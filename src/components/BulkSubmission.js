import React, { useEffect, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { Container, Row, Col, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { useDropzone } from 'react-dropzone';
import { Link } from 'react-router-dom';

const BulkSubmission = () => {
  const mods = useSelector(state => state.app.mods);
  const accessToken = useSelector(state => state.isLogged.accessToken);
  const oktaMod = useSelector(state => state.isLogged.oktaMod);
  const testerMod = useSelector(state => state.isLogged.testerMod);  
  // const [selectedMod, setSelectedMod] = useState(mods[0] || '');
  const [acceptedFiles, setAcceptedFiles] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [selectedMod, setSelectedMod] = useState('');
    
  const accessLevel = testerMod !== 'No' ? testerMod : oktaMod;

  // initialize selectedMod to the user’s accessLevel (if valid), else mods[0]
  useEffect(() => {
    if (accessLevel && mods.includes(accessLevel)) {
      setSelectedMod(accessLevel);
    } else if (mods.length > 0) {
      setSelectedMod(mods[0]);
    }
  }, [accessLevel, mods]);
    
  const handleModChange = e => setSelectedMod(e.target.value);

  const onDrop = useCallback(files => {
    if (files.length > 0) {
	setAcceptedFiles([files[0]]); // Only keep the first file
    }
    setResult(null);
    setError(null);
  }, []);

  // Set multiple: false to only accept one file
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false
  });

  const handleSubmit = async e => {
    e.preventDefault();
    if (!selectedMod || acceptedFiles.length === 0) {
      setError('Please select a MOD and upload an archive file');
      return;
    }
    setIsSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('archive', acceptedFiles[0]);

      const resp = await fetch(
        `${process.env.REACT_APP_RESTAPI}/reference/referencefile/bulk_upload_archive/?mod_abbreviation=${encodeURIComponent(selectedMod)}`,
        {
          method: 'POST',
          headers: { 
            Authorization: `Bearer ${accessToken}`
          },
          body: formData
        }
      );
	
      // Handle non-JSON responses
      const responseText = await resp.text();
      let responseData;
    
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}`);
      }

      if (!resp.ok) {
        throw new Error(responseData.error || `Request failed with status ${resp.status}`);
      }

      setResult(responseData);
    } catch (err) {
      setError('Test failed: ' + err.message);
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
              <input {...getInputProps()} />
              {isDragActive ? (
                 <p>Drop archive here...</p>
              ) : (
                <p>Drag & drop a SINGLE archive file here, or click to select</p>
              )}
		<em>(zip, tar, gz, tgz, pdf only)</em>
            </div>

            {acceptedFiles.length > 0 && (
              <div className="mt-2">
                <strong>Selected:</strong> {acceptedFiles[0].name}
              </div>
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
              <p>
		<a
                  href={`${process.env.REACT_APP_RESTAPI}/reference/referencefile/bulk_upload_status/${result.job_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View Progress
               </a>
              </p>
            </Alert>
          )}
        </Col>
      </Row>
    </Container>
  );
};

export default BulkSubmission;
