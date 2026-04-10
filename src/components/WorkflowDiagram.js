import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Spinner, Overlay, Popover } from 'react-bootstrap';
import { api } from '../api';
import { computeLayout, renderDiagram, setupZoom } from './workflowDiagramLayout';
import './WorkflowDiagram.css';

const WorkflowDiagram = ({ mod }) => {
  const [tagData, setTagData] = useState(null);
  const [collapsedProcesses, setCollapsedProcesses] = useState(new Set());
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [hoveredElement, setHoveredElement] = useState(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const resetZoomRef = useRef(null);
  const popoverTarget = useRef(null);

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
          // Collapse all processes by default
          const allProcessIds = new Set();
          for (const node of result.data) {
            if (node.workflow_process) allProcessIds.add(node.workflow_process);
          }
          setCollapsedProcesses(allProcessIds);
          setExpandedNodes(new Set());
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
          setDimensions({ width, height });
        }
      }
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  // ─── Zoom setup ──────────────────────────────────────────────────────
  useEffect(() => {
    if (svgRef.current) {
      resetZoomRef.current = setupZoom(svgRef.current);
    }
  }, [tagData]);

  // ─── Callbacks for D3 ────────────────────────────────────────────────
  const onGroupClick = useCallback((processId) => {
    setCollapsedProcesses(prev => {
      const next = new Set(prev);
      if (next.has(processId)) {
        next.delete(processId);
      } else {
        next.add(processId);
      }
      return next;
    });
    setHoveredElement(null);
  }, []);

  const onNodeClick = useCallback((nodeId) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
    setHoveredElement(null);
  }, []);

  const onNodeHover = useCallback((nodeData, event) => {
    const rect = {
      top: event.clientY - 5,
      left: event.clientX + 10,
      bottom: event.clientY + 5,
      right: event.clientX + 20,
      width: 10,
      height: 10,
      x: event.clientX + 10,
      y: event.clientY - 5,
    };
    popoverTarget.current = { getBoundingClientRect: () => rect };
    setHoveredElement({ type: 'node', data: nodeData });
  }, []);

  const onEdgeHover = useCallback((edgeData, event) => {
    const rect = {
      top: event.clientY - 5,
      left: event.clientX + 10,
      bottom: event.clientY + 5,
      right: event.clientX + 20,
      width: 10,
      height: 10,
      x: event.clientX + 10,
      y: event.clientY - 5,
    };
    popoverTarget.current = { getBoundingClientRect: () => rect };
    setHoveredElement({ type: 'edge', data: edgeData });
  }, []);

  const onHoverLeave = useCallback(() => {
    setHoveredElement(null);
  }, []);

  const callbacks = useMemo(() => ({
    onNodeHover,
    onNodeLeave: onHoverLeave,
    onEdgeHover,
    onEdgeLeave: onHoverLeave,
    onGroupClick,
    onNodeClick,
  }), [onNodeHover, onHoverLeave, onEdgeHover, onGroupClick, onNodeClick]);

  // ─── Compute layout & render ─────────────────────────────────────────
  useEffect(() => {
    if (!tagData || !svgRef.current) return;
    const layout = computeLayout(
      tagData, collapsedProcesses, expandedNodes,
      dimensions.width, dimensions.height
    );
    renderDiagram(svgRef.current, layout, callbacks);
  }, [tagData, collapsedProcesses, expandedNodes, dimensions, callbacks]);

  // ─── Popover content builders ────────────────────────────────────────
  const renderNodePopover = () => {
    if (!hoveredElement || hoveredElement.type !== 'node') return <span />;
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
      <Popover className="wf-popover" id="wf-node-popover">
        <Popover.Title as="h3">{data.name}</Popover.Title>
        <Popover.Content>
          <div className="wf-popover-atp">{data.id}</div>
          <div className="wf-popover-process">{data.processName}</div>
          {data.type === 'summary' && (
            <div style={{ marginBottom: 6 }}>
              <strong>{data.nodeCount}</strong> states in this process. Click to expand.
            </div>
          )}
          {data.hiddenChildren > 0 && (
            <div style={{ marginBottom: 6, color: '#5a8ab5' }}>
              Click to reveal {data.hiddenChildren} hidden descendant{data.hiddenChildren > 1 ? 's' : ''}.
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
        </Popover.Content>
      </Popover>
    );
  };

  const renderEdgePopover = () => {
    if (!hoveredElement || hoveredElement.type !== 'edge') return <span />;
    const data = hoveredElement.data;

    return (
      <Popover className="wf-popover" id="wf-edge-popover">
        <Popover.Title as="h3">
          {data.data.sourceName} &rarr; {data.data.to_name}
        </Popover.Title>
        <Popover.Content>
          <div className="wf-popover-transition">
            <strong>Type:</strong> {data.data.transition_type}
          </div>
          {data.data.condition && (
            <div className="wf-popover-transition">
              <strong>Condition:</strong> {data.data.condition}
            </div>
          )}
          {data.data.requirements.length > 0 && (
            <>
              <div className="wf-popover-section-title">Requirements</div>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {data.data.requirements.map((r, i) => (
                  <li key={i} style={{ fontSize: 12 }}>{r}</li>
                ))}
              </ul>
            </>
          )}
          {data.data.actions.length > 0 && (
            <>
              <div className="wf-popover-section-title">Actions</div>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {data.data.actions.map((a, i) => (
                  <li key={i} style={{ fontSize: 12 }}>{a}</li>
                ))}
              </ul>
            </>
          )}
        </Popover.Content>
      </Popover>
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
    return (
      <div className="workflow-diagram-error">
        Error: {error}
      </div>
    );
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
      <Overlay
        show={hoveredElement !== null}
        target={popoverTarget.current}
        placement="right"
        containerPadding={20}
      >
        {hoveredElement
          ? hoveredElement.type === 'node'
            ? renderNodePopover()
            : renderEdgePopover()
          : <span />
        }
      </Overlay>
    </div>
  );
};

export default WorkflowDiagram;
