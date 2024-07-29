import React, { useEffect, useState } from 'react';
import axios from 'axios';

const file_upload_process_atp_id = "ATP:0000140";
const col_width = '70px';

const WorkflowStatTable = () => {
  const [data, setData] = useState([]);
  const [mods, setMods] = useState([]);
  const [totals, setTotals] = useState({});

  useEffect(() => {
    const url = process.env.REACT_APP_RESTAPI + "/workflow_tag/counters/?workflow_process_atp_id=" + file_upload_process_atp_id;
    axios.get(url)
      .then(response => {
        const result = response.data;
        setData(result);

        const modsSet = new Set(result.map(item => item.mod_abbreviation));
        const modsArray = Array.from(modsSet);
        setMods(modsArray);

        const totalsObj = {};
        result.forEach(item => {
          if (!totalsObj[item.wornflow_tag_name]) {
            totalsObj[item.wornflow_tag_name] = 0;
          }
          totalsObj[item.wornflow_tag_name] += item.tag_count;
        });
        setTotals(totalsObj);
      })
      .catch(error => {
        console.error('Error fetching data:', error);
      });
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
    return tagName.replace(/^files?\s/, '');
  };
    
  return (
    <div>
      <h3>Workflow Statistics</h3>
	<strong style={{ display: 'block', marginTop: '40px' }}>File Upload Current Status</strong>
      <div style={containerStyle}>	
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}></th>
              <th style={thStyle}>Total</th>
              {mods.map(mod => (
                <th key={mod} style={thStyle}>{mod}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tagNames.map(tagName => (
              <tr key={tagName}>
                <td style={thTdStyle}>{formatTagName(tagName)}</td>
                <td style={thTdStyle}>{totals[tagName] || 0}</td>
                {mods.map(mod => (
                  <td key={`${tagName}-${mod}`} style={thTdStyle}>{getTagCount(tagName, mod)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default WorkflowStatTable;
