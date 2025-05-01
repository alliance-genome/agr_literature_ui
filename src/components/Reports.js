import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Spinner, Tabs, Tab, Button, ButtonGroup } from 'react-bootstrap';
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Form from 'react-bootstrap/Form';
import * as d3 from 'd3'

import { DownloadAllColumnsButton, DownloadMultiHeaderButton } from './biblio/topic_entity_tag/TopicEntityTable.js';

import { setDateRangeDict, setDateOptionDict, setDateFrequencyDict, setQcreportDict } from '../actions/reportsActions';

import axios from 'axios';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSync } from '@fortawesome/free-solid-svg-icons';

import DateRangePicker from '@wojtekmaj/react-daterange-picker'
import '@wojtekmaj/react-daterange-picker/dist/DateRangePicker.css';
import 'react-calendar/dist/Calendar.css';
import {render} from "@testing-library/react";

const file_upload_name_mapping = {
    'files uploaded': 'uploaded',
    'file needed': 'needed',
    'file unavailable': 'unavailable',
    'file upload in progress': 'in progress'
}

const WorkflowStatTableCounters = ({ workflowProcessAtpId, title, tagNames, nameMapping, modSection, columnType }) => {
  const [data, setData] = useState([]);
  const [totals, setTotals] = useState({});
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [key, setKey] = useState(0);
  const [countResync, setCountResync] = useState(0);
  const [dateRangeHeaders, setDateRangeHeaders] = useState([]);
  const [dateRangeData, setDateRangeData] = useState({});

  const mods = useSelector(state => state.app.mods);
  const dateRangeDict = useSelector(state => state.reports.dateRangeDict);
  const dateRangeValue = ( (dateRangeDict[modSection]) && (dateRangeDict[modSection][workflowProcessAtpId]) ) ? dateRangeDict[modSection][workflowProcessAtpId] : '';

  const dateOptionDict = useSelector(state => state.reports.dateOptionDict);
  const dateOptionValue = ( (dateOptionDict[modSection]) && (dateOptionDict[modSection][workflowProcessAtpId]) ) ? dateOptionDict[modSection][workflowProcessAtpId] : '';
  const dateFrequencyDict = useSelector(state => state.reports.dateFrequencyDict);
  const dateFrequencyValue = ( (dateFrequencyDict[modSection]) && (dateFrequencyDict[modSection][workflowProcessAtpId]) ) ? dateFrequencyDict[modSection][workflowProcessAtpId] : '';
  const gridRef = useRef();

  const mod_abbreviation = (modSection === 'All') ? '' : modSection;
  const date_range_start = (dateRangeValue === '') ? '': dateRangeValue[0];
  const date_range_end = (dateRangeValue === '') ? '': dateRangeValue[1];
  const date_option = (dateOptionValue === '') ? 'default' : dateOptionValue;

  useEffect(() => {
    const fetchData = async () => {
      let url = `${process.env.REACT_APP_RESTAPI}/workflow_tag/counters/?workflow_process_atp_id=${workflowProcessAtpId}`;
      if (mod_abbreviation !== '') { url += `&mod_abbreviation=${mod_abbreviation}`; }
      if ( (date_range_start !== '') && (date_range_end !== '') ) {
          url += `&date_option=${date_option}&date_range_start=${date_range_start}&date_range_end=${date_range_end}`; }
      if ( (date_option !== 'default') && ( (date_range_start === '') ||  (date_range_end === '') ) ) { return; }
      if (dateFrequencyValue !== '') { url += `&date_frequency=${dateFrequencyValue}`; }
      setIsLoadingData(true);
      try {
        const result = await axios.get(url);
        setData(result.data);

        const totalsObj = {};
        result.data.forEach(item => {
          //if (!totalsObj[item.workflow_tag_name]) {
          //  totalsObj[item.workflow_tag_name] = 0;
          //}
          //totalsObj[item.workflow_tag_name] += item.tag_count;
             //console.log("url:"+url + "\nwprkflowProcessAtpId:" + workflowProcessAtpId + "  tagNames"+ tagNames + " column type:"+ columnType+ " workflow_tag_name:"+item.workflow_tag_name +  " mod_abbreviation:" + item.mod_abbreviation + " number:" + item.tag_count)
          if (item.mod_abbreviation=="All"){
             totalsObj[item.workflow_tag_name] = item.tag_count?.toLocaleString();
          }
        });
        setTotals(totalsObj);

        if (columnType === 'date_range') {
          setDateRangeData(() => {
            const newData = {};
            result.data.forEach(item => {
              if (!newData[item['workflow_tag_id']]) {
                newData[item['workflow_tag_id']] = {};
              }
              newData[item['workflow_tag_id']][item['time_period']] = item['tag_count'];
            });
            return newData;
          });
          setDateRangeHeaders(() => {
            const newHeaders = [];
            result.data.forEach(item => {
              if (!newHeaders.includes(item['time_period'])) {
                newHeaders.push(item['time_period']);
              }
            });
            if (dateFrequencyValue === 'month') {
              return newHeaders.sort((a, b) => {	// sort by date
                const dateA = new Date(a.split(" ").join(" 1,"));
                const dateB = new Date(b.split(" ").join(" 1,"));
                return dateA - dateB;
              });
            }
            return newHeaders.sort();			// sort normally
          });
        }

        setKey(prevKey => prevKey + 1);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchData();
  }, [workflowProcessAtpId, dateOptionValue, date_range_start, date_range_end, countResync, dateFrequencyValue]);

  const getTagCountDateRange = (tagName, mod, dateRange) => {
    const item = data.find(d => d.workflow_tag_name === tagName && d.mod_abbreviation === mod && d.time_period === dateRange);
    return item && typeof item.tag_count === 'number' ? item.tag_count.toLocaleString() : "0";
  };

  const getTagCount = (tagName, mod) => {
    const item = data.find(d => d.workflow_tag_name === tagName && d.mod_abbreviation === mod);
    return item && typeof item.tag_count === 'number' ? item.tag_count.toLocaleString() : "0";
  };

  const containerStyle = {
    display: 'flex',
    justifyContent: 'center',
    marginTop: '15px',
  };

  const boldCellStyle = (params) => {
    if (params.colDef.field === 'tag_name') {
      return { fontWeight: 'bold', textAlign: 'left' };
    }
    return null;
  };

  let defaultColumns = [
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
    }
  ];
  let columns = defaultColumns;
  if (columnType === 'all_mods') {
    columns = [
      ...columns,
      ...mods.map(mod => ({
        headerName: mod,
        field: mod,
        flex: 1,
        cellStyle: { textAlign: 'left' },
        headerClass: 'wft-bold-header'
      })),
    ];
  }
  else if (columnType === 'date_range') {
    columns = [
      ...columns,
      ...dateRangeHeaders.map(dateRangeHeader => ({
        headerName: dateRangeHeader,
        field: dateRangeHeader,
        flex: 1,
        cellStyle: { textAlign: 'left' },
        headerClass: 'wft-bold-header'
      })),
    ];
  }

  let rowData = [];
  if (columnType === 'all_mods') {
    rowData = tagNames.map(tagName => {
      const row = {
        tag_name: nameMapping[tagName],
        total: totals[tagName] || 0
      };
      mods.forEach(mod => {
        row[mod] = getTagCount(tagName, mod);
      });
      return row;
    });
  }
  else if (columnType === 'two_column') {
    rowData = tagNames.map(tagName => {
      const row = {
        tag_name: nameMapping[tagName],
        total: getTagCount(tagName, modSection)
      };
      return row;
    });
  }
  else if (columnType === 'date_range') {
    rowData = tagNames.map(tagName => {
      let total = 0;
      const row = {
        tag_name: nameMapping[tagName],
      };
      dateRangeHeaders.forEach(dateRange => {
        const item = data.find(d => d.workflow_tag_name === tagName && d.mod_abbreviation === modSection && d.time_period === dateRange);
        if (item && typeof item.tag_count === 'number') {
          total += item.tag_count;
          row[dateRange] = item.tag_count.toLocaleString(); }
        else {
          row[dateRange] = "0"; }
      });
      row['total'] = total;
      return row;
    });
  }

  const gridOptions = { autoSizeStrategy: { type: 'fitCellContents', } }
  const fileNameFront = `${modSection}_${title}`.replace(/ /g,"_");

  return (
    <div>
      <h5>{title}</h5>
        <div style={containerStyle}>
          <Container fluid style={{ width: '90%' }}>
            <Row>
              <Col>
                <ReportsDatePicker facetName={workflowProcessAtpId} dateOptionValue={dateOptionValue} dateRangeValue={dateRangeValue} setValueFunction={setDateRangeDict} workflowProcessAtpId={workflowProcessAtpId} modSection={modSection} columnType={columnType} dateFrequencyValue={dateFrequencyValue} />
              </Col>
              <Col style={{ textAlign: "right" }}>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setCountResync(countResync + 1) }
                  style={{ marginRight: '5px', width: '120px' }}
                >
                  <FontAwesomeIcon icon={faSync} /> Resync Table
                </Button>
                <DownloadAllColumnsButton
                  gridRef={gridRef}
                  colDefs={columns}
                  rowData={rowData}
                  fileNameFront={fileNameFront}
                  buttonLabel="Download" />
              </Col>
            </Row>
            <Row>
              <Col>
                {isLoadingData ? (
                  <div className="text-center">
                    <Spinner animation="border" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </Spinner>
                  </div>
                ) : (
                  <div className="ag-theme-quartz" style={{ width: '100%' }}>
                    <AgGridReact
                      key={key}
                      ref={gridRef}
                      rowData={rowData}
                      columnDefs={columns}
                      pagination={false}
                      paginationPageSize={20}
                      domLayout="autoHeight"
                      gridOptions = {gridOptions}
                    /><br/><br/><br/>
                  </div>
                )}
              </Col>
            </Row>
          </Container>
        </div>
    </div>
  );
}; // const const WorkflowStatTableCounters = ({ workflowProcessAtpId, title, tagNames, nameMapping, modSection, columnType })

