
import {useEffect, useState} from 'react';
import { useSelector, useDispatch } from 'react-redux';

import { changeFieldEntityEntityList } from '../../actions/biblioActions';
import { changeFieldEntityAddGeneralField } from '../../actions/biblioActions';
import { changeFieldEntityAddTaxonSelect } from '../../actions/biblioActions';
import { updateButtonBiblioEntityAdd } from '../../actions/biblioActions';
import { setBiblioUpdatingEntityAdd } from '../../actions/biblioActions';
import { updateButtonBiblioEntityEditEntity } from '../../actions/biblioActions';
import { setBiblioEntityRemoveEntity } from '../../actions/biblioActions';
import { setEntityModalText } from '../../actions/biblioActions';
import { changeFieldEntityEditor } from '../../actions/biblioActions';
import { setFieldEntityEditor } from '../../actions/biblioActions';
import { changeFieldEntityEditorPriority } from '../../actions/biblioActions';

import LoadingOverlay from "../LoadingOverlay";
import RowDivider from './RowDivider';
import ModalGeneric from './ModalGeneric';

import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button'
import Spinner from 'react-bootstrap/Spinner'
import axios from "axios";
import Pagination from "react-bootstrap/Pagination";

import { faSortAlphaDown, faSortAlphaUp } from '@fortawesome/free-solid-svg-icons'
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";

export const curieToNameEntityType = { 'ATP:0000005': 'gene', 'ATP:0000006': 'allele' };

const BiblioEntity = () => {
  return (<><EntityCreate key="entityCreate" />
            <EntityEditor key="entityEditor" /></>); }

//   const curieToNameAtp = { 'ATP:0000005': 'gene', 'ATP:0000006': 'allele', 'ATP:0000122': 'entity type', 'ATP:0000132': 'additional display', 'ATP:0000129': 'headline display', 'ATP:0000131': 'other primary display', 'ATP:0000130': 'review display', 'ATP:0000116': 'high priority', '': '' };
  const curieToNameAtp = { 'ATP:0000132': 'additional display', 'ATP:0000129': 'headline display', 'ATP:0000131': 'other primary display', 'ATP:0000130': 'review display', 'ATP:0000116': 'high priority', '': '' };
  const qualifierList = [ '', 'ATP:0000131', 'ATP:0000132', 'ATP:0000130', 'ATP:0000129', 'ATP:0000116' ];
  const curieToNameTaxon = { 'NCBITaxon:559292': 'Saccharomyces cerevisiae', 'NCBITaxon:6239': 'Caenorhabditis elegans', 'NCBITaxon:7227': 'Drosophila melanogaster', 'NCBITaxon:7955': 'Danio rerio', 'NCBITaxon:10116': 'Rattus norvegicus', 'NCBITaxon:10090': 'Mus musculus', 'NCBITaxon:8355': 'Xenopus laevis', 'NCBITaxon:8364': 'Xenopus tropicalis', 'NCBITaxon:9606': 'Homo sapiens', '': '' };

