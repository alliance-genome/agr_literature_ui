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

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getGroupColor(processId) {
  return GROUP_COLORS[hashString(processId) % GROUP_COLORS.length];
}

// ─── Data transformation: API response → graph structures ────────────────────

function buildGraph(tagData) {
  const nodeMap = new Map();
  const edges = [];
  const processGroups = new Map();

  for (const node of tagData) {
    nodeMap.set(node.tag, {
      id: node.tag,
      name: node.tag_name,
      processId: node.workflow_process,
      processName: node.workflow_process_name,
      transitions: node.transitions || [],
    });

    const pid = node.workflow_process || '__unassigned__';
    const pname = node.workflow_process_name || 'Unassigned';
    if (!processGroups.has(pid)) {
      processGroups.set(pid, {
        processId: pid,
        processName: pname,
        nodeIds: [],
      });
    }
    processGroups.get(pid).nodeIds.push(node.tag);

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

  return { nodeMap, edges, processGroups };
}

// ─── Graph helpers for progressive expansion ─────────────────────────────────

/**
 * Build parent/children maps for a set of nodes and edges.
 */
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

/**
 * Given a group's nodes, edges, and the set of expanded node IDs,
 * determine which nodes are visible and which are expandable.
 *
 * Visible nodes: roots (no parents) are always visible.
 * For any node in expandedNodes, its direct children become visible.
 *
 * Returns { visibleIds: string[], hiddenChildCount: Map<nodeId, number> }
 */
function computeVisibleNodes(groupNodeIds, internalEdges, expandedNodes) {
  const { children, parents } = buildAdjacency(groupNodeIds, internalEdges);

  // Roots: nodes with no parents within the group
  const roots = groupNodeIds.filter(id => parents.get(id).length === 0);
  if (roots.length === 0 && groupNodeIds.length > 0) {
    roots.push(groupNodeIds[0]);
  }

  const visible = new Set(roots);

  // BFS: for each expanded node, make its children visible
  const queue = [...roots];
  const visited = new Set(queue);
  while (queue.length > 0) {
    const current = queue.shift();
    if (expandedNodes.has(current)) {
      for (const child of children.get(current) || []) {
        visible.add(child);
        if (!visited.has(child)) {
          visited.add(child);
          queue.push(child);
        }
      }
    }
  }

  // Count hidden descendants for each visible node
  const hiddenChildCount = new Map();
  for (const id of visible) {
    const directChildren = (children.get(id) || []);
    const hiddenCount = directChildren.filter(c => !visible.has(c)).length;
    if (hiddenCount > 0) {
      // Count all descendants reachable from hidden children
      let totalHidden = 0;
      const countQueue = directChildren.filter(c => !visible.has(c));
      const counted = new Set(countQueue);
      while (countQueue.length > 0) {
        totalHidden++;
        const n = countQueue.shift();
        for (const c of children.get(n) || []) {
          if (!counted.has(c) && !visible.has(c)) {
            counted.add(c);
            countQueue.push(c);
          }
        }
      }
      hiddenChildCount.set(id, totalHidden);
    }
  }

  return { visibleIds: [...visible], hiddenChildCount };
}

// ─── Topological layering ────────────────────────────────────────────────────

/**
 * Longest-path layering via BFS.
 * Each node is assigned layer = max depth from any root.
 * Uses a stack guard (not visited guard) to handle cycles without
 * preventing a node from being assigned to a deeper layer.
 */
function assignLayers(nodeIds, edges) {
  const { children, parents } = buildAdjacency(nodeIds, edges);

  const roots = nodeIds.filter(id => parents.get(id).length === 0);
  if (roots.length === 0 && nodeIds.length > 0) {
    roots.push(nodeIds[0]);
  }

  const layers = new Map();

  // BFS approach: process queue, allow depth upgrades, guard cycles per-path
  function dfs(node, depth, stack) {
    const current = layers.get(node);
    // Only continue if we can assign a deeper layer
    if (current !== undefined && depth <= current) return;
    // Cycle detection: don't recurse into a node already on this call stack
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
    if (!layers.has(id)) {
      layers.set(id, 0);
    }
  }

  return layers;
}

// ─── Group ordering ──────────────────────────────────────────────────────────

function orderGroups(processGroups, edges) {
  const groupIds = [...processGroups.keys()];
  if (groupIds.length <= 1) return groupIds;

  const nodeToGroup = new Map();
  for (const [gid, group] of processGroups) {
    for (const nid of group.nodeIds) {
      nodeToGroup.set(nid, gid);
    }
  }

  const flowScore = new Map();
  for (const gid of groupIds) flowScore.set(gid, 0);

  for (const e of edges) {
    const sg = nodeToGroup.get(e.source);
    const tg = nodeToGroup.get(e.target);
    if (sg && tg && sg !== tg) {
      flowScore.set(sg, flowScore.get(sg) - 1);
      flowScore.set(tg, flowScore.get(tg) + 1);
    }
  }

  groupIds.sort((a, b) => flowScore.get(a) - flowScore.get(b));
  return groupIds;
}

// ─── Layout constants ────────────────────────────────────────────────────────

const NODE_WIDTH = 180;
const NODE_HEIGHT = 40;
const SUMMARY_WIDTH = 220;
const SUMMARY_HEIGHT = 50;
const GROUP_PADDING = 30;
const GROUP_HEADER_HEIGHT = 32;
const GROUP_GAP = 40;
const NODE_X_GAP = 30;
const NODE_Y_GAP = 20;

// ─── computeLayout ──────────────────────────────────────────────────────────

/**
 * @param {Array} tagData - raw API response
 * @param {Set} collapsedProcesses - process IDs that are fully collapsed
 * @param {Set} expandedNodes - node IDs whose children should be visible
 * @param {number} width - container width
 * @param {number} height - container height
 */
export function computeLayout(tagData, collapsedProcesses, expandedNodes, width, height) {
  if (!tagData || tagData.length === 0) {
    return { nodes: [], edges: [], groups: [], viewBox: '0 0 800 600' };
  }

  const { nodeMap, edges: allEdges, processGroups } = buildGraph(tagData);
  const orderedGroupIds = orderGroups(processGroups, allEdges);

  // Build a node-to-process lookup for edge classification
  const nodeToProcess = new Map();
  for (const [gid, group] of processGroups) {
    for (const nid of group.nodeIds) {
      nodeToProcess.set(nid, gid);
    }
  }

  const layoutNodes = [];
  const layoutEdges = [];
  const layoutGroups = [];
  const nodeToLayoutId = new Map();

  let currentY = GROUP_GAP;

  for (const gid of orderedGroupIds) {
    const group = processGroups.get(gid);
    const color = getGroupColor(gid);

    if (collapsedProcesses.has(gid)) {
      // --- Collapsed: single summary node ---
      const summaryId = `summary:${gid}`;
      const sx = width / 2 - SUMMARY_WIDTH / 2;

      layoutNodes.push({
        id: summaryId,
        name: group.processName || gid,
        x: sx,
        y: currentY,
        width: SUMMARY_WIDTH,
        height: SUMMARY_HEIGHT,
        type: 'summary',
        processId: gid,
        processName: group.processName,
        nodeCount: group.nodeIds.length,
        color,
      });

      for (const nid of group.nodeIds) {
        nodeToLayoutId.set(nid, summaryId);
      }

      layoutGroups.push({
        processId: gid,
        processName: group.processName,
        collapsed: true,
        x: sx - 10,
        y: currentY - 10,
        width: SUMMARY_WIDTH + 20,
        height: SUMMARY_HEIGHT + 20,
        color,
      });

      currentY += SUMMARY_HEIGHT + GROUP_GAP;
    } else {
      // --- Expanded: progressive node visibility ---
      const groupNodeIds = group.nodeIds.filter(id => nodeMap.has(id));

      const internalEdges = allEdges.filter(
        e => groupNodeIds.includes(e.source) && groupNodeIds.includes(e.target)
      );

      const { visibleIds, hiddenChildCount } = computeVisibleNodes(
        groupNodeIds, internalEdges, expandedNodes
      );

      // Layout only visible nodes
      const visibleEdges = internalEdges.filter(
        e => visibleIds.includes(e.source) && visibleIds.includes(e.target)
      );
      const layers = assignLayers(visibleIds, visibleEdges);

      const layerBuckets = new Map();
      for (const [nid, layer] of layers) {
        if (!layerBuckets.has(layer)) layerBuckets.set(layer, []);
        layerBuckets.get(layer).push(nid);
      }
      const sortedLayers = [...layerBuckets.keys()].sort((a, b) => a - b);

      const groupStartY = currentY + GROUP_HEADER_HEIGHT + GROUP_PADDING;
      let maxRowWidth = 0;

      for (let li = 0; li < sortedLayers.length; li++) {
        const layerKey = sortedLayers[li];
        const nodesInLayer = layerBuckets.get(layerKey);
        const rowWidth = nodesInLayer.length * (NODE_WIDTH + NODE_X_GAP) - NODE_X_GAP;
        maxRowWidth = Math.max(maxRowWidth, rowWidth);

        const startX = width / 2 - rowWidth / 2;

        for (let ni = 0; ni < nodesInLayer.length; ni++) {
          const nid = nodesInLayer[ni];
          const nd = nodeMap.get(nid);
          const nx = startX + ni * (NODE_WIDTH + NODE_X_GAP);
          const ny = groupStartY + li * (NODE_HEIGHT + NODE_Y_GAP);
          const hc = hiddenChildCount.get(nid) || 0;

          layoutNodes.push({
            id: nid,
            name: nd.name,
            x: nx,
            y: ny,
            width: NODE_WIDTH,
            height: NODE_HEIGHT,
            type: 'normal',
            processId: gid,
            processName: group.processName,
            color,
            transitions: nd.transitions,
            hiddenChildren: hc,
            isExpanded: expandedNodes.has(nid),
          });

          nodeToLayoutId.set(nid, nid);
        }
      }

      // Map non-visible nodes to their nearest visible ancestor
      const nonVisibleSet = new Set(groupNodeIds.filter(id => !visibleIds.includes(id)));
      for (const nid of nonVisibleSet) {
        // Walk up parents to find a visible node
        const { parents } = buildAdjacency(groupNodeIds, internalEdges);
        let current = nid;
        const seen = new Set();
        while (current && !visibleIds.includes(current)) {
          seen.add(current);
          const ps = parents.get(current) || [];
          current = ps.find(p => !seen.has(p)) || null;
        }
        nodeToLayoutId.set(nid, current || (visibleIds[0] || `summary:${gid}`));
      }

      const groupContentHeight = Math.max(
        sortedLayers.length * (NODE_HEIGHT + NODE_Y_GAP) - NODE_Y_GAP,
        NODE_HEIGHT
      );
      const groupWidth = Math.max(maxRowWidth + GROUP_PADDING * 2, 280);
      const groupHeight = GROUP_HEADER_HEIGHT + GROUP_PADDING + groupContentHeight + GROUP_PADDING;
      const groupX = width / 2 - groupWidth / 2;

      layoutGroups.push({
        processId: gid,
        processName: group.processName,
        collapsed: false,
        x: groupX,
        y: currentY,
        width: groupWidth,
        height: groupHeight,
        color,
      });

      currentY += groupHeight + GROUP_GAP;
    }
  }

  // Build layout edges (re-routed through summary nodes, deduped)
  const edgeDedup = new Set();
  for (const e of allEdges) {
    const src = nodeToLayoutId.get(e.source);
    const tgt = nodeToLayoutId.get(e.target);
    if (!src || !tgt || src === tgt) continue;

    const key = `${src}\u2192${tgt}`;
    if (edgeDedup.has(key)) continue;
    edgeDedup.add(key);

    const srcNode = layoutNodes.find(n => n.id === src);
    const tgtNode = layoutNodes.find(n => n.id === tgt);
    if (!srcNode || !tgtNode) continue;

    // Classify edge: internal (same process) vs external (cross-process)
    const srcProcess = nodeToProcess.get(e.source) || srcNode.processId;
    const tgtProcess = nodeToProcess.get(e.target) || tgtNode.processId;
    const edgeType = (srcProcess === tgtProcess) ? 'internal' : 'external';

    layoutEdges.push({
      source: src,
      target: tgt,
      sourceNode: srcNode,
      targetNode: tgtNode,
      edgeType,
      data: e.data,
    });
  }

  // Force simulation fine-tuning
  if (layoutNodes.length > 1 && layoutEdges.length > 0) {
    const simNodes = layoutNodes.map(n => ({ ...n }));
    const simLinks = layoutEdges
      .map(e => {
        const si = simNodes.findIndex(n => n.id === e.source);
        const ti = simNodes.findIndex(n => n.id === e.target);
        if (si < 0 || ti < 0) return null;
        return { source: si, target: ti };
      })
      .filter(Boolean);

    if (simLinks.length > 0) {
      const anchors = simNodes.map(n => ({ x: n.x, y: n.y }));

      const simulation = d3.forceSimulation(simNodes)
        .force('link', d3.forceLink(simLinks).distance(80).strength(0.3))
        .force('collide', d3.forceCollide()
          .radius(d => Math.max(d.width, d.height) / 2 + 10)
          .strength(0.7))
        .force('anchorX', d3.forceX().x((d, i) => anchors[i].x).strength(0.8))
        .force('anchorY', d3.forceY().y((d, i) => anchors[i].y).strength(0.9))
        .alphaDecay(0.05)
        .stop();

      for (let i = 0; i < 80; i++) simulation.tick();

      for (let i = 0; i < simNodes.length; i++) {
        layoutNodes[i].x = simNodes[i].x;
        layoutNodes[i].y = simNodes[i].y;
      }
    }
  }

  // Compute viewBox
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const n of layoutNodes) {
    minX = Math.min(minX, n.x - 20);
    minY = Math.min(minY, n.y - 20);
    maxX = Math.max(maxX, n.x + n.width + 20);
    maxY = Math.max(maxY, n.y + n.height + 20);
  }
  for (const g of layoutGroups) {
    minX = Math.min(minX, g.x - 20);
    minY = Math.min(minY, g.y - 20);
    maxX = Math.max(maxX, g.x + g.width + 20);
    maxY = Math.max(maxY, g.y + g.height + 20);
  }

  if (!isFinite(minX)) {
    minX = 0; minY = 0; maxX = 800; maxY = 600;
  }

  const viewBox = `${minX} ${minY} ${maxX - minX} ${maxY - minY}`;

  // Refresh sourceNode/targetNode references after force adjustment
  for (const e of layoutEdges) {
    e.sourceNode = layoutNodes.find(n => n.id === e.source);
    e.targetNode = layoutNodes.find(n => n.id === e.target);
  }

  return { nodes: layoutNodes, edges: layoutEdges, groups: layoutGroups, viewBox };
}

