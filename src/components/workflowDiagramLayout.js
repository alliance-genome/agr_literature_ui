import * as d3 from 'd3';

// ─── Color palette for process groups ────────────────────────────────────────
const GROUP_COLORS = [
  { bg: '#e8f4f8', border: '#5ba3c9', header: '#d0e9f2' },
  { bg: '#f0e8f5', border: '#9b6fbd', header: '#e2d4ed' },
  { bg: '#e8f5e8', border: '#5bb55b', header: '#d4ead4' },
  { bg: '#fdf3e0', border: '#d4a03c', header: '#f5e6c4' },
  { bg: '#fce8e8', border: '#c95b5b', header: '#f2d4d4' },
  { bg: '#e8eef5', border: '#5b6fc9', header: '#d4deee' },
  { bg: '#f5f0e8', border: '#b59b5b', header: '#eae2d0' },
  { bg: '#e8f5f0', border: '#5bb59b', header: '#d4eae2' },
];

let markerInstanceCounter = 0;


// These two database workflows are real roll-up workflows. They summarize
// the detailed datatype workflows below them.
const ROLLUP_WORKFLOWS = {
  'ATP:0000172': {
    label: 'Entity extraction',
    badge: 'roll-up',
    summaryText: null,
    helperText: '',
  },
  'ATP:0000165': {
    label: 'Reference classification',
    badge: 'roll-up',
    summaryText: null,
    helperText: '',
  },
};

