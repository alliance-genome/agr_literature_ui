import { useCallback, useEffect, useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import axios from "axios";
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import Spinner from 'react-bootstrap/Spinner';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faExclamation } from '@fortawesome/free-solid-svg-icons';

const file_upload_process_atp_id = "ATP:0000140";

const BiblioWorkflow = () => {
  const referenceJsonLive = useSelector(state => state.biblio.referenceJsonLive);
  const referenceCurie = referenceJsonLive["curie"];
  const accessToken = useSelector((state) => state.isLogged.accessToken);
  const oktaMod = useSelector(state => state.isLogged.oktaMod);
  const testerMod = useSelector(state => state.isLogged.testerMod);
  let accessLevel = testerMod !== 'No' ? testerMod : oktaMod;

  const gridRef = useRef();
  const [gridApi, setGridApi] = useState(null);
  const onGridReady = (params) => { setGridApi(params.api); };

  const [data, setData] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [key, setKey] = useState(0);
  const [curationData, setCurationData] = useState([]);
  const [curationWholePaperData, setCurationWholePaperData] = useState([]);
  const [curationStatusOptions, setCurationStatusOptions] = useState([]);
  const [controlledNoteOptions, setControlledNoteOptions] = useState([]);
  const [reloadCurationDataTable, setReloadCurationDataTable] = useState(0);
  const [showApiErrorModal, setShowApiErrorModal] = useState(false);
  const [apiErrorMessage, setApiErrorMessage] = useState('');
  const [indexingWorkflowData, setIndexingWorkflowData] = useState([]);

  const fetchIndexingWorkflowOverview = useCallback(async () => {
      const url =
        `${process.env.REACT_APP_RESTAPI}` +
        `/workflow_tag/indexing-community/${referenceCurie}/${accessLevel}`;
      try {
        const res = await axios.get(url, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          }
        });
        const respData = res.data || {};
        const sectionOrder = [
          'indexing priority',
          'community curation',
          'manual indexing'
        ];
        const sectionDisplayNames = {
          'indexing priority': 'Indexing Priority',
          'community curation': 'Community Curation',
          'manual indexing': 'Manual Indexing',
        };

        const rows = sectionOrder
          .filter(sectionKey => sectionKey in respData)
          .map(sectionKey => {
            const sectionInfo = respData[sectionKey] || {};
            const allTagsObj = sectionInfo.all_workflow_tags || {};
            const currentArr = sectionInfo.current_workflow_tag || [];

            // Extract email and date_updated from current_workflow_tag[0], if present
            let currentValue = '';
            let email = '';
            let date_updated = '';
	    let reference_workflow_tag_id = null;  
            if (currentArr.length > 0) {
              const currentTag = currentArr[0];
              currentValue = currentTag.workflow_tag_id;
              email = currentTag.email;
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
              email,
              date_updated,
	      options,
	      reference_workflow_tag_id, 	
            };
          });

        setIndexingWorkflowData(rows);
      } catch (error) {
        console.error('Error fetching workflow overview:', error);
      }
  }

  useEffect(() => {
    fetchIndexingWorkflowOverview();
  }, [referenceCurie, accessLevel, accessToken]);

  useEffect(() => {
    const fetchWFTdata = async () => {
      const url = process.env.REACT_APP_RESTAPI + "/workflow_tag/get_current_workflow_status/" + referenceCurie + "/all/" + file_upload_process_atp_id;
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
  }, [referenceCurie, accessToken]);

  useEffect(() => {
    const fetchCurationStatuses = async () => {
      const baseUrl = process.env.REACT_APP_ATEAM_API_BASE_URL;
      const urls = {
        curationStatus: `${baseUrl}api/atpterm/ATP:0000230/children`,
        controlledNote1: `${baseUrl}api/atpterm/ATP:0000208/`,
        controlledNote2: `${baseUrl}api/atpterm/ATP:0000208/descendants`,
        controlledNote3: `${baseUrl}api/atpterm/ATP:0000227/`,
        controlledNote4: `${baseUrl}api/atpterm/ATP:0000227/descendants`,
      };
      try {
        const headers = {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        };
        const [curationStatusResult, controlledNoteResult1, controlledNoteResult2, controlledNoteResult3, controlledNoteResult4] = await Promise.all([
          axios.get(urls.curationStatus, { headers }),
          axios.get(urls.controlledNote1, { headers }),
          axios.get(urls.controlledNote2, { headers }),
          axios.get(urls.controlledNote3, { headers }),
          axios.get(urls.controlledNote4, { headers }),
        ]);
        const curationStatusOptionsObjs = Array.isArray(curationStatusResult.data.entities)
          ? curationStatusResult.data.entities.map(entity => ({
              value: entity.curie,
              label: entity.name,
            }))
          : [];
        const normalizeEntities = (data) => {
          if (Array.isArray(data.entities)) return data.entities;
          if (data.entity) return [data.entity];
          return [];
        };
        const controlledNoteResultEntities1 = normalizeEntities(controlledNoteResult1.data);
        const controlledNoteResultEntities2 = normalizeEntities(controlledNoteResult2.data);
        const controlledNoteResultEntities3 = normalizeEntities(controlledNoteResult3.data);
        const controlledNoteResultEntities4 = normalizeEntities(controlledNoteResult4.data);
        const controlledNoteOptionsObjs = [
            ...controlledNoteResultEntities1, ...controlledNoteResultEntities2,
            ...controlledNoteResultEntities3, ...controlledNoteResultEntities4].map(entity => ({
          value: entity.curie,
          label: entity.name,
        }));
        setCurationStatusOptions(curationStatusOptionsObjs);
        setControlledNoteOptions(controlledNoteOptionsObjs);
        if (gridApi && (curationStatusOptionsObjs.length > 0 || controlledNoteOptionsObjs.length > 0)) {
          gridApi.resetRowHeights();
        }
      } catch (error) {
        console.error('Error fetching ateam curation status options:', error);
      }
    };
    fetchCurationStatuses();
  }, [accessToken, gridApi]);

  useEffect(() => {
    const fetchCurationData = async () => {
      const curationUrl =
        process.env.REACT_APP_RESTAPI +
        `/curation_status/aggregated_curation_status_and_tet_info/${referenceCurie}/${accessLevel}`;
      try {
        const result = await axios.get(curationUrl);

        const processedCurationData = result.data
          .map(info => {
            // Convert Date to "Month Day, Year" if present
            let formatedCurstDateUpdated = null;
            if (info.curst_date_updated) {
              // const date = new Date(info.curst_date_updated);
              const [year, month, day] = info.curst_date_updated.split('-');
              const date = new Date(year, month - 1, day); // month is 0-based
              formatedCurstDateUpdated = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', });
            }
            let formatedTetInfoDateCreated = null;
            if (info.tet_info_date_created) {
              // const date = new Date(info.tet_info_date_created);
              const [year, month, day] = info.tet_info_date_created.split('-');
              const date = new Date(year, month - 1, day); // month is 0-based
              formatedTetInfoDateCreated = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', });
            }
            return {
              topic_name: info.topic_name,
              topic_curie: info.topic_curie,
              curation_status_id: info.curst_curation_status_id || 'new',
              curation_status: info.curst_curation_status || null,
              curation_status_updated: formatedCurstDateUpdated,
              curator: (info.curst_updated_by_email !== null) ? info.curst_updated_by_email : info.curst_updated_by,
              note: info.curst_note || null,
              controlled_note: info.curst_controlled_note || null,
              has_data: info.tet_info_has_data,
              novel_data: info.tet_info_novel_data,
              no_data: info.tet_info_no_data,
              topic_source: Array.isArray(info.tet_info_topic_source)
                ? info.tet_info_topic_source.join(', ')
                : info.tet_info_topic_source,
              topic_added: formatedTetInfoDateCreated,
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
          controlled_note: null,
          has_data: null,
          novel_data: null,
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
  }, [referenceCurie, accessLevel, reloadCurationDataTable]);

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
	  field: 'updated_by',
	  flex: 1,
	  cellStyle: { textAlign: 'left' },
	  headerClass: 'wft-bold-header wft-header-bg',
	  sortable: true,
	  filter: true
      },
      {
	  headerName: 'Date Updated',
	  field: 'date_updated',
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
      (entry.has_data === true || entry.novel_data === true)
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
    const handleChange = async (e, field) => {
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

  const GeneralizedDropdownRenderer = ({
    value,
    node,
    colDef,
    options,
    validateFn,
    errorMessage,
    isDisabled = false,
  }) => {
    const isValid = validateFn ? validateFn(value) : true;
    const rowIndex = node?.rowIndex;
    const rowClass = rowIndex % 2 === 0
      ? 'ag-row-striped-dark'
      : 'ag-row-striped-light';

    const handleChange = (e) => {
      node.setDataValue(colDef.field, e.target.value);
    };

    return (
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        padding: '4px 8px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        boxSizing: 'border-box',
      }}>
        {!isValid && value && (
          <div style={{
            color: 'red',
            fontSize: '0.8em',
            marginBottom: '2px'
          }}>
            {errorMessage ?? "Invalid value"}
          </div>
        )}
        <select
          value={value ?? ""}
          onChange={handleChange}
          className={rowClass}
          disabled={isDisabled}
          style={{
            width: '100%',
            height: '100%',
            border: '1px solid #ccc',
            borderRadius: '6px',
          }}
        >
          {/* Always include an empty option so it can be unset */}
          <option value=""></option>
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    );
  };

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
	flex: 1,
	cellStyle: { textAlign: 'left' },
	headerClass: 'wft-bold-header wft-header-bg',
      },
      {
        headerName: 'Note',
        field: 'note',
        flex: 4,
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

  const curationColumns = [
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
		  cellStyle: { textAlign: 'left' }
	      },
              {
		  headerName: 'Novel data',
		  field: 'novel_data',
		  width: 120,
		  cellRenderer:
		  renderNovelData,
		  headerClass: 'wft-bold-header wft-header-bg',
		  cellStyle: { textAlign: 'left' }
	      },
              {
		  headerName: 'No data',
		  field: 'no_data',
		  width: 120,
		  cellRenderer: renderNoData,
		  headerClass: 'wft-bold-header wft-header-bg',
		  cellStyle: { textAlign: 'left' }
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
	  flex: 1,
	  cellStyle: { textAlign: 'left' },
	  headerClass: 'wft-bold-header wft-header-bg',
	  sortable: true,
	  filter: true
      },
      {
	headerName: 'Curation Status updated',
	field: 'curation_status_updated',
	flex: 1,
	cellStyle: { textAlign: 'left' },
	headerClass: 'wft-bold-header wft-header-bg',
	sortable: true,
	filter: true
      },
      {
	headerName: 'Controlled Note',
	field: 'controlled_note',
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
            options: controlledNoteOptions, // Assumes format: [{ value, label }]
            validateFn: (val) => controlledNoteOptions.some(option => option.value === val),
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
      headerName: 'Current Status',
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
      headerName: 'Email',
      field: 'email',
      flex: 1,
      cellStyle: { textAlign: 'left' },
      headerClass: 'wft-bold-header wft-header-bg',
      sortable: true,
      filter: true,
    },
    {
      headerName: 'Date Updated',
      field: 'date_updated',
      flex: 1,
      cellStyle: { textAlign: 'left' },
      headerClass: 'wft-bold-header wft-header-bg',
      sortable: true,
      filter: true,
    },
  ];

  const containerStyle = {
    display: 'flex',
    justifyContent: 'center',
  };

  const onIndexingWorkflowCellValueChanged = useCallback(async (params) => {
    if (params.column.getColId() !== 'workflow_tag') return;
  
    const { data, oldValue, newValue } = params;
    if (newValue === oldValue) return;

    try {
      if (data.reference_workflow_tag_id) {
        // Existing tag - PATCH
        await patchWorkflowTag(
          data.reference_workflow_tag_id, 
          { workflow_tag_id: newValue }
        );
      } else {
        // New tag - POST
        await postWorkflowTag({
          reference_curie: referenceCurie,
          mod_abbreviation: accessLevel,
          workflow_tag_id: newValue
        });
      }
    
      // Refresh data after successful update
      fetchIndexingWorkflowOverview();
    } catch (error) {
      const errorMessage = `API error: ${error.message}`;
      setApiErrorMessage(errorMessage);
      setShowApiErrorModal(true);
      console.error('Error updating workflow tag:', error);
    }
  }, [referenceCurie, accessLevel, accessToken, fetchIndexingWorkflowOverview]);

  // Helper function for POST request
  const postWorkflowTag = async (data) => {
    const url = `${process.env.REACT_APP_RESTAPI}/workflow_tag/`;
    const response = await axios.post(url, data, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.status !== 201) {
      throw new Error(`POST failed with status ${response.status}`);
    }
  
    return response.data;
  };

  // Helper function for PATCH request
  const patchWorkflowTag = async (id, data) => {
    const url = `${process.env.REACT_APP_RESTAPI}/workflow_tag/${id}`;
    const response = await axios.patch(url, data, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
  
    if (response.status !== 202) {
      throw new Error(`PATCH failed with status ${response.status}`);
    }
  
    return response.data;
  };
    
  const onCellValueChanged = async (params) => {
    const colId = params.column.getColId();
    const newValue = params.newValue;
    const oldValue = params.oldValue;
    const rowData = params.data;

    if (newValue === oldValue) return;	// no change
    if (colId !== 'curation_status' && colId !== 'controlled_note' && colId !== 'note') return;	// Only handle specific fields

    if (colId === 'curation_status' && rowData.topic_name === 'Whole Paper' && newValue === 'ATP:0000237') { setDataTopicsInProgress(); }

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
            <div className="ag-theme-quartz" style={{ width: '80%', marginBottom: 10}}>
            <AgGridReact
              rowData={data}
              columnDefs={columns}
              domLayout="autoHeight"
            />
          </div>
        </div>
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
                height: `${indexingWorkflowData.length * 45}px`,
                marginBottom: 10,
              }}
            >
              <AgGridReact
                rowData={indexingWorkflowData}
                columnDefs={indexingWorkflowColumns}
                singleClickEdit={true}
                domLayout="normal"
                headerHeight={0}
                rowHeight={45}
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
