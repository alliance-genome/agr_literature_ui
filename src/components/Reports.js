import React, { useEffect, useState, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Spinner, Tabs, Tab, Button, ButtonGroup } from 'react-bootstrap';
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Form from 'react-bootstrap/Form';

import { DownloadDropdownOptionsButton } from './biblio/topic_entity_tag/TopicEntityTable.js';

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
  const dateFrequencyValue = ( (dateFrequencyDict[modSection]) && (dateFrequencyDict[modSection][workflowProcessAtpId]) ) ? dateFrequencyDict[modSection][workflowProcessAtpId] : 'year';
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
            // console.log("mod_abbreviation:" + item.mod_abbreviation + " number:" + item.tag_count)
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
              <Col>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setCountResync(countResync + 1) }
                  style={{ marginRight: '5px', width: '120px' }}
                >
                  <FontAwesomeIcon icon={faSync} /> Resync Table
                </Button>
              </Col>
              <Col>
                <DownloadDropdownOptionsButton
                  gridRef={gridRef}
                  colDefs={columns}
                  rowData={rowData}
                  fileNameFront={fileNameFront} />
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
                  <div className="ag-theme-quartz" style={{ height: 300, width: '100%' }}>
                    <AgGridReact
                      key={key}
                      ref={gridRef}
                      rowData={rowData}
                      columnDefs={columns}
                      pagination={false}
                      paginationPageSize={20}
                      domLayout="autoHeight"
                      gridOptions = {gridOptions}
                    />
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
  }, [workflowProcessAtpId, dateOptionValue, date_range_start, date_range_end]);


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

  return (
    <div>
      <h5>{title}</h5>
        <div style={containerStyle}>
          <Container fluid style={{ width: '90%' }}>
            <Row>
              <Col>
                {isLoadingData ? (
                  <div className="text-center">
                    <Spinner animation="border" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </Spinner>
                  </div>
                ) : (
                  <div className="ag-theme-quartz" style={{ height: 300, width: '100%' }}>
                    <AgGridReact
                      key={key}
                      ref={gridRef}
                      rowData={data}
                      pagination={false}
                      columnDefs={columns}
                      paginationPageSize={20}
                      domLayout="autoHeight"
                      gridOptions = {gridOptions}
                    />
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
  const qcreportDict = useSelector(state => state.reports.qcreportDict);

  const [isLoadingData, setIsLoadingData] = useState(false);
  const containerStyle = {
    display: 'flex',
    justifyContent: 'center',
    marginTop: '15px',
  };

  const [key, setKey] = useState(0);
  const gridRef = useRef();
  let rowData = [];
  const boldCellStyle = (params) => {
    if (params.colDef.field === 'tag_name') {
      return { fontWeight: 'bold', textAlign: 'left' };
    }
    return null;
  };
  const columns = [
    {
      headerName: 'Status',
      field: 'tag_name',
      flex: 1,
      cellStyle: boldCellStyle,
      headerClass: 'wft-bold-header'
    },
    {
      headerName: 'Entity Type',
      field: 'total',
      flex: 1,
      cellStyle: { textAlign: 'left' },
      headerClass: 'wft-bold-header'
    },
    {
      headerName: 'Curie',
      field: 'total',
      flex: 1,
      cellStyle: { textAlign: 'left' },
      headerClass: 'wft-bold-header'
    },
    {
      headerName: 'Entity Name',
      field: 'total',
      flex: 1,
      cellStyle: { textAlign: 'left' },
      headerClass: 'wft-bold-header'
    }
  ];
  const gridOptions = { autoSizeStrategy: { type: 'fitCellContents', } }
  const [data, setData] = useState([]);


  useEffect(() => {
    const fetchData = async () => {
      const url = `${process.env.REACT_APP_RESTAPI}/check/check_obsolete_entities`;
      setIsLoadingData(true);
      try {
        const result = await axios.get(url);
// Cross-Origin Request Blocked: The Same Origin Policy disallows reading the remote resource at https://dev.alliancegenome.org/logs_dev/obsolete_entity_report.log. (Reason: CORS header 'Access-Control-Allow-Origin' missing). Status code: 200.
// Needs  Access-Control-Allow-Origin: *  Serverside
        console.log('result');
        console.log(result);
        console.log('result.data');
        console.log(result.data);
        setData(result.data);
        setKey(prevKey => prevKey + 1);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoadingData(false);
      }
    };

    if (qcreportDict['date-produced'] === null) {
      fetchData(); }
  }, [qcreportDict]);


  return (
    <div>
      <h3 style={{ marginBottom: '30px' }}>QC Reports</h3>
      <div style={containerStyle}>
        <Container fluid style={{ width: '90%' }}>
          <Row>
            <Col>
              {isLoadingData ? (
                <div className="text-center">
                  <Spinner animation="border" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </Spinner>
                </div>
              ) : (
                <div className="ag-theme-quartz" style={{ height: 300, width: '100%' }}>
                  <AgGridReact
                    key={key}
                    ref={gridRef}
                    rowData={rowData}
                    columnDefs={columns}
                    pagination={false}
                    paginationPageSize={20}
                    domLayout="autoHeight"
                    gridOptions = {gridOptions}
                  />
                </div>
              )}
            </Col>
          </Row>
        </Container>
      </div>
    </div>
  );
};

const ReportsContainer = () => {
  const mods = useSelector(state => state.app.mods);
  return (
    <div>
      <Tabs mountOnEnter="true" defaultActiveKey="all" id="uncontrolled-tab-example">
        <Tab eventKey="all" title="All">
          <Tabs mountOnEnter="true" defaultActiveKey="all_qcreport" id="all-stats-tab">
            <Tab eventKey="all_stats" title="Workflow Statistics">
              <WorkflowStatTablesContainer modSection='All' />
            </Tab>
            <Tab eventKey="all_qcreport" title="QC Reports">
              <QCReportTablesContainer modSection='All' />
            </Tab>
          </Tabs>
        </Tab>
        {mods.map(mod => (
          <Tab key={mod} eventKey={mod} title={mod}>
            {mod}
              <WorkflowStatModTablesContainer modSection={mod} />
          </Tab>
        ))}
      </Tabs>
    </div>
  );
}

export default ReportsContainer;
