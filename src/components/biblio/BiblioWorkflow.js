import {useCallback, useEffect, useState, useRef} from 'react';
import { useSelector, useDispatch } from 'react-redux';
import axios from "axios";
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import Spinner from "react-bootstrap/Spinner";


import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

const file_upload_process_atp_id = "ATP:0000140";

const BiblioWorkflow = () => {

  const referenceJsonLive = useSelector(state => state.biblio.referenceJsonLive);
  const referenceCurie = referenceJsonLive["curie"]
  const accessToken = useSelector((state) => state.isLogged.accessToken);

  const [data, setData] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [key, setKey] = useState(0);

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

  const columns = [
    { headerName: 'MOD', field: 'abbreviation', flex: 1, cellStyle: { textAlign: 'left' },
      headerClass: 'wft-bold-header', sortable: true, filter: true },
    { headerName: 'Workflow Tag', field: 'workflow_tag_name', flex: 1, cellStyle: { textAlign: 'left' },
      headerClass: 'wft-bold-header', sortable: true, filter: true },
    { headerName: 'Updater', field: 'updated_by', flex: 1, cellStyle: { textAlign: 'left' },
      headerClass: 'wft-bold-header', sortable: true, filter: true },
    { headerName: 'Date Updated', field: 'date_updated', flex: 1, cellStyle: { textAlign: 'left' },
      headerClass: 'wft-bold-header', sortable: true, filter: true },
  ];

  const containerStyle = {
    display: 'flex',
    justifyContent: 'center',
    marginTop: '20px',
  };

  return (
       <div>
            <strong style={{ display: 'block', marginTop: '40px' }}>File Upload Current Status</strong>
            {isLoadingData ? (
               <div className="text-center">
                 <Spinner animation="border" role="status">
                   <span className="visually-hidden">Loading...</span>
                 </Spinner>
               </div>
            ) : (
              <div style={containerStyle}>
                <div className="ag-theme-alpine" style={{ height: '300px', width: '80%' }}>
                  <AgGridReact
                    key={key}
                    ref={gridRef}
                    rowData={data}
                    columnDefs={columns}
                    domLayout="autoHeight"
                  />
                </div>
              </div>
            )}
       </div>
  );

} // const BiblioWorkflow

export default BiblioWorkflow;
