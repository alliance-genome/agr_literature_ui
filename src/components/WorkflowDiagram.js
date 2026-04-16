import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Spinner } from 'react-bootstrap';
import { api } from '../api';
import { computeLayout, renderDiagram, setupZoom } from './workflowDiagramLayout';
import './WorkflowDiagram.css';

const WorkflowDiagram = ({ mod }) => {
  const [tagData, setTagData] = useState(null);
  const [collapsedProcesses, setCollapsedProcesses] = useState(new Set());
  const [expandedSubprocesses, setExpandedSubprocesses] = useState(new Set());
  const [hoveredElement, setHoveredElement] = useState(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
          const allProcessIds = new Set();
          for (const node of result.data) {
            if (node.workflow_process) allProcessIds.add(node.workflow_process);
          }
          setCollapsedProcesses(allProcessIds);
          setExpandedSubprocesses(new Set());
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
        if (width > 0 && height > 0) setDimensions({ width, height });
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
      const next = new Set(prev);
      if (next.has(processId)) next.delete(processId);
      else next.add(processId);
      return next;
    });
    setHoveredElement(null);
  }, []);

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

  const callbacks = useMemo(() => ({
    onNodeHover, onNodeLeave: onHoverLeave,
    onEdgeHover, onEdgeLeave: onHoverLeave,
    onGroupClick, onSubprocessClick,
  }), [onNodeHover, onHoverLeave, onEdgeHover, onGroupClick, onSubprocessClick]);

  // ─── Layout & render ─────────────────────────────────────────────────
  useEffect(() => {
    if (!tagData || !svgRef.current) return;
    const layout = computeLayout(
      tagData, collapsedProcesses, expandedSubprocesses,
      dimensions.width, dimensions.height
    );
    renderDiagram(svgRef.current, layout, callbacks);
  }, [tagData, collapsedProcesses, expandedSubprocesses, dimensions, callbacks]);

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
      <button
        className="workflow-diagram-reset-zoom"
        onClick={() => resetZoomRef.current && resetZoomRef.current()}
      >
        Reset Zoom
      </button>
      {hoveredElement && (
        <div className="wf-tooltip" style={{ left: hoverPos.x, top: hoverPos.y }}>
          {hoveredElement.type === 'node' ? renderNodeTooltip() : renderEdgeTooltip()}
        </div>
      )}
    </div>
  );
};

export default WorkflowDiagram;
