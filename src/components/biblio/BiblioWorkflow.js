import { useCallback, useEffect, useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import axios from "axios";
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import Spinner from "react-bootstrap/Spinner";
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
  const [isLoadingCurationData, setIsLoadingCurationData] = useState(false);
  const [curationStatusOptions, setCurationStatusOptions] = useState([]);
  const [reloadCurationDataTable, setReloadCurationDataTable] = useState(0);

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
      const url = process.env.REACT_APP_ATEAM_API_BASE_URL + "api/atpterm/ATP:0000230/children";
      try {
        const result = await axios.get(url, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          }
        });
        const options = result.data.entities.map((entity) => ({
          value: entity.curie,
          label: entity.name,
        }));
        setCurationStatusOptions(options);
        if (gridApi && options.length > 0) {
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
      setIsLoadingCurationData(true);
      try {
        const result = await axios.get(curationUrl);

        const processedCurationData = result.data
          .map(info => {
            // Convert Date to "Month Day, Year" if present
            let formatedCurstDateUpdated = null;
            if (info.curst_date_updated) {
              const date = new Date(info.curst_date_updated);
              formatedCurstDateUpdated = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', });
            }
            let formatedTetInfoDateCreated = null;
            if (info.tet_info_date_created) {
              const date = new Date(info.tet_info_date_created);
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

        setCurationData(processedCurationData);
      } catch (error) {
        console.error('Error fetching curation data:', error);
      } finally {
        setIsLoadingCurationData(false);
      }
    };

    fetchCurationData();
  }, [referenceCurie, accessLevel, reloadCurationDataTable]);

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

  const CurationStatusRenderer = (props) => {
    const handleChange = (e) => {
      props.node.setDataValue(props.colDef.field, e.target.value);
    };
    const isValidCurationStatus = curationStatusOptions.some(option => option.value === props.value);
    return (
    <div>
      {!isValidCurationStatus && props.value && (
        <div style={{ color: 'red', fontSize: '0.8em', marginBottom: '2px' }}> INVALID ATP ID: Choose Another </div> )}
      <select value={props.value ?? ""} onChange={handleChange} style={{ width: "8rem" }}>
        {!isValidCurationStatus && props.value && ( <option value={props.value}>{props.value}</option>)}
        {!props.value && ( <option value=""></option> )}
        {curationStatusOptions.map(option => ( <option key={option.value} value={option.value}> {option.label} </option> ))}
      </select>
    </div>
    );
  };

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
        cellRenderer: CurationStatusRenderer,
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
	sortable: true,
	filter: true
      },
      {
	headerName: 'Note',
	field: 'note',
	flex: 1,
	cellStyle: { textAlign: 'left' },
	headerClass: 'wft-bold-header wft-header-bg',
	sortable: true,
	filter: true
      },
  ];

  const containerStyle = {
    display: 'flex',
    justifyContent: 'center',
  };

  const onCellValueChanged = (params) => {
    if (params.column.getColId() === 'curation_status') {
      const newValue = params.newValue;
      const oldValue = params.oldValue;
      const rowData = params.data;
      console.log('Curation status changed from', oldValue, 'to', newValue);
      console.log('Row data:', rowData);
      console.log('Curation Status Id:', rowData.curation_status_id);

      let subPath = "/curation_status/";
      let method = "PATCH";
      let json_data = { curation_status: rowData.curation_status };
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

      updateCurationStatus(subPath, method, json_data)
    }
  };

  const updateCurationStatus = (subPath, method, json_data) => {
    setIsLoadingCurationData(true);
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
        const errorMessage = `error: ${url} ${err}`;
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

      {/* Curation Section */}
      <strong style={{ display: 'block', margin: '20px 0 10px' }}>
        Curation
      </strong>
      {isLoadingCurationData ? (
        <div className="text-center">
          <Spinner animation="border" role="status" />
        </div>
      ) : (
        <div style={containerStyle}>
          <div className="ag-theme-quartz" style={{ width: '80%', marginBottom: 40 }}>
            <AgGridReact
              rowData={curationData}
              columnDefs={curationColumns}
              domLayout="autoHeight"
              getRowClass={(params) => (params.node.rowIndex % 2 === 0 ? 'ag-row-striped-dark' : 'ag-row-striped-light')}
              getRowHeight={(params) => {
                const value = params.data?.curation_status;
                const isValidCurationStatus = curationStatusOptions.some(opt => opt.value === value);
                return !isValidCurationStatus && value ? 80 : 42; // taller if warning shown
              }}
              onCellValueChanged={onCellValueChanged}
              onGridReady={onGridReady}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default BiblioWorkflow;