const ReportsDatePicker = ({ facetName, dateOptionValue, dateRangeValue, setValueFunction, workflowProcessAtpId, modSection, columnType, dateFrequencyValue }) => {
    const dispatch = useDispatch();

    function formatDateRange(dateRange){
            let dateStart=dateRange[0].getFullYear()+"-"+parseInt(dateRange[0].getMonth()+1).toString().padStart(2,'0')+"-"+dateRange[0].getDate().toString().padStart(2,'0');
            let dateEnd=dateRange[1].getFullYear()+"-"+parseInt(dateRange[1].getMonth()+1).toString().padStart(2,'0')+"-"+dateRange[1].getDate().toString().padStart(2,'0');
            return [dateStart,dateEnd];
    }

    function formatToUTCString(dateRange) {
        if (dateRange !== '') {
            let dateStart = new Date (dateRange[0]);
            let offset = dateStart.getTimezoneOffset();
            let parsedDateStart = new Date(Date.parse(dateRange[0]) + (offset * 60000));
            let parsedDateEnd = new Date(Date.parse(dateRange[1]) + (offset * 60000));
            return [parsedDateStart, parsedDateEnd];
        } else {
            return "";
        }
    }

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
        dispatch(setValueFunction(newDate, workflowProcessAtpId, modSection));
    }

    function handleDateRangeChange(newDateRangeArr){
        if (newDateRangeArr === null) {
            dispatch(setValueFunction('', workflowProcessAtpId, modSection));
        }
        else if(!isNaN(Date.parse(newDateRangeArr[0])) && !isNaN(Date.parse(newDateRangeArr[1]))){
            dispatch(setValueFunction(formatDateRange(newDateRangeArr), workflowProcessAtpId, modSection));
        }
    }

    function handleDateOptionChange(newDateOption){
        dispatch(setDateOptionDict(newDateOption, workflowProcessAtpId, modSection));
    }

    function handleDateFrequencyChange(newDateFrequency){
        dispatch(setDateFrequencyDict(newDateFrequency, workflowProcessAtpId, modSection));
    }

    const dateOptions = { 'Date Workflow Updated': 'default', 'Date added to ABC': 'reference_created', 'Date Published': 'reference_published', 'Date Inside Corpus': 'inside_corpus' };
    const dateFrequencies = { 'year': 'year', 'month': 'month', 'week': 'week' };


    return(
      <div key={facetName} style={{ display: 'flex', alignItems: 'center', textAlign: "left", paddingLeft: "2em", paddingBottom: "0.5em" }}>
        <Form.Control as='select' id='dateOption' name='dateOption' style={{ width: "13em", marginRight: "3em" }} value={dateOptionValue} onChange={(e) => handleDateOptionChange(e.target.value)} >
          {Object.entries(dateOptions).map(([label, value], index) => ( <option value={value} key={index}>{label}</option> ))}
        </Form.Control>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <ButtonGroup aria-label="DateSetter" size ="sm" style={{display: "block"}}>
            <Button variant="secondary" style={{'borderBottomLeftRadius' : 0}} onClick= { () => { handleFixedTimeClick('Day') } } >Day</Button>
            <Button variant="secondary" onClick={ () => { handleFixedTimeClick('Week') } } >Week</Button>
            <Button variant="secondary" onClick={ () => { handleFixedTimeClick('Month') } } >Month</Button>
            <Button variant="secondary" style={{'borderBottomRightRadius' : 0}} onClick= { () => { handleFixedTimeClick('Year') } } >Year</Button>
          </ButtonGroup>
          <DateRangePicker value={formatToUTCString(dateRangeValue)} onChange= { (newDateRangeArr) => { handleDateRangeChange(newDateRangeArr) } } />
        </div>
          {(() => {
            if (columnType === 'date_range') { return(
              <div style={{ display: 'flex', flexDirection: 'column', paddingLeft: "2em", paddingBottom: "0.5em" }}>
                Report Frequency  <Form.Control as='select' id='dateFrequency' name='dateFrequency' style={{ width: "13em", marginRight: "3em" }} value={dateFrequencyValue} onChange={(e) => handleDateFrequencyChange(e.target.value)} >
                  {Object.entries(dateFrequencies).map(([label, value], index) => ( <option value={value} key={index}>{label}</option> ))}
                </Form.Control></div>); }
            return null
          })()}
      </div>
    )
} // const ReportsDatePicker = ({ facetName, dateRangeValue, setValueFunction, workflowProcessAtpId, modSection, columnType, dateFrequencyValue })


