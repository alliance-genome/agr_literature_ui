import {useEffect, useState} from 'react';
import {useSelector} from 'react-redux';

import LoadingOverlay from "../LoadingOverlay";
import RowDivider from './RowDivider';
import {AlertAteamApiDown} from "../ATeamAlert";
import {BiblioCitationDisplay} from './BiblioFileManagement';

import Container from 'react-bootstrap/Container';
import Table from 'react-bootstrap/Table';
import axios from "axios";


const BiblioRawTetData = () => {
  return (<><AlertAteamApiDown />
          <Container><BiblioCitationDisplay key="rawtetdataCitationDisplay" /></Container>
          <RowDivider />
          <RawDataEntityTable key="rawDataEntityTable" />
          </>);
}

const RawDataEntityTable = () => {
  const [topicEntityTags, setTopicEntityTags] = useState([]);
  const biblioUpdatingEntityAdd = useSelector(state => state.biblio.biblioUpdatingEntityAdd);
  const referenceCurie = useSelector(state => state.biblio.referenceCurie);
  const [isLoadingData, setIsLoadingData] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (biblioUpdatingEntityAdd === 0) {
        let url = process.env.REACT_APP_RESTAPI + '/topic_entity_tag/by_reference/' + referenceCurie
        setIsLoadingData(true);
        const resultTags = await axios.get(url);
        if (JSON.stringify(resultTags.data) !== JSON.stringify(topicEntityTags)) {
          setTopicEntityTags(resultTags.data);
        }
        setIsLoadingData(false);
      }
    }
    fetchData().then();
  }, [referenceCurie, biblioUpdatingEntityAdd, topicEntityTags]);

  // use the following code for the 'simple' table
  let headers = [];
  let source_headers = [];
  for (const tetDict of topicEntityTags.values()) {
    for (const tetDictKey in tetDict) {
      // console.log(tetDictKey);
      if (tetDictKey === 'topic_entity_tag_source') {
        for (const tetSourceKey in tetDict[tetDictKey]) {
          if (source_headers.indexOf(tetSourceKey) === -1) { source_headers.push(tetSourceKey); } } }
      else {
        if (headers.indexOf(tetDictKey) === -1) { headers.push(tetDictKey); } }
    }
  }

  return (
      <div>
        <LoadingOverlay active={isLoadingData} />
        <Table bordered size="sm" responsive>
          <thead>
            <tr>
              { headers.map( (header, index) => { return (<th key={`tetTableHeader th ${index}`} >{header}</th>) } ) }
              { source_headers.map( (header, index) => { return (<th key={`tetTableHeaderSource th ${index}`} >{header.startsWith('source_') ? header : 'source_' + header}</th>) } ) }
            </tr>
          </thead>
          <tbody>
          { topicEntityTags.map( (tetDict, index_1) => {
            return (
                <tr key={`tetTableRow ${index_1}`}>
                  { headers.map( (header, index_2) => {
                    let td_value = tetDict[header];
                    if (td_value === true) { td_value = 'True'; }
                    else if (td_value === false) { td_value = 'False'; }
                    return (<td key={`tetTable ${index_1} td ${index_2}`} >{td_value}</td>)
                  } ) }
                  { source_headers.map( (header, index_2) => {
                    let td_value = tetDict['topic_entity_tag_source'][header];
                    if (td_value === true) { td_value = 'True'; }
                    else if (td_value === false) { td_value = 'False'; }
                    return (<td key={`tetTable ${index_1} td ${index_2}`} >{td_value}</td>)
                  } ) }
                </tr>);
          } ) }
          </tbody></Table>
      </div>);
} // const RawDataEntityTable


export default BiblioRawTetData;

