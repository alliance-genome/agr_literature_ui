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

/**
 * Check if a state is considered "internal" (for hiding option)
 */
function isInternalState(stateName) {
  const category = classifyState(stateName);
  return category === 'internal';
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
    nodeMap.set(node.tag, {
      id: node.tag,
      name: node.tag_name,
      processId: node.workflow_process,
      processName: node.workflow_process_name,
      subprocessId: node.workflow_subprocess || null,
      subprocessName: node.workflow_subprocess_name || null,
      transitions: node.transitions || [],
    });

    const pid = node.workflow_process || '__unassigned__';
    const pname = node.workflow_process_name || 'Unassigned';
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

// Cross-workflow trigger definitions (state-to-state triggers between processes)
// These define which state in one process triggers which state in another
const CROSS_WORKFLOW_TRIGGERS = [
  {
    fromProcess: 'ATP:0000140',  // file upload
    fromState: 'ATP:0000134',    // files uploaded
    toProcess: 'ATP:0000161',    // text conversion
    toState: 'ATP:0000162',      // text conversion needed
    keepWhenNodeSelected: true,
  },
  {
    fromProcess: 'ATP:0000161',  // text conversion
    fromState: 'ATP:0000163',    // file converted to text
    toProcess: 'ATP:0000354',    // email extraction
    toState: 'ATP:0000358',      // email extraction needed
    keepWhenNodeSelected: true,
  },
  {
    fromProcess: 'ATP:0000161',  // text conversion
    fromState: 'ATP:0000163',    // file converted to text
    toProcess: 'ATP:0000165',    // reference classification
    toState: 'ATP:0000166',      // reference classification needed
    keepWhenNodeSelected: true,
  },
  {
    fromProcess: 'ATP:0000161',  // text conversion
    fromState: 'ATP:0000163',    // file converted to text
    toProcess: 'ATP:0000172',    // entity extraction
    toState: 'ATP:0000173',      // entity extraction needed
    keepWhenNodeSelected: true,
  },
];

// Custom row layout for specific MODs (processId -> row number)
// Processes in same row will be arranged horizontally
const CUSTOM_GROUP_LAYOUT = {
  'ATP:0000140': { row: 0, order: 0 },  // file upload - row 0, first
  'ATP:0000273': { row: 0, order: 1 },  // manual indexing - row 0, second
  'ATP:0000161': { row: 1, order: 0 },  // text conversion - row 1, centered
  'ATP:0000172': { row: 2, order: 0 },  // entity extraction - row 2, first
  'ATP:0000165': { row: 2, order: 1 },  // reference classification - row 2, second
  'ATP:0000354': { row: 2, order: 2 },  // email extraction - row 2, third
};

// Gap between boxes in the same row (smaller = closer together)
const ROW_BOX_GAP = 10;

function orderGroups(processGroups, edges, nodeToProcess) {
  const groupIds = [...processGroups.keys()];
  if (groupIds.length <= 1) return groupIds;

  // Check if we have custom layout for these groups
  const hasCustomLayout = groupIds.some(gid => CUSTOM_GROUP_LAYOUT[gid]);

  if (hasCustomLayout) {
    // Sort by custom row, then order within row
    groupIds.sort((a, b) => {
      const layoutA = CUSTOM_GROUP_LAYOUT[a] || { row: 99, order: 99 };
      const layoutB = CUSTOM_GROUP_LAYOUT[b] || { row: 99, order: 99 };
      if (layoutA.row !== layoutB.row) return layoutA.row - layoutB.row;
      return layoutA.order - layoutB.order;
    });
    return groupIds;
  }

  // Default: use flow score
  const flowScore = new Map();
  for (const gid of groupIds) flowScore.set(gid, 0);

  for (const e of edges) {
    const sg = nodeToProcess.get(e.source);
    const tg = nodeToProcess.get(e.target);
    if (sg && tg && sg !== tg) {
      flowScore.set(sg, (flowScore.get(sg) || 0) - 1);
      flowScore.set(tg, (flowScore.get(tg) || 0) + 1);
    }
  }

  groupIds.sort((a, b) => (flowScore.get(a) || 0) - (flowScore.get(b) || 0));
  return groupIds;
}

// Get row groups for horizontal layout
function getRowGroups(orderedGroupIds) {
  const rows = new Map(); // row number -> [groupIds]
  for (const gid of orderedGroupIds) {
    const layout = CUSTOM_GROUP_LAYOUT[gid];
    const rowNum = layout ? layout.row : 99;
    if (!rows.has(rowNum)) rows.set(rowNum, []);
    rows.get(rowNum).push(gid);
  }
  // Sort rows by row number and return as array of arrays
  const sortedRows = [...rows.entries()].sort((a, b) => a[0] - b[0]);
  return sortedRows.map(([, ids]) => ids);
}

// ─── Layout constants ────────────────────────────────────────────────────────

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
 * @param {boolean} options.hideInternalStates - Hide internal/status states
 * @param {string} options.selectedNodeId - Node ID to highlight and show edges for
 * @param {string} options.currentStateId - Current state to highlight (e.g., for a reference)
 */
export function computeLayout(tagData, collapsedProcesses, expandedSubprocesses, width, height, options = {}) {
  const { hideInternalStates = false, selectedNodeId = null, currentStateId = null } = options;

  if (!tagData || tagData.length === 0) {
    return { nodes: [], edges: [], groups: [], viewBox: '0 0 800 600', crossWorkflowTriggers: [] };
  }

  const { nodeMap, edges: allEdges, processGroups, nodeToProcess } = buildGraph(tagData);
  const orderedGroupIds = orderGroups(processGroups, allEdges, nodeToProcess);
  const rowGroups = getRowGroups(orderedGroupIds);

  const layoutNodes = [];
  const layoutGroups = [];
  const nodeToLayoutId = new Map();
  const processIdToSummaryId = new Map(); // Track summary IDs for cross-workflow edges

  let currentY = TOP_PADDING;

  // Process groups row by row
  for (const rowGroupIds of rowGroups) {
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

      if (collapsedProcesses.has(gid)) {
        // ─── Collapsed process: single summary node ───
        const summaryId = `summary:${gid}`;
        const sx = currentX;
        const totalNodes = pg.directNodeIds.length +
          [...pg.subprocesses.values()].reduce((s, sp) => s + sp.nodeIds.length, 0);

        layoutNodes.push({
          id: summaryId,
          name: pg.processName || gid,
          x: sx, y: currentY,
          width: SUMMARY_WIDTH, height: SUMMARY_HEIGHT,
          type: 'summary',
          processId: gid, processName: pg.processName,
          nodeCount: totalNodes,
          subprocessCount: pg.subprocesses.size,
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
          const result = layoutNodeSet(ids, internalEdges, nodeMap, innerY, width, gid, pg.processName, color, nodeToLayoutId, { hideInternalStates, selectedNodeId, currentStateId });
          layoutNodes.push(...result.nodes);
          maxWidth = Math.max(maxWidth, result.width);
          innerY = result.bottomY + SUB_GAP;
        }

        // Subprocesses
        for (const sp of pg.subprocesses.values()) {
          const spColor = getGroupColor(sp.subprocessId);

          if (!expandedSubprocesses.has(sp.subprocessId)) {
            // Collapsed subprocess: summary node
            const spSummaryId = `subsummary:${sp.subprocessId}`;
            const sx = width / 2 - SUB_SUMMARY_WIDTH / 2;

            layoutNodes.push({
              id: spSummaryId,
              name: sp.subprocessName || sp.subprocessId,
              x: sx, y: innerY,
              width: SUB_SUMMARY_WIDTH, height: SUB_SUMMARY_HEIGHT,
              type: 'subsummary',
              processId: gid, processName: pg.processName,
              subprocessId: sp.subprocessId, subprocessName: sp.subprocessName,
              nodeCount: sp.nodeIds.length,
              color: spColor,
            });

            for (const nid of sp.nodeIds) nodeToLayoutId.set(nid, spSummaryId);

            maxWidth = Math.max(maxWidth, SUB_SUMMARY_WIDTH + GROUP_PADDING * 2);
            innerY += SUB_SUMMARY_HEIGHT + SUB_GAP;
          } else {
            // Expanded subprocess: show nodes with sub-header
            const subHeaderY = innerY;
            innerY += SUB_HEADER_HEIGHT + 8;

            const ids = sp.nodeIds.filter(id => nodeMap.has(id));
            const internalEdges = allEdges.filter(
              e => ids.includes(e.source) && ids.includes(e.target)
            );
            const result = layoutNodeSet(ids, internalEdges, nodeMap, innerY, width, gid, pg.processName, color, nodeToLayoutId, { hideInternalStates, selectedNodeId, currentStateId });
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
  const edgeMap = new Map(); // "A→B" (sorted key) -> edge object
  for (const e of allEdges) {
    const src = nodeToLayoutId.get(e.source);
    const tgt = nodeToLayoutId.get(e.target);
    if (!src || !tgt || src === tgt) continue;

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
    const isSelectedEdge = selectedNodeId && (src === selectedNodeId || tgt === selectedNodeId);
    if (selectedNodeId && !isSelectedEdge && !isPrimaryFlow) {
      continue;
    }
    if (!selectedNodeId && edgeType === 'internal' && !isPrimaryFlow) {
      continue;
    }

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

  // ─── Add cross-workflow trigger edges ───
  // These show process-to-process triggers when source or target process is collapsed
  for (const trigger of CROSS_WORKFLOW_TRIGGERS) {
    const fromSummaryId = processIdToSummaryId.get(trigger.fromProcess);
    const toSummaryId = processIdToSummaryId.get(trigger.toProcess);

    // Only add if at least one of the processes is collapsed (showing summary)
    if (!fromSummaryId && !toSummaryId) continue;

    // Determine the actual source and target nodes
    const sourceProcessName = processGroups.get(trigger.fromProcess)?.processName;
    const targetProcessName = processGroups.get(trigger.toProcess)?.processName;
    let sourceId = fromSummaryId || nodeToLayoutId.get(trigger.fromState) ||
      findProcessLayoutNodeId(trigger.fromProcess, sourceProcessName, layoutNodes);
    let targetId = toSummaryId || nodeToLayoutId.get(trigger.toState) ||
      findProcessLayoutNodeId(trigger.toProcess, targetProcessName, layoutNodes);

    if (!sourceId || !targetId || sourceId === targetId) continue;
    if (selectedNodeId && sourceId !== selectedNodeId && targetId !== selectedNodeId && !trigger.keepWhenNodeSelected) continue;

    // Get names for the trigger states
    const fromStateName = nodeMap.get(trigger.fromState)?.name || trigger.fromState;
    const toStateName = nodeMap.get(trigger.toState)?.name || trigger.toState;

    const normalCanonKey = `${sourceId}\u2194${targetId}`;
    const triggerKey = `trigger:${trigger.fromState}\u2192${trigger.toState}:${sourceId}\u2192${targetId}`;
    if (edgeMap.has(triggerKey)) continue; // Don't duplicate
    if (edgeMap.has(normalCanonKey)) {
      const existingEdge = edgeMap.get(normalCanonKey);
      existingEdge.edgeType = 'external';
      existingEdge.isTrigger = true;
      existingEdge.isPrimaryFlow = !!trigger.keepWhenNodeSelected;
      existingEdge.data = {
        ...existingEdge.data,
        sourceName: fromStateName,
        to_name: toStateName,
        transition_type: 'trigger',
      };
      continue;
    }

    const srcNode = layoutNodes.find(n => n.id === sourceId);
    const tgtNode = layoutNodes.find(n => n.id === targetId);
    if (!srcNode || !tgtNode) continue;

    const triggerEdge = {
      source: sourceId,
      target: targetId,
      sourceNode: srcNode,
      targetNode: tgtNode,
      edgeType: 'external',
      isTrigger: true,
      isPrimaryFlow: !!trigger.keepWhenNodeSelected,
      data: {
        sourceName: fromStateName,
        to_name: toStateName,
        transition_type: 'trigger',
        condition: `${fromStateName} triggers ${toStateName}`,
        requirements: [],
        actions: [`Sets ${toStateName}`],
      },
      bidirectional: false,
      reverseData: null,
      _directionKeys: new Set([`${sourceId}\u2192${targetId}`]),
    };
    edgeMap.set(triggerKey, triggerEdge);
    layoutEdges.push(triggerEdge);
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
  if (!isFinite(minX)) { minX = 0; minY = 0; maxX = 800; maxY = 600; }

  const viewBox = `${minX} ${minY} ${maxX - minX} ${maxY - minY}`;
  for (const e of layoutEdges) {
    e.sourceNode = layoutNodes.find(n => n.id === e.source);
    e.targetNode = layoutNodes.find(n => n.id === e.target);
  }

  return { nodes: layoutNodes, edges: layoutEdges, groups: layoutGroups, viewBox, crossWorkflowTriggers: CROSS_WORKFLOW_TRIGGERS };
}

/**
 * Layout a set of nodes with main flow centered and side states on left/right.
 * Main flow: initial (needed) → progress → complete (top to bottom, centered)
 * Side states: failed/blocked/unavailable (positioned to left or right)
 * Returns { nodes, width, height, bottomY }.
 */
function layoutNodeSet(nodeIds, edges, nodeMap, startY, containerWidth, processId, processName, color, nodeToLayoutId, options = {}) {
  const { hideInternalStates = false, selectedNodeId = null, currentStateId = null } = options;

  // Filter out nodes already placed by another group/subprocess
  let ids = nodeIds.filter(id => !nodeToLayoutId.has(id));

  // Optionally filter out internal states
  if (hideInternalStates) {
    ids = ids.filter(id => {
      const nd = nodeMap.get(id);
      return nd && !isInternalState(nd.name);
    });
  }

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
  const leftSideNodes = [];  // blocked/unavailable - left side
  const rightSideNodes = []; // failed - right side (or could be left too)

  for (const nid of ids) {
    const nd = nodeMap.get(nid);
    const category = classifyState(nd?.name);

    if (category === 'initial' || category === 'progress' || category === 'complete') {
      mainFlowNodes.push({ id: nid, category, priority: STATE_PRIORITY[category] });
    } else if (category === 'blocked') {
      leftSideNodes.push({ id: nid, category });
    } else if (category === 'failed') {
      rightSideNodes.push({ id: nid, category });
    } else {
      // Other states go to left side
      leftSideNodes.push({ id: nid, category });
    }
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
  const sideStartY = startY + (mainFlowHeight / 2) - ((leftSideNodes.length + rightSideNodes.length) * (nh + yGap) / 4);

  // Layout left side nodes (unavailable, blocked, other)
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

  // Layout right side nodes (failed)
  let rightY = Math.max(startY, sideStartY);
  const rightX = centerX + nw + sideXGap;
  for (const item of rightSideNodes) {
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
      x: rightX,
      y: rightY,
      width: nw, height: nh,
      type: 'normal',
      compact,
      processId, processName, color,
      transitions: nd.transitions,
    });
    nodeToLayoutId.set(nid, nid);
    rightY += nh + yGap;
  }

  // Calculate total dimensions
  const maxY = Math.max(mainY, leftY, rightY) - yGap;
  const contentHeight = maxY - startY;

  // Calculate width: include side columns if present
  let totalWidth = nw; // main flow width
  if (leftSideNodes.length > 0) totalWidth += nw + sideXGap;
  if (rightSideNodes.length > 0) totalWidth += nw + sideXGap;

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

function edgePath(d) {
  const sn = d.sourceNode;
  const tn = d.targetNode;
  const gap = 5;  // Gap between arrow and target box top

  // Spread ports across 60% of node width
  const sOff = sn.width * 0.6 * (d._sPort || 0);
  const tOff = tn.width * 0.6 * (d._tPort || 0);

  // Check if nodes are roughly on the same row (horizontal layout)
  const sameRow = Math.abs(sn.y - tn.y) < sn.height;

  if (sameRow) {
    // Horizontal edge: exit from right side, enter from left side
    const isLeftToRight = sn.x < tn.x;
    const sx = isLeftToRight ? sn.x + sn.width : sn.x;
    const sy = sn.y + sn.height / 2;
    const tx = isLeftToRight ? tn.x : tn.x + tn.width;
    const ty = tn.y + tn.height / 2;
    const midX = (sx + tx) / 2;
    // Slight curve downward for visual distinction
    const curveY = Math.max(sy, ty) + 30;
    return `M ${sx} ${sy} Q ${midX} ${curveY}, ${tx} ${ty}`;
  }

  // Vertical edge: exit from bottom, enter from top
  const sx = sn.x + sn.width / 2 + sOff;
  const sy = sn.y + sn.height;
  const tx = tn.x + tn.width / 2 + tOff;
  const ty = tn.y - gap;

  // If target is above source (back-edge), route around with a wider curve
  if (tn.y < sn.y + sn.height) {
    const loopOut = Math.max(Math.abs(sx - tx), 80) + 40;
    const side = sx <= tx ? -1 : 1; // curve left or right to avoid overlap
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

  let rootG = svg.select('g.wf-root');
  if (rootG.empty()) rootG = svg.append('g').attr('class', 'wf-root');

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

  const edgeMerge = edgeEnter.merge(edgeSel);
  edgeMerge.attr('class', d =>
    `wf-edge wf-edge-${d.edgeType}${d.isPrimaryFlow ? ' wf-edge-primary' : ' wf-edge-special'}${d.isSelectedEdge ? ' wf-edge-selected' : ''}${d.bidirectional ? ' wf-bidirectional' : ''}`);

  edgeMerge.select('path')
    .on('mouseenter', (event, d) => callbacks.onEdgeHover(d, event))
    .on('mouseleave', () => callbacks.onEdgeLeave())
    .transition(t).attr('opacity', 1)
    .attr('d', edgePath)
    .attr('stroke-width', d => (d.isPrimaryFlow || d.isSelectedEdge) ? 2.25 : d.bidirectional ? 1.75 : 1.35)
    .attr('marker-end', d => `url(#${markerPrefix}-${d.edgeType})`);

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
      })
      .on('end', function (event, d) {
        d3.select(this).classed('wf-dragging', false);
        if (!didDrag) {
          if (d.type === 'summary') callbacks.onGroupClick(d.processId);
          else if (d.type === 'subsummary') callbacks.onSubprocessClick(d.subprocessId);
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
    .text(d => d.subprocessCount > 0
      ? `(${d.subprocessCount} sub-processes)`
      : `(${d.nodeCount} states)`);
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
}

// ─── setupZoom ───────────────────────────────────────────────────────────────

export function setupZoom(svgElement) {
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
          if (cls.includes('wf-node') || cls.includes('wf-summary-node') || cls.includes('wf-subsummary-node')) {
            return false;
          }
          el = el.parentNode;
        }
      }
      return true;
    })
    .on('zoom', (event) => {
      rootG.attr('transform', event.transform);
    });

  svg.call(zoomBehavior);

  return () => {
    svg.transition().duration(500).call(zoomBehavior.transform, d3.zoomIdentity);
  };
}