function getRollupWorkflow(processId) {
  return ROLLUP_WORKFLOWS[processId] || null;
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getGroupColor(id) {
  return GROUP_COLORS[hashString(id) % GROUP_COLORS.length];
}

/**
 * Shorten a state name by removing redundant workflow/process prefix.
 * E.g., "manual indexing in progress" -> "in progress" (when process is "manual indexing")
 */
function shortenStateName(stateName, processName) {
  if (!stateName) return stateName;
  if (!processName) return stateName;

  // Normalize for comparison (lowercase, trimmed)
  const normalizedProcess = processName.toLowerCase().trim();
  const normalizedState = stateName.toLowerCase().trim();

  // If state starts with process name, remove it
  if (normalizedState.startsWith(normalizedProcess)) {
    // Use normalizedProcess.length to handle case differences correctly
    const shortened = normalizedState.slice(normalizedProcess.length).trim();
    // If it's now empty or just punctuation, keep original
    if (shortened && shortened.length > 2) {
      // Capitalize first letter of shortened name
      return shortened.charAt(0).toUpperCase() + shortened.slice(1);
    }
  }

  // Try alternative: check if state contains common suffixes we can extract
  const suffixes = ['needed', 'in progress', 'complete', 'failed', 'blocked', 'unavailable', 'uploaded', 'extracted'];
  for (const suffix of suffixes) {
    if (normalizedState.endsWith(suffix)) {
      // Capitalize first letter
      return suffix.charAt(0).toUpperCase() + suffix.slice(1);
    }
  }

  return stateName;
}

/**
 * Classify a state name into a semantic category for layout ordering.
 * Returns: 'initial' (needed), 'progress', 'complete', 'failed', 'blocked', 'other'
 */
function classifyState(stateName) {
  if (!stateName) return 'other';
  const name = stateName.toLowerCase();

  // Initial/needed states - should be at top
  if (name.includes('needed') || name.includes('waiting') || name.includes('pending')) {
    return 'initial';
  }
  // In progress states - middle
  if (name.includes('in progress') || name.includes('in_progress') || name.includes('processing')) {
    return 'progress';
  }
  // Complete/final states - bottom of main flow
  if (name.includes('complete') || name.includes('uploaded') || name.includes('converted') ||
      name.includes('extracted') || name.includes('indexed') || name.includes('done')) {
    return 'complete';
  }
  // Failed states - to the side
  if (name.includes('failed') || name.includes('error')) {
    return 'failed';
  }
  // Blocked/unavailable states - to the side
  if (name.includes('blocked') || name.includes('unavailable') || name.includes("won't")) {
    return 'blocked';
  }
  // Status/internal states (often technical)
  if (name.includes('status') || name.includes('task')) {
    return 'internal';
  }

  return 'other';
}

function isPrimaryWorkflowTransition(sourceName, targetName) {
  const sourceCategory = classifyState(sourceName);
  const targetCategory = classifyState(targetName);
  return (sourceCategory === 'initial' && targetCategory === 'progress') ||
    (sourceCategory === 'progress' && targetCategory === 'complete');
}

function normalizeWorkflowName(name) {
  return (name || '').toLowerCase().trim();
}

function isProcessPlaceholderNode(node, processId, processName) {
  if (!node) return false;
  return node.tag === processId ||
    normalizeWorkflowName(node.tag_name) === normalizeWorkflowName(processName);
}

function findProcessLayoutNodeId(processId, processName, layoutNodes) {
  const processSummary = layoutNodes.find(n => n.type === 'summary' && n.processId === processId);
  if (processSummary) return processSummary.id;

  const normalizedProcessName = normalizeWorkflowName(processName);
  const subprocessSummary = layoutNodes.find(n =>
    n.type === 'subsummary' &&
    n.processId === processId &&
    normalizeWorkflowName(n.subprocessName || n.name).startsWith(normalizedProcessName)
  );
  if (subprocessSummary) return subprocessSummary.id;

  const visibleState = layoutNodes.find(n => n.type === 'normal' && n.processId === processId);
  return visibleState?.id || null;
}


// Semantic ordering priority (lower = earlier in layout)
const STATE_PRIORITY = {
  'initial': 0,
  'progress': 1,
  'other': 2,
  'complete': 3,
  'failed': 4,
  'blocked': 4,
  'internal': 5,
};

// ─── Data transformation ─────────────────────────────────────────────────────

function buildGraph(tagData) {
  const nodeMap = new Map();
  const edges = [];
  // 3-level hierarchy: process -> subprocess -> nodes
  const processGroups = new Map();   // processId -> { processName, subprocesses: Map }
  const nodeToProcess = new Map();

  for (const node of tagData) {
    // Skip nodes without a proper workflow_process (unassigned/internal states)
    if (!node.workflow_process) continue;

    nodeMap.set(node.tag, {
      id: node.tag,
      name: node.tag_name,
      processId: node.workflow_process,
      processName: node.workflow_process_name,
      subprocessId: node.workflow_subprocess || null,
      subprocessName: node.workflow_subprocess_name || null,
      transitions: node.transitions || [],
    });

    const pid = node.workflow_process;
    const pname = node.workflow_process_name || pid;
    nodeToProcess.set(node.tag, pid);

    if (!processGroups.has(pid)) {
      processGroups.set(pid, {
        processId: pid,
        processName: pname,
        subprocesses: new Map(),
        directNodeIds: [],  // nodes without a subprocess
        placeholderNodeIds: [],
      });
    }
    const pg = processGroups.get(pid);

    const spid = node.workflow_subprocess || null;
    if (spid && spid !== pid) {
      const spname = node.workflow_subprocess_name || spid;
      if (!pg.subprocesses.has(spid)) {
        pg.subprocesses.set(spid, {
          subprocessId: spid,
          subprocessName: spname,
          nodeIds: [],
        });
      }
      const spNodeIds = pg.subprocesses.get(spid).nodeIds;
      if (!spNodeIds.includes(node.tag)) spNodeIds.push(node.tag);
    } else {
      if (isProcessPlaceholderNode(node, pid, pname)) {
        if (!pg.placeholderNodeIds.includes(node.tag)) pg.placeholderNodeIds.push(node.tag);
      } else if (!pg.directNodeIds.includes(node.tag)) {
        pg.directNodeIds.push(node.tag);
      }
    }

    for (const t of node.transitions || []) {
      edges.push({
        source: node.tag,
        target: t.to,
        data: {
          sourceName: node.tag_name,
          to_name: t.to_name,
          transition_type: t.transition_type,
          condition: t.condition,
          requirements: t.requirements || [],
          actions: t.actions || [],
        },
      });
    }
  }

  // Remove direct nodes that are also subprocess IDs (they're represented by the subprocess group)
  for (const pg of processGroups.values()) {
    const spIds = new Set(pg.subprocesses.keys());
    pg.directNodeIds = pg.directNodeIds.filter(nid => !spIds.has(nid));
  }

  return { nodeMap, edges, processGroups, nodeToProcess };
}

// ─── Topological layering ────────────────────────────────────────────────────

function buildAdjacency(nodeIds, edges) {
  const children = new Map();
  const parents = new Map();
  const nodeSet = new Set(nodeIds);
  for (const id of nodeIds) {
    children.set(id, []);
    parents.set(id, []);
  }
  for (const e of edges) {
    if (nodeSet.has(e.source) && nodeSet.has(e.target)) {
      children.get(e.source).push(e.target);
      parents.get(e.target).push(e.source);
    }
  }
  return { children, parents };
}

function assignLayers(nodeIds, edges) {
  const { children, parents } = buildAdjacency(nodeIds, edges);

  const roots = nodeIds.filter(id => parents.get(id).length === 0);
  if (roots.length === 0 && nodeIds.length > 0) {
    roots.push(nodeIds[0]);
  }

  const layers = new Map();

  function dfs(node, depth, stack) {
    const current = layers.get(node);
    if (current !== undefined && depth <= current) return;
    if (stack.has(node)) return;

    layers.set(node, depth);
    stack.add(node);
    for (const child of children.get(node) || []) {
      dfs(child, depth + 1, stack);
    }
    stack.delete(node);
  }

  for (const root of roots) {
    dfs(root, 0, new Set());
  }

  for (const id of nodeIds) {
    if (!layers.has(id)) layers.set(id, 0);
  }

  return layers;
}

// ─── Group ordering ──────────────────────────────────────────────────────────

// What starts each workflow comes from the API (/workflow_tag/workflow_diagram_triggers):
// entry points are events outside every workflow (a paper entering the corpus, the
// sort page, the PubMed update); handoffs are states of one workflow that start
// another. A workflow's row is the length of the longest chain of these that leads
// to it, so the diagram reads from what starts a paper's workflows down to what
// they start in turn.

// Tie-breaker for workflows in the same row: the long-standing left-to-right order.
const PREFERRED_PROCESS_ORDER = [
  'ATP:0000140',  // file upload
  'ATP:0000273',  // manual indexing
  'ATP:0000161',  // text conversion
  'ATP:0000172',  // entity extraction
  'ATP:0000165',  // reference classification
  'ATP:0000354',  // email extraction
];

const ENTRY_SOURCE_ORDER = ['corpus_entry', 'sort_page', 'pubmed_update'];

// Wider rows wrap, so a MOD with many workflows started at once stays readable.
const MAX_GROUPS_PER_ROW = 5;

function compareProcesses(processGroups) {
  const rank = (gid) => {
    const i = PREFERRED_PROCESS_ORDER.indexOf(gid);
    return i === -1 ? PREFERRED_PROCESS_ORDER.length : i;
  };
  return (a, b) => (rank(a) - rank(b)) ||
    (processGroups.get(a)?.processName || a).localeCompare(processGroups.get(b)?.processName || b);
}

function chunkRow(ids) {
  const rows = [];
  for (let i = 0; i < ids.length; i += MAX_GROUPS_PER_ROW) rows.push(ids.slice(i, i + MAX_GROUPS_PER_ROW));
  return rows;
}

/**
 * Rows of process ids, top to bottom. A process started by an entry point is in
 * row 1, one started by a handoff from a row-n process is in row n + 1 (the
 * longest chain wins). Processes nothing starts are returned separately as
 * `unstarted`, for a lane of their own. Without trigger data every process is
 * unstarted, in the preferred order.
 */
export function computeProcessRows(processGroups, triggers) {
  const ids = [...processGroups.keys()];
  const known = new Set(ids);
  const started = new Set();
  const predecessors = new Map(ids.map(id => [id, new Set()]));
  for (const entry of triggers?.entry_points || []) {
    if (known.has(entry.to_process)) started.add(entry.to_process);
  }
  for (const handoff of triggers?.handoffs || []) {
    const from = handoff.from_process;
    const to = handoff.to_process;
    if (known.has(from) && known.has(to) && from !== to) predecessors.get(to).add(from);
  }

  const depth = new Map();
  const visiting = new Set();
  const depthOf = (id) => {
    if (depth.has(id)) return depth.get(id);
    if (visiting.has(id)) return null;  // a cycle: ignore that edge
    visiting.add(id);
    let best = started.has(id) ? 1 : null;
    for (const pred of predecessors.get(id)) {
      const d = depthOf(pred);
      if (d !== null && (best === null || d + 1 > best)) best = d + 1;
    }
    visiting.delete(id);
    depth.set(id, best);
    return best;
  };
  ids.forEach(depthOf);

  const byDepth = new Map();
  const unstarted = [];
  for (const id of ids) {
    const d = depth.get(id);
    if (d === null) unstarted.push(id);
    else {
      if (!byDepth.has(d)) byDepth.set(d, []);
      byDepth.get(d).push(id);
    }
  }
  const compare = compareProcesses(processGroups);
  const rows = [...byDepth.entries()]
    .sort((a, b) => a[0] - b[0])
    .flatMap(([, rowIds]) => chunkRow(rowIds.sort(compare)));
  return { rows, unstartedRows: chunkRow(unstarted.sort(compare)) };
}

// Gap between boxes in the same row (smaller = closer together)
const ROW_BOX_GAP = 28;

// ─── Layout constants ────────────────────────────────────────────────────────

const START_WIDTH = 190;
const START_HEIGHT = 44;
const LANE_LABEL_HEIGHT = 34;
const NODE_WIDTH = 200;      // Increased from 180 to avoid truncation
const NODE_HEIGHT = 40;
const SUMMARY_WIDTH = 180;   // Reduced to fit more boxes horizontally
const SUMMARY_HEIGHT = 55;   // Slightly reduced
const SUB_SUMMARY_WIDTH = 170; // Reduced to fit more boxes
const SUB_SUMMARY_HEIGHT = 45; // Slightly reduced
const GROUP_PADDING = 24;    // Increased from 20
const GROUP_HEADER_HEIGHT = 36; // Increased from 32
const SUB_HEADER_HEIGHT = 30;   // Increased from 28
const GROUP_GAP = 50;        // Increased from 30 for better spacing
const TOP_PADDING = 60;      // Extra top padding to avoid overlapping controls
const SUB_GAP = 20;          // Increased from 16
const NODE_X_GAP = 28;       // Increased from 24
const NODE_Y_GAP = 20;       // Increased from 16

// ─── computeLayout ──────────────────────────────────────────────────────────

/**
 * @param {Array} tagData
 * @param {Set} collapsedProcesses - process IDs that are fully collapsed
 * @param {Set} expandedSubprocesses - subprocess IDs whose nodes are visible
 * @param {number} width
 * @param {number} height
 * @param {Object} options - Additional layout options
 * @param {string} options.selectedNodeId - Node ID to highlight and show transitions for
 * @param {string} options.currentStateId - Current state to highlight (e.g., for a reference)
 * @param {boolean} options.showAllTransitions - Show every transition instead of only the main workflow
 * @param {Object} options.triggers - What starts each workflow: { entry_points, handoffs }
 *   from /workflow_tag/workflow_diagram_triggers; null draws no start nodes or handoffs
 */
export function computeLayout(tagData, collapsedProcesses, expandedSubprocesses, width, height, options = {}) {
  const { selectedNodeId = null, currentStateId = null, showAllTransitions = false, triggers = null } = options;

  if (!tagData || tagData.length === 0) {
    return { nodes: [], edges: [], groups: [], lanes: [], viewBox: '0 0 800 600' };
  }

  const { nodeMap, edges: allEdges, processGroups, nodeToProcess } = buildGraph(tagData);
  const { rows: startedRows, unstartedRows } = computeProcessRows(processGroups, triggers);
  const rowGroups = [...startedRows, ...unstartedRows];

  const layoutNodes = [];
  const layoutGroups = [];
  const layoutLanes = [];
  const nodeToLayoutId = new Map();
  const processIdToSummaryId = new Map(); // Track summary IDs for cross-workflow edges

  let currentY = TOP_PADDING;

  // ─── Start nodes: the events that begin this MOD's workflows ───
  const entryPoints = (triggers?.entry_points || []).filter(e => processGroups.has(e.to_process));
  const startSources = ENTRY_SOURCE_ORDER.filter(src => entryPoints.some(e => e.source === src));
  if (startSources.length > 0) {
    const rowWidth = startSources.length * START_WIDTH + (startSources.length - 1) * ROW_BOX_GAP;
    let startX = width / 2 - rowWidth / 2;
    for (const source of startSources) {
      const starts = entryPoints.filter(e => e.source === source);
      layoutNodes.push({
        id: `start:${source}`,
        name: starts[0].source_label,
        x: startX, y: currentY,
        width: START_WIDTH, height: START_HEIGHT,
        type: 'start',
        starts: starts.map(e => ({ name: e.to_state_name, process: e.to_process_name, condition: e.condition })),
      });
      startX += START_WIDTH + ROW_BOX_GAP;
    }
    currentY += START_HEIGHT + GROUP_GAP + 10;
  }

  // Process groups row by row
  for (const [rowIndex, rowGroupIds] of rowGroups.entries()) {
    if (triggers && rowIndex === startedRows.length && unstartedRows.length > 0) {
      // Workflows nothing starts automatically: a curator (or a tool) begins them.
      layoutLanes.push({ x: width / 2, y: currentY + 4, text: 'No automatic start (begun by curators or other tools)' });
      currentY += LANE_LABEL_HEIGHT;
    }
    const numInRow = rowGroupIds.length;
    const boxGap = numInRow > 1 ? ROW_BOX_GAP : 0;

    // First pass: calculate actual widths for each group
    const groupWidths = [];
    const groupHeights = [];
    const groupData = []; // Store computed data for each group

    for (const gid of rowGroupIds) {
      const pg = processGroups.get(gid);
      if (collapsedProcesses.has(gid)) {
        groupWidths.push(SUMMARY_WIDTH);
        groupHeights.push(SUMMARY_HEIGHT);
        groupData.push({ collapsed: true });
      } else {
        // Estimate expanded width (will be refined during layout)
        const estimatedWidth = 350; // Approximate expanded group width
        groupWidths.push(estimatedWidth);
        groupHeights.push(200); // Will be calculated during layout
        groupData.push({ collapsed: false });
      }
    }

    // Calculate total row width and starting X position
    const totalRowWidth = groupWidths.reduce((sum, w) => sum + w, 0) + (numInRow - 1) * boxGap;
    let rowStartX = width / 2 - totalRowWidth / 2;
    let maxRowHeight = 0;

    // Track X position as we place groups
    let currentX = rowStartX;

    for (let colIdx = 0; colIdx < rowGroupIds.length; colIdx++) {
      const gid = rowGroupIds[colIdx];
      const pg = processGroups.get(gid);
      const color = getGroupColor(gid);
      const rollupWorkflow = getRollupWorkflow(gid);

      if (collapsedProcesses.has(gid)) {
        // ─── Collapsed process: single summary node ───
        const summaryId = `summary:${gid}`;
        const sx = currentX;
        const totalNodes = pg.directNodeIds.length +
          [...pg.subprocesses.values()].reduce((s, sp) => s + sp.nodeIds.length, 0);

        layoutNodes.push({
          id: summaryId,
          name: rollupWorkflow?.label || pg.processName || gid,
          x: sx, y: currentY,
          width: SUMMARY_WIDTH, height: SUMMARY_HEIGHT,
          type: 'summary',
          processId: gid, processName: pg.processName,
          nodeCount: totalNodes,
          subprocessCount: pg.subprocesses.size,
          isRollup: !!rollupWorkflow,
          rollupBadge: rollupWorkflow?.badge || null,
          rollupSummaryText: rollupWorkflow?.summaryText || null,
          rollupHelperText: rollupWorkflow?.helperText || null,
          color,
        });

        // Map all nodes in this process to the summary
        for (const nid of pg.directNodeIds) nodeToLayoutId.set(nid, summaryId);
        for (const nid of pg.placeholderNodeIds || []) nodeToLayoutId.set(nid, summaryId);
        for (const sp of pg.subprocesses.values()) {
          for (const nid of sp.nodeIds) nodeToLayoutId.set(nid, summaryId);
        }
        processIdToSummaryId.set(gid, summaryId);

        layoutGroups.push({
          processId: gid, processName: pg.processName,
          collapsed: true,
          isRollup: !!rollupWorkflow,
          rollupBadge: rollupWorkflow?.badge || null,
          rollupHelperText: rollupWorkflow?.helperText || null,
          x: sx - 10, y: currentY - 10,
          width: SUMMARY_WIDTH + 20, height: SUMMARY_HEIGHT + 20,
          color,
        });

        currentX += SUMMARY_WIDTH + boxGap;
        maxRowHeight = Math.max(maxRowHeight, SUMMARY_HEIGHT + GROUP_GAP);
      } else {
        // ─── Expanded process: show subprocesses ───
        const groupNodeStart = layoutNodes.length;
        const groupBoxStart = layoutGroups.length;
        const groupStartY = currentY + GROUP_HEADER_HEIGHT + GROUP_PADDING;
        let innerY = groupStartY;
        let maxWidth = 280;

        // Direct nodes (no subprocess) — lay them out if any
        if (pg.directNodeIds.length > 0) {
          const ids = pg.directNodeIds.filter(id => nodeMap.has(id));
          const internalEdges = allEdges.filter(
            e => ids.includes(e.source) && ids.includes(e.target)
          );
          const result = layoutNodeSet(ids, internalEdges, nodeMap, innerY, width, gid, pg.processName, color, nodeToLayoutId, { selectedNodeId, currentStateId });
          layoutNodes.push(...result.nodes);
          maxWidth = Math.max(maxWidth, result.width);
          innerY = result.bottomY + SUB_GAP;
        }

        // Subprocesses - separate into main flow and side states
        const mainFlowSubprocesses = [];  // needed, in progress, complete
        const sideSubprocesses = [];      // failed, blocked, etc.
        const expandedSubprocessList = [];

        for (const sp of pg.subprocesses.values()) {
          if (expandedSubprocesses.has(sp.subprocessId)) {
            expandedSubprocessList.push(sp);
          } else {
            // Categorize collapsed subprocesses by their name
            const category = classifyState(sp.subprocessName);
            if (category === 'initial' || category === 'progress' || category === 'complete') {
              mainFlowSubprocesses.push({ sp, category, priority: STATE_PRIORITY[category] });
            } else {
              sideSubprocesses.push({ sp, category });
            }
          }
        }

        // If ALL subprocesses are side states (no main flow), put them in center instead
        if (mainFlowSubprocesses.length === 0 && sideSubprocesses.length > 0) {
          for (const item of sideSubprocesses) {
            mainFlowSubprocesses.push({ ...item, priority: STATE_PRIORITY[item.category] || 99 });
          }
          sideSubprocesses.length = 0;
        }

        // Sort main flow subprocesses by priority
        mainFlowSubprocesses.sort((a, b) => a.priority - b.priority);

        // Calculate positions for side subprocesses
        const sideXGap = 40;
        const centerX = width / 2 - SUB_SUMMARY_WIDTH / 2;
        const leftX = centerX - SUB_SUMMARY_WIDTH - sideXGap;

        // Layout main flow subprocesses (center)
        for (const { sp } of mainFlowSubprocesses) {
          const spColor = getGroupColor(sp.subprocessId);
          const spSummaryId = `subsummary:${sp.subprocessId}`;

          layoutNodes.push({
            id: spSummaryId,
            name: rollupWorkflow ? shortenStateName(sp.subprocessName || sp.subprocessId, rollupWorkflow.label || pg.processName) : (sp.subprocessName || sp.subprocessId),
            x: centerX, y: innerY,
            width: SUB_SUMMARY_WIDTH, height: SUB_SUMMARY_HEIGHT,
            type: 'subsummary',
            processId: gid, processName: pg.processName,
            subprocessId: sp.subprocessId, subprocessName: sp.subprocessName,
            nodeCount: sp.nodeIds.length,
            stateCategory: classifyState(sp.subprocessName),
            isMainFlow: true,
            color: spColor,
          });

          for (const nid of sp.nodeIds) nodeToLayoutId.set(nid, spSummaryId);
          innerY += SUB_SUMMARY_HEIGHT + SUB_GAP;
        }

        // Calculate vertical center for side subprocesses
        const mainFlowHeight = mainFlowSubprocesses.length > 0
          ? (mainFlowSubprocesses.length * (SUB_SUMMARY_HEIGHT + SUB_GAP) - SUB_GAP)
          : SUB_SUMMARY_HEIGHT;
        const sideStartY = groupStartY + (mainFlowHeight / 2) - (sideSubprocesses.length * (SUB_SUMMARY_HEIGHT + SUB_GAP) / 2);
        let sideY = Math.max(groupStartY, sideStartY);

        // Layout side subprocesses (left)
        for (const { sp } of sideSubprocesses) {
          const spColor = getGroupColor(sp.subprocessId);
          const spSummaryId = `subsummary:${sp.subprocessId}`;

          layoutNodes.push({
            id: spSummaryId,
            name: rollupWorkflow ? shortenStateName(sp.subprocessName || sp.subprocessId, rollupWorkflow.label || pg.processName) : (sp.subprocessName || sp.subprocessId),
            x: leftX, y: sideY,
            width: SUB_SUMMARY_WIDTH, height: SUB_SUMMARY_HEIGHT,
            type: 'subsummary',
            processId: gid, processName: pg.processName,
            subprocessId: sp.subprocessId, subprocessName: sp.subprocessName,
            nodeCount: sp.nodeIds.length,
            stateCategory: classifyState(sp.subprocessName),
            isMainFlow: false,
            color: spColor,
          });

          for (const nid of sp.nodeIds) nodeToLayoutId.set(nid, spSummaryId);
          sideY += SUB_SUMMARY_HEIGHT + SUB_GAP;
        }

        // Update maxWidth to include side column if present
        if (sideSubprocesses.length > 0) {
          maxWidth = Math.max(maxWidth, (SUB_SUMMARY_WIDTH * 2) + sideXGap + GROUP_PADDING * 2);
        } else {
          maxWidth = Math.max(maxWidth, SUB_SUMMARY_WIDTH + GROUP_PADDING * 2);
        }

        // Update innerY to account for both columns
        innerY = Math.max(innerY, sideY);

        // Layout expanded subprocesses
        for (const sp of expandedSubprocessList) {
          const spColor = getGroupColor(sp.subprocessId);
          // Expanded subprocess: show nodes with sub-header
          const subHeaderY = innerY;
          innerY += SUB_HEADER_HEIGHT + 8;

          const ids = sp.nodeIds.filter(id => nodeMap.has(id));
          const internalEdges = allEdges.filter(
            e => ids.includes(e.source) && ids.includes(e.target)
          );
          const result = layoutNodeSet(ids, internalEdges, nodeMap, innerY, width, gid, pg.processName, color, nodeToLayoutId, { selectedNodeId, currentStateId });
          layoutNodes.push(...result.nodes);

          // Add subprocess group box
          const spWidth = Math.max(result.width + GROUP_PADDING, SUB_SUMMARY_WIDTH + GROUP_PADDING);
          const spHeight = SUB_HEADER_HEIGHT + 8 + result.height + GROUP_PADDING;
          const spX = width / 2 - spWidth / 2;

          layoutGroups.push({
            processId: sp.subprocessId, processName: sp.subprocessName,
            collapsed: false,
            isSubprocess: true,
            parentProcessId: gid,
            x: spX, y: subHeaderY,
            width: spWidth, height: spHeight,
            color: spColor,
          });

          maxWidth = Math.max(maxWidth, spWidth + GROUP_PADDING);
          innerY = result.bottomY + SUB_GAP;
        }

        const groupHeight = innerY - currentY + GROUP_PADDING - SUB_GAP;
        const groupWidth = Math.max(maxWidth + GROUP_PADDING * 2, 300);

        // Position expanded group - if multiple in row, use currentX; otherwise center
        let groupX;
        if (numInRow > 1) {
          groupX = currentX;
          currentX += groupWidth + boxGap;
        } else {
          groupX = width / 2 - groupWidth / 2;
        }

        const groupCenterX = groupX + groupWidth / 2;
        const layoutCenterX = width / 2;
        const groupOffsetX = groupCenterX - layoutCenterX;
        if (groupOffsetX !== 0) {
          for (let i = groupNodeStart; i < layoutNodes.length; i++) {
            layoutNodes[i].x += groupOffsetX;
          }
          for (let i = groupBoxStart; i < layoutGroups.length; i++) {
            layoutGroups[i].x += groupOffsetX;
          }
        }

        layoutGroups.push({
          processId: gid, processName: pg.processName,
          collapsed: false,
          isRollup: !!rollupWorkflow,
          rollupBadge: rollupWorkflow?.badge || null,
          rollupHelperText: rollupWorkflow?.helperText || null,
          x: groupX, y: currentY,
          width: groupWidth, height: groupHeight,
          color,
        });

        maxRowHeight = Math.max(maxRowHeight, groupHeight + GROUP_GAP);
      }
    }
    // Move to next row
    currentY += maxRowHeight;
  }

  // ─── Build layout edges (merge bidirectional into one) ───
  const handoffStatePairs = new Set(
    (triggers?.handoffs || []).map(h => `${h.from_state}\u2192${h.to_state}`));
  const edgeMap = new Map(); // "A→B" (sorted key) -> edge object
  for (const e of allEdges) {
    const src = nodeToLayoutId.get(e.source);
    const tgt = nodeToLayoutId.get(e.target);
    if (!src || !tgt || src === tgt) continue;

    // Handoffs between workflows are drawn from the trigger data below.
    // Skipping the raw transition here prevents duplicate arrows, especially
    // when the source process is collapsed and the target process is expanded
    // (for example: file upload -> text conversion Needed).
    if (handoffStatePairs.has(`${e.source}\u2192${e.target}`)) continue;

    const srcNode = layoutNodes.find(n => n.id === src);
    const tgtNode = layoutNodes.find(n => n.id === tgt);
    if (!srcNode || !tgtNode) continue;

    const srcProc = nodeToProcess.get(e.source) || srcNode.processId;
    const tgtProc = nodeToProcess.get(e.target) || tgtNode.processId;
    const edgeType = (srcProc === tgtProc) ? 'internal' : 'external';
    const isPrimaryFlow = isPrimaryWorkflowTransition(
      nodeMap.get(e.source)?.name,
      nodeMap.get(e.target)?.name
    );
    const isSelectedEdge = !!selectedNodeId && (src === selectedNodeId || tgt === selectedNodeId);

    // Default/simple view: keep only the main internal workflow path here.
    // Arrows that start a workflow are added later from the trigger data.
    // Focused view: keep only transitions connected to the selected state, plus the main path.
    // Full view: keep everything.
    if (!showAllTransitions) {
      if (selectedNodeId) {
        if (!isSelectedEdge && !isPrimaryFlow) continue;
      } else if (!isPrimaryFlow) {
        continue;
      }
    }

    const isSideTransition = !isPrimaryFlow && (
      srcNode.isMainFlow === false ||
      tgtNode.isMainFlow === false ||
      srcNode.stateCategory === 'failed' ||
      srcNode.stateCategory === 'blocked' ||
      srcNode.stateCategory === 'internal' ||
      tgtNode.stateCategory === 'failed' ||
      tgtNode.stateCategory === 'blocked' ||
      tgtNode.stateCategory === 'internal'
    );

    // Primary workflow edges stay directed so the normal Needed → In progress
    // → Complete/Uploaded path remains visible even if reverse special-case
    // transitions also exist.
    const [lo, hi] = src < tgt ? [src, tgt] : [tgt, src];
    const canonKey = `${lo}\u2194${hi}`;
    const forwardKey = `${src}\u2192${tgt}`;
    const edgeKey = isPrimaryFlow ? forwardKey : canonKey;

    if (edgeMap.has(edgeKey)) {
      const existing = edgeMap.get(edgeKey);
      if (!isPrimaryFlow && !existing._directionKeys.has(forwardKey)) {
        existing._directionKeys.add(forwardKey);
        existing.bidirectional = true;
        existing.reverseData = e.data;
      }
      continue;
    }

    edgeMap.set(edgeKey, {
      source: src, target: tgt,
      sourceNode: srcNode, targetNode: tgtNode,
      edgeType, data: e.data,
      isPrimaryFlow,
      isSelectedEdge,
      isSideTransition,
      showAllTransitions,
      bidirectional: false,
      reverseData: null,
      _directionKeys: new Set([forwardKey]),
    });
  }
  const layoutEdges = [...edgeMap.values()];

  const addSyntheticEdge = (sourceNode, targetNode, edgeType, data, options = {}) => {
    if (!sourceNode || !targetNode || sourceNode.id === targetNode.id) return;
    const edgeKey = `${options.keyPrefix || 'synthetic'}:${sourceNode.id}\u2192${targetNode.id}`;
    const normalKey = `${sourceNode.id}\u2192${targetNode.id}`;
    if (edgeMap.has(edgeKey) || edgeMap.has(normalKey)) return;

    const edge = {
      source: sourceNode.id,
      target: targetNode.id,
      sourceNode,
      targetNode,
      edgeType,
      data,
      isPrimaryFlow: !!options.isPrimaryFlow,
      isTrigger: !!options.isTrigger,
      isSideTransition: false,
      showAllTransitions,
      synthetic: true,
      bidirectional: false,
      reverseData: null,
      _directionKeys: new Set([normalKey]),
    };
    edgeMap.set(edgeKey, edge);
    layoutEdges.push(edge);
  };

  const visibleNodesByProcess = new Map();
  for (const node of layoutNodes) {
    if (node.type !== 'normal') continue;
    if (!visibleNodesByProcess.has(node.processId)) visibleNodesByProcess.set(node.processId, []);
    visibleNodesByProcess.get(node.processId).push(node);
  }
  for (const nodes of visibleNodesByProcess.values()) {
    const initialNodes = nodes.filter(n => n.stateCategory === 'initial');
    const progressNodes = nodes.filter(n => n.stateCategory === 'progress');
    const completeNodes = nodes.filter(n => n.stateCategory === 'complete');

    for (const sourceNode of initialNodes) {
      for (const targetNode of progressNodes) {
        addSyntheticEdge(sourceNode, targetNode, 'internal', {
          sourceName: sourceNode.name,
          to_name: targetNode.name,
          transition_type: 'primary workflow',
          requirements: [],
          actions: [],
        }, { isPrimaryFlow: true, keyPrefix: 'primary' });
      }
    }
    for (const sourceNode of progressNodes) {
      for (const targetNode of completeNodes) {
        addSyntheticEdge(sourceNode, targetNode, 'internal', {
          sourceName: sourceNode.name,
          to_name: targetNode.name,
          transition_type: 'primary workflow',
          requirements: [],
          actions: [],
        }, { isPrimaryFlow: true, keyPrefix: 'primary' });
      }
    }
  }

  // ─── Arrows that start a workflow: entry points and handoffs ───
  // Always drawn, whether the workflows are collapsed or expanded. An expanded
  // workflow connects the real state (for example Uploaded → Needed); a
  // collapsed one falls back to its summary box. Several handoffs between the
  // same two boxes (e.g. one per classifier sub-task) become one arrow.
  const findLayoutNode = (state, subprocess, process, processName) => {
    const id = nodeToLayoutId.get(state) ||
      (subprocess && layoutNodes.some(n => n.id === `subsummary:${subprocess}`) ? `subsummary:${subprocess}` : null) ||
      processIdToSummaryId.get(process) ||
      findProcessLayoutNodeId(process, processName, layoutNodes);
    return id ? layoutNodes.find(n => n.id === id) : null;
  };
  const addStartEdge = (sourceNode, targetNode, data, kind) => {
    if (!sourceNode || !targetNode || sourceNode.id === targetNode.id) return;
    const key = `${kind}:${sourceNode.id}\u2192${targetNode.id}`;
    if (edgeMap.has(key)) {
      const existing = edgeMap.get(key);
      for (const condition of data.conditions) {
        if (!existing.conditions.includes(condition)) existing.conditions.push(condition);
      }
      existing.label = edgeLabel(existing.conditions);
      existing.data.condition = existing.label || existing.data.condition;
      return;
    }
    // A raw transition already drawn between the same boxes in this direction
    // becomes this arrow. A transition the other way (e.g. a reset from the
    // target back to the source) is not the handoff, so it stays as its own edge.
    const forward = `${sourceNode.id}\u2192${targetNode.id}`;
    const reverse = `${targetNode.id}\u2192${sourceNode.id}`;
    const dropRawEdge = (rawEdgeKey) => {
      const raw = edgeMap.get(rawEdgeKey);
      edgeMap.delete(rawEdgeKey);
      layoutEdges.splice(layoutEdges.indexOf(raw), 1);
    };
    const [lo, hi] = sourceNode.id < targetNode.id ? [sourceNode.id, targetNode.id] : [targetNode.id, sourceNode.id];
    const rawKey = `${lo}\u2194${hi}`;
    if (edgeMap.has(rawKey)) {
      const raw = edgeMap.get(rawKey);
      if (raw._directionKeys.has(reverse)) {
        if (raw.source === sourceNode.id) {
          // the reverse transition was merged in as reverseData; make it the edge
          Object.assign(raw, {
            source: targetNode.id, target: sourceNode.id,
            sourceNode: targetNode, targetNode: sourceNode,
            data: raw.reverseData,
          });
        }
        raw.bidirectional = false;
        raw.reverseData = null;
        raw._directionKeys = new Set([reverse]);
      } else {
        dropRawEdge(rawKey);
      }
    }
    // primary-flow raw edges are keyed by direction rather than by the pair
    if (edgeMap.has(forward)) dropRawEdge(forward);
    const edge = {
      source: sourceNode.id,
      target: targetNode.id,
      sourceNode,
      targetNode,
      edgeType: kind === 'entry' ? 'start' : 'external',
      isTrigger: true,
      isPrimaryFlow: true,
      isSideTransition: false,
      showAllTransitions,
      conditions: [...data.conditions],
      label: edgeLabel(data.conditions),
      data: {
        sourceName: data.sourceName,
        to_name: data.toName,
        transition_type: kind === 'entry' ? 'starts workflow' : 'handoff',
        condition: edgeLabel(data.conditions) || data.note,
        requirements: [],
        actions: [`Sets ${data.toName}`],
      },
      bidirectional: false,
      reverseData: null,
      _directionKeys: new Set([`${sourceNode.id}\u2192${targetNode.id}`]),
    };
    edgeMap.set(key, edge);
    layoutEdges.push(edge);
  };

  for (const entry of entryPoints) {
    addStartEdge(
      layoutNodes.find(n => n.id === `start:${entry.source}`),
      findLayoutNode(entry.to_state, entry.to_subprocess, entry.to_process, entry.to_process_name),
      { sourceName: entry.source_label, toName: entry.to_state_name, conditions: [entry.condition],
        note: `${entry.source_label} starts ${entry.to_process_name}` },
      'entry');
  }
  for (const handoff of triggers?.handoffs || []) {
    if (handoff.from_process === handoff.to_process) continue;
    addStartEdge(
      findLayoutNode(handoff.from_state, handoff.from_subprocess, handoff.from_process, handoff.from_process_name),
      findLayoutNode(handoff.to_state, handoff.to_subprocess, handoff.to_process, handoff.to_process_name),
      { sourceName: handoff.from_state_name, toName: handoff.to_state_name, conditions: [handoff.condition],
        note: `${handoff.from_state_name} starts ${handoff.to_process_name}` },
      'handoff');
  }
  layoutEdges.sort((a, b) => {
    if (a.isPrimaryFlow === b.isPrimaryFlow) return 0;
    return a.isPrimaryFlow ? 1 : -1;
  });

  // ─── Force simulation ───
  // Only apply to normal nodes (not summary/subsummary which should stay centered)
  const normalNodes = layoutNodes.filter(n => n.type === 'normal');
  if (normalNodes.length > 1 && layoutEdges.length > 0) {
    const simNodes = normalNodes.map(n => ({ ...n }));
    const normalNodeIds = new Set(normalNodes.map(n => n.id));
    const simLinks = layoutEdges
      .filter(e => e.isPrimaryFlow && normalNodeIds.has(e.source) && normalNodeIds.has(e.target))
      .map(e => {
        const si = simNodes.findIndex(n => n.id === e.source);
        const ti = simNodes.findIndex(n => n.id === e.target);
        return (si >= 0 && ti >= 0) ? { source: si, target: ti } : null;
      })
      .filter(Boolean);

    if (simLinks.length > 0) {
      const anchors = simNodes.map(n => ({ x: n.x, y: n.y }));

      // Fix Y positions so topological (from->to) ordering is preserved.
      // Also fix X for main flow nodes to keep them centered.
      for (const n of simNodes) {
        n.fy = n.y;
        if (n.isMainFlow) n.fx = n.x;  // Keep main flow nodes centered
      }

      const simulation = d3.forceSimulation(simNodes)
        .force('link', d3.forceLink(simLinks).distance(80).strength(0.2))
        .force('collide', d3.forceCollide()
          .radius(d => d.width / 2 + 8).strength(0.7))
        .force('anchorX', d3.forceX().x((d, i) => anchors[i].x).strength(0.6))
        .alphaDecay(0.05).stop();

      for (let i = 0; i < 80; i++) simulation.tick();
      // Update only normal node positions
      for (let i = 0; i < simNodes.length; i++) {
        const layoutNode = layoutNodes.find(n => n.id === simNodes[i].id);
        if (layoutNode) layoutNode.x = simNodes[i].x;
      }
    }
  }

  // ─── Compute viewBox ───
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const n of layoutNodes) {
    minX = Math.min(minX, n.x - 20); minY = Math.min(minY, n.y - 20);
    maxX = Math.max(maxX, n.x + n.width + 20); maxY = Math.max(maxY, n.y + n.height + 20);
  }
  for (const g of layoutGroups) {
    minX = Math.min(minX, g.x - 20); minY = Math.min(minY, g.y - 20);
    maxX = Math.max(maxX, g.x + g.width + 20); maxY = Math.max(maxY, g.y + g.height + 20);
  }
  for (const lane of layoutLanes) {
    minY = Math.min(minY, lane.y - 20); maxY = Math.max(maxY, lane.y + 20);
  }
  if (!isFinite(minX)) { minX = 0; minY = 0; maxX = 800; maxY = 600; }

  const viewBox = `${minX} ${minY} ${maxX - minX} ${maxY - minY}`;
  for (const e of layoutEdges) {
    e.sourceNode = layoutNodes.find(n => n.id === e.source);
    e.targetNode = layoutNodes.find(n => n.id === e.target);
  }

  return { nodes: layoutNodes, edges: layoutEdges, groups: layoutGroups, lanes: layoutLanes, viewBox };
}

