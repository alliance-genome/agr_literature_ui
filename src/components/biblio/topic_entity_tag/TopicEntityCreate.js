import {useDispatch, useSelector} from "react-redux";
import React, {useEffect, useRef, useState} from "react";
import {
    ateamGetTopicDescendants,
    changeFieldEntityAddDisplayTag,
    changeFieldEntityAddGeneralField,
    changeFieldEntityAddTaxonSelect,
    changeFieldEntityEntityList,
    fetchDisplayTagData,
    getCuratorSourceId,
    setBiblioUpdatingEntityAdd,
    setEntityModalText,
    setTypeaheadName2CurieMap,
    updateButtonBiblioEntityAdd
} from "../../../actions/biblioActions";
import {checkTopicEntitySetDisplayTag, setDisplayTag, sgdTopicList} from "../BiblioEntityUtilsSGD";
import Container from "react-bootstrap/Container";
import ModalGeneric from "../ModalGeneric";
import RowDivider from "../RowDivider";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form"
import {AsyncTypeahead} from "react-bootstrap-typeahead";
import Button from "react-bootstrap/Button"
import Spinner from "react-bootstrap/Spinner";
import axios from "axios";

export const curieToNameEntityType = { '': 'no value', 'ATP:0000005': 'gene', 'ATP:0000006': 'allele', 'ATP:0000123': 'species' };

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

