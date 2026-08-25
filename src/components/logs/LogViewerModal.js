import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Modal, Spinner } from 'react-bootstrap';

import { api } from '../../api';

// Anything larger than this is not fetched on open: a curator wanting the end of
// a 42MB run should not wait for — or hold in memory — the whole thing.
export const AUTO_PREVIEW_LIMIT = 2 * 1024 * 1024;
export const TAIL_BYTES = 200 * 1024;

const formatMb = (bytes) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

const LogViewerModal = ({ show, file, onHide }) => {
  const [state, setState] = useState({ status: 'idle', data: null, error: null });

  const fetchContent = useCallback((tail) => {
    setState({ status: 'loading', data: null, error: null });
    const params = tail ? { path: file.path, tail } : { path: file.path };
    return api.get('/report/file', { params })
      .then((response) => setState({ status: 'ready', data: response.data, error: null }))
      .catch((error) => setState({ status: 'failed', data: null, error }));
  }, [file]);

  useEffect(() => {
    if (!show || !file) return;
    if (file.size > AUTO_PREVIEW_LIMIT) {
      setState({ status: 'too-large', data: null, error: null });
      return;
    }
    fetchContent();
  }, [show, file, fetchContent]);

  if (!file) return null;

  const rawLink = (
    <a href={file.url} target="_blank" rel="noopener noreferrer">open raw</a>
  );

  return (
    <Modal show={show} onHide={onHide} size="xl">
      <Modal.Header closeButton>
        <Modal.Title style={{ fontSize: '1.1rem' }}>{file.name}</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {state.status === 'loading' && (
          <div style={{ textAlign: 'center', padding: '2em' }}>
            <Spinner animation="border" role="status" />
          </div>
        )}

        {state.status === 'too-large' && (
          <Alert variant="info">
            {`This file is ${formatMb(file.size)}. `}
            <Button variant="link" style={{ padding: 0 }} onClick={() => fetchContent(TAIL_BYTES)}>
              Preview the last 200 KB
            </Button>
            {', or '}{rawLink}{' to read all of it.'}
          </Alert>
        )}

        {state.status === 'failed' && (
          <Alert variant="warning">
            Preview unavailable from this browser — {rawLink} instead.
          </Alert>
        )}

        {state.status === 'ready' && (
          <>
            {state.data.truncated && (
              <div className="text-muted" style={{ paddingBottom: '0.5em' }}>
                {`Showing the last 200 KB of ${formatMb(state.data.size)}.`}
              </div>
            )}
            <pre
              data-testid="log-content"
              style={{
                maxHeight: '60vh', overflow: 'auto', background: '#f7f7f7',
                padding: '1em', fontSize: '0.85rem', whiteSpace: 'pre'
              }}
            >{state.data.content}</pre>
          </>
        )}
      </Modal.Body>

      <Modal.Footer>
        <span style={{ marginRight: 'auto' }}>{rawLink}</span>
        <Button variant="secondary" onClick={onHide}>Close</Button>
      </Modal.Footer>
    </Modal>
  );
};

export default LogViewerModal;
