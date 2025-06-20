import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import {
  Container,
  Row,
  Col,
  Form,
  Button,
  Alert,
  Spinner,
  Table,
  ProgressBar
} from 'react-bootstrap';
import { useDropzone } from 'react-dropzone';

const BulkSubmission = () => {
  // Redux state
  const mods = useSelector(state => state.app.mods);
  const accessToken = useSelector(state => state.isLogged.accessToken);
  const oktaMod = useSelector(state => state.isLogged.oktaMod);
  const testerMod = useSelector(state => state.isLogged.testerMod);

  const accessLevel = testerMod !== 'No' ? testerMod : oktaMod;
  const defaultMod = (accessLevel && mods.includes(accessLevel))
    ? accessLevel
    : (mods[0] || '');

  // Component state
  const [selectedMod, setSelectedMod] = useState(defaultMod);
  const [acceptedFiles, setAcceptedFiles] = useState([]);
  const [uploadStatuses, setUploadStatuses] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (accessLevel && mods.includes(accessLevel)) {
      setSelectedMod(accessLevel);
    }
  }, [accessLevel, mods]);

  const handleModChange = e => setSelectedMod(e.target.value);

  const onDrop = useCallback(files => {
    // get a list of unique file names
    const uniqueNames = Array.from(new Set(files.map(f => f.path || f.name)));
    const uniqueFiles = uniqueNames.map(name =>
      files.find(f => (f.path || f.name) === name)
    );
    setAcceptedFiles(uniqueFiles);
    setUploadStatuses({});
    setError(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, // gets called with the File[] whenever files/folders are dropped or selected
    multiple: true, // allow more than one file at a time
    webkitdirectory: true, // tell the file input to accept directory trees, not just individual files.
    directory: true // allow dropping (and selecting) entire folders/directories
  });

  const isArchive = filename => /\.(zip|tar|tgz|tar\.gz|gz)$/i.test(filename);

  const makeReferenceCurie = (filename, mod) => {
    // It takes the very first piece ([0]), so for "12345_John2017.pdf" or "12345.pdf"
    // you’ll get "12345" as id.	
    const id = filename.split(/[_\.]/)[0]; 
    if (/^[0-9]{15}$/.test(id)) return `AGRKB:${id}`;
    if (mod === 'WB') return `WB:WBPaper${id}`;
    return `PMID:${id}`;
  };

  const uploadSingle = async file => {
    const formData = new FormData();
    const base = process.env.REACT_APP_RESTAPI;
    let url;

    if (isArchive(file.name)) {
      // upload archive file => bulk endpoint
      formData.append('archive', file);
      url = `${base}/reference/referencefile/bulk_upload_archive/` +
            `?mod_abbreviation=${encodeURIComponent(selectedMod)}`;
    } else {
      // upload one file at a time => file_upload endpoint
      formData.append('file', file);

      // normalize and split path for dropped folder
      // picks the full path if we dropped in a folder, or just the filename otherwise.
      // strips off any leading / characters
      const rel = (file.path || file.name).replace(/^\/+/, '');
      const parts = rel.split(/[\\/]+/);

      // detect supplement by checking second-to-last segment is numeric
      let isSupp = false;
      let idSegment;
      if (parts.length > 1 && /^\d+$/.test(parts[parts.length - 2])) {
        isSupp = true;  
        idSegment = parts[parts.length - 2];
      }

      let referenceCurie;
      const fileClass = isSupp ? 'supplement' : 'main';
      if (isSupp) {
        referenceCurie = selectedMod === 'WB'
          ? `WB:WBPaper${idSegment}`
          : `PMID:${idSegment}`;
      } else {
        referenceCurie = makeReferenceCurie(file.name, selectedMod);
      }

      const displayName   = file.name;
      const fileExt       = file.name.split('.').pop();
      const filePubStatus = 'final';
      const pdfType       = fileExt.toLowerCase() === 'pdf' ? 'pdf' : '';

      let display_name_without_extension;
      const lastDotIndex = displayName.lastIndexOf('.');

      // Check if a dot exists and it's not the first character (to handle cases like ".bashrc")
      if (lastDotIndex !== -1 && lastDotIndex > 0) {
        display_name_without_extension = displayName.substring(0, lastDotIndex);
      } else {
        // If no dot or if the dot is the first character, keep the original name
        display_name_without_extension = displayName;
      }

      console.log(display_name_without_extension); // For "123.pdf" -> "123", for "my.document.pdf" -> "my.document"
	
      url = `${base}/reference/referencefile/file_upload/` +
            `?reference_curie=${encodeURIComponent(referenceCurie)}` +
            `&display_name=${encodeURIComponent(display_name_without_extension)}` +
            `&file_class=${fileClass}` +
            `&file_publication_status=${filePubStatus}` +
            `&file_extension=${fileExt}` +
            (pdfType ? `&pdf_type=${pdfType}` : '') +
            `&is_annotation=false` +
            `&mod_abbreviation=${encodeURIComponent(selectedMod)}` +
            `&upload_if_already_converted=true`;
    }

    // Try up to 10 times on network errors
    const maxAttempts = 10;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const resp = await fetch(url, {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
          body: formData
        });
        if (!resp.ok) {
          const text = await resp.text();
          throw new Error(text || `HTTP ${resp.status}`);
        }
        return { status: 'success', message: 'Uploaded' };
      } catch (err) {
        // only retry on network-level failures
        const isNetworkError = err.message === 'Failed to fetch'
                             || err.message.includes('NetworkError')
                             || err.message.includes('Connection reset');
        if (isNetworkError && attempt < maxAttempts) {
          // small backoff then retry
          await new Promise(r => setTimeout(r, 500 * attempt));
          continue;
        }
        // final failure
        return { status: 'error', message: err.message };
      }
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!selectedMod || acceptedFiles.length === 0) {
      setError('Please select a MOD and drop files/folders to upload.');
      return;
    }
    setIsSubmitting(true);
    setError(null);

    const statuses = {};
    for (let file of acceptedFiles) {
      const key = file.path || file.name;
      // add an entry { status: 'pending' } so the UI can show “Uploading…”
      statuses[key] = { status: 'pending', message: '' };
      setUploadStatuses({ ...statuses });

      const result = await uploadSingle(file);
      statuses[key] = result;
      setUploadStatuses({ ...statuses });
    }

    setIsSubmitting(false);
  };

  const completedCount = Object.values(uploadStatuses)
    .filter(s => s.status !== 'pending').length;
  const totalCount = acceptedFiles.length;
  const progress   = totalCount ? (completedCount / totalCount) * 100 : 0;

  return (
    <Container className="mt-4">
      <Row className="justify-content-center">
        <Col xs="auto"><h4>Bulk Reference File Upload</h4></Col>
      </Row>

      <Form onSubmit={handleSubmit}>
        <Row className="mt-3 justify-content-center align-items-center">
          <Col xs="auto">
            <Form.Control as="select" value={selectedMod} onChange={handleModChange}>
              {mods.map(m => <option key={m} value={m}>{m}</option>)}
            </Form.Control>
          </Col>

          <Col
            xs={6}
            {...getRootProps()}
            className="border p-3 text-center"
            style={{ cursor: 'pointer' }}
          >
            <input {...getInputProps()} />
            {isDragActive
              ? <p>Drop files/folders here…</p>
              : <p>Drag & drop files or folders here, or click to select</p>}
            <em>(Archives or single files upload individually)</em>
          </Col>

          <Col xs="auto">
            <Button variant="primary" type="submit" disabled={isSubmitting || !accessToken}>
              {isSubmitting
                ? <><Spinner animation="border" size="sm"/> Uploading…</>
                : 'Start Upload'}
            </Button>
          </Col>
        </Row>
      </Form>

      {error && <Alert variant="danger" className="mt-3">{error}</Alert>}

      {totalCount > 0 && (
        <Row className="mt-4">
          <Col>
            <ProgressBar now={progress} label={`${Math.round(progress)}%`} className="mb-3" />
            <Table striped bordered hover size="sm">
              <thead>
                <tr><th>File</th><th>Status</th><th>Message</th></tr>
              </thead>
              <tbody>
                {acceptedFiles.map(file => {
                  const key = file.path || file.name;
                  const st  = uploadStatuses[key] || { status: 'idle', message: '' };
                  return (
                    <tr key={key}>
                      <td>{key}</td>
                      <td>{st.status === 'pending'
                        ? '⏳'
                        : st.status === 'success'
                        ? '✅'
                        : '❌'}</td>
                      <td>{st.message}</td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </Col>
        </Row>
      )}
    </Container>
  );
};

export default BulkSubmission;