const TopicEntityCreate = () => {
  const dispatch = useDispatch();
  const referenceJsonLive = useSelector(state => state.biblio.referenceJsonLive);
  const accessToken = useSelector(state => state.isLogged.accessToken);
  const oktaMod = useSelector(state => state.isLogged.oktaMod);
  const testerMod = useSelector(state => state.isLogged.testerMod);
  const accessLevel = (testerMod !== 'No') ? testerMod : oktaMod;
  const [displayTagData, setDisplayTagData] = useState([]);

  const biblioUpdatingEntityAdd = useSelector(state => state.biblio.biblioUpdatingEntityAdd);
  const entityModalText = useSelector(state => state.biblio.entityModalText);
  const entityText = useSelector(state => state.biblio.entityAdd.entitytextarea);
  const noteText = useSelector(state => state.biblio.entityAdd.notetextarea);
  const topicSelect = useSelector(state => state.biblio.entityAdd.topicSelect);
  const [topicSelectLoading, setTopicSelectLoading] = useState(false);
  const topicTypeaheadRef = useRef(null);
  const [typeaheadOptions, setTypeaheadOptions] = useState([]);
  const typeaheadName2CurieMap = useSelector(state => state.biblio.typeaheadName2CurieMap);
  const [warningMessage, setWarningMessage] = useState('');

  const tetdisplayTagSelect = useSelector(state => state.biblio.entityAdd.tetdisplayTagSelect);
  const taxonSelect = useSelector(state => state.biblio.entityAdd.taxonSelect);
  const entityTypeSelect = useSelector(state => state.biblio.entityAdd.entityTypeSelect);
  const entityResultList = useSelector(state => state.biblio.entityAdd.entityResultList);
  const curieToNameDisplayTag = displayTagData.reduce((acc, option) => {
    acc[option.curie] = option.name;
    return acc;
  }, {});
  const displayTagList = displayTagData.map(option=> option.curie);
  displayTagList.unshift('');

  const [topicEntitySourceId, setTopicEntitySourceId] = useState(undefined);

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
  const entityTypeList = ['', 'ATP:0000005', 'ATP:0000006', 'ATP:0000123'];

  useEffect(() => {
    const fetchSourceId = async () => {
      if (accessToken !== null) {
        setTopicEntitySourceId(await getCuratorSourceId(accessLevel, accessToken));
      }
    }
    fetchSourceId().catch(console.error);
  }, [accessLevel, accessToken]);

  const topicDescendants = useSelector(state => state.biblio.topicDescendants);
  useEffect(() => {
    if ((topicDescendants.size === 0) && (accessToken !== null)) {
      dispatch(ateamGetTopicDescendants(accessToken)); }
  }, [topicDescendants, accessToken, dispatch])

  useEffect(() => {
     fetchDisplayTagData(accessToken).then((data) => setDisplayTagData(data));
     if (accessLevel === 'SGD') {
       dispatch(changeFieldEntityAddGeneralField({target: {id: 'entityTypeSelect', value: 'ATP:0000005' }}));
     }
  }, [accessLevel, accessToken, dispatch])

  useEffect( () => {
    if (taxonSelect !== '' && taxonSelect !== undefined && entityTypeSelect !== '') {
      dispatch(changeFieldEntityEntityList(entityText, accessToken, taxonSelect, curieToNameEntityType[entityTypeSelect])) }
  }, [entityText, taxonSelect]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect( () => {
    if (accessLevel in modToTaxon) {
      dispatch(changeFieldEntityAddTaxonSelect(modToTaxon[accessLevel][0])) }
  }, [accessLevel]); // eslint-disable-line react-hooks/exhaustive-deps

  const getMapKeyByValue = (mapObj, value) => {
    const objEntries = Object.entries(mapObj);
    const keyByValue = objEntries.filter((e) => e[1] === value);
    return keyByValue.map(e => e[0])[0];
  }

  function initializeUpdateJson(refCurie) {
    let updateJson = {};
    updateJson['reference_curie'] = refCurie;
    updateJson['topic'] = topicSelect;
    updateJson['species'] = taxonSelect;
    // TODO: add entity_published_as field when synonyms are in the A-team system
    updateJson['note'] = noteText !== "" ? noteText : null;
    updateJson['negated'] = false;
    updateJson['confidence_level'] = null;
    updateJson['topic_entity_tag_source_id'] = topicEntitySourceId;
    if (tetdisplayTagSelect && tetdisplayTagSelect !== '') {
      updateJson['display_tag'] = tetdisplayTagSelect;
    }
    return updateJson;
  }

  function getDisplayTagForTopic(topicSelect) {
    dispatch(changeFieldEntityAddGeneralField({target: {id: 'topicSelect', value: topicSelect }}));
    if (accessLevel !== 'SGD') {
      return '';
    }
    return setDisplayTag(topicSelect);
  }

  function createEntities(refCurie) {
    if (topicSelect === null) {
      return
    }
    if (accessLevel === 'SGD') {
      const [warningMessage, displayTag] = checkTopicEntitySetDisplayTag(entityText,
									   entityResultList,
									   topicSelect);
      if (warningMessage) {
        setWarningMessage(warningMessage)
        setTimeout(() => {
          setWarningMessage('');
        }, 8000);
        return;
      }
      dispatch(changeFieldEntityAddDisplayTag(displayTag));
      console.log("displayTag = " + displayTag);
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
      dispatch(updateButtonBiblioEntityAdd(arrayData, accessLevel))
    }
    if (accessLevel === 'SGD') {
      dispatch(changeFieldEntityAddGeneralField({target: {id: 'topicSelect', value: '' }}));
    }
    else {
      setTypeaheadOptions([]);
      dispatch(changeFieldEntityAddGeneralField({target: {id: 'topicSelect', value: null }}));
      if (topicTypeaheadRef.current !== null) {
        topicTypeaheadRef.current.clear();
      }
    }
  }

  if (accessLevel in modToTaxon) {
    let filteredTaxonList = taxonList.filter((x) => !modToTaxon[accessLevel].includes(x));
    taxonList = modToTaxon[accessLevel].concat(filteredTaxonList); }

  // const taxonSelect = 'NCBITaxon:4932';	// to hardcode if they don't want a dropdown
  // const taxonSelect = 'NCBITaxon:6239';	// to hardcode if they don't want a dropdown
  // figure out if they want general disabling to work the same for the whole row, in which case combine the next two variables
  const disabledEntityList = (taxonSelect === '' || taxonSelect === undefined) ? 'disabled' : '';
  const disabledAddButton = (taxonSelect === '' || taxonSelect === undefined || topicEntitySourceId === undefined) ? 'disabled' : '';

  if (accessLevel === 'SGD') {
    return (
      <Container fluid>
	<ModalGeneric showGenericModal={entityModalText !== '' ? true : false} genericModalHeader="Entity Error"
                      genericModalBody={entityModalText} onHideAction={setEntityModalText('')} />
        <RowDivider />
        <Row className="form-group row" style={{ display: 'flex', alignItems: 'center' }}>
          <Col className="form-label col-form-label" sm="10" align='left'><h3>Entity and Topic Addition</h3></Col></Row>
        {warningMessage && (
          <Row className="form-group row">
            <Col sm="10">
              <div className="alert alert-warning" role="alert">
                {warningMessage}
              </div>
           </Col>
          </Row>
        )}
	<Row className="form-group row">
	  <Col sm="3">
	    <div><label>Topic:</label></div>
            <Form.Control as="select" id="topicSelect" type="topicSelect" value={topicSelect} onChange={(e) => { dispatch(changeFieldEntityAddDisplayTag(getDisplayTagForTopic(e.target.value))) }} >
              <option value=""> Pick a topic </option> {/* Empty option */}
              {sgdTopicList
                .map((option, index) => (
                  <option key={`topicSelect-${index}`} value={option.curie}>
                    {option.name}
                  </option>
              ))}
            </Form.Control>
	  </Col>
	  <Col sm="3">
            <div><label>Entity Type:</label></div>
            <TetPulldownMenu id='entityTypeSelect' value={entityTypeSelect} pdList={entityTypeList} curieToName={curieToNameEntityType} />
	  </Col>
	  <Col sm="3">
	    <div><label>Species:</label></div>
            <TetPulldownMenu id='taxonSelect' value={taxonSelect} pdList={taxonList} curieToName={curieToNameTaxon} />
          </Col>
          <Col sm="2">
            <div><label>Display Tag:</label></div>
            <TetPulldownMenu id='tetdisplayTagSelect' value={tetdisplayTagSelect} pdList={displayTagList} curieToName={curieToNameDisplayTag} />
          </Col>
	</Row>
	<Row>
          <Col sm="3">
            <div><label>Entity List(one per line, case insensitive)</label></div>
	    <Form.Control as="textarea" id="entitytextarea" type="entitytextarea" value={entityText} disabled={disabledEntityList} onChange={(e) => { dispatch(changeFieldEntityAddGeneralField(e)); } } />
	  </Col>
          <Col sm="3">
            <div><label>Entity Validation:</label></div>
            <Container>
             { entityResultList && entityResultList.length > 0 && entityResultList.map( (entityResult, index) => {
                const colDisplayClass = (entityResult.curie === 'no Alliance curie') ? 'Col-display-warn' : 'Col-display';
                return (
                  <Row key={`entityEntityContainerrows ${index}`}>
                    <Col className={`Col-general ${colDisplayClass} Col-display-left`} sm="5">{entityResult.entityTypeSymbol}</Col>
                    <Col className={`Col-general ${colDisplayClass} Col-display-right`} sm="7">{entityResult.curie}</Col>
                  </Row>)
              })}
            </Container>
          </Col>
	  <Col sm="3">
	    <div><label>Comment/internal notes:</label></div>
            <Form.Control as="textarea" id='notetextarea' type='notetextarea' value={noteText} disabled={disabledEntityList}
              onChange={(e) => { dispatch(changeFieldEntityAddGeneralField(e)); }}
            />
          </Col>
	  <Col sm="3" className="d-flex align-items-center">
	    <div className="mt-3">
	      <Button
	        variant="outline-primary"
	        disabled={disabledAddButton}
	        onClick={() => createEntities(referenceJsonLive.curie)}
	      >
	        {biblioUpdatingEntityAdd > 0 ? <Spinner animation="border" size="sm"/> : "Add"}
	      </Button>
	    </div>
	  </Col>
	</Row></Container>);
  }

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
      <Col className="div-grey-border" sm="1">display tag</Col>
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
                                dispatch(setTypeaheadName2CurieMap(Object.fromEntries(res.data.results.map(item => [item.name, item.curie]))));
                                setTypeaheadOptions(res.data.results.filter(item => {return topicDescendants.has(item.curie)}).map(item => item.name));
                              });
                        }}
                        onChange={(selected) => {
                          dispatch(changeFieldEntityAddGeneralField({target: {id: 'topicSelect', value: typeaheadName2CurieMap[selected[0]] }}));
                          // Set the displayTag value based on the selected topic
                          dispatch(changeFieldEntityAddDisplayTag(getDisplayTagForTopic(typeaheadName2CurieMap[selected[0]])));
                        }}
                        options={typeaheadOptions}
                        selected={topicSelect !== undefined && topicSelect !== null && topicSelect !== '' ? [getMapKeyByValue(typeaheadName2CurieMap, topicSelect)] : []}
        />
      </Col>
      <Col sm="1">
         <TetPulldownMenu id='entityTypeSelect' value={entityTypeSelect} pdList={entityTypeList} curieToName={curieToNameEntityType} />
      </Col>
      <Col sm="1">
         <TetPulldownMenu id='taxonSelect' value={taxonSelect} pdList={taxonList} curieToName={curieToNameTaxon} />
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
        <TetPulldownMenu id='tetdisplayTagSelect' value={tetdisplayTagSelect} pdList={displayTagList} curieToName={curieToNameDisplayTag} />
      </Col>
      <Col className="form-label col-form-label" sm="2">
        <Form.Control as="textarea" id="notetextarea" type="notetextarea" value={noteText} onChange={(e) => dispatch(changeFieldEntityAddGeneralField(e))} />
      </Col>
      <Col className="form-label col-form-label" sm="1"><Button variant="outline-primary" disabled={disabledAddButton} onClick={() => createEntities(referenceJsonLive.curie)} >{biblioUpdatingEntityAdd > 0 ? <Spinner animation="border" size="sm"/> : "Add"}</Button></Col>
    </Row></Container>);
} // const EntityCreate


const TetPulldownMenu = ({id, value, pdList, curieToName}) => {
  const dispatch = useDispatch();
  return (<div>
    <Form.Control
      as="select"
      id={id}
      type={id}
      value={value}
      onChange={(e) => { dispatch(changeFieldEntityAddGeneralField(e)) } } >
      { pdList.map((optionValue, index) => (
        <option key={`{id} ${optionValue}`}
          value={optionValue}>{curieToName[optionValue]}
        </option>
      ))}
    </Form.Control>
  </div>);
}

export default TopicEntityCreate;