/**
 * Layout a set of nodes with main flow centered and side states on left/right.
 * Main flow: initial (needed) → progress → complete (top to bottom, centered)
 * Side states: failed/blocked/unavailable (positioned to left or right)
 * Returns { nodes, width, height, bottomY }.
 */
function layoutNodeSet(nodeIds, edges, nodeMap, startY, containerWidth, processId, processName, color, nodeToLayoutId, options = {}) {
  const { selectedNodeId = null, currentStateId = null } = options;

  // Filter out nodes already placed by another group/subprocess
  const ids = nodeIds.filter(id => !nodeToLayoutId.has(id));

  if (ids.length === 0) {
    return { nodes: [], width: 0, height: 0, bottomY: startY };
  }

  const filteredEdges = edges.filter(e => ids.includes(e.source) && ids.includes(e.target));

  // Determine initial/final states within this node set
  const { parents, children } = buildAdjacency(ids, filteredEdges);
  const initialIds = new Set(ids.filter(id => parents.get(id).length === 0));
  const finalIds = new Set(ids.filter(id => children.get(id).length === 0));

  // Separate nodes into main flow and side states
  const mainFlowNodes = [];  // initial, progress, complete - centered vertical flow
  const leftSideNodes = [];  // blocked/unavailable/failed - left side

  for (const nid of ids) {
    const nd = nodeMap.get(nid);
    const category = classifyState(nd?.name);

    if (category === 'initial' || category === 'progress' || category === 'complete') {
      mainFlowNodes.push({ id: nid, category, priority: STATE_PRIORITY[category] });
    } else {
      // All side states (blocked, failed, unavailable, other) go to left side
      leftSideNodes.push({ id: nid, category });
    }
  }

  // If ALL nodes are side states (no main flow), put them in center instead
  // This handles subprocesses like "entity extraction failed" where all states are failed
  if (mainFlowNodes.length === 0 && leftSideNodes.length > 0) {
    // Move all left side nodes to main flow for center layout
    for (const item of leftSideNodes) {
      mainFlowNodes.push({ ...item, priority: STATE_PRIORITY[item.category] || 99 });
    }
    leftSideNodes.length = 0; // Clear left side
  }

  // Sort main flow by priority (initial → progress → complete)
  mainFlowNodes.sort((a, b) => a.priority - b.priority);

  // Adaptive sizing
  const totalNodes = ids.length;
  const compact = totalNodes > 6;
  const nw = compact ? 160 : NODE_WIDTH;
  const nh = compact ? 36 : NODE_HEIGHT;
  const yGap = compact ? 14 : NODE_Y_GAP;
  const sideXGap = 40; // Horizontal gap between main flow and side nodes

  const nodes = [];
  const centerX = containerWidth / 2 - nw / 2;

  // Layout main flow nodes (centered, vertical)
  let mainY = startY;
  for (const item of mainFlowNodes) {
    const nid = item.id;
    const nd = nodeMap.get(nid);
    const nodeRole = initialIds.has(nid) ? 'initial'
      : finalIds.has(nid) ? 'final' : 'normal';
    const isSelected = selectedNodeId === nid;
    const isCurrent = currentStateId === nid;

    nodes.push({
      id: nid,
      name: nd.name,
      shortName: shortenStateName(nd.name, nd.processName),
      nodeRole,
      stateCategory: item.category,
      isSelected,
      isCurrent,
      x: centerX,
      y: mainY,
      width: nw, height: nh,
      type: 'normal',
      compact,
      isMainFlow: true,  // Mark as main flow to fix X position in simulation
      processId, processName, color,
      transitions: nd.transitions,
    });
    nodeToLayoutId.set(nid, nid);
    mainY += nh + yGap;
  }

  // Calculate vertical range for side nodes (align with main flow)
  const mainFlowHeight = mainFlowNodes.length > 0 ? (mainFlowNodes.length * (nh + yGap) - yGap) : nh;
  const sideStartY = startY + (mainFlowHeight / 2) - (leftSideNodes.length * (nh + yGap) / 2);

  // Layout left side nodes (unavailable, blocked, failed, other)
  let leftY = Math.max(startY, sideStartY);
  const leftX = centerX - nw - sideXGap;
  for (const item of leftSideNodes) {
    const nid = item.id;
    const nd = nodeMap.get(nid);
    const nodeRole = initialIds.has(nid) ? 'initial'
      : finalIds.has(nid) ? 'final' : 'normal';
    const isSelected = selectedNodeId === nid;
    const isCurrent = currentStateId === nid;

    nodes.push({
      id: nid,
      name: nd.name,
      shortName: shortenStateName(nd.name, nd.processName),
      nodeRole,
      stateCategory: item.category,
      isSelected,
      isCurrent,
      x: leftX,
      y: leftY,
      width: nw, height: nh,
      type: 'normal',
      compact,
      processId, processName, color,
      transitions: nd.transitions,
    });
    nodeToLayoutId.set(nid, nid);
    leftY += nh + yGap;
  }

  // Calculate total dimensions
  const maxY = Math.max(mainY, leftY) - yGap;
  const contentHeight = maxY - startY;

  // Calculate width: include side column if present
  let totalWidth = nw; // main flow width
  if (leftSideNodes.length > 0) totalWidth += nw + sideXGap;

  return { nodes, width: totalWidth, height: contentHeight, bottomY: maxY };
}

