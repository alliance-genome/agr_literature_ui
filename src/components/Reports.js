import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import { Spinner } from 'react-bootstrap';

const file_upload_process_atp_id = "ATP:0000140";

const WorkflowStatTable = () => {
  const [data, setData] = useState([]);
  const [mods, setMods] = useState([]);
  const [totals, setTotals] = useState({});
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [key, setKey] = useState(0);

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
    width: '100%',
  };

  const formatTagName = (tagName) => {
      return tagName.replace(/^files?\s/, '').replace(/^upload /, "");
  };

  const boldCellStyle = (params) => {
    if (params.colDef.field === 'tag_name') {
      return { fontWeight: 'bold' };
    }
    return null;
  };

  const columns = [
    { 
      headerName: '', 
      field: 'tag_name', 
      flex: 1, 
      cellStyle: boldCellStyle,
      cellRendererFramework: (params) => <strong>{params.value}</strong>,
      headerClass: 'wft-bold-header' // Apply CSS class to header
    },
    { 
      headerName: 'Total', 
      field: 'total', 
      flex: 1, 
      cellStyle: { textAlign: 'left' },
      headerClass: 'wft-bold-header' // Apply CSS class to header
    },
    ...mods.map(mod => ({
      headerName: mod, 
      field: mod, 
      flex: 1, 
      cellStyle: { textAlign: 'left' },
      headerClass: 'wft-bold-header' // Apply CSS class to header
    })),
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
              key={key}
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