const EntityEditor = () => {
  const dispatch = useDispatch();
//   const curieToNameAtp = { 'ATP:0000005': 'gene', 'ATP:0000122': 'entity type', 'ATP:0000132': 'additional display', 'ATP:0000129': 'headline display', 'ATP:0000131': 'other primary display', 'ATP:0000130': 'review display', 'ATP:0000116': 'high priority', '': '' };
//   const qualifierList = [ '', 'ATP:0000132', 'ATP:0000129', 'ATP:0000131', 'ATP:0000130', 'ATP:0000116' ];
//   const curieToNameTaxon = { 'NCBITaxon:559292': 'S. cerevisiae S288C', 'NCBITaxon:6239': 'Caenorhabditis elegans' };

  const biblioAction = useSelector(state => state.biblio.biblioAction);
  const accessToken = useSelector(state => state.isLogged.accessToken);
  const [topicEntityTags, setTopicEntityTags] = useState([]);
  const [entityEntityMappings, setEntityEntityMappings] = useState({});
  const biblioUpdatingEntityRemoveEntity = useSelector(state => state.biblio.biblioUpdatingEntityRemoveEntity);
  const biblioUpdatingEntityAdd = useSelector(state => state.biblio.biblioUpdatingEntityAdd);
  const referenceCurie = useSelector(state => state.biblio.referenceCurie);
  const [totalTagsCount, setTotalTagsCount] = useState(undefined);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState(null);
  const [descSort, setDescSort] = useState(true);
  //const [limit, setLimit] = useState(10);
  const pageSize = 10; // fixed limit value for now
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchMappings = async () => {
      let config = {
        headers: {
          'content-type': 'application/json',
          'authorization': 'Bearer ' + accessToken
        }
      };
      const resultMappings = await axios.get(process.env.REACT_APP_RESTAPI + "/topic_entity_tag/map_entity_curie_to_name/?curie_or_reference_id=" + referenceCurie + "&token=" + accessToken,
          config);
      setEntityEntityMappings(resultMappings.data);
    }
    fetchMappings().then();
  }, [accessToken, referenceCurie, biblioUpdatingEntityAdd, biblioUpdatingEntityRemoveEntity]);

  useEffect(() => {
    const fetchTotalTagsCount = async () => {
      const resultTags = await axios.get(process.env.REACT_APP_RESTAPI + '/topic_entity_tag/by_reference/' + referenceCurie + "?count_only=true");
      setTotalTagsCount(resultTags.data);
    }
    fetchTotalTagsCount().then();
  }, [referenceCurie, biblioUpdatingEntityAdd, biblioUpdatingEntityRemoveEntity])

  useEffect(() => {
    const fetchData = async () => {
      let url = process.env.REACT_APP_RESTAPI + '/topic_entity_tag/by_reference/' + referenceCurie + "?page=" + page + "&page_size=" + pageSize
      if (sortBy !== null && sortBy !== undefined) {
        url += "&sort_by=" + sortBy
      }
      if (descSort) {
        url += "&desc_sort=true"
      }
      setIsLoading(true);
      const resultTags = await axios.get(url);
      setTopicEntityTags(resultTags.data);
      setIsLoading(false);
    }
    fetchData().then();
  }, [sortBy, descSort, referenceCurie, biblioUpdatingEntityAdd, biblioUpdatingEntityRemoveEntity, page, pageSize]);

  const changePage = (action) => {
      let maxPage = Math.max(0, Math.ceil(totalTagsCount/pageSize));
      switch (action){
        case 'Next':
          setPage(Math.min(maxPage, page + 1));
          break;
        case 'Prev':
          setPage(Math.max(1, page - 1));
          break;
        case 'First':
          setPage(1);
          break;
        case 'Last':
          setPage(maxPage);
          break;
        default:
          setPage(1);
          break;
      }
    }

  return (
      <div>
        <LoadingOverlay active={isLoading} />
        <Container fluid>
          <RowDivider />
          <Row className="form-group row" >
            <Col className="form-label col-form-label" sm="3"><h3>Entity and Topic Editor</h3></Col></Row>
          <Row className="form-group row" >
            <Col className="div-grey-border" sm="1">topic</Col>
            <Col className="div-grey-border" sm="1">entity type <FontAwesomeIcon icon={sortBy !== "entity_type" || !descSort ? faSortAlphaDown : faSortAlphaUp} style={{color: sortBy === "entity_type" ? '#0069d9' : 'black'}}
                                                                                 onClick={() => {
                                                                                   if (sortBy === "entity_type" && descSort) {
                                                                                     setSortBy(null);
                                                                                     setDescSort(true);
                                                                                   } else {
                                                                                     setSortBy("entity_type");
                                                                                     setDescSort(!descSort)}
                                                                                 }}/></Col>
            <Col className="div-grey-border" sm="2">species (taxon)</Col>
            <Col className="div-grey-border" sm="2">entity name</Col>
            <Col className="div-grey-border" sm="2">entity curie</Col>
            <Col className="div-grey-border" sm="1">qualifier</Col>
            <Col className="div-grey-border" sm="1">manual validation</Col>
          </Row>
          { topicEntityTags.map( (tetDict, index) => {
            let qualifierValue = ''; let qualifierId = ''; let qualifierIndex = '';
            // UI only allows display/selection of one priority qualifier, but someone could connect in the database multiple priority qualifier in topic_entity_tag_prop to the same topic_entity_tag, even though that would be wrong.
            if ('props' in tetDict && tetDict['props'].length > 0) {
              // for (const tetpDict of tetDict['props'].values())
              for (const[indexPriority, tetpDict] of tetDict['props'].entries()) {
                if ('qualifier' in tetpDict && tetpDict['qualifier'] !== '' && qualifierList.includes(tetpDict['qualifier'])) {
                  qualifierId = tetpDict['topic_entity_tag_prop_id'];
                  qualifierIndex = indexPriority;
                  qualifierValue = tetpDict['qualifier']; } } }
            const entityName = tetDict.entity in entityEntityMappings ? entityEntityMappings[tetDict.entity] : 'unknown';
            if ( (biblioAction === 'entity') && (tetDict.topic !== 'ATP:0000122') ) { return ""; }
            // else if ( (biblioAction === 'topic') && (tetDict.topic === 'ATP:0000122') ) { return ""; } // topic no longer a separate section
            else {
              return (
                  <Row key={`geneEntityContainerrows ${tetDict.topic_entity_tag_id}`}>
                    <Col className="div-grey-border" sm="1">{tetDict.topic in entityEntityMappings ? entityEntityMappings[tetDict.topic] : tetDict.topic }</Col>
                    <Col className="div-grey-border" sm="1">{tetDict.entity_type in entityEntityMappings ? entityEntityMappings[tetDict.entity_type] : tetDict.entity_type }</Col>
                    <Col className="div-grey-border" sm="2">{tetDict.species in curieToNameTaxon ? curieToNameTaxon[tetDict.species] : tetDict.species }</Col>
                    <Col className="div-grey-border" sm="2">{entityName}</Col>
                    <Col className="div-grey-border" sm="2">{tetDict.entity}</Col>

                    <Col sm="1">
                      {/* changeFieldEntityEditorPriority changes which value to display, but does not update database. ideally this would update the databasewithout reloading referenceJsonLive, because API would return entities in a different order, so things would jump. but if creating a new qualifier where there wasn't any, there wouldn't be a tetpId until created, and it wouldn't be in the prop when changing again. could get the tetpId from the post and inject it, but it starts to get more complicated.  needs to display to patch existing tetp prop, or post to create a new one */}
                      <Form.Control as="select" id={`qualifier ${index} ${qualifierIndex} ${qualifierId}`} type="tetqualifierSelect" disabled="disabled" value={qualifierValue} onChange={(e) => dispatch(changeFieldEntityEditorPriority(e))} >
                        { qualifierList.map((optionValue, index) => (
                            <option key={`tetqualifierSelect ${optionValue}`} value={optionValue}>{curieToNameAtp[optionValue]}</option>
                        ))}
                      </Form.Control>
                    </Col>
                    <Col sm="1">
                      <Form.Control as="select" id={`manualSelect ${index}`} type="manualSelect" disabled="disabled" value="manual" onChange={(e) => {} } >
                        <option key={`manual ${index}`} value="manual">positive</option>
                      </Form.Control>
                    </Col>
                  </Row> ) }
          } ) }
        </Container>
        {totalTagsCount > 0 ?
            <Pagination style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '10vh'}}>
              <Pagination.First  onClick={() => changePage('First')} />
              <Pagination.Prev   onClick={() => changePage('Prev')} />
              <Pagination.Item  disabled>{"Page " + page + " of " + Math.ceil(totalTagsCount/pageSize)}</Pagination.Item>
              <Pagination.Next   onClick={() => changePage('Next')} />
              <Pagination.Last   onClick={() => changePage('Last')} />
            </Pagination>
            : null}
      </div>);
} // const EntityEditor

