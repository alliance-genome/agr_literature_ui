import React, { useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { Container, Row, Col, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { useDropzone } from 'react-dropzone';

const BulkSubmission = () => {
  const mods = useSelector(state => state.app.mods);
  const accessToken = useSelector(state => state.isLogged.accessToken);

  const [selectedMod, setSelectedMod] = useState(mods[0] || '');
  const [acceptedFiles, setAcceptedFiles] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleModChange = e => setSelectedMod(e.target.value);

  const onDrop = useCallback(files => {
    setAcceptedFiles(files);
    setResult(null);
    setError(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true
  });

  const handleSubmit = async e => {
    e.preventDefault();
    if (!selectedMod || acceptedFiles.length === 0) {
      setError('Please select a MOD and drop at least one file or folder.');
      return;
    }
    setIsSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      // append every file under the same key 'archive'
      acceptedFiles.forEach(file =>
        formData.append('archive', file, file.path || file.name)
      );

      const resp = await fetch(
        `/reference/referencefile/bulk_upload_archive/?mod_abbreviation=${encodeURIComponent(selectedMod)}`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
          body: formData
        }
      );
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.detail || 'Upload failed');
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container className="mt-4">
      <Row className="justify-content-center">
        <Col xs="auto">
          <h4>Bulk Reference File Upload</h4>
        </Col>
      </Row>

      <Form onSubmit={handleSubmit}>
        <Row className="mt-3 justify-content-center align-items-center">
          {/* MOD pulldown */}
          <Col xs="auto">
	    <div style={{ height: '13px' }} />	
            <Form.Group controlId="modSelect" className="text-center">
              <Form.Control
                as="select"
                value={selectedMod}
                onChange={handleModChange}
                style={{ display: 'inline-block', width: 'auto' }}
              >
                {mods.map(mod => (
                  <option key={mod} value={mod}>{mod}</option>
                ))}
              </Form.Control>
            </Form.Group>
          </Col>

          {/* drag-and-drop area */}
          <Col xs="auto">
            <div
              {...getRootProps()}
              className="border p-3 text-center"
              style={{
                cursor: 'pointer',
                display: 'inline-block',
                minWidth: 250
              }}
            >
              <input
                {...getInputProps()}
                // allow full-folder drop in WebKit browsers
                webkitdirectory="true"
                directory=""
              />
              {isDragActive
                ? <p>Drop files here…</p>
                : <p>Drag &amp; drop files/folders here, <br/>or click to select</p>
              }
	      <em style={{ color: '#888', backgroundColor: 'transparent', fontStyle: 'normal' }}>
                (zip, tar, gz, tgz, pdf, folders…)
              </em>
            </div>

            {acceptedFiles.length > 0 && (
              <aside className="mt-2 text-left">
                <strong>Selected:</strong>
                <ul className="mb-0">
                  {acceptedFiles.map(f => (
                    <li key={f.path || f.name}>{f.path || f.name}</li>
                  ))}
                </ul>
              </aside>
            )}
          </Col>

          {/* submit button */}
          <Col xs="auto">
            <Button
              variant="primary"
              type="submit"
              disabled={isSubmitting || !accessToken}
            >
              {isSubmitting
                ? <><Spinner animation="border" size="sm" /> Uploading…</>
                : 'Start Bulk Upload'
              }
            </Button>
          </Col>
        </Row>
      </Form>

      <Row className="mt-3 justify-content-center">
        <Col xs={8} md={6}>
          {error && <Alert variant="danger">{error}</Alert>}
          {result && (
            <Alert variant="success">
              <p>Job ID: {result.job_id}</p>
              <p>Status: {result.status}</p>
              <p>Message: {result.message}</p>
              <p>Total files: {result.total_files}</p>
              <p>Main files: {result.main_files}</p>
              <p>Supplement files: {result.supplement_files}</p>
              <p><a href={result.status_url}>View Progress</a></p>
            </Alert>
          )}
        </Col>
      </Row>
    </Container>
  );
};

export default BulkSubmission;