// ─── Edge path helper ────────────────────────────────────────────────────────

function edgePath(d) {
  const sx = d.sourceNode.x + d.sourceNode.width / 2;
  const sy = d.sourceNode.y + d.sourceNode.height;
  const tx = d.targetNode.x + d.targetNode.width / 2;
  const ty = d.targetNode.y;
  const midY = (sy + ty) / 2;
  return `M ${sx} ${sy} C ${sx} ${midY}, ${tx} ${midY}, ${tx} ${ty}`;
}

// ─── renderDiagram ───────────────────────────────────────────────────────────

export function renderDiagram(svgElement, layout, callbacks) {
  const svg = d3.select(svgElement);
  const t = svg.transition().duration(500).ease(d3.easeCubicInOut);

  svg.attr('viewBox', layout.viewBox);

  // Defs: arrowhead markers (internal and external)
  let defs = svg.select('defs');
  if (defs.empty()) defs = svg.append('defs');

  if (defs.select('#wf-arrow-internal').empty()) {
    defs.append('marker')
      .attr('id', 'wf-arrow-internal')
      .attr('viewBox', '0 0 10 10')
      .attr('refX', 9).attr('refY', 5)
      .attr('markerWidth', 8).attr('markerHeight', 8)
      .attr('orient', 'auto-start-reverse')
      .append('path').attr('d', 'M 0 0 L 10 5 L 0 10 z').attr('fill', '#5a9bd5');
  }
  if (defs.select('#wf-arrow-external').empty()) {
    defs.append('marker')
      .attr('id', 'wf-arrow-external')
      .attr('viewBox', '0 0 10 10')
      .attr('refX', 9).attr('refY', 5)
      .attr('markerWidth', 8).attr('markerHeight', 8)
      .attr('orient', 'auto-start-reverse')
      .append('path').attr('d', 'M 0 0 L 10 5 L 0 10 z').attr('fill', '#d4a03c');
  }

  // Root <g> for zoom transform
  let rootG = svg.select('g.wf-root');
  if (rootG.empty()) rootG = svg.append('g').attr('class', 'wf-root');

  // --- Groups ---
  const groupSel = rootG.selectAll('g.wf-group')
    .data(layout.groups, d => d.processId);

  const groupEnter = groupSel.enter().append('g')
    .attr('class', 'wf-group')
    .attr('opacity', 0);

  groupEnter.append('rect').attr('class', 'wf-group-bg');
  groupEnter.append('rect').attr('class', 'wf-group-header');
  groupEnter.append('text').attr('class', 'wf-group-label');
  groupEnter.append('text').attr('class', 'wf-group-toggle');

  const groupMerge = groupEnter.merge(groupSel);

  groupMerge.transition(t).attr('opacity', 1);

  groupMerge.select('rect.wf-group-bg')
    .transition(t)
    .attr('x', d => d.x).attr('y', d => d.y)
    .attr('width', d => d.width).attr('height', d => d.height)
    .attr('fill', d => d.color.bg).attr('stroke', d => d.color.border)
    .attr('opacity', d => d.collapsed ? 0 : 0.5);

  groupMerge.select('rect.wf-group-header')
    .transition(t)
    .attr('x', d => d.x).attr('y', d => d.y)
    .attr('width', d => d.width).attr('height', GROUP_HEADER_HEIGHT)
    .attr('fill', d => d.color.header).attr('stroke', d => d.color.border)
    .attr('opacity', d => d.collapsed ? 0 : 1);

  groupMerge.select('rect.wf-group-header')
    .style('cursor', 'pointer')
    .on('click', (event, d) => callbacks.onGroupClick(d.processId));

  groupMerge.select('text.wf-group-label')
    .transition(t)
    .attr('x', d => d.x + 12).attr('y', d => d.y + 21)
    .attr('opacity', d => d.collapsed ? 0 : 1)
    .text(d => d.processName || d.processId);

  groupMerge.select('text.wf-group-toggle')
    .transition(t)
    .attr('x', d => d.x + d.width - 70).attr('y', d => d.y + 21)
    .attr('opacity', d => d.collapsed ? 0 : 1)
    .text('[ collapse ]');

  groupSel.exit().transition(t).attr('opacity', 0).remove();

  // --- Edges ---
  const edgeSel = rootG.selectAll('g.wf-edge')
    .data(layout.edges, d => `${d.source}\u2192${d.target}`);

  const edgeEnter = edgeSel.enter().append('g');
  edgeEnter.append('path').attr('opacity', 0);

  const edgeMerge = edgeEnter.merge(edgeSel);

  // Set class for internal/external coloring
  edgeMerge
    .attr('class', d => `wf-edge wf-edge-${d.edgeType}`);

  edgeMerge.select('path')
    .on('mouseenter', (event, d) => callbacks.onEdgeHover(d, event))
    .on('mouseleave', () => callbacks.onEdgeLeave())
    .transition(t)
    .attr('opacity', 1)
    .attr('d', edgePath)
    .attr('marker-end', d => `url(#wf-arrow-${d.edgeType})`);

  edgeSel.exit().transition(t).attr('opacity', 0).remove();

  // --- Drag behavior (shared by normal + summary nodes) ---
  function makeDrag() {
    let dragStartX, dragStartY, didDrag;
    return d3.drag()
      .on('start', function (event, d) {
        dragStartX = event.x;
        dragStartY = event.y;
        didDrag = false;
        d3.select(this).classed('wf-dragging', true).raise();
      })
      .on('drag', function (event, d) {
        const dx = event.x - dragStartX;
        const dy = event.y - dragStartY;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didDrag = true;
        d.x = event.x;
        d.y = event.y;
        d3.select(this).attr('transform', `translate(${d.x}, ${d.y})`);
        edgeMerge.select('path').attr('d', edgePath);
      })
      .on('end', function (event, d) {
        d3.select(this).classed('wf-dragging', false);
        if (!didDrag) {
          // Treat as click: expand/collapse for nodes, group toggle for summary
          if (d.type === 'summary') {
            callbacks.onGroupClick(d.processId);
          } else if (d.hiddenChildren > 0 || d.isExpanded) {
            callbacks.onNodeClick(d.id);
          }
        }
      });
  }

  // --- Normal nodes ---
  const normalNodes = layout.nodes.filter(n => n.type === 'normal');
  const nodeSel = rootG.selectAll('g.wf-node')
    .data(normalNodes, d => d.id);

  const nodeEnter = nodeSel.enter().append('g')
    .attr('opacity', 0)
    .attr('transform', d => `translate(${d.x}, ${d.y})`);

  nodeEnter.append('rect');
  nodeEnter.append('text').attr('class', 'wf-node-label');
  nodeEnter.append('text').attr('class', 'wf-expand-badge');

  const nodeMerge = nodeEnter.merge(nodeSel);

  // Set classes: wf-node + wf-expandable if has hidden children
  nodeMerge
    .attr('class', d => `wf-node${d.hiddenChildren > 0 ? ' wf-expandable' : ''}`);

  nodeMerge.transition(t)
    .attr('opacity', 1)
    .attr('transform', d => `translate(${d.x}, ${d.y})`);

  nodeMerge.select('rect')
    .attr('width', d => d.width).attr('height', d => d.height);

  nodeMerge.select('text.wf-node-label')
    .attr('x', d => d.width / 2)
    .attr('y', d => d.hiddenChildren > 0 ? d.height / 2 : d.height / 2 + 4)
    .attr('text-anchor', 'middle')
    .text(d => {
      const maxChars = Math.floor(d.width / 7);
      return d.name.length > maxChars
        ? d.name.slice(0, maxChars - 1) + '\u2026'
        : d.name;
    });

  // Badge showing hidden child count
  nodeMerge.select('text.wf-expand-badge')
    .attr('x', d => d.width / 2)
    .attr('y', d => d.height / 2 + 14)
    .attr('text-anchor', 'middle')
    .text(d => d.hiddenChildren > 0
      ? `+ ${d.hiddenChildren} more`
      : '');

  nodeMerge
    .on('mouseenter', (event, d) => callbacks.onNodeHover(d, event))
    .on('mouseleave', () => callbacks.onNodeLeave());

  nodeMerge.call(makeDrag());

  nodeSel.exit().transition(t).attr('opacity', 0).remove();

  // --- Summary (collapsed) nodes ---
  const summaryNodes = layout.nodes.filter(n => n.type === 'summary');
  const sumSel = rootG.selectAll('g.wf-summary-node')
    .data(summaryNodes, d => d.id);

  const sumEnter = sumSel.enter().append('g')
    .attr('class', 'wf-summary-node')
    .attr('opacity', 0)
    .attr('transform', d => `translate(${d.x}, ${d.y})`);

  sumEnter.append('rect');
  sumEnter.append('text').attr('class', 'wf-summary-label');
  sumEnter.append('text').attr('class', 'wf-summary-count');

  const sumMerge = sumEnter.merge(sumSel);

  sumMerge.transition(t)
    .attr('opacity', 1)
    .attr('transform', d => `translate(${d.x}, ${d.y})`);

  sumMerge.select('rect')
    .attr('width', d => d.width).attr('height', d => d.height);

  sumMerge.select('text.wf-summary-label')
    .attr('x', d => d.width / 2)
    .attr('y', d => d.height / 2)
    .attr('text-anchor', 'middle')
    .text(d => d.name);

  sumMerge.select('text.wf-summary-count')
    .attr('x', d => d.width / 2)
    .attr('y', d => d.height / 2 + 16)
    .attr('text-anchor', 'middle')
    .text(d => `(${d.nodeCount} states)`);

  sumMerge
    .on('mouseenter', (event, d) => callbacks.onNodeHover(d, event))
    .on('mouseleave', () => callbacks.onNodeLeave());

  sumMerge.call(makeDrag());

  sumSel.exit().transition(t).attr('opacity', 0).remove();
}

// ─── setupZoom ───────────────────────────────────────────────────────────────

export function setupZoom(svgElement) {
  const svg = d3.select(svgElement);
  const rootG = svg.select('g.wf-root');

  const zoomBehavior = d3.zoom()
    .scaleExtent([0.2, 4])
    .filter(event => {
      // Always allow wheel zoom
      if (event.type === 'wheel') return true;
      // For mousedown/touchstart: only allow pan from the SVG background
      if (event.type === 'mousedown' || event.type === 'touchstart') {
        let el = event.target;
        while (el && el !== svgElement) {
          const cls = el.getAttribute && el.getAttribute('class') || '';
          if (cls.includes('wf-node') || cls.includes('wf-summary-node')) {
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
