
import {useEffect, useRef, useState} from 'react';
import { useSelector, useDispatch } from 'react-redux';

import { changeFieldEntityEntityList } from '../../actions/biblioActions';
import { changeFieldEntityAddGeneralField } from '../../actions/biblioActions';
import { changeFieldEntityAddTaxonSelect } from '../../actions/biblioActions';
import { updateButtonBiblioEntityAdd } from '../../actions/biblioActions';
import { setBiblioUpdatingEntityAdd } from '../../actions/biblioActions';
import { setEntityModalText } from '../../actions/biblioActions';
import { changeFieldEntityEditorPriority } from '../../actions/biblioActions';
import { fetchQualifierData } from '../../actions/biblioActions';

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

import { AsyncTypeahead } from "react-bootstrap-typeahead";

export const curieToNameEntityType = { '': 'no value', 'ATP:0000005': 'gene', 'ATP:0000006': 'allele' };

const BiblioEntity = () => {
  return (<><EntityCreate key="entityCreate" />
          <EntityEditor key="entityEditor" /></>);
}

const curieToNameTaxon = {
    'NCBITaxon:559292': 'Saccharomyces cerevisiae',
    'NCBITaxon:6239': 'Caenorhabditis elegans',
    'NCBITaxon:7227': 'Drosophila melanogaster',
    'NCBITaxon:7955': 'Danio rerio',
    'NCBITaxon:10116': 'Rattus norvegicus',
    'NCBITaxon:10090': 'Mus musculus',
    'NCBITaxon:8355': 'Xenopus laevis',
    'NCBITaxon:8364': 'Xenopus tropicalis',
    'NCBITaxon:9606': 'Homo sapiens',
    '': ''
};

