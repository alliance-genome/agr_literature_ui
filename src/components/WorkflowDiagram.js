import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Spinner } from 'react-bootstrap';
import { api } from '../api';
import { computeLayout, renderDiagram, setupZoom } from './workflowDiagramLayout';
import './WorkflowDiagram.css';

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
  const [hideInternalStates, setHideInternalStates] = useState(false); // Hide internal/status states
  const [selectedNodeId, setSelectedNodeId] = useState(null); // Selected node for edge filtering
  const [legendExpanded, setLegendExpanded] = useState(false); // Legend collapsed by default
  const [selectedDatatype, setSelectedDatatype] = useState(''); // Filter by datatype (e.g., "gene extraction")
  const [availableDatatypes, setAvailableDatatypes] = useState([]); // List of datatypes for dropdown

  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const resetZoomRef = useRef(null);

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
          const datatypes = new Set();
          for (const node of result.data) {
            if (node.workflow_process) processIds.add(node.workflow_process);
            // Extract datatype from tag names like "gene extraction needed" or "disease classification in progress"
            const name = node.tag_name || '';
            const statusSuffixes = [' needed', ' in progress', ' complete', ' failed', ' uploaded', ' converted', ' extracted'];
            for (const suffix of statusSuffixes) {
              if (name.toLowerCase().endsWith(suffix)) {
                const datatype = name.slice(0, -suffix.length).trim();
                // Only add if it's a specific datatype (not the parent process name)
                if (datatype && !datatype.includes('entity extraction') && !datatype.includes('reference classification') &&
                    !datatype.includes('file upload') && !datatype.includes('text conversion') && !datatype.includes('manual indexing') &&
                    !datatype.includes('email extraction') && !datatype.includes('curation classification')) {
                  datatypes.add(datatype);
                }
                break;
              }
            }
          }
          setAllProcessIds(processIds);
          setAvailableDatatypes([...datatypes].sort());
          setCollapsedProcesses(new Set(processIds)); // Start all collapsed
          setExpandedSubprocesses(new Set());
          setSelectedDatatype(''); // Reset datatype filter when MOD changes
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
    if (svgRef.current) resetZoomRef.current = setupZoom(svgRef.current);
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

  // Click on a normal node to select it (show only its edges)
  const onNodeClick = useCallback((nodeId) => {
    setSelectedNodeId(prev => prev === nodeId ? null : nodeId); // Toggle selection
  }, []);

  const callbacks = useMemo(() => ({
    onNodeHover, onNodeLeave: onHoverLeave,
    onEdgeHover, onEdgeLeave: onHoverLeave,
    onGroupClick, onSubprocessClick, onNodeClick,
  }), [onNodeHover, onHoverLeave, onEdgeHover, onGroupClick, onSubprocessClick, onNodeClick]);

  // ─── Filter data by selected datatype ─────────────────────────────────
  const filteredTagData = useMemo(() => {
    if (!tagData || !selectedDatatype) return tagData;

    // Filter to only include nodes that match the selected datatype
    const datatypeLower = selectedDatatype.toLowerCase();
    return tagData.filter(node => {
      const name = (node.tag_name || '').toLowerCase();
      // Include if name starts with the datatype
      if (name.startsWith(datatypeLower)) return true;
      // Also include parent process/subprocess nodes for context
      const processName = (node.workflow_process_name || '').toLowerCase();
      const subprocessName = (node.workflow_subprocess_name || '').toLowerCase();
      if (processName === 'entity extraction' || processName === 'reference classification' ||
          subprocessName.includes('entity extraction') || subprocessName.includes('reference classification')) {
        // Only include parent nodes, not other datatype nodes
        return name.startsWith(datatypeLower) ||
               name === processName ||
               ['needed', 'in progress', 'complete', 'failed'].some(s => name === `${processName} ${s}`) ||
               ['needed', 'in progress', 'complete', 'failed'].some(s => name === subprocessName);
      }
      return true; // Include non-datatype nodes (file upload, text conversion, etc.)
    });
  }, [tagData, selectedDatatype]);

  // ─── Layout & render ─────────────────────────────────────────────────
  useEffect(() => {
    if (!filteredTagData || !svgRef.current) return;
    const layout = computeLayout(
      filteredTagData, collapsedProcesses, expandedSubprocesses,
      dimensions.width, dimensions.height,
      { hideInternalStates, selectedNodeId, currentStateId }
    );
    renderDiagram(svgRef.current, layout, callbacks);
  }, [filteredTagData, collapsedProcesses, expandedSubprocesses, dimensions, callbacks, hideInternalStates, selectedNodeId, currentStateId]);

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
              <strong>{data.nodeCount}</strong> states{data.subprocessCount > 0 ? `, ${data.subprocessCount} sub-processes` : ''}. Click to expand.
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
            Show All Edges
          </button>
        )}
        <label className="workflow-diagram-toggle">
          <input
            type="checkbox"
            checked={singleExpand}
            onChange={(e) => setSingleExpand(e.target.checked)}
          />
          <span>Single expand</span>
        </label>
        <label className="workflow-diagram-toggle">
          <input
            type="checkbox"
            checked={hideInternalStates}
            onChange={(e) => setHideInternalStates(e.target.checked)}
          />
          <span>Hide status states</span>
        </label>
        {availableDatatypes.length > 0 && (
          <select
            className="workflow-diagram-select"
            value={selectedDatatype}
            onChange={(e) => setSelectedDatatype(e.target.value)}
          >
            <option value="">All datatypes</option>
            {availableDatatypes.map(dt => (
              <option key={dt} value={dt}>{dt}</option>
            ))}
          </select>
        )}
      </div>
      <div className="workflow-diagram-hint">
        Click a state to show transitions to/from it
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
              <span className="workflow-legend-label">Edges:</span>
              <span className="workflow-legend-item"><span className="workflow-legend-edge"></span> Internal</span>
              <span className="workflow-legend-item"><span className="workflow-legend-edge cross"></span> Cross-workflow</span>
              <span className="workflow-legend-item"><span className="workflow-legend-edge bidirectional"></span> Bidirectional</span>
            </div>
          </div>
        )}
      </div>
      {hoveredElement && (
        <div className="wf-tooltip" style={{ left: hoverPos.x, top: hoverPos.y }}>
          {hoveredElement.type === 'node' ? renderNodeTooltip() : renderEdgeTooltip()}
        </div>
      )}
    </div>
  );
};

export default WorkflowDiagram;
