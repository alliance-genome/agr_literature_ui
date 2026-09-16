import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { Alert, Spinner } from 'react-bootstrap';
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";

import { api } from "../api";
import { AgGridReact } from 'ag-grid-react';
import { handleGridCopy } from '../utils/gridCopyHandler';
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

// Alliance image permissions: a resource can carry several grants when the
// permission differs by publication year (e.g. J Neurosci pre-2010 /
// 2010-2014 / 2014-2025), so each formatter labels every entry with its year
// range when one exists.
const permissionYearRange = (perm) => {
  if (perm.start_year == null && perm.end_year == null) return '';
  return `${perm.start_year ?? ''}-${perm.end_year ?? ''}`;
};

const withYearRange = (perm, text) => {
  const range = permissionYearRange(perm);
  return range ? `${range}: ${text}` : text;
};

// valueGetters (not valueFormatters) so AG Grid's text filter and sort work
// on the readable string rather than on "[object Object]".
const permissionsGetter = (field) => (params) => {
  const perms = params.data?.alliance_permissions;
  if (!Array.isArray(perms)) return '';
  return perms
    .filter((perm) => perm[field] != null && perm[field] !== '')
    .map((perm) => withYearRange(perm, perm[field]))
    .join(' | ');
};

const canDisplayImagesGetter = (params) => {
  const perms = params.data?.alliance_permissions;
  if (!Array.isArray(perms) || perms.length === 0) return '';
  return perms
    .map((perm) => withYearRange(perm, perm.can_display_images ? 'yes' : 'no'))
    .join(' | ');
};

const Resources = () => {
  const [rowData, setRowData] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [gridHeight, setGridHeight] = useState(500);
  const gridContainerRef = useRef(null);

  const MIN_GRID_HEIGHT = 300;
  const BOTTOM_PADDING = 16;

  const updateGridHeight = useCallback(() => {
    const el = gridContainerRef.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top;
    const available = window.innerHeight - top - BOTTOM_PADDING;
    setGridHeight(Math.max(available, MIN_GRID_HEIGHT));
  }, []);

  useEffect(() => {
    updateGridHeight();
    const ro = new ResizeObserver(updateGridHeight);
    ro.observe(document.body);
    return () => ro.disconnect();
  }, [updateGridHeight]);

  const columnDefs = useMemo(() => [
    { headerName: 'Resource Id', field: 'resource_id' },
    { headerName: 'Curie', field: 'curie' },
    { headerName: 'Title', field: 'title' },
    { headerName: 'Title Synonyms', field: 'title_synonyms', valueFormatter: arrayFormatter },
    { headerName: 'Title Abbreviation', field: 'title_abbreviation' },
    { headerName: 'Title Abbreviation Synonyms', field: 'title_abbreviation_synonyms', valueFormatter: arrayFormatter },
    { headerName: 'Copyright Date', field: 'copyright_date' },
    { headerName: 'Publisher', field: 'publisher' },
    { headerName: 'Pages', field: 'pages' },
    { headerName: 'Volumes', field: 'volumes', valueFormatter: arrayFormatter },
    { headerName: 'Cross References', field: 'cross_references', cellRenderer: CrossReferencesCellRenderer },
    { headerName: 'Editors', field: 'editors', valueFormatter: editorsFormatter },
    { headerName: 'Copyright License Id', field: 'copyright_license_id' },
    { headerName: 'Copyright License', field: 'copyright_license' },
    { headerName: 'License List', field: 'license_list', valueFormatter: arrayFormatter },
    { headerName: 'License Start Year', field: 'license_start_year' },
    { headerName: 'Alliance Permission', colId: 'alliance_permission',
      valueGetter: permissionsGetter('name') },
    { headerName: 'Alliance Can Display Images', colId: 'alliance_can_display_images',
      valueGetter: canDisplayImagesGetter },
    { headerName: 'Alliance Attribution Text', colId: 'alliance_attribution_text',
      valueGetter: permissionsGetter('permission_text') },
    { headerName: 'Alliance Permission Notes', colId: 'alliance_permission_notes',
      valueGetter: permissionsGetter('notes') },
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
        setRowData(data);
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
            <div ref={gridContainerRef} className="ag-theme-quartz" onCopy={handleGridCopy} style={{ width: '100%', height: gridHeight }}>
              <AgGridReact
                rowData={rowData}
                columnDefs={columnDefs}
                defaultColDef={defaultColDef}
                enableCellTextSelection={true}
                ensureDomOrder={true}
                suppressColumnVirtualisation={true}
                pagination={true}
                paginationPageSize={20}
              />
            </div>
          )}
        </Col>
      </Row>
    </Container>
  );
};

export default Resources;
