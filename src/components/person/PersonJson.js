import React, { useState } from 'react';
import Card from 'react-bootstrap/Card';
import Button from 'react-bootstrap/Button';

const PersonJson = ({ person }) => {
  const [copied, setCopied] = useState(false);
  const text = JSON.stringify(person ?? {}, null, 2);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  return (
    <Card>
      <Card.Header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Raw JSON</span>
        <Button size="sm" variant="outline-secondary" onClick={onCopy}>
          {copied ? 'Copied!' : 'Copy to clipboard'}
        </Button>
      </Card.Header>
      <Card.Body style={{ padding: 0 }}>
        <pre
          style={{
            margin: 0,
            padding: '1em',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
            fontSize: '0.85em',
            whiteSpace: 'pre',
            overflow: 'auto',
            maxHeight: '70vh',
            backgroundColor: '#fafafa',
          }}
        >
          {text}
        </pre>
      </Card.Body>
    </Card>
  );
};

export default PersonJson;