const WorkflowStatModTablesContainer = ({modSection}) => {
  return (
    <div>
      <h3 style={{ marginBottom: '30px' }}>Workflow Statistics</h3>
                  <WorkflowStatTableCounters
                    workflowProcessAtpId="ATP:0000140"
                    title="File Upload Current Status"
                    tagNames={Object.keys(file_upload_name_mapping)}
                    nameMapping={file_upload_name_mapping}
                    modSection={modSection}
                    columnType="date_range"
                  />

            {(() => {
              if (modSection === 'SGD') {
                const manual_indexing_name_mapping = {
                    'manual indexing needed': 'needed',
                    'manual indexing complete': 'complete',
                    'manual indexing in progress': 'in progress'
                }
                return (
                  <WorkflowStatTableCounters
                    workflowProcessAtpId="ATP:0000273"
                    title="Reference Manually Indexing"
                    tagNames={Object.keys(manual_indexing_name_mapping)}
                    nameMapping={manual_indexing_name_mapping}
                    modSection={modSection}
                    columnType="two_column"
                  />
                  ) }
              return null
            })()}

      <WorkflowStatModTable
        workflowProcessAtpId="ATP:0000165"
        title="Reference Classification Status"
        modSection={modSection}
      />
    </div>
  );
};

const WorkflowStatModTable = ({ workflowProcessAtpId, title, modSection }) => {
  const [data, setData] = useState([]);
  const [header, setHeader] = useState([]);
  //const [totals, setTotals] = useState({});
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [key, setKey] = useState(100);
  const [countResync, setCountResync] = useState(0);

  const mods = useSelector(state => state.app.mods);
  const dateRangeDict = useSelector(state => state.reports.dateRangeDict);
  const dateRangeValue = ( (dateRangeDict[modSection]) && (dateRangeDict[modSection][workflowProcessAtpId]) ) ? dateRangeDict[modSection][workflowProcessAtpId] : '';

  const dateOptionDict = useSelector(state => state.reports.dateOptionDict);
  const dateOptionValue = ( (dateOptionDict[modSection]) && (dateOptionDict[modSection][workflowProcessAtpId]) ) ? dateOptionDict[modSection][workflowProcessAtpId] : '';
  const gridRef = useRef();

  const mod_abbreviation = (modSection === 'All') ? '' : modSection;
  const date_range_start = (dateRangeValue === '') ? '': dateRangeValue[0];
  const date_range_end = (dateRangeValue === '') ? '': dateRangeValue[1];
  const date_option = (dateOptionValue === '') ? 'default' : dateOptionValue;

  useEffect(() => {
    const fetchData = async () => {
        console.log("mods is " + mods);
        console.log("mod abbr " + mod_abbreviation);
      let url = `${process.env.REACT_APP_RESTAPI}/workflow_tag/reports/${workflowProcessAtpId}/${mod_abbreviation}`;
      // if (mod_abbreviation !== '') { url += `&mod_abbreviation=${mod_abbreviation}`; }
      //if ( (date_range_start !== '') && (date_range_end !== '') ) {
      //    url += `&date_option=${date_option}&date_range_start=${date_range_start}&date_range_end=${date_range_end}`; }
      //if ( (date_option !== 'default') && ( (date_range_start === '') ||  (date_range_end === '') ) ) { return; }
      setIsLoadingData(true);
      try {
        const result = await axios.get(url);
        setData(result.data[0]);
        setHeader(result.data[1])

        setKey(prevKey => prevKey + 1);
      } catch (error) {
        console.error('wfsMt: Error fetching data:', error);
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchData();
  }, [workflowProcessAtpId, dateOptionValue, date_range_start, date_range_end, countResync]);


  const containerStyle = {
    display: 'flex',
    justifyContent: 'center',
    marginTop: '15px',
  };

  const columns = [
      ...header.map(mod => ({
      headerName: mod,
            children: [
                {headerName: '#',
                 cellStyle: { textAlign: 'left' },
                 field: mod + '_num'},
                {headerName: '%',
                 cellStyle: { textAlign: 'left' },
                 field: mod + '_perc'}
            ],
      field: mod,
      flex: 1,
      headerClass: 'wft-bold-header'
    }))
  ];
  columns[0] = {headerName: '', field: 'status', cellStyle: { fontWeight: 'bold', textAlign: 'left' }}

  const gridOptions = { autoSizeStrategy: { type: 'fitCellContents', } }
  const fileNameFront = `${modSection}_${title}`.replace(/ /g,"_");

  return (
    <div>
      <h5>{title}</h5>
        <div style={containerStyle}>
          <Container fluid style={{ width: '90%' }}>
            <Row style={{ paddingBottom: "0.5em" }}>
              <Col style={{ textAlign: "right" }}>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setCountResync(countResync + 1) }
                  style={{ marginRight: '5px', width: '120px' }}
                >
                  <FontAwesomeIcon icon={faSync} /> Resync Table
                </Button>
                <DownloadMultiHeaderButton
                  gridRef={gridRef}
                  colDefs={columns}
                  rowData={data}
                  fileNameFront={fileNameFront}
                  buttonLabel="Download" />
              </Col>
            </Row>
            <Row>
              <Col>
                {isLoadingData ? (
                  <div className="text-center">
                    <Spinner animation="border" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </Spinner>
                  </div>
                ) : (
                  <div className="ag-theme-quartz" style={{ width: '100%' }}>
                    <AgGridReact
                      key={key}
                      ref={gridRef}
                      rowData={data}
                      pagination={false}
                      columnDefs={columns}
                      paginationPageSize={20}
                      domLayout="autoHeight"
                      gridOptions = {gridOptions}
                    /><br/><br/><br/>
                  </div>
                )}
              </Col>
            </Row>
          </Container>
        </div>
    </div>
  );
}; // const WorkflowStatModTable = ({ workflowProcessAtpId, title, modSection })

const WorkflowStatTablesContainer = ({modSection}) => {
  const text_conversion_name_mapping = {
      'file converted to text': 'converted',
      'text conversion needed': 'needed',
      'file to text conversion failed': 'failed',
      'text conversion in progress': 'in progress'
  }
  return (
    <div>
      <h3 style={{ marginBottom: '30px' }}>Workflow Statistics</h3>
      <WorkflowStatTableCounters
        workflowProcessAtpId="ATP:0000140"
        title="File Upload Current Status"
        tagNames={Object.keys(file_upload_name_mapping)}
	nameMapping={file_upload_name_mapping}
        modSection={modSection}
        columnType="all_mods"
      />
      <WorkflowStatTableCounters
        workflowProcessAtpId="ATP:0000161"
        title="Text Conversion Current Status"
        tagNames={Object.keys(text_conversion_name_mapping)}
        nameMapping={text_conversion_name_mapping}
        modSection={modSection}
        columnType="all_mods"
      />
    </div>
  );
};

const QCReportTablesContainer = ({modSection}) => {
  const dispatch = useDispatch();
  const qcReportDict = useSelector(state => state.reports.qcReportDict);

  const [isLoadingData, setIsLoadingData] = useState(false);
  const containerStyle = {
    display: 'flex',
    justifyContent: 'center',
    marginTop: '15px',
  };

  const [key, setKey] = useState(0);
  const gridRef = useRef();
  const gridOptions = { autoSizeStrategy: { type: 'fitCellContents', } }

  const paginationPageSizeSelector = useMemo(() => { return [10, 25, 50, 100, 500]; }, []);

  useEffect(() => {
    const fetchData = async () => {
      const url = `${process.env.REACT_APP_RESTAPI}/check/check_obsolete_entities`;
      setIsLoadingData(true);
      try {
        const result = await axios.get(url);
        dispatch(setQcreportDict(result.data));
        setKey(prevKey => prevKey + 1);
        // console.log('result.data'); console.log(result.data); console.log(JSON.stringify(result.data));
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoadingData(false);
      }
    };

    if (qcReportDict['date-produced'] === null) {
      fetchData(); }
  }, [qcReportDict]);

  const columnDefs = [
    { headerName: "Entity Type", field: "entity_type", flex:1, cellStyle: { textAlign: 'left' }, headerClass: 'wft-bold-header' },
    { headerName: "Entity Status", field: "entity_status", flex:1, cellStyle: { textAlign: 'left' }, headerClass: 'wft-bold-header' },
    { headerName: "Entity Curie", field: "entity_curie", flex:1, cellStyle: { textAlign: 'left' }, headerClass: 'wft-bold-header' },
    { headerName: "Entity Name", field: "entity_name", flex:1, cellStyle: { textAlign: 'left' }, headerClass: 'wft-bold-header' }
  ];

  let rowData = [];
  if ( ( qcReportDict["obsolete_entities"] !== null) && ( modSection in qcReportDict["obsolete_entities"] ) ) {
    rowData = qcReportDict["obsolete_entities"][modSection].map(item => ({
      entity_type: item.entity_type,
      entity_status: item.entity_status,
      entity_curie: item.entity_curie,
      entity_name: item.entity_name || "N/A"
    }));
  }

  return (
    <div>
      <h3 style={{ marginBottom: '30px' }}>QC Reports</h3>
      <div>
        <Container fluid style={{ width: '90%' }}>
          <Row>
            <Col>
              <h4 style={{ textAlign: 'left' }}>TET Table Deleted or Obsoleted Entities</h4>
            </Col>
          </Row>
          <Row>
            <Col>
              {isLoadingData ? (
                <div className="text-center">
                  <Spinner animation="border" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </Spinner>
                </div>
              ) : (
                <div className="ag-theme-quartz" style={{ width: '100%' }}>
                 {( qcReportDict["'date-produced'"] !== null) &&
                  (<div style={{ textAlign: 'left' }}>Date Produced: {qcReportDict['date-produced']}<br /><br /></div>) }
                 {( ( qcReportDict["obsolete_entities"] !== null) && ( modSection in qcReportDict["obsolete_entities"] ) ) ? (
                  <AgGridReact
                    key={key}
                    ref={gridRef}
                    rowData={rowData}
                    columnDefs={columnDefs}
                    pagination={true}
                    paginationPageSize={10}
                    paginationPageSizeSelector={paginationPageSizeSelector}
                    domLayout="autoHeight"
                    gridOptions = {gridOptions}
                  />
                  ) : (<div style={{ textAlign: 'left', fontWeight: 'bold' }}> No obsolete or deleted entities for {modSection}</div>)}
                </div>
              )}
            </Col>
          </Row>
          <Row>
            <Col>
              <div style={{ textAlign: 'left' }}>
                <br /><a href={`${process.env.REACT_APP_ABC_FILE_BASE_URL}/reports/QC/`} rel="noreferrer noopener" target="_blank">report history</a>
              </div>
            </Col>
          </Row>
        </Container>
      </div>
    </div>
  );
}; // const QCReportTablesContainer

const WorkflowDiagram = () => {

    const [tagData, setTagData] = useState([]);

    const svgRef = useRef();

    useEffect(() => {
        const fetchDiagramData = async () => {
            let url = `${process.env.REACT_APP_RESTAPI}/workflow_tag/workflow_diagram/All`;
            try {
                const result = await axios.get(url);
                setTagData(result.data);
                let nestedData = {tag: "ATP:0000141", children :[]};
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {

            }
        }
        fetchDiagramData();
    },[]);

    useEffect(() => {
        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();
        const rootNode= "ATP:0000141";
        const maxWidth = 12; //Number of boxes wide max
        const maxHeight = 30; //Max rows
        const boxWidth = 340;
        const boxHeight = 50;
        const txtPadding = 5;
        const x = d3.scaleLinear([0, maxWidth+1], [0, 4500]);
        const y = d3.scaleLinear([0, maxHeight+1], [0, 4000]);

        let renderedTags = [];
        let spaceUsed = [];

        const renderNode = (node, row, column) => {
            let nodeData = tagData.find(x=>x.tag ===node)
            renderedTags.push(node);

            //This is inefficent.
            spaceUsed.push({row,column});
            if(!nodeData){
                nodeData = {tag: node, transitions_to : ''}
            }

            let currentNode = svg.append("g")
            currentNode.append("text")
                .datum(nodeData)
                .attr("class", "tag")
                .attr("x", x(column)+txtPadding)
                .attr("y", y(row)- (boxHeight/2) +20   )
                .text(nodeData.tag)
                .on("mouseover", function(d){
                    console.log(d);
                })
            currentNode.append("text")
                .attr("x", x(column)+txtPadding)
                .attr("y", y(row)- (boxHeight/2)+40)
                .text(nodeData.tag_name)

            currentNode.append("rect")
                .attr("width", boxWidth)
                .attr("height", boxHeight)
                .attr("x", x(column))
                .attr("y", y(row)-(boxHeight/2))
                .style("fill-opacity", 0)
                .style("stroke-width", 1)
                .style("stroke", "black");

            if(nodeData.transitions_to){
                let distinctTransitions = [...new Set(nodeData.transitions_to)];

                //Filter out already rendered tags
                distinctTransitions = distinctTransitions.filter( function( tag ) {
                    return !renderedTags.includes( tag );
                });
                let childColumn = Math.max(column - distinctTransitions.length +1, 1);
                //WE NEED To remove dupes first so we know how many nodes are below
                distinctTransitions.forEach(childNode => {
                    //Looking for space
                    for(let i=0;spaceUsed.length>i;i++){
                        if(spaceUsed[i].row === row+1 && spaceUsed[i].column === childColumn){
                            childColumn++;
                            i = 0;
                            console.log("check next column");
                        }

                    }
                    svg.append("line")          // attach a line
                        .style("stroke", "black")  // colour the line
                        .attr("x1", x(column)+(boxWidth/2))     // x position of the first end of the line
                        .attr("y1", y(row)+(boxHeight/2))      // y position of the first end of the line
                        .attr("x2", x(childColumn)+(boxWidth/2))     // x position of the second end of the line
                        .attr("y2", y(row+1)-(boxHeight/2));
                    renderNode(childNode, row+1, childColumn)
                    childColumn++;
                })
            }
        }


        //var result = tagData.find(node=>node.tag ===rootNode);
        if(tagData){
            renderNode(rootNode, 1, 4 );
            console.log(spaceUsed);
        }

    }, [tagData]);



    return(
        <svg ref={svgRef} width={4500} height={4000}></svg>
    )
}

const ReportsContainer = () => {
  const mods = useSelector(state => state.app.mods);
  return (
    <div>
      <Tabs mountOnEnter="true" defaultActiveKey="all" id="mods-tabs">
        <Tab eventKey="all" title="All">
          <Tabs mountOnEnter="true" defaultActiveKey="all_stats" id="all-reports-tabs">
            <Tab eventKey="all_stats" title="Workflow Statistics">
              <WorkflowStatTablesContainer modSection='All' />
            </Tab>
          </Tabs>
        </Tab>
        {mods.map(mod => (
          <Tab key={mod} eventKey={mod} title={mod}>
            <Tabs mountOnEnter="true" defaultActiveKey={`${mod}_stats`} id={`${mod}_reports-tabs`}>
              <Tab eventKey={`${mod}_stats`} title="Workflow Statistics">
                <WorkflowStatModTablesContainer modSection={mod} />
              </Tab>
              <Tab eventKey={`${mod}_qcreport`} title="QC Reports">
                <QCReportTablesContainer modSection={mod} />
              </Tab>
            </Tabs>
          </Tab>
        ))}
      <Tab eventKey="diagram" title="Workflow Diagram">
          <WorkflowDiagram />
      </Tab>
      </Tabs>
    </div>
  );
}

export default ReportsContainer;
