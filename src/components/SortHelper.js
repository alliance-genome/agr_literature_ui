import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { Button, Modal, InputGroup, Form, Alert, Spinner } from 'react-bootstrap';
import axios from 'axios';
import { api } from '../api';
import PropTypes from 'prop-types';

/**
 * NewTaxonModal Component
 */
export const NewTaxonModal = () => {
  const accessToken = useSelector(state => state.isLogged.accessToken);
  const [show, setShow] = useState(false);
  const [taxonId, setTaxonId] = useState('');
  const [ateamResponse, setAteamResponse] = useState('');
  const [ateamSuccess, setAteamSuccess] = useState(false);
  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);
  const defaultBodyText = "Import NCBI Taxon into A-team system for autocomplete here.\nOnly put in the digits part of the NCBI Taxon ID.\n\n";

  const importTaxon = (taxonId) => {
    axios.get(`${process.env.REACT_APP_ATEAM_API_BASE_URL}api/ncbitaxonterm/NCBITaxon:${taxonId}`, {
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${accessToken}`
      }
    })
    .then(res => {
      let success = false;
      if (res.data.entity && res.data.entity.curie) { success = true; }
      if (success) {
        setAteamResponse(`${res.data.entity.curie} created in A-team system`);
        setAteamSuccess(true);
      } else {
        setAteamResponse('Unknown failure to create in A-team system');
        setAteamSuccess(false);
      }
    })
    .catch(error => {
      console.error('Error importing taxon:', error);
      setAteamResponse('Error importing taxon');
      setAteamSuccess(false);
    });
  };

  const handleKeyPress = (event) => {
    if (event.charCode === 13) { // Enter key
      importTaxon(taxonId);
    }
  };

  return (
    <>
      <Button variant="outline-primary" size="sm" onClick={handleShow}>Create New Taxon</Button>
      <Modal show={show} onHide={handleClose}>
        <Modal.Header closeButton>
          <Modal.Title>New Taxon</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <pre>{defaultBodyText}</pre>
          {ateamResponse && (
            ateamSuccess ? <span style={{ color: 'green' }}>{ateamResponse}</span>
              : <span style={{ color: 'red' }}>{ateamResponse}</span>
          )}
          <InputGroup className="mb-2">
            <Form.Control
              placeholder="e.g., 2489"
              type="text"
              id="taxonIdField"
              name="taxonIdField"
              value={taxonId}
              onChange={(e) => setTaxonId(e.target.value)}
              onKeyPress={handleKeyPress}
            />
            <Button type="submit" size="sm" onClick={() => importTaxon(taxonId)}>Import NCBI Taxon</Button>
          </InputGroup>
        </Modal.Body>
      </Modal>
    </>
  );
};

/**
 * FileElement Component
 * Provides functionality to download a file associated with a reference.
 */
export const FileElement = ({ referenceCurie }) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState('');

  const handleDownload = async () => {
    setIsDownloading(true);
    setError('');

    try {
      const response = await api.get(`/references/${referenceCurie}/download`, {
        responseType: 'blob', // Important for file downloads
      });

      // Create a link element, use it to download the file, then remove it
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;

      // Extract filename from headers or set a default name
      const contentDisposition = response.headers['content-disposition'];
      let fileName = 'downloaded_file';
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (fileNameMatch && fileNameMatch.length === 2)
          fileName = fileNameMatch[1];
      }

      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (error) {
      console.error('Error downloading file:', error);
      setError('Failed to download the file. Please try again later.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <>
      <Button variant="outline-secondary" size="sm" onClick={handleDownload} disabled={isDownloading}>
        {isDownloading ? (
          <>
            <Spinner
              as="span"
              animation="border"
              size="sm"
              role="status"
              aria-hidden="true"
            />{' '}
            Downloading...
          </>
        ) : (
          'Download File'
        )}
      </Button>
      {error && <Alert variant="danger" className="mt-2">{error}</Alert>}
    </>
  );
};

FileElement.propTypes = {
  referenceCurie: PropTypes.string.isRequired,
};