const EntityCreate = () => {
  const dispatch = useDispatch();
  const referenceJsonLive = useSelector(state => state.biblio.referenceJsonLive);
  const accessToken = useSelector(state => state.isLogged.accessToken);
  const oktaMod = useSelector(state => state.isLogged.oktaMod);
  const testerMod = useSelector(state => state.isLogged.testerMod);
  const accessLevel = (testerMod !== 'No') ? testerMod : oktaMod;

  const biblioAction = useSelector(state => state.biblio.biblioAction);
  const biblioUpdatingEntityAdd = useSelector(state => state.biblio.biblioUpdatingEntityAdd);
  const entityModalText = useSelector(state => state.biblio.entityModalText);
  const entityText = useSelector(state => state.biblio.entityAdd.entitytextarea);
  const noteText = useSelector(state => state.biblio.entityAdd.notetextarea);
  const tetqualifierSelect = useSelector(state => state.biblio.entityAdd.tetqualifierSelect);
  const taxonSelect = useSelector(state => state.biblio.entityAdd.taxonSelect);
  const entityTypeSelect = useSelector(state => state.biblio.entityAdd.entityTypeSelect);
  const entityResultList = useSelector(state => state.biblio.entityAdd.entityResultList);
  const topicSelect = 'entity type ATP:0000122';
  const modToTaxon = { 'ZFIN': ['NCBITaxon:7955'], 'FB': ['NCBITaxon:7227'], 'WB': ['NCBITaxon:6239'], 'RGD': ['NCBITaxon:10116'], 'MGI': ['NCBITaxon:10090'], 'SGD': ['NCBITaxon:559292'], 'XB': ['NCBITaxon:8355', 'NCBITaxon:8364'] }
  const unsortedTaxonList = [ '', 'NCBITaxon:559292', 'NCBITaxon:6239', 'NCBITaxon:7227', 'NCBITaxon:7955', 'NCBITaxon:10116', 'NCBITaxon:10090', 'NCBITaxon:8355', 'NCBITaxon:8364', 'NCBITaxon:9606' ];
  let taxonList = unsortedTaxonList.sort((a, b) => (curieToNameTaxon[a] > curieToNameTaxon[b] ? 1 : -1));
  const entityTypeList = ['ATP:0000005', 'ATP:0000006'];

  useEffect( () => {
    if (!(taxonSelect === '' || taxonSelect === undefined)) {
      dispatch(changeFieldEntityEntityList(entityText, accessToken, taxonSelect, curieToNameEntityType[entityTypeSelect])) }
  }, [entityText, taxonSelect]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect( () => {
    if (accessLevel in modToTaxon) {
      dispatch(changeFieldEntityAddTaxonSelect(modToTaxon[accessLevel][0])) }
  }, [accessLevel]); // eslint-disable-line react-hooks/exhaustive-deps

  function createEntities(refCurie) {
    const forApiArray = []
    if ( entityResultList && entityResultList.length > 0 ) {
      for (const entityResult of entityResultList.values()) {
        console.log(entityResult);
        console.log(entityResult.curie);
        if (entityResult.curie !== 'no Alliance curie') {
          let updateJson = {};
          updateJson['reference_curie'] = refCurie;
          updateJson['topic'] = biblioAction === 'entity' ? 'ATP:0000122' : 'insert topic here';
          // updateJson['entity_type'] = 'ATP:0000005';
          updateJson['entity_type'] = entityTypeSelect;
          updateJson['entity'] = entityResult.curie;
          updateJson['entity_source'] = 'alliance'; // TODO: make this a select with 'alliance', 'mod', 'new'
          updateJson['species'] = taxonSelect;
          // TODO: add entity_published_as field when synonyms are in the A-team system
          updateJson['sources'] = [
              {
                'source': 'manual',
                'mod_abbreviation': accessLevel,
                'validated': true,
                'validation_type': 'manual',
                'note': noteText
              }];
          if (tetqualifierSelect && tetqualifierSelect !== '') {
            updateJson['qualifiers'] = [
              {
                'qualifier': tetqualifierSelect,
                'qualifier_type': 'curation',
                'mod_abbreviation': accessLevel
              }
            ];
          }
          let subPath = 'topic_entity_tag/';
          let method = 'POST';
          let array = [ subPath, updateJson, method]
          forApiArray.push( array );
        }
      }
    }

    dispatch(setBiblioUpdatingEntityAdd(forApiArray.length));

    for (const arrayData of forApiArray.values()) {
      arrayData.unshift(accessToken);
        dispatch(updateButtonBiblioEntityAdd(arrayData))
    }
  }

  if (accessLevel in modToTaxon) {
    let filteredTaxonList = taxonList.filter((x) => !modToTaxon[accessLevel].includes(x));
    taxonList = modToTaxon[accessLevel].concat(filteredTaxonList); }

  // const taxonSelect = 'NCBITaxon:4932';	// to hardcode if they don't want a dropdown
  // const taxonSelect = 'NCBITaxon:6239';	// to hardcode if they don't want a dropdown
  // figure out if they want general disabling to work the same for the whole row, in which case combine the next two variables
  const disabledEntityList = (taxonSelect === '' || taxonSelect === undefined) ? 'disabled' : '';
  const disabledAddButton = (taxonSelect === '' || taxonSelect === undefined) ? 'disabled' : '';

  return (
    <Container fluid>
    <ModalGeneric showGenericModal={entityModalText !== '' ? true : false} genericModalHeader="Entity Error"
                  genericModalBody={entityModalText} onHideAction={setEntityModalText('')} />
    <RowDivider />
    <Row className="form-group row" >
      <Col className="form-label col-form-label" sm="3"><h3>Entity and Topic Addition</h3></Col></Row>
    <Row className="form-group row" >
      <Col className="div-grey-border" sm="1">topic</Col>
      <Col className="div-grey-border" sm="1">entity type</Col>
      <Col className="div-grey-border" sm="1">species</Col>
      <Col className="div-grey-border" sm="2">entity list (one per line, case insensitive)</Col>
      <Col className="div-grey-border" sm="2">entity validation</Col>
      <Col className="div-grey-border" sm="1">qualifier</Col>
      <Col className="div-grey-border" sm="3">internal notes</Col>
      <Col className="div-grey-border" sm="1">button</Col>
    </Row>
    <Row className="form-group row" >
      <Col sm="1">
        <Form.Control as="select" id="topicSelect" type="topicSelect" value={topicSelect} onChange={(e) => {} } >
          <option key={`topicSelect ${topicSelect}`} value={topicSelect}>{topicSelect}</option>
        </Form.Control>
      </Col>
      <Col sm="1">
        <Form.Control as="select" id="entityTypeSelect" type="entityTypeSelect" value={entityTypeSelect} onChange={(e) => { dispatch(changeFieldEntityAddGeneralField(e)) } } >
          { entityTypeList.map((optionValue, index) => (
            <option key={`entityTypeSelect ${optionValue}`} value={optionValue}>{curieToNameEntityType[optionValue]} {optionValue}</option>
          ))}
        </Form.Control>
      </Col>
      <Col sm="1">
        <Form.Control as="select" id="taxonSelect" type="taxonSelect" value={taxonSelect} onChange={(e) => { dispatch(changeFieldEntityAddGeneralField(e)) } } >
          { taxonList.map((optionValue, index) => (
            <option key={`taxonSelect ${optionValue}`} value={optionValue}>{curieToNameTaxon[optionValue]}</option>
          ))}
        </Form.Control>
      </Col>
      <Col className="form-label col-form-label" sm="2" >
        <Form.Control as="textarea" id="entitytextarea" type="entitytextarea" value={entityText} disabled={disabledEntityList} onChange={(e) => { dispatch(changeFieldEntityAddGeneralField(e)); } } />
      </Col>
      <Col className="form-label col-form-label" sm="2" >
        <Container>
          { entityResultList && entityResultList.length > 0 && entityResultList.map( (entityResult, index) => {
            const colDisplayClass = (entityResult.curie === 'no Alliance curie') ? 'Col-display-warn' : 'Col-display';
            return (
              <Row key={`entityEntityContainerrows ${index}`}>
                <Col className={`Col-general ${colDisplayClass} Col-display-left`} sm="5">{entityResult.entityTypeSymbol}</Col>
                <Col className={`Col-general ${colDisplayClass} Col-display-right`} sm="7">{entityResult.curie}</Col>
              </Row>)
          } ) }
        </Container>
      </Col>
      <Col sm="1">
        <Form.Control as="select" id="tetqualifierSelect" type="tetqualifierSelect" value={tetqualifierSelect} onChange={(e) => dispatch(changeFieldEntityAddGeneralField(e))} >
          { qualifierList.map((optionValue, index) => (
            <option key={`tetqualifierSelect ${optionValue}`} value={optionValue}>{curieToNameAtp[optionValue]}</option>
          ))}
        </Form.Control>
      </Col>
      <Col className="form-label col-form-label" sm="3">
        <Form.Control as="textarea" id="notetextarea" type="notetextarea" value={noteText} onChange={(e) => dispatch(changeFieldEntityAddGeneralField(e))} />
      </Col>
      <Col className="form-label col-form-label" sm="1"><Button variant="outline-primary" disabled={disabledAddButton} onClick={() => createEntities(referenceJsonLive.curie)} >{biblioUpdatingEntityAdd > 0 ? <Spinner animation="border" size="sm"/> : "Add"}</Button></Col>
    </Row></Container>);
}

export default BiblioEntity;
