import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Spinner } from 'react-bootstrap';
import { api } from '../api';
import { computeLayout, renderDiagram, setupZoom } from './workflowDiagramLayout';
import './WorkflowDiagram.css';


const ROLLUP_PROCESS_CONFIG = {
  'entity extraction': {
    overallOptionLabel: 'Overall entity extraction status',
    detailOptionLabel: 'View extraction workflow',
  },
  'reference classification': {
    overallOptionLabel: 'Overall reference classification status',
    detailOptionLabel: 'View classification workflow',
  },
};

const STATUS_SUFFIXES = [
  ' needed',
  ' in progress',
  ' complete',
  ' failed',
  ' uploaded',
  ' converted',
  ' extracted',
];

function getRollupConfig(processName) {
  return ROLLUP_PROCESS_CONFIG[(processName || '').toLowerCase()] || null;
}

const WorkflowDiagram = ({ mod, currentStateId = null }) => {
  const [tagData, setTagData] = useState(null);
  const [collapsedProcesses, setCollapsedProcesses] = useState(new Set());
  const [expandedSubprocesses, setExpandedSubprocesses] = useState(new Set());
  const [hoveredElement, setHoveredElement] = useState(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [singleExpand, setSingleExpand] = useState(true); // Only allow one group expanded at a time
  const [allProcessIds, setAllProcessIds] = useState(new Set());
  const [selectedNodeId, setSelectedNodeId] = useState(null); // Selected node for focused transition view
  const [showAllTransitions, setShowAllTransitions] = useState(false); // Simple view by default
  const [legendExpanded, setLegendExpanded] = useState(false); // Legend collapsed by default
  const [processDatatypes, setProcessDatatypes] = useState({}); // Map of process name -> available datatypes
  const [selectedProcessDatatype, setSelectedProcessDatatype] = useState({}); // Map of process name -> selected datatype
  const [summaryPositions, setSummaryPositions] = useState({}); // Map of processName -> {x, y} for dropdown positioning
  const [zoomTransform, setZoomTransform] = useState(null); // Track zoom transform for dropdown positioning
  const [processNameToId, setProcessNameToId] = useState({}); // Map of process name -> process ID

  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const resetZoomRef = useRef(null);
  const layoutRef = useRef(null); // Store layout for position calculations

  // ─── Fetch data ──────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await api.get(`/workflow_tag/workflow_diagram/${mod}`);
        if (!cancelled) {
          setTagData(result.data);
          const processIds = new Set();
          const datatypesByProcess = {}; // Map process name -> Set of datatypes
          const nameToId = {}; // Map process name (lowercase) -> process ID

          for (const node of result.data) {
            if (node.workflow_process) {
              processIds.add(node.workflow_process);
              // Build process name to ID mapping
              if (node.workflow_process_name) {
                nameToId[node.workflow_process_name.toLowerCase()] = node.workflow_process;
              }
            }

            // Extract datatype from tag names
            const name = node.tag_name || '';
            const processName = node.workflow_process_name || '';
            for (const suffix of STATUS_SUFFIXES) {
              if (name.toLowerCase().endsWith(suffix)) {
                const datatype = name.slice(0, -suffix.length).trim();
                const datatypeLower = datatype.toLowerCase();
                // Check if this is a datatype under entity extraction or reference classification
                // Exclude the parent process name itself (case-insensitive)
                if (processName.toLowerCase() === 'entity extraction' && datatypeLower !== 'entity extraction') {
                  if (!datatypesByProcess['entity extraction']) {
                    datatypesByProcess['entity extraction'] = new Set();
                  }
                  datatypesByProcess['entity extraction'].add(datatype);
                } else if (processName.toLowerCase() === 'reference classification' && datatypeLower !== 'reference classification') {
                  if (!datatypesByProcess['reference classification']) {
                    datatypesByProcess['reference classification'] = new Set();
                  }
                  datatypesByProcess['reference classification'].add(datatype);
                }
                break;
              }
            }
          }

          // Convert Sets to sorted arrays
          const datatypesMap = {};
          for (const [proc, dtSet] of Object.entries(datatypesByProcess)) {
            datatypesMap[proc] = [...dtSet].sort();
          }

          setAllProcessIds(processIds);
          setProcessDatatypes(datatypesMap);
          setProcessNameToId(nameToId);
          setCollapsedProcesses(new Set(processIds)); // Start all collapsed
          setExpandedSubprocesses(new Set());
          setSelectedProcessDatatype({}); // Reset datatype filters when MOD changes
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load workflow diagram');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => { cancelled = true; };
  }, [mod]);

  // ─── ResizeObserver ──────────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          const nextWidth = Math.round(width);
          const nextHeight = Math.round(height);
          setDimensions(prev => (
            prev.width === nextWidth && prev.height === nextHeight
              ? prev
              : { width: nextWidth, height: nextHeight }
          ));
        }
      }
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  // ─── Zoom setup ──────────────────────────────────────────────────────
  useEffect(() => {
    if (svgRef.current) {
      resetZoomRef.current = setupZoom(svgRef.current, (transform) => {
        setZoomTransform(transform);
      });
    }
  }, [tagData]);

  // ─── Callbacks ───────────────────────────────────────────────────────
  const onGroupClick = useCallback((processId) => {
    setCollapsedProcesses(prev => {
      const isCurrentlyCollapsed = prev.has(processId);
      if (isCurrentlyCollapsed) {
        // Expanding this group
        if (singleExpand) {
          // Collapse all others, expand only this one
          const next = new Set(allProcessIds);
          next.delete(processId);
          return next;
        } else {
          const next = new Set(prev);
          next.delete(processId);
          return next;
        }
      } else {
        // Collapsing this group
        const next = new Set(prev);
        next.add(processId);
        return next;
      }
    });
    setExpandedSubprocesses(new Set()); // Collapse all subprocesses when changing groups
    setHoveredElement(null);
  }, [singleExpand, allProcessIds]);

  const onSubprocessClick = useCallback((subprocessId) => {
    setExpandedSubprocesses(prev => {
      const next = new Set(prev);
      if (next.has(subprocessId)) next.delete(subprocessId);
      else next.add(subprocessId);
      return next;
    });
    setHoveredElement(null);
  }, []);

  const onNodeHover = useCallback((nodeData, event) => {
    const cr = containerRef.current
      ? containerRef.current.getBoundingClientRect()
      : { left: 0, top: 0 };
    setHoverPos({ x: event.clientX - cr.left + 15, y: event.clientY - cr.top - 10 });
    setHoveredElement({ type: 'node', data: nodeData });
  }, []);

  const onEdgeHover = useCallback((edgeData, event) => {
    const cr = containerRef.current
      ? containerRef.current.getBoundingClientRect()
      : { left: 0, top: 0 };
    setHoverPos({ x: event.clientX - cr.left + 15, y: event.clientY - cr.top - 10 });
    setHoveredElement({ type: 'edge', data: edgeData });
  }, []);

  const onHoverLeave = useCallback(() => setHoveredElement(null), []);

  // Click on a state to focus only its incoming/outgoing transitions.
  // If the user is in full-transition mode, switch back to the cleaner
  // focused mode instead of leaving every transition visible.
  const onNodeClick = useCallback((nodeId) => {
    setShowAllTransitions(false);
    setSelectedNodeId(prev => prev === nodeId ? null : nodeId); // Toggle selection
  }, []);

  const callbacks = useMemo(() => ({
    onNodeHover, onNodeLeave: onHoverLeave,
    onEdgeHover, onEdgeLeave: onHoverLeave,
    onGroupClick, onSubprocessClick, onNodeClick,
  }), [onNodeHover, onHoverLeave, onEdgeHover, onGroupClick, onSubprocessClick, onNodeClick]);

  const isRollupStateForProcess = useCallback((node, processName) => {
    const nodeName = (node.tag_name || '').toLowerCase();
    const normalizedProcessName = (processName || '').toLowerCase();
    return STATUS_SUFFIXES.some(suffix => nodeName === `${normalizedProcessName}${suffix}`);
  }, []);

  // ─── Filter data by selected datatypes per process ─────────────────────
  const filteredTagData = useMemo(() => {
    if (!tagData) return tagData;

    // Check if any datatype filters are active
    const hasActiveFilters = Object.values(selectedProcessDatatype).some(dt => dt);
    if (!hasActiveFilters) return tagData;

    return tagData
      .filter(node => {
        const name = (node.tag_name || '').toLowerCase();
        const processName = (node.workflow_process_name || '').toLowerCase();

        // Check entity extraction filter. When a datatype is selected,
        // show the selected detailed workflow only. The empty selection means
        // the real database roll-up workflow / overall status.
        if (processName === 'entity extraction') {
          const selectedDt = selectedProcessDatatype['entity extraction'];
          if (selectedDt) {
            const dtLower = selectedDt.toLowerCase();
            return name.startsWith(dtLower) && !isRollupStateForProcess(node, processName);
          }
        }

        // Check reference classification filter. Same behavior as entity extraction.
        if (processName === 'reference classification') {
          const selectedDt = selectedProcessDatatype['reference classification'];
          if (selectedDt) {
            const dtLower = selectedDt.toLowerCase();
            return name.startsWith(dtLower) && !isRollupStateForProcess(node, processName);
          }
        }

        // Include all other nodes
        return true;
      })
      .map(node => {
        const processName = (node.workflow_process_name || '').toLowerCase();

        // When a datatype filter is active for a process, flatten the subprocess structure
        // by removing the subprocess association so nodes appear directly under the process
        if (processName === 'entity extraction' && selectedProcessDatatype['entity extraction']) {
          return {
            ...node,
            workflow_subprocess: null,
            workflow_subprocess_name: null,
          };
        }
        if (processName === 'reference classification' && selectedProcessDatatype['reference classification']) {
          return {
            ...node,
            workflow_subprocess: null,
            workflow_subprocess_name: null,
          };
        }

        return node;
      });
  }, [tagData, selectedProcessDatatype, isRollupStateForProcess]);

  // ─── Layout & render ─────────────────────────────────────────────────
  useEffect(() => {
    if (!filteredTagData || !svgRef.current) return;
    const layout = computeLayout(
      filteredTagData, collapsedProcesses, expandedSubprocesses,
      dimensions.width, dimensions.height,
      { selectedNodeId, currentStateId, showAllTransitions }
    );
    layoutRef.current = layout;
    renderDiagram(svgRef.current, layout, callbacks);

    // Calculate summary node positions for dropdown placement
    // Also check expanded groups for dropdown positioning
    const positions = {};

    // Show datatype dropdowns only for expanded roll-up groups.
    // Keeping them off collapsed summary boxes prevents confusing cases where a
    // collapsed roll-up says "overall status" while a datatype filter is shown below it.
    for (const group of layout.groups) {
      if (!group.isSubprocess && !group.collapsed) {
        const processName = (group.processName || '').toLowerCase();
        if (processName === 'entity extraction' || processName === 'reference classification') {
          positions[processName] = {
            // Position just under the group header, aligned near the right edge.
            svgX: group.x + group.width - 190,
            svgY: group.y + 42,
            width: group.width,
            height: 0,
            isCollapsed: false,
          };
        }
      }
    }

    setSummaryPositions(positions);
  }, [filteredTagData, collapsedProcesses, expandedSubprocesses, dimensions, callbacks, selectedNodeId, currentStateId, showAllTransitions]);

  // ─── Tooltip builders ────────────────────────────────────────────────
  const renderNodeTooltip = () => {
    if (!hoveredElement || hoveredElement.type !== 'node') return null;
    const data = hoveredElement.data;

    const incoming = [];
    if (tagData && data.type === 'normal') {
      for (const node of tagData) {
        for (const tr of node.transitions || []) {
          if (tr.to === data.id) {
            incoming.push({ from: node.tag_name, transition_type: tr.transition_type });
          }
        }
      }
    }

    return (
      <>
        <div className="wf-tooltip-header">{data.name}</div>
        <div className="wf-tooltip-body">
          <div className="wf-popover-atp">{data.id}</div>
          <div className="wf-popover-process">{data.processName}</div>
          {(data.type === 'summary' || data.type === 'subsummary') && (
            <div style={{ marginBottom: 6 }}>
              <strong>{data.nodeCount}</strong> states{data.subprocessCount > 0 ? `, ${data.subprocessCount} sub-processes` : ''}.{' '}
              {data.type === 'subsummary' && data.isMainFlow === false
                ? 'Click to show incoming and outgoing transitions.'
                : 'Click to expand.'}
            </div>
          )}
          {data.type === 'normal' && (
            <div className="wf-popover-hint">
              Click to show transitions to and from this state.
            </div>
          )}
          {data.transitions && data.transitions.length > 0 && (
            <>
              <div className="wf-popover-section-title">Outgoing transitions</div>
              {data.transitions.map((tr, i) => (
                <div key={i} className="wf-popover-transition">
                  <span className="wf-popover-arrow">&rarr;</span> {tr.to_name}
                  <span className="wf-popover-detail"> ({tr.transition_type})</span>
                </div>
              ))}
            </>
          )}
          {incoming.length > 0 && (
            <>
              <div className="wf-popover-section-title">Incoming transitions</div>
              {incoming.map((tr, i) => (
                <div key={i} className="wf-popover-transition">
                  {tr.from} <span className="wf-popover-arrow">&rarr;</span>
                  <span className="wf-popover-detail"> ({tr.transition_type})</span>
                </div>
              ))}
            </>
          )}
        </div>
      </>
    );
  };

  const renderEdgeTooltip = () => {
    if (!hoveredElement || hoveredElement.type !== 'edge') return null;
    const edge = hoveredElement.data;
    const fwd = edge.data;
    const rev = edge.reverseData;

    return (
      <>
        <div className="wf-tooltip-header">
          {fwd.sourceName} {edge.bidirectional ? '\u21C4' : '\u2192'} {fwd.to_name}
        </div>
        <div className="wf-tooltip-body">
          {/* Forward direction */}
          <div className="wf-popover-section-title">
            {fwd.sourceName} &rarr; {fwd.to_name}
          </div>
          <div className="wf-popover-transition">
            <strong>Type:</strong> {fwd.transition_type}
          </div>
          {fwd.condition && (
            <div className="wf-popover-transition">
              <strong>Condition:</strong> {fwd.condition}
            </div>
          )}
          {fwd.requirements.length > 0 && (
            <div className="wf-popover-transition">
              <strong>Requires:</strong> {fwd.requirements.join(', ')}
            </div>
          )}
          {fwd.actions.length > 0 && (
            <div className="wf-popover-transition">
              <strong>Actions:</strong> {fwd.actions.join(', ')}
            </div>
          )}
          {/* Reverse direction (if bidirectional) */}
          {rev && (
            <>
              <div className="wf-popover-section-title" style={{ marginTop: 8 }}>
                {rev.sourceName} &rarr; {rev.to_name}
              </div>
              <div className="wf-popover-transition">
                <strong>Type:</strong> {rev.transition_type}
              </div>
              {rev.condition && (
                <div className="wf-popover-transition">
                  <strong>Condition:</strong> {rev.condition}
                </div>
              )}
              {rev.requirements.length > 0 && (
                <div className="wf-popover-transition">
                  <strong>Requires:</strong> {rev.requirements.join(', ')}
                </div>
              )}
              {rev.actions.length > 0 && (
                <div className="wf-popover-transition">
                  <strong>Actions:</strong> {rev.actions.join(', ')}
                </div>
              )}
            </>
          )}
        </div>
      </>
    );
  };

  const handleCollapseAll = useCallback(() => {
    setCollapsedProcesses(new Set(allProcessIds));
    setExpandedSubprocesses(new Set());
    setSelectedNodeId(null);
    setHoveredElement(null);
  }, [allProcessIds]);

  const handleClearSelection = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  const handleToggleAllTransitions = useCallback(() => {
    setShowAllTransitions(prev => !prev);
    setSelectedNodeId(null);
    setHoveredElement(null);
  }, []);

  // Convert SVG coordinates to screen coordinates
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const svgToScreenCoords = useCallback((svgX, svgY) => {
    if (!svgRef.current || !containerRef.current) return null;

    const svg = svgRef.current;
    const container = containerRef.current;

    // Get the SVG's CTM (Current Transform Matrix)
    const rootG = svg.querySelector('g.wf-root');
    if (!rootG) return null;

    // Create an SVG point
    const point = svg.createSVGPoint();
    point.x = svgX;
    point.y = svgY;

    // Transform the point through the root group's CTM
    const ctm = rootG.getCTM();
    if (!ctm) return null;

    const screenPoint = point.matrixTransform(ctm);

    // Get container offset
    const containerRect = container.getBoundingClientRect();
    const svgRect = svg.getBoundingClientRect();

    return {
      x: screenPoint.x + (svgRect.left - containerRect.left),
      y: screenPoint.y + (svgRect.top - containerRect.top),
    };
  }, [zoomTransform]); // Re-calculate when zoom changes

  // Handle datatype selection for a process
  const handleDatatypeChange = useCallback((processName, datatype) => {
    setSelectedProcessDatatype(prev => ({
      ...prev,
      [processName]: datatype || '',
    }));

    // Auto-expand the process when a datatype is selected
    if (datatype) {
      const processId = processNameToId[processName];
      if (processId) {
        setCollapsedProcesses(prev => {
          if (prev.has(processId)) {
            // Expand this process (and collapse others if singleExpand is on)
            if (singleExpand) {
              const next = new Set(allProcessIds);
              next.delete(processId);
              return next;
            } else {
              const next = new Set(prev);
              next.delete(processId);
              return next;
            }
          }
          return prev;
        });
      }
    }
  }, [processNameToId, singleExpand, allProcessIds]);

  // ─── Render ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="workflow-diagram-loading">
        <Spinner animation="border" size="sm" /> Loading workflow diagram...
      </div>
    );
  }

  if (error) {
    return <div className="workflow-diagram-error">Error: {error}</div>;
  }

  return (
    <div className="workflow-diagram-container" ref={containerRef}>
      <svg ref={svgRef} />
      {/* Controls panel */}
      <div className="workflow-diagram-controls">
        <button
          className="workflow-diagram-btn"
          onClick={() => resetZoomRef.current && resetZoomRef.current()}
        >
          Reset Zoom
        </button>
        <button
          className="workflow-diagram-btn"
          onClick={handleCollapseAll}
        >
          Collapse All
        </button>
        {selectedNodeId && (
          <button
            className="workflow-diagram-btn workflow-diagram-btn-active"
            onClick={handleClearSelection}
          >
            Clear Focus
          </button>
        )}
        <button
          className={`workflow-diagram-btn ${showAllTransitions ? 'workflow-diagram-btn-active' : ''}`}
          onClick={handleToggleAllTransitions}
          title={showAllTransitions ? 'Return to the simple workflow view' : 'Show all workflow transitions'}
        >
          {showAllTransitions ? 'Simple View' : 'Show All Transitions'}
        </button>
        <label className="workflow-diagram-toggle">
          <input
            type="checkbox"
            checked={singleExpand}
            onChange={(e) => setSingleExpand(e.target.checked)}
          />
          <span>Single expand</span>
        </label>
      </div>
      <div className="workflow-diagram-hint">
        {showAllTransitions
          ? 'Full view: extra transitions are shown faintly. Click a state for a cleaner focused view.'
          : selectedNodeId
            ? 'Focused view: showing incoming and outgoing transitions for the selected state.'
            : 'Simple view: main workflow only. Click a state to show its incoming and outgoing transitions.'}
      </div>
      {/* Collapsible Legend */}
      <div className={`workflow-legend ${legendExpanded ? 'expanded' : 'collapsed'}`}>
        <div className="workflow-legend-title" onClick={() => setLegendExpanded(!legendExpanded)}>
          <span className="workflow-legend-toggle">{legendExpanded ? '▼' : '▶'}</span>
          <span>Legend</span>
        </div>
        {legendExpanded && (
          <div className="workflow-legend-content">
            <div className="workflow-legend-row">
              <span className="workflow-legend-label">Transitions:</span>
              <span className="workflow-legend-item"><span className="workflow-legend-edge"></span> Internal</span>
              <span className="workflow-legend-item"><span className="workflow-legend-edge cross"></span> Cross-workflow</span>
              <span className="workflow-legend-item"><span className="workflow-legend-edge bidirectional"></span> Bidirectional</span>
            </div>
          </div>
        )}
      </div>
      {/* Per-process datatype dropdowns positioned below summary nodes or in group headers */}
      {Object.entries(summaryPositions).map(([processName, pos]) => {
        const datatypes = processDatatypes[processName];
        if (!datatypes || datatypes.length === 0) return null;

        // Convert SVG coordinates to screen coordinates
        const screenPos = svgToScreenCoords(pos.svgX, pos.svgY);
        if (!screenPos) return null;

        // Capitalize first letter of process name for display
        const displayName = processName.charAt(0).toUpperCase() + processName.slice(1);
        const rollupConfig = getRollupConfig(processName);

        // For collapsed boxes, center the dropdown below the box
        // For expanded groups, position in the header
        const dropdownStyle = pos.isCollapsed
          ? {
              position: 'absolute',
              left: screenPos.x,
              top: screenPos.y,
              transform: 'translateX(-50%)', // Center horizontally
              zIndex: 15,
            }
          : {
              position: 'absolute',
              left: screenPos.x,
              top: screenPos.y,
              zIndex: 15,
            };

        return (
          <select
            key={processName}
            className="workflow-diagram-select workflow-diagram-process-dropdown"
            style={dropdownStyle}
            value={selectedProcessDatatype[processName] || ''}
            onChange={(e) => handleDatatypeChange(processName, e.target.value)}
            title={rollupConfig?.detailOptionLabel || `Filter ${displayName} by datatype`}
          >
            <option value="">
              {rollupConfig?.overallOptionLabel || `All ${displayName}`}
            </option>
            {datatypes.map(dt => (
              <option key={dt} value={dt}>{dt}</option>
            ))}
          </select>
        );
      })}
      {hoveredElement && (
        <div className="wf-tooltip" style={{ left: hoverPos.x, top: hoverPos.y }}>
          {hoveredElement.type === 'node' ? renderNodeTooltip() : renderEdgeTooltip()}
        </div>
      )}
    </div>
  );
};

export default WorkflowDiagram;