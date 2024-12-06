import React, { useEffect, useState, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Spinner, Tabs, Tab, Button, ButtonGroup } from 'react-bootstrap';
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Form from 'react-bootstrap/Form';

import { setDateFileUpload } from '../actions/reportsActions';

import axios from 'axios';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';

import DateRangePicker from '@wojtekmaj/react-daterange-picker'
import '@wojtekmaj/react-daterange-picker/dist/DateRangePicker.css';
import 'react-calendar/dist/Calendar.css';

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
          <Container fluid style={{ width: '90%' }}>
            <Row>
              <Col>
                <ReportsDatePicker facetName={workflowProcessAtpId} currentValue={dateFileUpload} setValueFunction={setDateFileUpload} />
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

const ReportsDatePicker = ({ facetName, currentValue, setValueFunction }) => {
    const dispatch = useDispatch();

    function formatDateRange(dateRange){
            let dateStart=dateRange[0].getFullYear()+"-"+parseInt(dateRange[0].getMonth()+1).toString().padStart(2,'0')+"-"+dateRange[0].getDate().toString().padStart(2,'0');
            let dateEnd=dateRange[1].getFullYear()+"-"+parseInt(dateRange[1].getMonth()+1).toString().padStart(2,'0')+"-"+dateRange[1].getDate().toString().padStart(2,'0');
            return [dateStart,dateEnd];
    }

    function formatToUTCString(dateRange) {
        if (dateRange !== '') {
            let dateStart = new Date (dateRange[0]);
            let dateEnd = new Date(dateRange[1]);
            let offset = dateStart.getTimezoneOffset();
            dateStart.setMinutes(dateStart.getMinutes() + offset);
            dateEnd.setMinutes(dateEnd.getMinutes() + offset);
            return [dateStart, dateEnd]; 
//             let parsedDateStart = Date.parse(dateRange[0]) + (offset * 60000);
//             let parsedDateEnd = Date.parse(dateRange[1]) + (offset * 60000);
// console.log('parsedDateStart');
// console.log( parsedDateStart );
// console.log('parsedDateEnd');
// console.log( parsedDateEnd );
//             return [new Date("2017-01-01"), new Date("2017-01-01")]
//             return [parsedDateStart, parsedDateEnd];
        } else {
// console.log('formatToUTCString blank string');
            return "";
        }
    }

// console.log('currentValue');
// console.log(currentValue);
// console.log('formatToUTCString(currentValue)');
// const blah = formatToUTCString(currentValue)
// console.log(blah);
// console.log('blah');

// [ 1483257600000, 1483257600000 ]
// [ "2017-01-01", "2017-01-01" ]
//  const bleh = [ 1483257600000, 1483257600000 ]
//  const bleh = [new Date(), new Date()]
//  const bleh = [new Date("2017-01-01"), new Date("2017-01-01")]
//  const bleh = [ "2017-01-01", "2017-01-01" ]

    function handleFixedTimeClick(timeframe) {
        var today = new Date();
        let newDate = ['',''];
        if (timeframe === 'Day') {
            newDate = formatDateRange([today,today]);
        }
        else if (timeframe === 'Week') {
            let lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            newDate = formatDateRange([lastWeek,today]);
        }
        else if (timeframe === 'Month') {
            let lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
            newDate = formatDateRange([lastMonth,today]);
        }
        else if (timeframe === 'Year') {
            let lastYear = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000);
            newDate = formatDateRange([lastYear,today]);
        }
        dispatch(setValueFunction(newDate));
//         dispatch(searchReferences());
    }

    function handleDateChange(newDateRangeArr){
        if (newDateRangeArr === null) {
            dispatch(setValueFunction(''));
//             dispatch(setSearchResultsPage(1));
//             dispatch(searchReferences());
        }
        else if(!isNaN(Date.parse(newDateRangeArr[0])) && !isNaN(Date.parse(newDateRangeArr[1]))){
            dispatch(setValueFunction(formatDateRange(newDateRangeArr)));
//             dispatch(setSearchResultsPage(1));
//             dispatch(searchReferences());
        }
    }

//                   <Form.Control as='select' id='license' name='license' style={{width: "10em"}} value={newLicense} onChange={(e) => setNewLicense(e.target.value)} >
  const dateOptions = [ 'Date added to ABC', 'Date Published' ];
  const newLicense = 'blah';
  const licenseName = 'bleh';
  const licenseToShow = 'bleh';

//             <h5>{facetName}</h5>
    return(
            <div key={facetName} style={{ display: 'flex', alignItems: 'center', textAlign: "left", paddingLeft: "2em", paddingBottom: "0.5em" }}>
              <Form.Control as='select' id='license' name='license' style={{ width: "12em", marginRight: "3em" }} value={newLicense} >
                {dateOptions.map((optionValue, index) => (
                    <option value={optionValue} defaultValue={licenseToShow !== '' ? licenseName : null} key={index}>{optionValue}</option>
                ))}
              </Form.Control>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <ButtonGroup aria-label="DateSetter" size ="sm" style={{display: "block"}}>
                  <Button variant="secondary" style={{'borderBottomLeftRadius' : 0}} onClick= { () => { handleFixedTimeClick('Day') } } >Day</Button>
                  <Button variant="secondary" onClick={ () => { handleFixedTimeClick('Week') } } >Week</Button>
                  <Button variant="secondary" onClick={ () => { handleFixedTimeClick('Month') } } >Month</Button>
                  <Button variant="secondary" style={{'borderBottomRightRadius' : 0}} onClick= { () => { handleFixedTimeClick('Year') } } >Year</Button>
                </ButtonGroup>
                <DateRangePicker value={formatToUTCString(currentValue)} onChange= { (newDateRangeArr) => { handleDateChange(newDateRangeArr) } } />
              </div>
            </div>
    )
} // const ReportsDatePicker = ({ facetName, currentValue, setValueFunction })

//             <DateRangePicker value={bleh} onChange= { (newDateRangeArr) => { handleDateChange(newDateRangeArr) } } />

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