// ─── Edge path helper ────────────────────────────────────────────────────────

/**
 * Pre-compute port offsets so multiple edges sharing a node side are spread out.
 * Edges always go bottom-of-source → top-of-target (matching hierarchy).
 */
function assignEdgePorts(edges) {
  // Count how many edges leave each node's bottom and enter each node's top
  const outCount = new Map(); // nodeId -> [edgeIdx, ...]
  const inCount = new Map();

  for (let i = 0; i < edges.length; i++) {
    const d = edges[i];
    if (!outCount.has(d.source)) outCount.set(d.source, []);
    outCount.get(d.source).push(i);
    if (!inCount.has(d.target)) inCount.set(d.target, []);
    inCount.get(d.target).push(i);
  }

  // Assign spread offsets (-0.5 to 0.5) for each port
  for (const [, indices] of outCount) {
    const n = indices.length;
    for (let j = 0; j < n; j++) {
      edges[indices[j]]._sPort = n > 1 ? (j + 1) / (n + 1) - 0.5 : 0;
    }
  }
  for (const [, indices] of inCount) {
    const n = indices.length;
    for (let j = 0; j < n; j++) {
      edges[indices[j]]._tPort = n > 1 ? (j + 1) / (n + 1) - 0.5 : 0;
    }
  }
}

