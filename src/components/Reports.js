import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import { Spinner } from 'react-bootstrap';

const file_upload_process_atp_id = "ATP:0000140";
const col_width = '70px';

const WorkflowStatTable = () => {
  const [data, setData] = useState([]);
  const [mods, setMods] = useState([]);
  const [totals, setTotals] = useState({});
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [key, setKey] = useState(0); // Add a key state to force re-rendering

  const gridRef = useRef();

  useEffect(() => {
    const fetchData = async () => {
      const url = process.env.REACT_APP_RESTAPI + "/workflow_tag/counters/?workflow_process_atp_id=" + file_upload_process_atp_id;
      setIsLoadingData(true);
      try {
        const result = await axios.get(url);
        setData(result.data);

        const modsSet = new Set(result.data.map(item => item.mod_abbreviation));
        const modsArray = Array.from(modsSet);
        setMods(modsArray);

        const totalsObj = {};
        result.data.forEach(item => {
          if (!totalsObj[item.wornflow_tag_name]) {
            totalsObj[item.wornflow_tag_name] = 0;
          }
          totalsObj[item.wornflow_tag_name] += item.tag_count;
        });
        setTotals(totalsObj);

        // Update key to force re-render
        setKey(prevKey => prevKey + 1);

      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchData();
  }, []);

  const getTagCount = (tagName, mod) => {
    const item = data.find(d => d.wornflow_tag_name === tagName && d.mod_abbreviation === mod);
    return item ? item.tag_count : 0;
  };

  const tagNames = ['files uploaded', 'file needed', 'file unavailable', 'file upload in progress'];

  const containerStyle = {
    display: 'flex',
    justifyContent: 'center',
    marginTop: '20px',
  };

  const tableStyle = {
    borderCollapse: 'collapse',
    width: '95%',
  };

  const thTdStyle = {
    border: '1px solid #ddd',
    padding: '8px',
    width: col_width,
    textAlign: 'left',
  };

  const thStyle = {
    ...thTdStyle,
    backgroundColor: '#f2f2f2',
  };

  const formatTagName = (tagName) => {
    return tagName.replace(/^files?\s/, '').replace('upload in progress', 'in progress');
  };

  const BoldRenderer = (props) => {
    return <strong>{props.value}</strong>;
  };

  const columns = [
    { 
      headerName: '', 
      field: 'tag_name', 
      width: 300,  // Increased width for the first column
      cellStyle: { textAlign: 'left', whiteSpace: 'normal' }, 
      cellRendererFramework: BoldRenderer 
    },
    { headerName: 'Total', field: 'total', width: 150, cellStyle: { textAlign: 'left' } },
    ...mods.map(mod => ({ headerName: mod, field: mod, width: 150, cellStyle: { textAlign: 'left' } })),
  ];

  const rowData = tagNames.map(tagName => {
    const row = { 
      tag_name: formatTagName(tagName), 
      total: totals[tagName] || 0 
    };
    mods.forEach(mod => {
      row[mod] = getTagCount(tagName, mod);
    });
    return row;
  });

  return (
    <div>
      <h3>Workflow Statistics</h3>
      <strong style={{ display: 'block', marginTop: '40px' }}>File Upload Current Status</strong>
      {isLoadingData ? (
        <div className="text-center">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        </div>
      ) : (
        <div style={containerStyle}>
          <div className="ag-theme-quartz" style={{ height: 500, width: '90%' }}>
            <AgGridReact
              key={key} // Add key prop to force re-render
              ref={gridRef}
              rowData={rowData}
              columnDefs={columns}
              pagination={true}
              paginationPageSize={25}
              domLayout="autoHeight"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkflowStatTable;
