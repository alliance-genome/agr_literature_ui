import { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { useSelector } from 'react-redux';
import axios from "axios";
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import { Spinner, Form, Modal, Button, Container, Row, Col } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faExclamation } from '@fortawesome/free-solid-svg-icons';
import { postWorkflowTag, patchWorkflowTag, deleteWorkflowTag } from './WorkflowTagService'

import BiblioPreferenceControls from '../settings/BiblioPreferenceControls';

const file_upload_process_atp_id = "ATP:0000140";

export const timestampToDateFormatter = (params) => {
  if (params.value === null) { return ''; }	// e.g. aggregated_curation_status_and_tet_info without tet
  if (params.value === '') { return ''; }	// e.g. indexing priority
  const date = new Date(params.value + 'Z');	// force treat it as UTC
  const pad = (n) => n.toString().padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1); // Months are 0-indexed
  const day = pad(date.getDate());
  let hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours === 0 ? 12 : hours; // 0 becomes 12 in 12-hour format
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} ${ampm}`;
};


const BiblioWorkflow = () => {
  const referenceJsonLive = useSelector(state => state.biblio.referenceJsonLive);
  const referenceCurie = referenceJsonLive["curie"];
  const accessToken = useSelector((state) => state.isLogged.accessToken);
  const cognitoMod = useSelector(state => state.isLogged.cognitoMod);
  const testerMod = useSelector(state => state.isLogged.testerMod);
  const email = useSelector((state) => state.isLogged.email);
  let accessLevel = testerMod !== 'No' ? testerMod : cognitoMod;

  const [items, setItems] = useState([]);
  const [colDefs, setColDefs] = useState([]);
  const [isGridReady, setIsGridReady] = useState(false);
  const gridRef = useRef();
  const apiRef = useRef(null);

  const [notification, setNotification] = useState({ show: false, message: '', variant: 'success' });
  const showNotification = (message, variant = 'success') =>
    setNotification({ show: true, message, variant });
  const hideNotification = () => setNotification({ show: false, message: '', variant: 'success' });

  const onGridReady = useCallback((params) => {
    apiRef.current = params.api;
    setIsGridReady(true);
  }, []);
//   const getGridApi = useCallback( () => apiRef.current, [] );

//   const [gridApi, setGridApi] = useState(null);
//   const onGridReady = (params) => { setGridApi(params.api); };
  const getGridApi = useCallback(() => apiRef.current || gridRef.current?.api || null, []);

  const [data, setData] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [key, setKey] = useState(0);
  const [curationData, setCurationData] = useState([]);
  const [curationWholePaperData, setCurationWholePaperData] = useState([]);
  const [curationStatusOptions, setCurationStatusOptions] = useState([]);
  const [curationTagOptions, setCurationTagOptions] = useState([]);
  const [reloadCurationDataTable, setReloadCurationDataTable] = useState(0);
  const [showApiErrorModal, setShowApiErrorModal] = useState(false);
  const [apiErrorMessage, setApiErrorMessage] = useState('');
  const [indexingWorkflowData, setIndexingWorkflowData] = useState([]);
  const [indexingPriorityData, setIndexingPriorityData] = useState([]);
   
  const REST = process.env.REACT_APP_RESTAPI;

  const fmtScore = (s) => (s == null ? '' : Number.isFinite(Number(s)) ? Number(s).toFixed(2) : s);
    
  const fetchIndexingPriorityRow = useCallback(async () => {

    const url = `${REST}/indexing_priority/get_priority_tag/${referenceCurie}/${accessLevel}`;
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };

    // helper to normalize shapes safely
    const normalize = (payload) => {
      let ip = payload?.current_priority_tag ?? null;
      if (Array.isArray(ip)) ip = ip[0] ?? null;
      const rawAll = payload?.all_priority_tags ?? {};
      let options = [];
      if (Array.isArray(rawAll)) {	
	// tolerate [{curie,name}] or {entity:{curie,name}}
	options = rawAll
          .map((e) => {
            const ent = e?.entity ?? e;
            return ent?.curie && ent?.name
              ? { value: ent.curie, label: ent.name }
              : null;
          })
          .filter(Boolean);
      } else {
        options = Object.entries(rawAll).map(([value, label]) => ({ value, label }));
      }
      return { ip, options };
    };
    try {
      const res = await axios.get(url, { headers });
      const payload = res.data || {};
      const { ip, options } = normalize(payload);
      return {
        section: 'Indexing Priority',
        workflow_tag: ip?.indexing_priority ?? '',
        confidence_score: fmtScore(ip?.confidence_score),
        curator: ip?.updated_by_name ?? ip?.updated_by_email ?? '',
        date_updated: ip?.date_updated ?? '',
        options,
        indexing_priority_id: ip?.indexing_priority_id ?? null,
      };
    } catch (err) {
      console.error('[IndexingPriority] GET failed:', err);
    }
    return {
      section: 'Indexing Priority',
      workflow_tag: '',
      confidence_score: '',
      curator: '',
      date_updated: '',
      options: [],
      indexing_priority_id: null,
    };
  }, [REST, referenceCurie, accessLevel, accessToken]);

  // Existing: fetch overview for manual indexing + community curation
  const fetchIndexingWorkflowOverview = useCallback(
    async () => {
      const url =
        `${REST}` +
        `/workflow_tag/indexing-community/${referenceCurie}/${accessLevel}`;
      const wantIP = accessLevel === 'ZFIN';
      try {
	const headers = {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        };
	  
        // fetch WFT + IP (only for ZFIN)
	const [wftRes, ipRow] = await Promise.all([
          axios.get(url, { headers }),
	  wantIP ? fetchIndexingPriorityRow() : Promise.resolve(null),
        ]);
	  
        const respData = wftRes.data || {};
        const sectionOrder = [
          'community curation',
          'manual indexing'
        ];
        const sectionDisplayNames = {
          'community curation': 'Community Curation',
          'manual indexing': 'Manual Indexing',
        };

        const rowsFromWFT = sectionOrder
          .filter(sectionKey => sectionKey in respData)
          .map(sectionKey => {
            const sectionInfo = respData[sectionKey] || {};
            const allTagsObj = sectionInfo.all_workflow_tags || {};
            const currentArr = sectionInfo.current_workflow_tag || [];

            let currentValue = '';
            let curator = '';
            let curation_tag = '';
            let note = '';
            let date_updated = '';
            let reference_workflow_tag_id = null;
            if (currentArr.length > 0) {
              const currentTag = currentArr[0];
              currentValue = currentTag.workflow_tag_id;
              curator = currentTag.updated_by_name ?? currentTag.updated_by_email ?? '';;
              note = currentTag.note;
              curation_tag = currentTag.curation_tag;
              date_updated = currentTag.date_updated;
              reference_workflow_tag_id = currentArr[0].reference_workflow_tag_id;
            }

            const options = Object.entries(allTagsObj).map(([id, label]) => ({
              value: id,
              label: label,
            }));

            return {
              section: sectionDisplayNames[sectionKey],
              workflow_tag: currentValue,
	      confidence_score: '',	
              curator,
              date_updated,
              note: note,
              curation_tag: curation_tag,
              options,
              reference_workflow_tag_id, // used by workflow_tag PATCH/POST
            };
          });
        if (wantIP && ipRow) setIndexingPriorityData([ipRow]);
        else setIndexingPriorityData([]);
	setIndexingWorkflowData(rowsFromWFT);  
      } catch (error) {
        console.error('Error fetching workflow overview:', error);
      }
    },
    [REST, referenceCurie, accessLevel, accessToken, fetchIndexingPriorityRow]
  );

  useEffect(() => {
    fetchIndexingWorkflowOverview();
  }, [fetchIndexingWorkflowOverview]);

  useEffect(() => {
    const fetchWFTdata = async () => {
      const url = REST + "/workflow_tag/get_current_workflow_status/" + referenceCurie + "/all/" + file_upload_process_atp_id;
      setIsLoadingData(true);
      try {
        const result = await axios.get(url, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'mode': 'cors',
            'Content-Type': 'application/json',
          }
        });
        const processedData = result.data.map((item) => ({
          ...item,
          updated_by: item.email ? item.email : item.updated_by,
        }));
        setData(processedData);
        setKey(prevKey => prevKey + 1);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoadingData(false);
      }
    };
    fetchWFTdata();
  }, [REST, referenceCurie, accessToken]);

  useEffect(() => {
    const fetchCurationStatuses = async () => {
      // REST /ontology/search_descendants/{ancestor_curie}/{direct_children_only}/{include_self}/{include_names}
      const urls = {
        curationStatus: `${process.env.REACT_APP_RESTAPI}/ontology/search_descendants/ATP:0000230/true/false/true`,
        curationTag1: `${process.env.REACT_APP_RESTAPI}/ontology/search_descendants/ATP:0000208/false/true/true`,
        curationTag2: `${process.env.REACT_APP_RESTAPI}/ontology/search_descendants/ATP:0000227/false/true/true`,
      };
      try {
        const headers = {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        };
        const [curationStatusResult, curationTagResult1, curationTagResult2] = await Promise.all([
          axios.get(urls.curationStatus, { headers }),
          axios.get(urls.curationTag1, { headers }),
          axios.get(urls.curationTag2, { headers }),
        ]);
        const curationStatusOptionsObjs = curationStatusResult.data.map(entity => ({
              value: entity.curie,
              label: entity.name,
            }));
        const curationTagResultEntities1 = curationTagResult1.data;
        const curationTagResultEntities2 = curationTagResult2.data;
        const curationTagOptionsObjs = [
            ...curationTagResultEntities1, ...curationTagResultEntities2].map(entity => ({
          value: entity.curie,
          label: entity.name,
        }));
        setCurationStatusOptions(curationStatusOptionsObjs);
        setCurationTagOptions(curationTagOptionsObjs);

        if (!apiRef.current) return;
        if (
          curationStatusOptionsObjs.length > 0 ||
          curationTagOptionsObjs.length > 0
        ) {
          apiRef.current.resetRowHeights();
        }
      } catch (error) {
        console.error('Error fetching ateam curation status options:', error);
      }
    };
    fetchCurationStatuses();
  }, [accessToken]);

  useEffect(() => {
    const fetchCurationData = async () => {
      const curationUrl =
        REST +
        `/curation_status/aggregated_curation_status_and_tet_info/${referenceCurie}/${accessLevel}`;
      try {
        const result = await axios.get(curationUrl);

        const processedCurationData = result.data
          .map(info => {
            return {
              topic_name: info.topic_name,
              topic_curie: info.topic_curie,
              curation_status_id: info.curst_curation_status_id || 'new',
              curation_status: info.curst_curation_status || null,
              curation_status_updated: info.curst_date_updated || '',
              curator: (info.curst_updated_by_name !== null) ? info.curst_updated_by_name : info.curst_updated_by,
              note: info.curst_note || null,
              curation_tag: info.curst_curation_tag || null,
              has_data: info.tet_info_has_data,
              new_data: info.tet_info_new_data,
              no_data: info.tet_info_no_data,
              topic_source: Array.isArray(info.tet_info_topic_source)
                ? info.tet_info_topic_source.join(', ')
                : info.tet_info_topic_source,
              topic_added: info.tet_info_date_created || '',
            };
          })
          .sort((a, b) => a.topic_name.localeCompare(b.topic_name));

        const wholePaperEntry = processedCurationData.find(item => item.topic_curie === 'ATP:0000002') || {
          topic_name: 'topic tag',
          topic_curie: 'ATP:0000002',
          curation_status_id: 'new',
          curation_status: null,
          curation_status_updated: null,
          curator: null,
          note: null,
          curation_tag: null,
          has_data: null,
          new_data: null,
          no_data: null,
          topic_source: null,
          topic_added: null,
        };
        const restOfCurationData = processedCurationData
          .filter(item => item.topic_curie !== 'ATP:0000002')
          .sort((a, b) => a.topic_name.localeCompare(b.topic_name));
        wholePaperEntry.topic_name = 'Whole Paper';
        setCurationWholePaperData([wholePaperEntry]);
        setCurationData(restOfCurationData);
      } catch (error) {
        console.error('Error fetching curation data:', error);
      }
    };

    fetchCurationData();
  }, [REST, referenceCurie, accessLevel, reloadCurationDataTable]);

  const GenericWorkflowTableModal = ({ title, body, show, onHide }) => {
    return (
      <Modal show={show} onHide={onHide} centered>
        <Modal.Header closeButton>
          <Modal.Title>{title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>{body}</Modal.Body>
      </Modal>
    );
  };
    
  const columns = [
      {
	  headerName: 'MOD',
	  field: 'abbreviation',
	  flex: 1,
	  cellStyle: { textAlign: 'left' },
	  headerClass: 'wft-bold-header wft-header-bg',
	  sortable: true,
	  filter: true
      },
      {
	  headerName: 'Workflow Tag',
	  field: 'workflow_tag_name',
	  flex: 1,
	  cellStyle: { textAlign: 'left' },
	  headerClass: 'wft-bold-header wft-header-bg',
	  sortable: true,
	  filter: true
      },
      {
	  headerName: 'Updater',
	  field: 'updated_by_name',
	  flex: 1,
	  cellStyle: { textAlign: 'left' },
	  headerClass: 'wft-bold-header wft-header-bg',
	  sortable: true,
	  filter: true
      },
      {
	  headerName: 'Date Updated',
	  field: 'date_updated',
          valueFormatter: timestampToDateFormatter,
	  flex: 1,
	  cellStyle: { textAlign: 'left' },
	  headerClass: 'wft-bold-header wft-header-bg',
	  sortable: true,
	  filter: true
      },
  ];

  const renderHasData = (params) => {
    const { data } = params;
    if (data.has_data && data.no_data) {
      return <FontAwesomeIcon icon={faExclamation} style={{ color: 'red', fontWeight: 'bold' }} />;
    }
    return data.has_data ? <FontAwesomeIcon icon={faCheck} style={{ color: 'green', fontWeight: 'bold' }} /> : null;
  };

  const renderNoData = (params) => {
    const { data } = params;
    if (data.has_data && data.no_data) {
      return <FontAwesomeIcon icon={faExclamation} style={{ color: 'red', fontWeight: 'bold' }} />;
    }
    return data.no_data ? <FontAwesomeIcon icon={faCheck} style={{ color: 'green', fontWeight: 'bold' }} /> : null;
  };

  const renderNovelData = (params) => {
    return params.value ? <FontAwesomeIcon icon={faCheck} style={{ color: 'green', fontWeight: 'bold' }} /> : null;
  };

  const setDataTopicsInProgress = async () => {
    const entriesToUpdate = curationData.filter(entry =>
      entry.curation_status_id === "new" &&
      (entry.has_data === true || entry.new_data === true)
    );
    const updatePromises = entriesToUpdate.map(entry => {
      const json_data = {
        curation_status: 'ATP:0000237',
        mod_abbreviation: accessLevel,
        topic: entry.topic_curie,
        reference_curie: referenceCurie
      };
      const subPath = "/curation_status/";
      const method = "POST";
      return updateCurationStatus(subPath, method, json_data)
        .catch(err => {
          console.warn(`Failed to update curation status for ${entry.topic_name} ${entry.topic_curie}`, err);
        });
    });
    await Promise.all(updatePromises);
  }

  const CurationStatusWholePaper = () => {
    const handleChange = async (e, field) => {	// this function doesn't seem to be used anywhere, functionality is in onCellValueChanged
      const newValue = e.target.value;
      let json_data = {};
      if (field === 'curation_status') {
        if (newValue === (curationWholePaperData.curation_status ?? "")) { return; }
        if (newValue === 'ATP:0000237') { setDataTopicsInProgress(); }
        json_data = { curation_status: newValue }; }
      else if (field === "note") {
        if (newValue === (curationWholePaperData.note ?? "")) return;
        if (curationWholePaperData.curation_status_id === 'new') {
          console.warn("Note can't be saved until a curation status exists.");
          return;
        }
        json_data = { note: newValue }; }
      let subPath = "/curation_status/";
      let method = "PATCH";
      if (curationWholePaperData.curation_status_id === 'new') {
        method = "POST";
        json_data["mod_abbreviation"] = accessLevel;
        json_data["topic"] = curationWholePaperData.topic_curie;
        json_data["reference_curie"] = referenceCurie; }
      else {
        subPath = "/curation_status/" + curationWholePaperData.curation_status_id; }
      try {
        await updateCurationStatus(subPath, method, json_data);
      } catch (err) {
        console.warn("Failed to update curation status", err);
      }
    };
    const isValidCurationStatus = curationStatusOptions.some(option => option.value === curationWholePaperData.curation_status);
    return (
      <div style={containerStyle}>
        {showApiErrorModal && (
          <GenericWorkflowTableModal title="Api Error" body={apiErrorMessage} show={showApiErrorModal} onHide={() => setShowApiErrorModal(false)} />
        )}
        <div className="ag-theme-quartz" style={{ width: '80%', height: 45, marginBottom: 40 }}>
          <AgGridReact
            rowData={curationWholePaperData}
            columnDefs={curationWholePaperColumns}
            singleClickEdit={true}
            domLayout="normal"
            getRowClass={() => 'ag-row-striped-light'}
            popupParent={document.body}
            headerHeight={0}
            onCellValueChanged={onCellValueChanged}
          />
        </div>
      </div>
    );
  };

  const GeneralizedDropdownRenderer = ({ value, node, colDef, options, validateFn, errorMessage, isDisabled = false, }) => {
    const isValid = validateFn ? validateFn(value) : true;
    const rowIndex = node?.rowIndex;
    const rowClass = rowIndex % 2 === 0 ? 'ag-row-striped-dark' : 'ag-row-striped-light';
    const handleChange = (e) => { node.setDataValue(colDef.field, e.target.value); };
    return (
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, padding: '4px 8px',
        display: 'flex', flexDirection: 'column', justifyContent: 'center', boxSizing: 'border-box',
      }}>
        {!isValid && value && (
          <div style={{ color: 'red', fontSize: '0.8em', marginBottom: '2px' }}>{errorMessage ?? "Invalid value"}</div>)}
        <select
          value={value ?? ""}
          onChange={handleChange}
          className={rowClass}
          disabled={isDisabled}
          style={{ width: '100%', height: '100%', border: '1px solid #ccc', borderRadius: '6px', }}
        >
          {!isValid && value && <option value={value}>{value}</option>}
          {(
            !value ||
            colDef.field === 'curation_tag' ||
            ( (colDef.field === 'curation_status' || colDef.field === 'workflow_tag') && !node?.data?.curation_tag && !node?.data?.note)
          ) && <option value=""></option>}
          {options.map(opt => ( <option key={opt.value} value={opt.value}>{opt.label}</option>))}
        </select>
      </div>
    );
  };

  // ---------------------------
  // Default items (Hide/Show list)
  // ---------------------------
  const itemsInit = useMemo(
    () => [
      { headerName: 'Topic', field: 'topic_name', id: 1, checked: true },
      { headerName: 'Topic for curation', field: 'topic_name', id: 2, checked: true },
      { headerName: 'Curation Status', field: 'curation_status', id: 3, checked: true },
      { headerName: 'Curator', field: 'curator', id: 4, checked: true },
      { headerName: 'Has data', field: 'has_data', id: 5, checked: true },
      { headerName: 'New data', field: 'new_data', id: 6, checked: true },
      { headerName: 'No data', field: 'no_data', id: 7, checked: true },
      { headerName: 'Topic Source', field: 'topic_source', id: 8, checked: true },
      { headerName: 'Topic Added', field: 'topic_added', id: 9, checked: true },
      { headerName: 'Curation Status updated', field: 'curation_status_updated', id: 10, checked: true },
      { headerName: 'Curation Tag', field: 'curation_tag', id: 11, checked: true },
      { headerName: 'Note', field: 'note', id: 12, checked: true }
    ],
    []
  );

  // keep this for structure like TET one, even though it doesn't have itemsInitSGD to switch between
  const getInitialItems = useCallback(
    () => itemsInit,
    [itemsInit]
  );

  // ---------------------------
  // Column definitions
  // ---------------------------
  const curationWholePaperColumns = [
      {
	headerName: 'Topic for curation',
	field: 'topic_name',
	flex: 1,
	cellStyle: { textAlign: 'left' },
	headerClass: 'wft-bold-header wft-header-bg',
      },
      {
        headerName: 'Curation Status',
        field: 'curation_status',
        flex: 1,
        cellStyle: { textAlign: 'left' },
        headerClass: 'wft-bold-header wft-header-bg',
        cellRenderer: GeneralizedDropdownRenderer,
        cellRendererParams: (params) => ({
          value: params.value,
          node: params.node,
          colDef: params.colDef,
          options: curationStatusOptions, // Assumes format: [{ value, label }]
          validateFn: (val) => curationStatusOptions.some(option => option.value === val),
          errorMessage: 'INVALID ATP ID: Choose Another',
          isDisabled: false,
        })
      },
      {
	headerName: 'Curator',
	field: 'curator',
	flex: 1,
	cellStyle: { textAlign: 'left' },
	headerClass: 'wft-bold-header wft-header-bg',
      },
      {
	headerName: 'Curation Status updated',
	field: 'curation_status_updated',
        valueFormatter: timestampToDateFormatter,
	flex: 1,
	cellStyle: { textAlign: 'left' },
	headerClass: 'wft-bold-header wft-header-bg',
      },
      {
	headerName: 'Curation Tag',
	field: 'curation_tag',
	flex: 1,
	cellStyle: { textAlign: 'left' },
	headerClass: 'wft-bold-header wft-header-bg',
        cellRenderer: GeneralizedDropdownRenderer,
        cellRendererParams: (params) => {
          const isValidCurationStatus = curationStatusOptions.some(option => option.value === params.data?.curation_status);
          return {
            value: params.value,
            node: params.node,
            colDef: params.colDef,
            options: curationTagOptions, // Assumes format: [{ value, label }]
            validateFn: (val) => curationTagOptions.some(option => option.value === val),
            errorMessage: 'INVALID Curation Tag: Choose Another',
            isDisabled: !isValidCurationStatus,
          };
        },
	sortable: true,
	filter: true
      },
      {
        headerName: 'Note',
        field: 'note',
        flex: 3,
        cellStyle: { textAlign: 'left' },
        headerClass: 'wft-bold-header wft-header-bg',
        editable: (params) => {
          // note is only editable if curation_status is valid
          return curationStatusOptions.some(option => option.value === params.data?.curation_status);
        },
        cellRenderer: (params) => {
          const isValidCurationStatus = curationStatusOptions.some(option => option.value === params.data?.curation_status);
          // note is only displayed if it has data, placeholder displayed only if curation_status is valid
          if (params.value) { return params.value; }
          else if (isValidCurationStatus) { return 'Add Note here'; }
          else { return ''; }
        },
        cellEditor: 'agLargeTextCellEditor',
        cellEditorPopup: true,
        cellEditorParams: {
          maxLength: 2000
        },
      },
  ];

  const curationColumns = useMemo(
    () => [
      {
	headerName: 'Topic for curation',
	field: 'topic_name',
	flex: 1,
	cellStyle: { textAlign: 'left' },
	headerClass: 'wft-bold-header wft-header-bg',
	sortable: true,
	filter: true
      },
      {
        headerName: 'Curation Status',
        field: 'curation_status',
        flex: 1,
        cellStyle: { textAlign: 'left' },
        headerClass: 'wft-bold-header wft-header-bg',
        cellRenderer: GeneralizedDropdownRenderer,
        cellRendererParams: (params) => ({
          value: params.value,
          node: params.node,
          colDef: params.colDef,
          options: curationStatusOptions, // Assumes format: [{ value, label }]
          validateFn: (val) => curationStatusOptions.some(option => option.value === val),
          errorMessage: 'INVALID ATP ID: Choose Another',
          isDisabled: false,
        }),
        sortable: true,
        filter: true,
      },
      {
	headerName: 'Curator',
	field: 'curator',
	flex: 1,
	cellStyle: { textAlign: 'left' },
	headerClass: 'wft-bold-header wft-header-bg',
	sortable: true,
	filter: true
      },
      {
	  headerName: 'Topic Data',
	  headerClass: 'wft-bold-header wft-header-bg',
	  children: [
              {
		  headerName: 'Has data',
		  field: 'has_data',
		  width: 120,
		  cellRenderer: renderHasData,
		  headerClass: 'wft-bold-header wft-header-bg',
		  cellStyle: { textAlign: 'center' }
	      },
              {
		  headerName: 'New data',
		  field: 'new_data',
		  width: 120,
		  cellRenderer:
		  renderNovelData,
		  headerClass: 'wft-bold-header wft-header-bg',
		  cellStyle: { textAlign: 'center' }
	      },
              {
		  headerName: 'No data',
		  field: 'no_data',
		  width: 120,
		  cellRenderer: renderNoData,
		  headerClass: 'wft-bold-header wft-header-bg',
		  cellStyle: { textAlign: 'center' }
	      },
	  ]
      },
      {
	  headerName: 'Topic Source',
	  field: 'topic_source',
	  flex: 1,
	  cellStyle: { textAlign: 'left' },
	  headerClass: 'wft-bold-header wft-header-bg',
	  sortable: true,
	  filter: true
      },
      {
	  headerName: 'Topic Added',
	  field: 'topic_added',
          valueFormatter: timestampToDateFormatter,
	  flex: 1,
	  cellStyle: { textAlign: 'left' },
	  headerClass: 'wft-bold-header wft-header-bg',
	  sortable: true,
	  filter: true
      },
      {
	headerName: 'Curation Status updated',
	field: 'curation_status_updated',
        valueFormatter: timestampToDateFormatter,
	flex: 1,
	cellStyle: { textAlign: 'left' },
	headerClass: 'wft-bold-header wft-header-bg',
	sortable: true,
	filter: true
      },
      {
	headerName: 'Curation Tag',
	field: 'curation_tag',
	flex: 1,
	cellStyle: { textAlign: 'left' },
	headerClass: 'wft-bold-header wft-header-bg',
        cellRenderer: GeneralizedDropdownRenderer,
        cellRendererParams: (params) => {
          const isValidCurationStatus = curationStatusOptions.some(option => option.value === params.data?.curation_status);
          return {
            value: params.value,
            node: params.node,
            colDef: params.colDef,
            options: curationTagOptions, // Assumes format: [{ value, label }]
            validateFn: (val) => curationTagOptions.some(option => option.value === val),
            errorMessage: 'INVALID Curation Tag: Choose Another',
            isDisabled: !isValidCurationStatus,
          };
        },
	sortable: true,
	filter: true
      },
      {
        headerName: 'Note',
        field: 'note',
        flex: 1,
        cellStyle: { textAlign: 'left' },
        headerClass: 'wft-bold-header wft-header-bg',
        editable: (params) => {
          // note is only editable if curation_status is valid
          return curationStatusOptions.some(option => option.value === params.data?.curation_status);
        },
        cellEditor: 'agLargeTextCellEditor',
        cellEditorPopup: true,
        cellEditorParams: {
            maxLength: 2000
        },
        sortable: true,
        filter: true
      },
    ],
    []
  );

  const indexingPriorityColumns = [
    {
      headerName: 'Workflow Status',
      field: 'workflow_tag',
      flex: 1,
      cellStyle: { textAlign: 'left' },
      headerClass: 'wft-bold-header wft-header-bg',
      cellRenderer: GeneralizedDropdownRenderer,
      cellRendererParams: (params) => ({
        value: params.value,
        node: params.node,
        colDef: params.colDef,
        options: params.data.options,
        validateFn: (val) => params.data.options.some(opt => opt.value === val),
        errorMessage: 'INVALID ATP ID',
        isDisabled: false,
      }),
      sortable: true,
      filter: true,
    },
    {
      headerName: 'Confidence Score',
      field: 'confidence_score',
      flex: 1,
      cellStyle: { textAlign: 'left' },
      headerClass: 'wft-bold-header wft-header-bg',
      sortable: true,
      filter: true,
    },
    {
      headerName: 'Curator',
      field: 'curator',
      flex: 1,
      cellStyle: { textAlign: 'left' },
      headerClass: 'wft-bold-header wft-header-bg',
      sortable: true,
      filter: true,
    },
    {
      headerName: 'Workflow Updated',
      field: 'date_updated',
      valueFormatter: timestampToDateFormatter,
      flex: 1,
      cellStyle: { textAlign: 'left' },
      headerClass: 'wft-bold-header wft-header-bg',
      sortable: true,
      filter: true,
    },
  ];
	
  const indexingWorkflowColumns = [
    {
      headerName: 'Workflow Process',
      field: 'section',
      flex: 1,
      cellStyle: { textAlign: 'left' },
      headerClass: 'wft-bold-header wft-header-bg',
      sortable: true,
      filter: true,
    },
    {
      headerName: 'Workflow Status',
      field: 'workflow_tag',
      flex: 1,
      cellStyle: { textAlign: 'left' },
      headerClass: 'wft-bold-header wft-header-bg',
      cellRenderer: GeneralizedDropdownRenderer,
      cellRendererParams: (params) => ({
        value: params.value,
        node: params.node,
        colDef: params.colDef,
        options: params.data.options,
        validateFn: (val) => params.data.options.some(opt => opt.value === val),
        errorMessage: 'INVALID ATP ID',
        isDisabled: false,
      }),
      sortable: true,
      filter: true,
    },
    {
      headerName: 'Confidence Score',
      field: 'confidence_score',
      flex: 1,
      cellStyle: { textAlign: 'left' },
      headerClass: 'wft-bold-header wft-header-bg',
      sortable: true,
      filter: true,
    },
    {
      headerName: 'Curator',
      field: 'curator',
      flex: 1,
      cellStyle: { textAlign: 'left' },
      headerClass: 'wft-bold-header wft-header-bg',
      sortable: true,
      filter: true,
    },
    {
      headerName: 'Workflow Updated',
      field: 'date_updated',
      valueFormatter: timestampToDateFormatter,
      flex: 1,
      cellStyle: { textAlign: 'left' },
      headerClass: 'wft-bold-header wft-header-bg',
      sortable: true,
      filter: true,
    },
    {
      headerName: 'Curation Tag',
      field: 'curation_tag',
      flex: 1,
      cellStyle: { textAlign: 'left' },
      headerClass: 'wft-bold-header wft-header-bg',
      cellRenderer: GeneralizedDropdownRenderer,
      cellRendererParams: (params) => {
        const isValidCurationStatus = params.data?.options?.some(option => option.value === params.data?.workflow_tag);
        return {
          value: params.value,
          node: params.node,
          colDef: params.colDef,
          options: curationTagOptions, // Assumes format: [{ value, label }]
          validateFn: (val) => curationTagOptions.some(option => option.value === val),
          errorMessage: 'INVALID Controlled Note: Choose Another',
          isDisabled: !isValidCurationStatus,
        };
      },
      sortable: true,
      filter: true
    },
    {
      headerName: 'Note',
      field: 'note',
      flex: 3,
      cellStyle: { textAlign: 'left' },
      headerClass: 'wft-bold-header wft-header-bg',
      editable: (params) => {
        // note is only editable if workflow_tag is valid
        return params.data?.options?.some(option => option.value === params.data?.workflow_tag);
      },
      cellRenderer: (params) => {
        const isValidCurationStatus = params.data?.options?.some(option => option.value === params.data?.workflow_tag);
        // note is only displayed if it has data, placeholder displayed only if workflow_tag is valid
        if (params.value) { return params.value; }
        else if (isValidCurationStatus) { return 'Add Note here'; }
        else { return ''; }
      },
      cellEditor: 'agLargeTextCellEditor',
      cellEditorPopup: true,
      cellEditorParams: {
        maxLength: 2000
      },
    },
  ];

  const updateColDefsWithItems = useCallback(
    (currentItems) => {
      const itemsByField = new Map((currentItems || []).map((i) => [i.field, i]));
      return curationColumns.map((col) => {
        const item = itemsByField.get(col.field);
        return item ? { ...col, hide: !item.checked } : col;
      });
    },
    [curationColumns]
  );

  useEffect(() => {
    const initItems = getInitialItems();
    setItems(initItems);
    setColDefs(updateColDefsWithItems(initItems));
  }, [getInitialItems, updateColDefsWithItems]);


  const containerStyle = {
    display: 'flex',
    justifyContent: 'center',
  };

  const onIndexingWorkflowCellValueChanged = useCallback(async (params) => {
    const colId = params.column.getColId();
    const newValue = params.newValue;
    const oldValue = params.oldValue;
    const rowData = params.data;

    if (newValue === oldValue) return;
   
    const editableFields = ['workflow_tag', 'curation_tag', 'note'];
    if (!editableFields.includes(colId)) return;

    // DELETE if workflow_tag is being cleared
    const isClearingWorkflowTag = (
      colId === 'workflow_tag' &&
      (oldValue ?? "") !== "" && // was something
      newValue === "" &&
      rowData.curation_status_id !== 'new' // can't delete something that hasn't been posted
    );
  
    try {
      // Indexing Priority: PATCH /indexing_priority/{id} with payload { indexing_priority: "ATP:..." }
      if (rowData.section === 'Indexing Priority') {
        // Only allow editing workflow_tag in Indexing Priority table
        if (colId !== 'workflow_tag') return;

        if (!rowData.indexing_priority_id) {
          const msg = 'No existing indexing priority record to patch.';
          setApiErrorMessage(msg);
          setShowApiErrorModal(true);
          return;
        }

        const url = `${REST}/indexing_priority/${rowData.indexing_priority_id}`;

        // UI uses field "workflow_tag", API expects "indexing_priority"
        const payload = {
          indexing_priority: newValue === "" ? null : newValue,
        };

        await axios.patch(url, payload, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          }
        });

        // Refresh data after successful update
        fetchIndexingWorkflowOverview();
        return;
      }

      // --- Manual Indexing / Community Curation: existing workflow_tag behavior unchanged
      if (isClearingWorkflowTag) {
        if (rowData.reference_workflow_tag_id) {
          await deleteWorkflowTag(rowData.reference_workflow_tag_id, accessToken);
        }
      } else {
        if (rowData.reference_workflow_tag_id) {
          await patchWorkflowTag(
            rowData.reference_workflow_tag_id,
            { [colId]: newValue },
            accessToken
          );
        } else if (colId === 'workflow_tag') {
          // Only post if creating new workflow tag AND the change was to 'workflow_tag'
            
          await postWorkflowTag(
            {
              reference_curie: referenceCurie,
              mod_abbreviation: accessLevel,
              workflow_tag_id: newValue
            },
            accessToken
          );
        } else {
          // Trying to edit curation_tag/note but no existing workflow tag
          const msg = 'No existing workflow tag record to patch.';
          setApiErrorMessage(msg);
          setShowApiErrorModal(true);
          return;
        }
      }

      // Refresh data after successful update
      fetchIndexingWorkflowOverview();
    } catch (error) {
      const errorMessage = `API error: ${error.message}`;
      setApiErrorMessage(errorMessage);
      setShowApiErrorModal(true);
      console.error('Error updating workflow/indexing priority:', error);
    }
  }, [REST, referenceCurie, accessLevel, accessToken, fetchIndexingWorkflowOverview]);
    
  const onCellValueChanged = async (params) => {
    const colId = params.column.getColId();
    const newValue = params.newValue;
    const oldValue = params.oldValue;
    const rowData = params.data;

    if (newValue === oldValue) return;	// no change
    if (colId !== 'curation_status' && colId !== 'curation_tag' && colId !== 'note') return;	// Only handle specific fields

    if (colId === 'curation_status' && rowData.topic_name === 'Whole Paper' && newValue === 'ATP:0000237') { setDataTopicsInProgress(); }

    // DELETE if curation_status is being cleared
    const isClearingCurationStatus = (
      colId === 'curation_status' &&
      (oldValue ?? "") !== "" && // was something
      newValue === "" &&
      rowData.curation_status_id !== 'new' // can't delete something that hasn't been posted
    );

    console.log(`${colId} changed from`, oldValue, 'to', newValue);
    console.log('Row data:', rowData);
    console.log('Curation Status Id:', rowData.curation_status_id);

    let subPath = "/curation_status/";
    let method = "PATCH";
    let json_data = { [colId]: newValue };
    if (rowData.curation_status_id === 'new') {
      method = "POST";
      json_data["mod_abbreviation"] = accessLevel;
      json_data["topic"] = rowData.topic_curie;
      json_data["reference_curie"] = referenceCurie; }
    else {
      if (isClearingCurationStatus) { method = 'DELETE'; json_data = null; }
      subPath = "/curation_status/" + rowData.curation_status_id; }
    console.log("subPath: ", subPath);
    console.log("method: ", method);
    console.log("json_data: ");
    console.log(json_data);

    try {
      await updateCurationStatus(subPath, method, json_data);
    } catch (err) {
      // Error is already logged and modal shown by updateCurationStatus, but you can log more if needed
      console.warn("Failed to update curation status", err);
    }
  };

  const updateCurationStatus = (subPath, method, json_data) => {
    const url = process.env.REACT_APP_RESTAPI + subPath;
    return new Promise((resolve, reject) => {
      axios({
        url,
        method,
        headers: {
          'content-type': 'application/json',
          'authorization': 'Bearer ' + accessToken,
          'mode': 'cors',
        },
        data: json_data,
      })
      .then((res) => {
        let isValid = false;
        if (method === 'PATCH' && res.status === 202) isValid = true;
        else if (method === 'POST' && res.status === 201) isValid = true;
        else if (method === 'DELETE' && res.status === 204) isValid = true;
        if (!isValid) {
          const response_message = `error: ${url} : API status code ${res.status} for method ${method}`;
          reject(new Error(response_message));
        } else {
          resolve(res.data);
        }
      })
      .catch((err) => {
        const errorMessage = (<>API error: reload page to see what's in the database.<br/><br/>Debug:<br/>url: {url}<br/>payload: {JSON.stringify(json_data)}<br/>error: {err.toString()}</>)
        setApiErrorMessage(errorMessage);
        setShowApiErrorModal(true);
        console.error(errorMessage);
        reject(new Error(errorMessage));
      })
      .finally(() => {
        setReloadCurationDataTable(prevKey => prevKey + 1);
      });
    });
  };


  return (
    <div>
      {/* File Upload Status Section */}
      <strong style={{ display: 'block', margin: '20px 0 10px' }}>
        File Upload Current Status
      </strong>
      {isLoadingData ? (
        <div className="text-center">
          <Spinner animation="border" role="status" />
        </div>
      ) : (
        <div style={containerStyle}>
            <div className="ag-theme-quartz" style={{ width: '80%', marginBottom: 10 }}>
            <AgGridReact
              rowData={data}
              columnDefs={columns}
              domLayout="autoHeight"
            />
          </div>
        </div>
      )}

      {/* NEW: Indexing Priority Section (separate table, above Manual Indexing/Community Curation) */}
      {accessLevel === 'ZFIN' && (
        <>
	  <strong style={{ display: 'block', margin: '20px 0 10px' }}>
            Indexing Priority
	  </strong>
	  <div style={containerStyle}> 	
            <div
              className="ag-theme-quartz"
              style={{
                width: '80%',
                height: `${indexingPriorityData.length * 45 + 60}px`,
                marginBottom: 10,
              }}
            >    
	      <AgGridReact
                rowData={indexingPriorityData}
                columnDefs={indexingPriorityColumns}
		singleClickEdit={true}
                domLayout="normal"
                rowHeight={43}
                getRowClass={() => 'ag-row-striped-light'}
                popupParent={document.body}
                onCellValueChanged={onIndexingWorkflowCellValueChanged}
              />
            </div>
          </div>
        </>
      )}               
	
      {/* Manual Indexing and Community Curation Section */}
      {['WB', 'SGD', 'FB', 'ZFIN'].includes(accessLevel) && (
        <>
          <strong style={{ display: 'block', margin: '20px 0 10px' }}>
            Manual Indexing and Community Curation
          </strong>
          <div style={containerStyle}>
            <div
              className="ag-theme-quartz"
              style={{
                width: '80%',
                height: `${indexingWorkflowData.length * 45 + 60}px`,
                marginBottom: 40,
              }}
            >
              <AgGridReact
                rowData={indexingWorkflowData}
                columnDefs={indexingWorkflowColumns}
                singleClickEdit={true}
                domLayout="normal"
                rowHeight={43}
                getRowClass={() => 'ag-row-striped-light'}
                popupParent={document.body}
		onCellValueChanged={onIndexingWorkflowCellValueChanged}  
              />
            </div>
          </div>
        </>
      )}

      {/* Curation Section */}
      <strong style={{ display: 'block', margin: '20px 0 10px' }}>
        Curation
      </strong>
      <CurationStatusWholePaper />

      <div style={containerStyle}>
        <div className="d-flex justify-content-start align-items-center" style={{ paddingBottom: '10px', justifyContent: 'flex-start', width: '80%' }}>
          <div className="d-flex align-items-start" style={{ gap: '14px' }}>
            <BiblioPreferenceControls
              baseUrl={process.env.REACT_APP_RESTAPI}
              accessToken={accessToken}
              email={email}
              accessLevel={accessLevel}
              gridRef={gridRef}
              getGridApi={getGridApi}
              isGridReady={isGridReady}
              getInitialItems={getInitialItems}
              updateColDefsWithItems={updateColDefsWithItems}
              setItems={setItems}
              setColDefs={setColDefs}
              showNotification={showNotification}
              title="Manage Table Preferences"
              componentName="wft_curation_table"
            />
          </div>
        </div>
      </div>
      <div style={containerStyle}>
        {showApiErrorModal && (
          <GenericWorkflowTableModal title="Api Error" body={apiErrorMessage} show={showApiErrorModal} onHide={() => setShowApiErrorModal(false)} />
        )}
        <div className="ag-theme-quartz" style={{ width: '80%', marginBottom: 40 }}>
          <AgGridReact
            rowData={curationData}
            columnDefs={curationColumns}
            singleClickEdit={true}
            domLayout="autoHeight"
            getRowClass={(params) => (params.node.rowIndex % 2 === 0 ? 'ag-row-striped-dark' : 'ag-row-striped-light')}
            getRowHeight={(params) => {
              const value = params.data?.curation_status;
              const isValidCurationStatus = curationStatusOptions.some(opt => opt.value === value);
              return !isValidCurationStatus && value ? 80 : 42; // taller if warning shown
            }}
            popupParent={document.body}
            onCellValueChanged={onCellValueChanged}
            onGridReady={onGridReady}
          />
        </div>
      </div>
    </div>
  );
};

export default BiblioWorkflow;