/** A start/handoff arrow's label: its conditions, or nothing if any is unconditional. */
function edgeLabel(conditions) {
  if (!conditions || conditions.length === 0 || conditions.includes(null) || conditions.includes(undefined)) {
    return '';
  }
  return conditions.join(' or ');
}

/** Where an arrow's label sits: halfway along its usual top-to-bottom curve. */
function edgeLabelPosition(d) {
  const sn = d.sourceNode;
  const tn = d.targetNode;
  const sx = sn.x + sn.width / 2 + sn.width * 0.6 * (d._sPort || 0);
  const tx = tn.x + tn.width / 2 + tn.width * 0.6 * (d._tPort || 0);
  return { x: (sx + tx) / 2, y: (sn.y + sn.height + tn.y) / 2 };
}

function edgePath(d) {
  const sn = d.sourceNode;
  const tn = d.targetNode;
  const gap = 6;

  const sourceCenterX = sn.x + sn.width / 2;
  const sourceCenterY = sn.y + sn.height / 2;
  const targetCenterX = tn.x + tn.width / 2;
  const targetCenterY = tn.y + tn.height / 2;
  const sameRow = Math.abs(sourceCenterY - targetCenterY) < Math.max(sn.height, tn.height) * 0.75;
  const sideTransition = d.isSideTransition && !d.isPrimaryFlow;

  // Exception/side-state transitions are routed as soft side curves so they do
  // not cut through the main Needed → In progress → Complete/Uploaded column.
  if (sideTransition) {
    const sourceOnLeft = sourceCenterX <= targetCenterX;
    const sx = sourceOnLeft ? sn.x + sn.width : sn.x;
    const sy = sourceCenterY;
    const tx = sourceOnLeft ? tn.x : tn.x + tn.width;
    const ty = targetCenterY;
    const dx = Math.max(Math.abs(tx - sx), 90);
    const bow = d.isSelectedEdge ? 42 : 64;
    const c1x = sx + (sourceOnLeft ? dx * 0.45 : -dx * 0.45);
    const c2x = tx + (sourceOnLeft ? -dx * 0.45 : dx * 0.45);
    const c1y = sy + (ty >= sy ? bow : -bow);
    const c2y = ty + (ty >= sy ? -bow : bow);
    return `M ${sx} ${sy} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${tx} ${ty}`;
  }

  if (sameRow) {
    const isLeftToRight = sourceCenterX < targetCenterX;
    const sx = isLeftToRight ? sn.x + sn.width : sn.x;
    const sy = sourceCenterY;
    const tx = isLeftToRight ? tn.x - gap : tn.x + tn.width + gap;
    const ty = targetCenterY;
    const midX = (sx + tx) / 2;
    const curveY = Math.max(sy, ty) + 28;
    return `M ${sx} ${sy} Q ${midX} ${curveY}, ${tx} ${ty}`;
  }

  const sOff = sn.width * 0.6 * (d._sPort || 0);
  const tOff = tn.width * 0.6 * (d._tPort || 0);
  const sx = sourceCenterX + sOff;
  const sy = sn.y + sn.height;
  const tx = targetCenterX + tOff;
  const ty = tn.y - gap;

  if (tn.y < sn.y + sn.height) {
    const loopOut = Math.max(Math.abs(sx - tx), 80) + 40;
    const side = sx <= tx ? -1 : 1;
    const mx = Math.min(sn.x, tn.x) + side * loopOut;
    return `M ${sx} ${sy} C ${mx} ${sy}, ${mx} ${ty}, ${tx} ${ty}`;
  }

  const midY = (sy + ty) / 2;
  return `M ${sx} ${sy} C ${sx} ${midY}, ${tx} ${midY}, ${tx} ${ty}`;
}

