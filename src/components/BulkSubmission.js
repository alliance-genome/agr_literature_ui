import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';
import axios from 'axios';
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
import { extractArchive } from './FileExtractor';

const BulkSubmission = () => {
  const history = useHistory();
  const mods = useSelector(state => state.app.mods);
  const accessToken = useSelector(state => state.isLogged.accessToken);
  const base = process.env.REACT_APP_RESTAPI;
  const oktaMod = useSelector(state => state.isLogged.oktaMod);
  const testerMod = useSelector(state => state.isLogged.testerMod);

  const accessLevel = testerMod !== 'No' ? testerMod : oktaMod;
  const defaultMod = (accessLevel && mods.includes(accessLevel))
    ? accessLevel
    : (mods[0] || '');

  const [selectedMod, setSelectedMod] = useState(defaultMod);
  const [acceptedFiles, setAcceptedFiles] = useState([]);
  const [uploadStatuses, setUploadStatuses] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [extractedFiles, setExtractedFiles] = useState([]);
  const [isExtracting, setIsExtracting] = useState(false);

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
    setExtractedFiles([]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, // gets called with the File[] whenever files/folders are dropped or selected
    multiple: true, // allow more than one file at a time
    webkitdirectory: true, // tell the file input to accept directory trees, not just individual files.
    directory: true, // allow dropping (and selecting) entire folders/directories
  });

  const isArchive = filename => /\.(zip|tar|tgz|tar\.gz|gz)$/i.test(filename);

  const makeReferenceCurie = (filename, mod) => {
    // It takes the very first piece ([0]), so for "12345_John2017.pdf" or "12345.pdf"
    // you'll get "12345" as id.
    const id = filename.split(/[_\.]/)[0]; 
    const allowedPdfTypes = ['aut', 'htm', 'html', 'lib', 'ocr', 'temp', 'tif'];
    if (/^[0-9]{15}$/.test(id)) return [`AGRKB:${id}`, 'pdf', 'final'];
    if (mod === 'WB') {
      // For WB also capture the last _text part and treat it differently to generate a pdfType and filePubStatus
      const regex = /^(\d+)(?:_[a-zA-Z0-9]+)*_([a-zA-Z0-9]+)\.pdf$/;
      const match = filename.match(regex);
      if (match) {
        const numberPart = match[1];
        let suffix = match[2].toLowerCase();
        if (suffix === 'temp') { return [`WB:WBPaper${numberPart}`, 'pdf', 'temp']; }
        if (suffix === 'htm') { suffix = 'html'; }
        const pdfType = allowedPdfTypes.includes(suffix) ? suffix : 'pdf';
        return [`WB:WBPaper${id}`, pdfType, 'final'];
      } else {
        console.log(`No regex match for ${filename}`);
        return [`WB:WBPaper${id}`, 'pdf', 'final'];
      }
    }
    return [`PMID:${id}`, 'pdf', 'final'];
  };

  const uploadSingle = async (file, path = null) => {
    const formData = new FormData();
    const base = process.env.REACT_APP_RESTAPI;
    let url;

    // normalize and split path for dropped folder
    // picks the full path if we dropped in a folder, or just the filename otherwise.
    // strips off any leading / characters
    const rel = path || file.path || file.name;
    const parts = rel.replace(/^\/+/, '').split(/[\\/]+/);

    // detect supplement by checking second-to-last segment is numeric
    let isSupp = false;
    let idSegment;
    if (parts.length > 1 && /^\d+$/.test(parts[parts.length - 2])) {
      isSupp = true;  
      idSegment = parts[parts.length - 2];
    }

    const displayName = file.name;
    const fileExt = file.name.split('.').pop();
    let referenceCurie, pdfType, filePubStatus;
    const fileClass = isSupp ? 'supplement' : 'main';
    if (isSupp) {
      referenceCurie = selectedMod === 'WB'
        ? `WB:WBPaper${idSegment}`
        : `PMID:${idSegment}`;
      filePubStatus = 'final';
      pdfType = fileExt.toLowerCase() === 'pdf' ? 'pdf' : '';
    } else {
      [referenceCurie, pdfType, filePubStatus] = makeReferenceCurie(file.name, selectedMod);
    }

    let display_name_without_extension;
    const lastDotIndex = displayName.lastIndexOf('.');

    if (lastDotIndex !== -1 && lastDotIndex > 0) {
      display_name_without_extension = displayName.substring(0, lastDotIndex);
    } else {
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

    // Try up to 10 times on network errors
    const maxAttempts = 10;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        formData.append('file', file);
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
        const isNetworkError = err.message === 'Failed to fetch' ||
                             err.message.includes('NetworkError') ||
                             err.message.includes('Connection reset');
        if (isNetworkError && attempt < maxAttempts) {
          // wait 500ms × current attempt count before trying again
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
    setUploadStatuses({});
    setExtractedFiles([]);

    try {
      // process archives first
      const archives = acceptedFiles.filter(file => isArchive(file.name));
      const nonArchives = acceptedFiles.filter(file => !isArchive(file.name));
      
      // extract archive files
      let allExtractedFiles = [];
      if (archives.length > 0) {
        setIsExtracting(true);
        
        for (const archive of archives) {
          try {
            const extractedFiles = await extractArchive(archive);
            allExtractedFiles = [...allExtractedFiles, ...extractedFiles];
            
            // update status for archive
            setUploadStatuses(prev => ({
              ...prev,
              [archive.name]: { 
                status: 'success', 
                message: `Extracted ${extractedFiles.length} files` 
              }
            }));
          } catch (err) {
            console.error('Error extracting archive:', archive.name, err);
            setUploadStatuses(prev => ({
              ...prev,
              [archive.name]: { 
                status: 'error', 
                message: `Extraction failed: ${err.message}` 
              }
            }));
          }
        }
        
        setExtractedFiles(allExtractedFiles);
        setIsExtracting(false);
      }

      // Upload all files (non-archives + extracted files from archives)
      const allFiles = [
        ...nonArchives.map(file => ({ file, path: file.path || file.name })),
        ...allExtractedFiles
      ];

      const statuses = {};
      for (const fileData of allFiles) {
        const key = fileData.path;
        statuses[key] = { status: 'pending', message: '' };
        setUploadStatuses(prev => ({ ...prev, ...statuses }));

        try {
          const result = await uploadSingle(fileData.file, fileData.path);
          statuses[key] = result;
        } catch (err) {
          statuses[key] = { 
            status: 'error', 
            message: err.message || 'Upload failed' 
          };
        }
        
        setUploadStatuses(prev => ({ ...prev, ...statuses }));
      }
    } catch (err) {
      setError(`Processing error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
      setIsExtracting(false);
    }
  };

  /**
   * Open (or reuse) a tab named "_filemanagement", look up the AGRKB curie
   * for a XREF ID (PMID:… or WB:WBPaper…), then navigate it into the filemanagement tab
   */
  const handleManageClick = async key => {
    // compute the raw curie exactly as in uploadSingle
    const rawCurie = computeReferenceCurie(key);
    // open the tab upfront
    const win = window.open('', '_filemanagement');
    try {
      // pick the right endpoint
      const url = rawCurie.startsWith('AGRKB:')
        ? `${base}/reference/${encodeURIComponent(rawCurie)}`
        : `${base}/cross_reference/${encodeURIComponent(rawCurie)}`;
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      // response brings back AGRKB curie
      const agrCurie = res.data.reference_curie ?? res.data.curie;
      // navigate the opened tab
      win.location = `/Biblio/?action=filemanagement&referenceCurie=${agrCurie}`;
    } catch (err) {
      console.error('Could not map to AGRKB curie:', err);
      win.close();
    }
  };
    
  // combine original files and extracted files for display
  const allFilesToDisplay = [
    ...acceptedFiles.map(file => ({
      path: file.path || file.name,
      isArchive: isArchive(file.name),
      isOriginal: true
    })),
    ...extractedFiles.map(f => ({
      path: f.path,
      isExtracted: true
    }))
  ];

  const completedCount = Object.values(uploadStatuses)
    .filter(s => s.status === 'success' || s.status === 'error').length;
    
  const totalCount = allFilesToDisplay.length;
  const progress = totalCount ? (completedCount / totalCount) * 100 : 0;

   // helper to compute exactly the same referenceCurie logic as uploadSingle
  const computeReferenceCurie = path => {
    const parts = path.replace(/^\/+/, '').split(/[\\/]+/);
    if (parts.length > 1 && /^\d+$/.test(parts[parts.length - 2])) {
      // a supplement under folder named numeric
      const idSeg = parts[parts.length - 2];
      return selectedMod === 'WB'
        ? `WB:WBPaper${idSeg}`
       : `PMID:${idSeg}`;
    }
    // otherwise, look at the filename
    const filename = parts[parts.length - 1];
    return makeReferenceCurie(filename, selectedMod)[0];
  };
  
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
            <em>(Archives will be extracted automatically)</em>
          </Col>
          <Col xs="auto">
            <Button
              variant="primary"
              type="submit"
              disabled={isSubmitting || !accessToken || isExtracting}
            >
              {isExtracting ? (
                <><Spinner animation="border" size="sm"/> Extracting…</>
              ) : isSubmitting ? (
                <><Spinner animation="border" size="sm"/> Uploading…</>
              ) : 'Start Upload'}
            </Button>
          </Col>
        </Row>
      </Form>

      {error && (
        <Alert variant="danger" className="mt-4">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          {error}
        </Alert>
      )}

      {totalCount > 0 && (
        <div className="mt-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5>Upload Progress</h5>
            <span className="text-muted">
              {completedCount} of {totalCount} files processed
            </span>
          </div>
          <ProgressBar 
            now={progress} 
            label={`${Math.round(progress)}%`} 
            className="mb-4"
            variant={progress === 100 ? 'success' : 'primary'}
            striped={isSubmitting}
            animated={isSubmitting}
          />
          
          <div className="table-responsive">
            <Table striped bordered hover size="sm">
              <thead className="thead-light">
                <tr>
                  <th>File Path</th>
		  <th>File Mgmt</th>  
                  <th>Status</th>
                  <th>Message</th>
                </tr>
              </thead>
              <tbody>
                {allFilesToDisplay.map(file => {
                  const key = file.path;
                  const st = uploadStatuses[key] || { status: 'idle', message: '' };
		  const isSuccess = st.status === 'success';
                  return (
                    <tr key={key}>
	              <td className="small text-nowrap">{file.path}</td>	

                      <td className="text-center">
                        {st.status === 'pending' ? (
                          // uploading state
                          <Spinner animation="border" size="sm" />
                        ) : st.status === 'success' ? (
                          // uploaded → clickable folder
                          <button
                            type="button"
                            onClick={() => handleManageClick(key)}
                            style={{
                              background: 'none',
                              border: 'none',
                              padding: 0,
                              fontSize: '1.2em',
                              color: '#0d6efd',
                              cursor: 'pointer'
                            }}
                            title="Go to File Management"
                          >
                            🗂️
                          </button>
                        ) : (
                          // idle state
                          <span
                            role="img"
                            aria-label="Pending reference"
                            style={{ fontSize: '1.2em', color: '#6c757d' }}
                            title="Will enable when uploaded"
                          >
                            📁
                          </span>
                        )}
                      </td>

                      <td className="text-center">
                        {st.status === 'pending' ? (
                          <span className="text-primary">
                            <Spinner animation="border" size="sm" className="me-1" />
                            Uploading
                          </span>
                        ) : st.status === 'success' ? (
                          <span className="text-success">✅</span>
                        ) : st.status === 'error' ? (
                          <span className="text-danger">❌</span>
                        ) : file.isArchive ? (
                          isExtracting ? 'Extracting...' : 'Ready'
                        ) : (
                          '⏳'
                        )}
                      </td>
                      <td className="small">{st.message}</td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
        </div>
      )}

      {totalCount > 0 && completedCount === totalCount && (
        <Alert variant="success" className="mt-4">
          <i className="bi bi-check-circle-fill me-2"></i>
          <strong>Processing complete!</strong> {completedCount} files have been processed.
        </Alert>
      )}
    </Container>
  );
};

export default BulkSubmission;
