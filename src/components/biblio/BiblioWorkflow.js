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

  const [data, setData] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [key, setKey] = useState(0);
  const [curationData, setCurationData] = useState([]);
  const [isLoadingCurationData, setIsLoadingCurationData] = useState(false);
  const gridRef = useRef();

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
    const fetchCurationData = async () => {
      const curationUrl =
        process.env.REACT_APP_RESTAPI +
        `/reference/get_tet_info/${referenceCurie}?mod_abbreviation=${accessLevel}`;
      setIsLoadingCurationData(true);
      try {
        const result = await axios.get(curationUrl);

        const processedCurationData = Object.entries(result.data)
          .map(([topic, info]) => ({
            topic,
            has_data:
              info.has_data === true ||
              info.has_data === 'true' ||
              info.has_data === 1,
            novel_data:
              info.novel_data === true ||
              info.novel_data === 'true' ||
              info.novel_data === 1,
            no_data:
              info.no_data === true ||
              info.no_data === 'true' ||
              info.no_data === 1,
            topic_source: Array.isArray(info.topic_source)
              ? info.topic_source.join(', ')
              : info.topic_source,
            topic_added: info.topic_added,
          }))
          .sort((a, b) => a.topic.localeCompare(b.topic));

        setCurationData(processedCurationData);
      } catch (error) {
        console.error('Error fetching curation data:', error);
      } finally {
        setIsLoadingCurationData(false);
      }
    };

    fetchCurationData();
  }, [referenceCurie, accessLevel]); 

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

  const curationColumns = [
      {
	headerName: 'Topic for curation',
	field: 'topic',
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
  ];

  const containerStyle = {
    display: 'flex',
    justifyContent: 'center',
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
            <div className="ag-theme-alpine" style={{ width: '80%', marginBottom: 10 }}>
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
          <div className="ag-theme-alpine" style={{ width: '80%', marginBottom: 40 }}>
            <AgGridReact
              rowData={curationData}
              columnDefs={curationColumns}
              domLayout="autoHeight"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default BiblioWorkflow;