// ─── renderDiagram ───────────────────────────────────────────────────────────

export function renderDiagram(svgElement, layout, callbacks) {
  const svg = d3.select(svgElement);
  svg.selectAll('*').interrupt();
  const t = svg.transition().duration(500).ease(d3.easeCubicInOut);
  if (!svgElement.__workflowMarkerId) {
    markerInstanceCounter += 1;
    svgElement.__workflowMarkerId = `wf-arrow-${markerInstanceCounter}`;
  }
  const markerPrefix = svgElement.__workflowMarkerId;
  const internalArrowId = `${markerPrefix}-internal`;
  const externalArrowId = `${markerPrefix}-external`;

  svg.attr('viewBox', layout.viewBox);

  // Defs
  let defs = svg.select('defs');
  if (defs.empty()) defs = svg.append('defs');

  // End arrows (point forward)
  if (defs.select(`#${internalArrowId}`).empty()) {
    defs.append('marker').attr('id', internalArrowId)
      .attr('viewBox', '0 0 10 10').attr('refX', 9.5).attr('refY', 5)
      .attr('markerWidth', 6).attr('markerHeight', 6).attr('orient', 'auto')
      .attr('markerUnits', 'strokeWidth')
      .append('path').attr('d', 'M 0 0 L 10 5 L 0 10 z').attr('fill', '#5a9bd5');
  }
  if (defs.select(`#${externalArrowId}`).empty()) {
    defs.append('marker').attr('id', externalArrowId)
      .attr('viewBox', '0 0 10 10').attr('refX', 9.5).attr('refY', 5)
      .attr('markerWidth', 6).attr('markerHeight', 6).attr('orient', 'auto')
      .attr('markerUnits', 'strokeWidth')
      .append('path').attr('d', 'M 0 0 L 10 5 L 0 10 z').attr('fill', '#d4a03c');
  }

  if (defs.select(`#${markerPrefix}-start`).empty()) {
    defs.append('marker').attr('id', `${markerPrefix}-start`)
      .attr('viewBox', '0 0 10 10').attr('refX', 9.5).attr('refY', 5)
      .attr('markerWidth', 6).attr('markerHeight', 6).attr('orient', 'auto')
      .attr('markerUnits', 'strokeWidth')
      .append('path').attr('d', 'M 0 0 L 10 5 L 0 10 z').attr('fill', '#3d8b3d');
  }

  let rootG = svg.select('g.wf-root');
  if (rootG.empty()) rootG = svg.append('g').attr('class', 'wf-root');

  // ─── Lane labels ───
  const laneSel = rootG.selectAll('text.wf-lane-label').data(layout.lanes || [], d => d.text);
  laneSel.enter().append('text').attr('class', 'wf-lane-label').attr('text-anchor', 'middle')
    .merge(laneSel)
    .attr('x', d => d.x).attr('y', d => d.y)
    .text(d => d.text);
  laneSel.exit().remove();

  // ─── Groups (process + subprocess boxes) ───
  const processGroups = layout.groups.filter(g => !g.isSubprocess);
  const subGroups = layout.groups.filter(g => g.isSubprocess);

  // Process groups
  const groupSel = rootG.selectAll('g.wf-group')
    .data(processGroups, d => d.processId);

  const groupEnter = groupSel.enter().append('g')
    .attr('class', 'wf-group').attr('opacity', 0);
  groupEnter.append('rect').attr('class', 'wf-group-bg');
  groupEnter.append('rect').attr('class', 'wf-group-header');
  groupEnter.append('text').attr('class', 'wf-group-label');
  groupEnter.append('text').attr('class', 'wf-group-badge');
  groupEnter.append('text').attr('class', 'wf-group-helper');
  groupEnter.append('text').attr('class', 'wf-group-toggle');

  const groupMerge = groupEnter.merge(groupSel);
  groupMerge.transition(t).attr('opacity', 1);

  groupMerge.select('rect.wf-group-bg').transition(t)
    .attr('x', d => d.x).attr('y', d => d.y)
    .attr('width', d => d.width).attr('height', d => d.height)
    .attr('fill', d => d.color.bg).attr('stroke', d => d.color.border)
    .attr('opacity', d => d.collapsed ? 0 : 0.5);

  groupMerge.select('rect.wf-group-header').transition(t)
    .attr('x', d => d.x).attr('y', d => d.y)
    .attr('width', d => d.width).attr('height', GROUP_HEADER_HEIGHT)
    .attr('fill', d => d.color.header).attr('stroke', d => d.color.border)
    .attr('opacity', d => d.collapsed ? 0 : 1);

  groupMerge.select('rect.wf-group-header')
    .style('cursor', 'pointer')
    .on('click', (event, d) => callbacks.onGroupClick(d.processId));

  groupMerge.select('text.wf-group-label').transition(t)
    .attr('x', d => d.x + 12).attr('y', d => d.y + 21)
    .attr('opacity', d => d.collapsed ? 0 : 1)
    .text(d => d.processName || d.processId);

  groupMerge.select('text.wf-group-badge').transition(t)
    .attr('x', d => {
      const labelLength = (d.processName || d.processId || '').length;
      return d.x + 12 + Math.min(260, Math.max(155, labelLength * 8 + 16));
    })
    .attr('y', d => d.y + 21)
    .attr('opacity', d => d.collapsed || !d.isRollup ? 0 : 1)
    .text(d => d.rollupBadge ? `[${d.rollupBadge}]` : '');

  groupMerge.select('text.wf-group-helper').transition(t)
    .attr('x', d => d.x + 12).attr('y', d => d.y + GROUP_HEADER_HEIGHT + 18)
    .attr('opacity', d => d.collapsed || !d.rollupHelperText ? 0 : 1)
    .text(d => d.rollupHelperText || '');

  groupMerge.select('text.wf-group-toggle').transition(t)
    .attr('x', d => d.x + d.width - 70).attr('y', d => d.y + 21)
    .attr('opacity', d => d.collapsed ? 0 : 1)
    .text('[ collapse ]');

  groupSel.exit().transition(t).attr('opacity', 0).remove();

  // Subprocess groups
  const subSel = rootG.selectAll('g.wf-subgroup')
    .data(subGroups, d => d.processId);

  const subEnter = subSel.enter().append('g')
    .attr('class', 'wf-subgroup').attr('opacity', 0);
  subEnter.append('rect').attr('class', 'wf-subgroup-bg');
  subEnter.append('rect').attr('class', 'wf-subgroup-header');
  subEnter.append('text').attr('class', 'wf-subgroup-label');
  subEnter.append('text').attr('class', 'wf-subgroup-toggle');

  const subMerge = subEnter.merge(subSel);
  subMerge.transition(t).attr('opacity', 1);

  subMerge.select('rect.wf-subgroup-bg').transition(t)
    .attr('x', d => d.x).attr('y', d => d.y)
    .attr('width', d => d.width).attr('height', d => d.height)
    .attr('fill', d => d.color.bg).attr('stroke', d => d.color.border)
    .attr('opacity', 0.3);

  subMerge.select('rect.wf-subgroup-header').transition(t)
    .attr('x', d => d.x).attr('y', d => d.y)
    .attr('width', d => d.width).attr('height', SUB_HEADER_HEIGHT)
    .attr('fill', d => d.color.header).attr('stroke', d => d.color.border);

  subMerge.select('rect.wf-subgroup-header')
    .style('cursor', 'pointer')
    .on('click', (event, d) => callbacks.onSubprocessClick(d.processId));

  subMerge.select('text.wf-subgroup-label').transition(t)
    .attr('x', d => d.x + 10).attr('y', d => d.y + 19)
    .text(d => d.processName || d.processId);

  subMerge.select('text.wf-subgroup-toggle').transition(t)
    .attr('x', d => d.x + d.width - 65).attr('y', d => d.y + 19)
    .text('[ collapse ]');

  subSel.exit().transition(t).attr('opacity', 0).remove();

  // ─── Edges ───
  assignEdgePorts(layout.edges);
  const edgeSel = rootG.selectAll('g.wf-edge')
    .data(layout.edges, d => `${d.source}\u2192${d.target}`);

  const edgeEnter = edgeSel.enter().append('g');
  edgeEnter.append('path').attr('opacity', 0);
  edgeEnter.append('text').attr('class', 'wf-edge-label').attr('text-anchor', 'middle');

  const edgeMerge = edgeEnter.merge(edgeSel);
  edgeMerge.attr('class', d =>
    `wf-edge wf-edge-${d.edgeType}${d.isPrimaryFlow ? ' wf-edge-primary' : ' wf-edge-special'}${d.isSelectedEdge ? ' wf-edge-selected' : ''}${d.isSideTransition ? ' wf-edge-side' : ''}${d.showAllTransitions ? ' wf-edge-full-view' : ''}${d.bidirectional ? ' wf-bidirectional' : ''}`);

  edgeMerge.select('path')
    .on('mouseenter', (event, d) => callbacks.onEdgeHover(d, event))
    .on('mouseleave', () => callbacks.onEdgeLeave())
    .transition(t)
    .attr('opacity', d => {
      if (d.isSelectedEdge || d.isPrimaryFlow || d.isTrigger) return 1;
      if (d.showAllTransitions && d.isSideTransition) return 0.16;
      if (d.showAllTransitions) return 0.28;
      return 0.45;
    })
    .attr('d', edgePath)
    .attr('stroke-width', d => {
      if (d.isPrimaryFlow || d.isSelectedEdge) return 2.25;
      if (d.showAllTransitions && d.isSideTransition) return 1;
      return d.bidirectional ? 1.75 : 1.35;
    })
    .attr('marker-end', d => `url(#${markerPrefix}-${d.edgeType})`);

  // The condition a handoff or start arrow fires on, e.g. "research articles"
  const placeEdgeLabels = (selection) => selection
    .attr('x', d => edgeLabelPosition(d).x)
    .attr('y', d => edgeLabelPosition(d).y)
    .text(d => d.label || '');
  edgeMerge.select('text.wf-edge-label').call(placeEdgeLabels);

  edgeSel.exit().transition(t).attr('opacity', 0).remove();

  // ─── Drag behavior ───
  function makeDrag() {
    let dragStartX, dragStartY, didDrag;
    return d3.drag()
      .on('start', function (event) {
        dragStartX = event.x; dragStartY = event.y; didDrag = false;
        d3.select(this).classed('wf-dragging', true).raise();
      })
      .on('drag', function (event, d) {
        if (Math.abs(event.x - dragStartX) > 3 || Math.abs(event.y - dragStartY) > 3) didDrag = true;
        d.x = event.x; d.y = event.y;
        d3.select(this).attr('transform', `translate(${d.x}, ${d.y})`);
        assignEdgePorts(layout.edges);
        edgeMerge.select('path').attr('d', edgePath);
        edgeMerge.select('text.wf-edge-label').call(placeEdgeLabels);
      })
      .on('end', function (event, d) {
        d3.select(this).classed('wf-dragging', false);
        if (!didDrag) {
          if (d.type === 'summary') callbacks.onGroupClick(d.processId);
          else if (d.type === 'subsummary') {
            // Side-state subgroups (Failed, Blocked, Unavailable, won't..., Status TBD)
            // are shown as context by default. Clicking them should focus their
            // incoming/outgoing transitions instead of expanding into extra detail.
            if (d.isMainFlow === false && callbacks.onNodeClick) {
              callbacks.onNodeClick(d.id);
            } else {
              callbacks.onSubprocessClick(d.subprocessId);
            }
          }
        }
      });
  }

  // ─── Normal nodes ───
  const normalNodes = layout.nodes.filter(n => n.type === 'normal');
  const nodeSel = rootG.selectAll('g.wf-node')
    .data(normalNodes, d => d.id);

  const nodeEnter = nodeSel.enter().append('g')
    .attr('class', 'wf-node').attr('opacity', 0)
    .attr('transform', d => `translate(${d.x}, ${d.y})`);
  nodeEnter.append('rect');
  nodeEnter.append('text').attr('class', 'wf-node-label');

  const nodeMerge = nodeEnter.merge(nodeSel);
  nodeMerge.each(function () {
    const node = d3.select(this);
    if (node.select('text.wf-node-label').empty()) {
      node.select('text').attr('class', 'wf-node-label');
    }
    node.selectAll('text.wf-node-hint').remove();
  });
  nodeMerge.transition(t).attr('opacity', 1)
    .attr('transform', d => `translate(${d.x}, ${d.y})`);
  nodeMerge.select('rect')
    .attr('width', d => d.width).attr('height', d => d.height)
    .attr('fill', d => {
      if (d.isCurrent) return '#fff3cd';  // yellow highlight for current state
      if (d.isSelected) return '#cce5ff'; // blue highlight for selected
      if (d.nodeRole === 'initial') return '#e8f5e8';  // light green
      if (d.nodeRole === 'final') return '#fce8e8';    // light red
      return 'white';
    })
    .attr('stroke', d => {
      if (d.isCurrent) return '#ffc107';  // gold border for current
      if (d.isSelected) return '#0056b3'; // dark blue for selected
      if (d.nodeRole === 'initial') return '#4a9d4a';  // green border
      if (d.nodeRole === 'final') return '#c95b5b';    // red border
      return '#5a9bd5';
    })
    .attr('stroke-width', d => (d.isCurrent || d.isSelected) ? 3 : 1.5);
  nodeMerge.select('text.wf-node-label')
    .attr('x', d => d.width / 2)
    .attr('y', d => d.height / 2 + (d.compact ? 3 : 4))
    .attr('text-anchor', 'middle')
    .attr('font-size', d => d.compact ? '10px' : '12px')
    .text(d => {
      const displayName = d.shortName || d.name;
      const charWidth = d.compact ? 6 : 7;
      const max = Math.floor(d.width / charWidth);
      return displayName.length > max ? displayName.slice(0, max - 1) + '\u2026' : displayName;
    });
  nodeMerge
    .on('mouseenter', (event, d) => callbacks.onNodeHover(d, event))
    .on('mouseleave', () => callbacks.onNodeLeave())
    .on('click', (event, d) => {
      if (callbacks.onNodeClick) callbacks.onNodeClick(d.id);
    })
    .style('cursor', 'pointer');
  nodeMerge.call(makeDrag());
  nodeSel.exit().transition(t).attr('opacity', 0).remove();

  // ─── Summary nodes (collapsed process) ───
  const summaryNodes = layout.nodes.filter(n => n.type === 'summary');
  const sumSel = rootG.selectAll('g.wf-summary-node')
    .data(summaryNodes, d => d.id);

  const sumEnter = sumSel.enter().append('g')
    .attr('class', 'wf-summary-node').attr('opacity', 0)
    .attr('transform', d => `translate(${d.x}, ${d.y})`);
  sumEnter.append('rect');
  sumEnter.append('text').attr('class', 'wf-summary-label');
  sumEnter.append('text').attr('class', 'wf-summary-count');

  const sumMerge = sumEnter.merge(sumSel);
  sumMerge.transition(t).attr('opacity', 1)
    .attr('transform', d => `translate(${d.x}, ${d.y})`);
  sumMerge.select('rect').attr('width', d => d.width).attr('height', d => d.height);
  sumMerge.select('text.wf-summary-label')
    .attr('x', d => d.width / 2).attr('y', d => d.height / 2)
    .attr('text-anchor', 'middle').text(d => d.name);
  sumMerge.select('text.wf-summary-count')
    .attr('x', d => d.width / 2).attr('y', d => d.height / 2 + 16)
    .attr('text-anchor', 'middle')
    .text(d => d.rollupSummaryText || (d.subprocessCount > 0
      ? `(${d.subprocessCount} sub-processes)`
      : `(${d.nodeCount} states)`));
  sumMerge
    .on('mouseenter', (event, d) => callbacks.onNodeHover(d, event))
    .on('mouseleave', () => callbacks.onNodeLeave());
  sumMerge.call(makeDrag());
  sumSel.exit().transition(t).attr('opacity', 0).remove();

  // ─── Sub-summary nodes (collapsed subprocess) ───
  const subSummaryNodes = layout.nodes.filter(n => n.type === 'subsummary');
  const ssSel = rootG.selectAll('g.wf-subsummary-node')
    .data(subSummaryNodes, d => d.id);

  const ssEnter = ssSel.enter().append('g')
    .attr('class', 'wf-subsummary-node').attr('opacity', 0)
    .attr('transform', d => `translate(${d.x}, ${d.y})`);
  ssEnter.append('rect');
  ssEnter.append('text').attr('class', 'wf-summary-label');
  ssEnter.append('text').attr('class', 'wf-summary-count');

  const ssMerge = ssEnter.merge(ssSel);
  ssMerge.transition(t).attr('opacity', 1)
    .attr('transform', d => `translate(${d.x}, ${d.y})`);
  ssMerge.select('rect').attr('width', d => d.width).attr('height', d => d.height);
  ssMerge.select('text.wf-summary-label')
    .attr('x', d => d.width / 2).attr('y', d => d.height / 2)
    .attr('text-anchor', 'middle').text(d => d.name);
  ssMerge.select('text.wf-summary-count')
    .attr('x', d => d.width / 2).attr('y', d => d.height / 2 + 14)
    .attr('text-anchor', 'middle')
    .text(d => `(${d.nodeCount} states)`);
  ssMerge
    .on('mouseenter', (event, d) => callbacks.onNodeHover(d, event))
    .on('mouseleave', () => callbacks.onNodeLeave());
  ssMerge.call(makeDrag());
  ssSel.exit().transition(t).attr('opacity', 0).remove();

  // ─── Start nodes (events that begin workflows) ───
  const startNodes = layout.nodes.filter(n => n.type === 'start');
  const startSel = rootG.selectAll('g.wf-start-node')
    .data(startNodes, d => d.id);

  const startEnter = startSel.enter().append('g')
    .attr('class', 'wf-start-node').attr('opacity', 0)
    .attr('transform', d => `translate(${d.x}, ${d.y})`);
  startEnter.append('rect');
  startEnter.append('text').attr('class', 'wf-start-label');

  const startMerge = startEnter.merge(startSel);
  startMerge.transition(t).attr('opacity', 1)
    .attr('transform', d => `translate(${d.x}, ${d.y})`);
  startMerge.select('rect')
    .attr('width', d => d.width).attr('height', d => d.height)
    .attr('rx', d => d.height / 2).attr('ry', d => d.height / 2);
  startMerge.select('text.wf-start-label')
    .attr('x', d => d.width / 2).attr('y', d => d.height / 2 + 5)
    .attr('text-anchor', 'middle').text(d => d.name);
  startMerge
    .on('mouseenter', (event, d) => callbacks.onNodeHover(d, event))
    .on('mouseleave', () => callbacks.onNodeLeave());
  startMerge.call(makeDrag());
  startSel.exit().transition(t).attr('opacity', 0).remove();
}

