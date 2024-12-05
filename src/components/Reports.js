import React, { useEffect, useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import { Spinner, Tabs, Tab } from 'react-bootstrap';
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";

import { DatePicker } from './search/Facets';

import { setDateFileUpload } from '../actions/reportsActions';

import axios from 'axios';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';

const WorkflowStatTable = ({ workflowProcessAtpId, title, tagNames, nameMapping }) => {
  const [data, setData] = useState([]);
  const [totals, setTotals] = useState({});
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [key, setKey] = useState(0);

  const mods = useSelector(state => state.app.mods);
  const gridRef = useRef();

  useEffect(() => {
    const fetchData = async () => {
      const url = `${process.env.REACT_APP_RESTAPI}/workflow_tag/counters/?workflow_process_atp_id=${workflowProcessAtpId}`;
      setIsLoadingData(true);
      try {
        const result = await axios.get(url);
        setData(result.data);

        const totalsObj = {};
        result.data.forEach(item => {
          if (!totalsObj[item.workflow_tag_name]) {
            totalsObj[item.workflow_tag_name] = 0;
          }
          totalsObj[item.workflow_tag_name] += item.tag_count;
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
  }, [workflowProcessAtpId]);

  const getTagCount = (tagName, mod) => {
    const item = data.find(d => d.workflow_tag_name === tagName && d.mod_abbreviation === mod);
    return item ? item.tag_count : 0;
  };

  const containerStyle = {
    display: 'flex',
    justifyContent: 'center',
    marginTop: '15px',
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
      headerClass: 'wft-bold-header'
    },
    { 
      headerName: 'Total', 
      field: 'total', 
      flex: 1, 
      cellStyle: { textAlign: 'left' },
      headerClass: 'wft-bold-header'
    },
    ...mods.map(mod => ({
      headerName: mod, 
      field: mod, 
      flex: 1, 
      cellStyle: { textAlign: 'left' },
      headerClass: 'wft-bold-header'
    })),
  ];

  const rowData = tagNames.map(tagName => {
    const row = { 
      tag_name: nameMapping[tagName], 
      total: totals[tagName] || 0 
    };
    mods.forEach(mod => {
      row[mod] = getTagCount(tagName, mod);
    });
    return row;
  });

  const dateFileUpload = useSelector(state => state.reports.dateFileUpload);

  return (
    <div>
      <h5>{title}</h5>
      {isLoadingData ? (
        <div className="text-center">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        </div>
      ) : (
        <div style={containerStyle}>
          <Container style={{ width: '90%' }}>
            <Row>
              <Col>
                <DatePicker facetName='Date Range' currentValue={dateFileUpload} setValueFunction={setDateFileUpload} />
              </Col>
            </Row>
            <Row>
              <Col>
                <div className="ag-theme-quartz" style={{ height: 300, width: '100%' }}>
                  <AgGridReact
                    key={key}
                    ref={gridRef}
                    rowData={rowData}
                    columnDefs={columns}
                    pagination={true}
                    paginationPageSize={20}
                    domLayout="autoHeight"
                  />
                </div>
              </Col>
            </Row>
          </Container>
        </div>
      )}
    </div>
  );
};

const WorkflowStatTablesContainer = () => {
  const file_upload_name_mapping = {
      'files uploaded': 'uploaded',
      'file needed': 'needed',
      'file unavailable': 'unavailable',
      'file upload in progress': 'in progress'
  }
  const text_conversion_name_mapping = {
      'file converted to text': 'converted',
      'text conversion needed': 'needed',
      'file to text conversion failed': 'failed',
      'text conversion in progress': 'in progress'
  }
  return (
    <div>
      <h3 style={{ marginBottom: '30px' }}>Workflow Statistics</h3>
      <WorkflowStatTable
        workflowProcessAtpId="ATP:0000140"
        title="File Upload Current Status"
        tagNames={Object.keys(file_upload_name_mapping)}
	nameMapping={file_upload_name_mapping}
      />
      <WorkflowStatTable
        workflowProcessAtpId="ATP:0000161"
        title="Text Conversion Current Status"
        tagNames={Object.keys(text_conversion_name_mapping)}
        nameMapping={text_conversion_name_mapping}
      />
    </div>
  );
};

const ReportsContainer = () => {
  const mods = useSelector(state => state.app.mods);
  return (
    <div>
      <Tabs defaultActiveKey="all" id="uncontrolled-tab-example">
        <Tab eventKey="all" title="All">
          <WorkflowStatTablesContainer />
        </Tab>
        {mods.map(mod => (
          <Tab key={mod} eventKey={mod} title={mod}>
            {mod}
          </Tab>
        ))}
      </Tabs>
    </div>
  );
}

export default ReportsContainer;
