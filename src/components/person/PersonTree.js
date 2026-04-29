import React from 'react';
import Card from 'react-bootstrap/Card';

const isPrimitive = (v) => v === null || ['string', 'number', 'boolean', 'undefined'].includes(typeof v);

const renderPrimitive = (v) => {
  if (v === null) return <span style={{ color: '#888' }}>null</span>;
  if (typeof v === 'undefined') return <span style={{ color: '#888' }}>undefined</span>;
  if (typeof v === 'string') return <span style={{ color: '#0a6e0a' }}>"{v}"</span>;
  if (typeof v === 'number') return <span style={{ color: '#0033b3' }}>{v}</span>;
  if (typeof v === 'boolean') return <span style={{ color: '#9c27b0' }}>{String(v)}</span>;
  return String(v);
};

const TreeNode = ({ label, value, depth = 0, defaultOpen = false }) => {
  const indent = { paddingLeft: depth === 0 ? 0 : '1em' };

  if (isPrimitive(value)) {
    return (
      <div style={{ ...indent, padding: '1px 0' }}>
        <span style={{ fontWeight: 500 }}>{label}:</span> {renderPrimitive(value)}
      </div>
    );
  }

  if (Array.isArray(value)) {
    return (
      <details open={defaultOpen} style={indent}>
        <summary style={{ cursor: 'pointer' }}>
          <span style={{ fontWeight: 500 }}>{label}</span>{' '}
          <span style={{ color: '#888' }}>[{value.length}]</span>
        </summary>
        {value.map((v, i) => (
          <TreeNode key={i} label={String(i)} value={v} depth={depth + 1} />
        ))}
      </details>
    );
  }

  // object
  const entries = Object.entries(value ?? {});
  return (
    <details open={defaultOpen} style={indent}>
      <summary style={{ cursor: 'pointer' }}>
        <span style={{ fontWeight: 500 }}>{label}</span>{' '}
        <span style={{ color: '#888' }}>{`{${entries.length}}`}</span>
      </summary>
      {entries.map(([k, v]) => (
        <TreeNode key={k} label={k} value={v} depth={depth + 1} />
      ))}
    </details>
  );
};

const PersonTree = ({ person }) => {
  if (!person) return null;
  return (
    <Card>
      <Card.Header>Tree view</Card.Header>
      <Card.Body style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: '0.9em' }}>
        <TreeNode label="person" value={person} depth={0} defaultOpen={true} />
      </Card.Body>
    </Card>
  );
};

export default PersonTree;