// ─── setupZoom ───────────────────────────────────────────────────────────────

export function setupZoom(svgElement, onTransformChange) {
  const svg = d3.select(svgElement);
  let rootG = svg.select('g.wf-root');
  if (rootG.empty()) rootG = svg.append('g').attr('class', 'wf-root');

  const zoomBehavior = d3.zoom()
    .scaleExtent([0.2, 4])
    .filter(event => {
      if (event.type === 'wheel') return true;
      if (event.type === 'mousedown' || event.type === 'touchstart') {
        let el = event.target;
        while (el && el !== svgElement) {
          const cls = (el.getAttribute && el.getAttribute('class')) || '';
          if (cls.includes('wf-node') || cls.includes('wf-summary-node') || cls.includes('wf-subsummary-node') ||
              cls.includes('wf-start-node')) {
            return false;
          }
          el = el.parentNode;
        }
      }
      return true;
    })
    .on('zoom', (event) => {
      rootG.attr('transform', event.transform);
      if (onTransformChange) {
        onTransformChange(event.transform);
      }
    });

  svg.call(zoomBehavior);

  return () => {
    svg.transition().duration(500).call(zoomBehavior.transform, d3.zoomIdentity);
    if (onTransformChange) {
      onTransformChange(d3.zoomIdentity);
    }
  };
}