const EntityEditor = () => {
  const dispatch = useDispatch();
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
  const [qualifierData, setQualifierData] = useState([]);
 
  useEffect(() => {
     fetchQualifierData(accessToken).then((data) => setQualifierData(data));
  }, [])
  
  const qualifierList = qualifierData.map(option => option.name);
  // console.table("qualifierData=", qualifierData);
  // console.table("qualifierList=", qualifierList);
    
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
            let entityName = '';
            if (tetDict.entity !== null) {
              entityName = tetDict.entity in entityEntityMappings ? entityEntityMappings[tetDict.entity] : 'unknown'; }
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
		      <option value=""> </option> {/* Empty option */}
                      {qualifierData
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((option, index) => (
                          <option key={`tetqualifierSelect-${index}`} value={option.curie}>
                            {option.name}
                          </option>
			))}
                    </Form.Control>
                  </Col>
                  <Col sm="1">
                    <Form.Control as="select" id={`manualSelect ${index}`} type="manualSelect" disabled="disabled" value="manual" onChange={(e) => {} } >
                      <option key={`manual ${index}`} value="manual">positive</option>
                    </Form.Control>
                  </Col>
                </Row> ) }
          ) }
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
  const [qualifierData, setQualifierData] = useState([]);
  const [newQualifier, setNewQualifier] = useState('');
    
  const biblioUpdatingEntityAdd = useSelector(state => state.biblio.biblioUpdatingEntityAdd);
  const entityModalText = useSelector(state => state.biblio.entityModalText);
  const entityText = useSelector(state => state.biblio.entityAdd.entitytextarea);
  const noteText = useSelector(state => state.biblio.entityAdd.notetextarea);
  const [topicSelect, setTopicSelect] = useState(null);
  const [topicSelectLoading, setTopicSelectLoading] = useState(false);
  const topicTypeaheadRef = useRef(null);
  const [typeaheadOptions, setTypeaheadOptions] = useState([]);
  const [typeaheadName2CurieMap, setTypeaheadName2CurieMap] = useState({});
  const [warningMessage, setWarningMessage] = useState('');
  
  const tetqualifierSelect = useSelector(state => state.biblio.entityAdd.tetqualifierSelect);
  const taxonSelect = useSelector(state => state.biblio.entityAdd.taxonSelect);
  const entityTypeSelect = useSelector(state => state.biblio.entityAdd.entityTypeSelect);
  const entityResultList = useSelector(state => state.biblio.entityAdd.entityResultList);
  const modToTaxon = { 'ZFIN': ['NCBITaxon:7955'],
		       'FB': ['NCBITaxon:7227'],
		       'WB': ['NCBITaxon:6239'],
		       'RGD': ['NCBITaxon:10116'],
		       'MGI': ['NCBITaxon:10090'],
		       'SGD': ['NCBITaxon:559292'],
		       'XB': ['NCBITaxon:8355', 'NCBITaxon:8364'] }
  const unsortedTaxonList = [ '', 'NCBITaxon:559292', 'NCBITaxon:6239', 'NCBITaxon:7227',
			      'NCBITaxon:7955', 'NCBITaxon:10116', 'NCBITaxon:10090',
			      'NCBITaxon:8355', 'NCBITaxon:8364', 'NCBITaxon:9606' ];
  let taxonList = unsortedTaxonList.sort((a, b) => (curieToNameTaxon[a] > curieToNameTaxon[b] ? 1 : -1));
  const entityTypeList = ['', 'ATP:0000005', 'ATP:0000006'];

  /*
   ATP:0000128: protein containing complex
   ATP:0000012: gene ontology
   ATP:0000079: Classical phenotype information
   ATP:0000129: Headline information
  */
  const sgdPrimaryTopics = ['ATP:0000128', 'ATP:0000012', 'ATP:0000079', 'ATP:0000129'];
  const primaryDisplay = 'ATP:0000147';
    
  /*
   ATP:0000085: high throughput phenotype assay
   TODO: add another one: other HTP?
  */
  const sgdOmicsTopics = ['ATP:0000085'];
  const omicsDisplay = 'ATP:0000148';
    
  /*
   ATP:0000142: entity (Gene model/Alleles/Reviews/other primary?)
  */
  const sgdEntityTopic = 'ATP:0000142';
    
  /* 
   ATP:0000011: Homology/Disease
   ATP:0000088: post translational modification
   ATP:0000070: regulatory interaction
   ATP:0000022: pathway
   ATP:0000149: metabolic engineering
  */  
  const sgdAdditionalTopics = ['ATP:0000142', 'ATP:0000011', 'ATP:0000088', 'ATP:0000070',
			       'ATP:0000022', 'ATP:0000149'];
  const additionalDisplay = 'ATP:0000132';
  const reviewDisplay = 'ATP:0000130';
    
  useEffect(() => {
     fetchQualifierData(accessToken).then((data) => setQualifierData(data));
  }, [])

  useEffect( () => {
    if (taxonSelect !== '' && taxonSelect !== undefined && entityTypeSelect !== '') {
      dispatch(changeFieldEntityEntityList(entityText, accessToken, taxonSelect, curieToNameEntityType[entityTypeSelect])) }
  }, [entityText, taxonSelect]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect( () => {
    if (accessLevel in modToTaxon) {
      dispatch(changeFieldEntityAddTaxonSelect(modToTaxon[accessLevel][0])) }
  }, [accessLevel]); // eslint-disable-line react-hooks/exhaustive-deps

  function initializeUpdateJson(refCurie) {
    let updateJson = {};
    updateJson['reference_curie'] = refCurie;
    updateJson['topic'] = topicSelect;
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
    return updateJson;
  }

  function checkTopicEntitySetQualifierForSGD() {

    /*
     -------------------------------------------
     qualifier = 'primary display', ATP:0000147
     -------------------------------------------  
    */
    const isPrimaryTopic = sgdPrimaryTopics.includes(topicSelect);  
    const isEntityEmpty = !entityText || entityText.trim() === '';
    let isEntityInvalid = false;
    if ( entityResultList && entityResultList.length > 0 ) {
      for (let entityResult of entityResultList.values()) {
        if (entityResult.curie === 'no Alliance curie') {
          isEntityInvalid = true;
	  break;
        }
      }
    }
    if (isPrimaryTopic) {
      if (isEntityEmpty || isEntityInvalid) {
        return ["You need to add a valid gene or other entity.", false];
      }
      return [false, primaryDisplay];
    }

    /*
     -----------------------------------------
     qualifier = 'OMICs display', ATP:0000148
     -----------------------------------------
    */
    if (sgdOmicsTopics.includes(topicSelect)) {
      if (isEntityEmpty === false) {
	return ["There is no need to include any entities in a paper containing HTP data.", false];
      }
      return [false, omicsDisplay];
    }

    /*
     -----------------------------------------------------------------
     qualifier = 'additional display', ATP:0000132 if there is entity
     -----------------------------------------------------------------
    */
    if (sgdAdditionalTopics.includes(topicSelect)) {
      if (isEntityEmpty) { // no gene/entity => no qualifier
        return [false, ''];
      }
      else if (isEntityInvalid) {
	return ["If you want to add an entity, please ensure it is valid; otherwise, remove the entity.", false];
      }
      return [false, additionalDisplay];
    }

    /*
     -------------------------------------------------------------------
     it is an entity topic ATP:0000142:
       it can be review or gene model, alleles or has data about entity
     -------------------------------------------------------------------
     qualifier can be 'additional display' (ATP:0000132) or 'review display' (ATP:0000130)
     or no qualifier  
     * for a review paper, entity is optional => qualifier = 'review display' (ATP:0000130)
     * for a not-review paper, if there is an entity, qualifier = 'additional display'; 
       otherwise, no qualifier => qualifier = ''
    */
    if (topicSelect === sgdEntityTopic) {
      // if it is a review paper	  
      if (tetqualifierSelect === reviewDisplay) { 	  
	if (isEntityEmpty) { // no gene/entity
          return [false, reviewDisplay];
        }
        else if (isEntityInvalid) {
          return ["If you want to add an entity, please ensure it is valid; otherwise, remove the entity.", false];
        }
        return [false, reviewDisplay];
      }

      /* if it is not a review paper and it has no entity provided so set qualifier to '' */
      if (isEntityEmpty) {
	return [false, ''];
      }		  

      /*
       if it is not a review paper and it has an entity provided
       then set qualifier = 'ATP:0000132' (additional display) if it a valid entity
      */
      if (isEntityInvalid) {
	return ["If you want to add an entity, please ensure it is valid; otherwise, remove the entity and set qualifier to ''", false];
      }
      return [false, additionalDisplay]
    }
    return ['You select an unknown topic for SGD. Please make the necessary correction.', false]
  }

  function getQualifierForTopic(topicSelect) {

    if (accessLevel !== 'SGD') {
      return '';
    }
    if (sgdPrimaryTopics.includes(topicSelect)) {
      return primaryDisplay;
    }
    if (sgdOmicsTopics.includes(topicSelect)) {
      return omicsDisplay;
    }
    if (sgdAdditionalTopics.includes(topicSelect) || topicSelect === sgdEntityTopic) {
      /* 
       Set qualifier to 'additional display' first.
       * curators can also manually change it to 'primary display' if it is an 'entity' topic 
         and has info about entity
       * curators can also manually change it to 'review display' if it is an 'entity' topic
         and it is a review paper
       * otherwise, it will be reset to '' unless a valid gene/entity is provided
      */
      return additionalDisplay;
    }
    return '';
  }
    
  function createEntities(refCurie) {
    if (topicSelect === null) {
      return
    }
      
    if (accessLevel === 'SGD') {
      const [warningMessage, qualifier] = checkTopicEntitySetQualifierForSGD();
      if (warningMessage) {
        setWarningMessage(warningMessage)
        setTimeout(() => {
          setWarningMessage('');
        }, 5000);
        return;
      }
      setNewQualifier(qualifier);
      console.log("qualifier = " + qualifier);	
    }
    
    const forApiArray = []
    const subPath = 'topic_entity_tag/';
    const method = 'POST';
    if ( entityResultList && entityResultList.length > 0 ) {
      for (const entityResult of entityResultList.values()) {
        console.log(entityResult);
        console.log(entityResult.curie);
        if (entityResult.curie !== 'no Alliance curie') {
          let updateJson = initializeUpdateJson(refCurie);
          // updateJson['entity_type'] = 'ATP:0000005';
          updateJson['entity_source'] = 'alliance'; // TODO: make this a select with 'alliance', 'mod', 'new'
          updateJson['entity_type'] = (entityTypeSelect === '') ? null : entityTypeSelect;
          updateJson['entity'] = entityResult.curie;
          let array = [subPath, updateJson, method]
           forApiArray.push(array); } } }
    else if (taxonSelect !== '' && taxonSelect !== undefined) {
      let updateJson = initializeUpdateJson(refCurie);
      // curators can pick an entity_type without adding an entity list, so send that to API so they can get an error message
      updateJson['entity_type'] = (entityTypeSelect === '') ? null : entityTypeSelect;
      let array = [subPath, updateJson, method]
      forApiArray.push(array); }

    dispatch(setBiblioUpdatingEntityAdd(forApiArray.length));

    for (const arrayData of forApiArray.values()) {
      arrayData.unshift(accessToken);
        dispatch(updateButtonBiblioEntityAdd(arrayData))
    }
    setTypeaheadOptions([]);
    setTopicSelect(null);
    topicTypeaheadRef.current.clear();
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
    {warningMessage && (
      <Row className="form-group row">
        <Col sm="12">
          <div className="alert alert-warning" role="alert">
            {warningMessage}
          </div>
	</Col>
      </Row>
    )}	  
    <Row className="form-group row" >
      <Col className="div-grey-border" sm="2">topic</Col>
      <Col className="div-grey-border" sm="1">entity type</Col>
      <Col className="div-grey-border" sm="1">species</Col>
      <Col className="div-grey-border" sm="2">entity list (one per line, case insensitive)</Col>
      <Col className="div-grey-border" sm="2">entity validation</Col>
      <Col className="div-grey-border" sm="1">qualifier</Col>
      <Col className="div-grey-border" sm="2">internal notes</Col>
      <Col className="div-grey-border" sm="1">button</Col>
    </Row>
    <Row className="form-group row" >
      <Col sm="2">
        <AsyncTypeahead isLoading={topicSelectLoading} placeholder="Start typing to search topics"
                        ref={topicTypeaheadRef} id="topicTypeahead"
            onSearch={(query) => {
              setTopicSelectLoading(true);
              axios.post(process.env.REACT_APP_ATEAM_API_BASE_URL + 'api/atpterm/search?limit=10&page=0',
                  {
                    "searchFilters": {
                      "nameFilter": {
                        "name": {
                          "queryString": query,
                          "tokenOperator": "AND"
                        }
                      }
                    },
                    "sortOrders": [],
                    "aggregations": [],
                    "nonNullFieldsTable": []
                  },
                  { headers: {
                      'content-type': 'application/json',
                      'authorization': 'Bearer ' + accessToken
                    }
                  })
              .then(res => {
                setTopicSelectLoading(false);
                setTypeaheadName2CurieMap(Object.fromEntries(res.data.results.map(item => [item.name, item.curie])))
                setTypeaheadOptions(res.data.results.map(item => item.name));
              });
            }}
            onChange={(selected) => {
	      setTopicSelect(typeaheadName2CurieMap[selected[0]]);
	      // Set the qualifier value based on the selected topic
	      setNewQualifier(getQualifierForTopic(typeaheadName2CurieMap[selected[0]]));
            }}
            options={typeaheadOptions}
        />
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
        <Form.Control as="select" id="tetqualifierSelect" type="tetqualifierSelect" value={newQualifier} onChange={(e) => setNewQualifier(e.target.value)} >
	  <option value=""> </option> {/* Empty option */} 
          {qualifierData
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((option, index) => (
              <option key={`tetqualifierSelect-${index}`} value={option.curie}>
                {option.name}
              </option>
            ))}
        </Form.Control>
      </Col>
      <Col className="form-label col-form-label" sm="2">
        <Form.Control as="textarea" id="notetextarea" type="notetextarea" value={noteText} onChange={(e) => dispatch(changeFieldEntityAddGeneralField(e))} />
      </Col>
      <Col className="form-label col-form-label" sm="1"><Button variant="outline-primary" disabled={disabledAddButton} onClick={() => createEntities(referenceJsonLive.curie)} >{biblioUpdatingEntityAdd > 0 ? <Spinner animation="border" size="sm"/> : "Add"}</Button></Col>
    </Row></Container>);
}

export default BiblioEntity;
