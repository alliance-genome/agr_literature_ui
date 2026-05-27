import React from 'react';
import { Modal, Button } from 'react-bootstrap';

export default function NoteModal({ show, onHide, sourceLabel, note }) {
  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Note — {sourceLabel}</Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ whiteSpace: 'pre-wrap' }}>
        {note || '(empty)'}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
