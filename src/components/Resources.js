import React, { useEffect, useState, useMemo } from 'react';
import { Alert, Spinner } from 'react-bootstrap';
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";

import { api } from "../api";
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';

const CrossReferencesCellRenderer = (params) => {
  if (!params.value || !Array.isArray(params.value)) return null;
  return (
    <span>
      {params.value.map((xref, i) => (
        <span key={i}>
          {i > 0 && ', '}
          {xref.url ? (
            <a href={xref.url} target="_blank" rel="noopener noreferrer">{xref.curie}</a>
          ) : (
            xref.curie
          )}
        </span>
      ))}
    </span>
  );
};

const arrayFormatter = (params) => {
  if (!params.value || !Array.isArray(params.value)) return '';
  return params.value.join(', ');
};

const editorsFormatter = (params) => {
  if (!params.value || !Array.isArray(params.value)) return '';
  return params.value.map(editor => {
    if (editor.name) return editor.name;
    return [editor.first_name, editor.last_name].filter(Boolean).join(' ');
  }).join(', ');
};

const Resources = () => {
  const [rowData, setRowData] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  const columnDefs = useMemo(() => [
    { headerName: 'Resource Id', field: 'resource_id' },
    { headerName: 'Curie', field: 'curie' },
    { headerName: 'Title', field: 'title' },
    { headerName: 'Title Synonyms', field: 'title_synonyms', valueFormatter: arrayFormatter },
    { headerName: 'Abbreviation Synonyms', field: 'abbreviation_synonyms', valueFormatter: arrayFormatter },
    { headerName: 'Iso Abbreviation', field: 'iso_abbreviation' },
    { headerName: 'Medline Abbreviation', field: 'medline_abbreviation' },
    { headerName: 'Copyright Date', field: 'copyright_date' },
    { headerName: 'Publisher', field: 'publisher' },
    { headerName: 'Print Issn', field: 'print_issn' },
    { headerName: 'Online Issn', field: 'online_issn' },
    { headerName: 'Pages', field: 'pages' },
    { headerName: 'Volumes', field: 'volumes', valueFormatter: arrayFormatter },
    { headerName: 'Abstract', field: 'abstract' },
    { headerName: 'Summary', field: 'summary' },
    { headerName: 'Cross References', field: 'cross_references', cellRenderer: CrossReferencesCellRenderer },
    { headerName: 'Editors', field: 'editors', valueFormatter: editorsFormatter },
    { headerName: 'Open Access', field: 'open_access' },
    { headerName: 'Copyright License Id', field: 'copyright_license_id' },
    { headerName: 'Copyright License', field: 'copyright_license' },
    { headerName: 'License List', field: 'license_list', valueFormatter: arrayFormatter },
    { headerName: 'License Start Year', field: 'license_start_year' },
    { headerName: 'Date Created', field: 'date_created' },
    { headerName: 'Date Updated', field: 'date_updated' },
    { headerName: 'Created By', field: 'created_by' },
    { headerName: 'Updated By', field: 'updated_by' },
  ], []);

  const defaultColDef = useMemo(() => ({
    filter: true,
    sortable: true,
    resizable: true,
  }), []);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingData(true);
      setFetchError(null);
      try {
        const result = await api.get('/resource/show_all');
        const data = Array.isArray(result.data) ? result.data : [];
        const processed = data.map(row => ({
          ...row,
          open_access: row.open_access === true ? 'true' : row.open_access === false ? 'false' : '',
        }));
        setRowData(processed);
      } catch (error) {
        console.error('Error fetching resources:', error);
        setFetchError('Failed to load resources. Please try again later.');
      } finally {
        setIsLoadingData(false);
      }
    };
    fetchData();
  }, []);

  return (
    <Container fluid>
      <Row className="justify-content-center">
        <Col>
          <h3>Resources</h3>
          {isLoadingData ? (
            <div className="text-center"><Spinner animation="border" /></div>
          ) : fetchError ? (
            <Alert variant="danger">{fetchError}</Alert>
          ) : (
            <div className="ag-theme-quartz" style={{ width: '100%' }}>
              <AgGridReact
                rowData={rowData}
                columnDefs={columnDefs}
                defaultColDef={defaultColDef}
                pagination={true}
                paginationPageSize={20}
                domLayout="autoHeight"
              />
            </div>
          )}
        </Col>
      </Row>
    </Container>
  );
};

export default Resources;
