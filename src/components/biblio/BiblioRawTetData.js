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
  const accessToken = useSelector(state => state.isLogged.accessToken);
  const [topicEntityTags, setTopicEntityTags] = useState([]);
  const biblioUpdatingEntityAdd = useSelector(state => state.biblio.biblioUpdatingEntityAdd);
  const referenceCurie = useSelector(state => state.biblio.referenceCurie);
  const [isLoadingData, setIsLoadingData] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (biblioUpdatingEntityAdd === 0) {
        let url = process.env.REACT_APP_RESTAPI + '/topic_entity_tag/by_reference/' + referenceCurie + "?token=" + accessToken
        setIsLoadingData(true);
        const resultTags = await axios.get(url);
        if (JSON.stringify(resultTags.data) !== JSON.stringify(topicEntityTags)) {
          setTopicEntityTags(resultTags.data);
        }
        setIsLoadingData(false);
      }
    }
    fetchData().then();
  }, [referenceCurie, biblioUpdatingEntityAdd, topicEntityTags, accessToken]);

  // use the following code for the editor view table
  // let headers = ['topic', 'entity_type', 'species', 'entity', 'entity_published_as', 'negated', 'confidence_level', 'created_by', 'note', 'entity_source', 'date_created', 'updated_by', 'date_updated', 'validation_value_author', 'validation_value_curator', 'validation_value_curation_tools', 'display_tag'];
  // let source_headers = ['mod_id', 'source_method', 'evidence', 'validation_type', 'source_type', 'description', 'created_by', 'date_updated', 'date_created'];
  // const headersWithSortability = new Set(['entity_type']);
  // const headersToEntityMap = new Set(['topic', 'entity_type', 'entity', 'display_tag']);

  // use the following code for the 'simple' table
  let headers = [];
  let source_headers = [];
  const excludeColumnSet = new Set(['topic_entity_tag_source_id', 'topic_entity_tag_id', 'reference_id']);
  const dateColumnSet = new Set(['date_created', 'date_updated']);
  for (const tetDict of topicEntityTags.values()) {
    for (const tetDictKey in tetDict) {
      // console.log(tetDictKey);
      if (tetDictKey === 'topic_entity_tag_source') {
        for (const tetSourceKey in tetDict[tetDictKey]) {
          if ( (source_headers.indexOf(tetSourceKey) === -1) && !(excludeColumnSet.has(tetSourceKey)) ) { source_headers.push(tetSourceKey); } } }
      else {
        if ( (headers.indexOf(tetDictKey) === -1) && !(excludeColumnSet.has(tetDictKey)) ) { headers.push(tetDictKey); } }
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
                    else if (dateColumnSet.has(header)) {
                      td_value = new Date(td_value).toLocaleString(); }
                    // else if (headersToEntityMap.has(header)) {
                    //   td_value = tetDict[header] in entityEntityMappings ? entityEntityMappings[tetDict[header]] : tetDict[header]; }
                    // else if (header === "species") {
                    //   td_value = tetDict.species in curieToNameTaxon ? curieToNameTaxon[tetDict.species] : tetDict.species; }
                    return (<td key={`tetTable ${index_1} td ${index_2}`} >{td_value}</td>)
                  } ) }
                  { source_headers.map( (header, index_2) => {
                    let td_value = tetDict['topic_entity_tag_source'][header];
                    if (td_value === true) { td_value = 'True'; }
                    else if (td_value === false) { td_value = 'False'; }
                    if (dateColumnSet.has(header)) {
                      td_value = new Date(td_value).toLocaleString(); }
                    return (<td key={`tetTable ${index_1} td ${index_2}`} >{td_value}</td>)
                  } ) }
                </tr>);
          } ) }
          </tbody></Table>
      </div>);
} // const RawDataEntityTable


export default BiblioRawTetData;

