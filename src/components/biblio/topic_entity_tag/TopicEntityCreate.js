import {useDispatch, useSelector} from "react-redux";
import React, {useEffect, useRef, useState} from "react";
import {union} from "lodash"; // to handle arrays
import {
    ateamGetTopicDescendants,
    changeFieldEntityAddGeneralField,
    changeFieldEntityAddTaxonSelect,
    changeFieldEntityEntityList,
    getCuratorSourceId,
    setBiblioUpdatingEntityAdd,
    setEntityModalText,
    setTypeaheadName2CurieMap,
    updateButtonBiblioEntityAdd
} from "../../../actions/biblioActions";
import {
  getCurieToNameTaxon,
  getModToTaxon
} from "./TaxonUtils";
import {PulldownMenu} from "../PulldownMenu";
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

const TopicEntityCreate = () => {
  const dispatch = useDispatch();
  const referenceJsonLive = useSelector(state => state.biblio.referenceJsonLive);
  const accessToken = useSelector(state => state.isLogged.accessToken);
  const oktaMod = useSelector(state => state.isLogged.oktaMod);
  const testerMod = useSelector(state => state.isLogged.testerMod);
  const accessLevel = (testerMod !== 'No') ? testerMod : oktaMod;
    
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

  const taxonSelect = useSelector(state => state.biblio.entityAdd.taxonSelect);
  const noDataCheckbox = useSelector(state => state.biblio.entityAdd.noDataCheckbox);
  const entityTypeSelect = useSelector(state => state.biblio.entityAdd.entityTypeSelect);
  const entityResultList = useSelector(state => state.biblio.entityAdd.entityResultList);
  const [topicEntitySourceId, setTopicEntitySourceId] = useState(undefined);

  // state to track the current view: 'list' or 'autocomplete'
  const [currentView, setCurrentView] = useState('list');  
  const [speciesSelectLoading, setSpeciesSelectLoading] = useState([]);
  const speciesTypeaheadRef = useRef(null);
  const [selectedSpecies, setSelectedSpecies] = useState([]);
    
  const curieToNameTaxon = getCurieToNameTaxon();
  const modToTaxon = getModToTaxon();
    
  const unsortedTaxonList = [ '', 'NCBITaxon:559292', 'NCBITaxon:6239', 'NCBITaxon:7227',
			      'NCBITaxon:7955', 'NCBITaxon:10116', 'NCBITaxon:10090',
			      'NCBITaxon:8355', 'NCBITaxon:8364', 'NCBITaxon:9606' ];
  let taxonList = unsortedTaxonList.sort((a, b) => (curieToNameTaxon[a] > curieToNameTaxon[b] ? 1 : -1));
  const curieToNameEntityType = { '': 'no value', 'ATP:0000005': 'gene', 'ATP:0000006': 'allele', 'ATP:0000123': 'species' };
  const entityTypeList = ['', 'ATP:0000005', 'ATP:0000006', 'ATP:0000123'];

  // effect to reset view and other fields when topic changes
  useEffect(() => {
    //if (topicSelect === 'ATP:0000123') { // 'ATP:0000123' is the curie for species
    if (topicSelect === 'ATP:0000053') { // for testing only 
      setCurrentView('autocomplete');
      setSelectedSpecies([]); // reset species list when topic changes
      dispatch(changeFieldEntityAddGeneralField({ target: { id: 'entitytextarea', value: '' } }));
      dispatch(changeFieldEntityAddGeneralField({ target: { id: 'notetextarea', value: '' } }));
      dispatch(changeFieldEntityAddGeneralField({ target: { id: 'noDataCheckbox', value: false } }));
      // dispatch novel_topic_data here	
    } else {
      setCurrentView('list');
    }
  }, [topicSelect]);
      
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
    updateJson['negated'] = noDataCheckbox;
    updateJson['confidence_level'] = null;
    updateJson['topic_entity_tag_source_id'] = topicEntitySourceId;
    return updateJson;
  }

  function createEntities(refCurie) {
    if (topicSelect === null) {
      return
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
    setTypeaheadOptions([]);
    dispatch(changeFieldEntityAddGeneralField({target: {id: 'topicSelect', value: null }}));
    if (topicTypeaheadRef.current !== null) {
      topicTypeaheadRef.current.clear();
    }
  }

  if (accessLevel in modToTaxon) {
    let filteredTaxonList = taxonList.filter((x) => !modToTaxon[accessLevel].includes(x));
    taxonList = modToTaxon[accessLevel].concat(filteredTaxonList); }

  const disabledEntityList = (taxonSelect === '' || taxonSelect === undefined) ? 'disabled' : '';
  const disabledAddButton = (taxonSelect === '' || taxonSelect === undefined || topicEntitySourceId === undefined) ? 'disabled' : '';

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
      <Col className="div-grey-border" sm="1">checkbox</Col>
      <Col className="div-grey-border" sm="1">entity type</Col>
      <Col className="div-grey-border" sm="1">species</Col>
      <Col className="div-grey-border" sm="2">entity list (one per line, case insensitive)</Col>
      <Col className="div-grey-border" sm="2">entity validation</Col>
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
                        }}
                        options={typeaheadOptions}
                        selected={topicSelect !== undefined && topicSelect !== null && topicSelect !== '' ? [getMapKeyByValue(typeaheadName2CurieMap, topicSelect)] : []}
        />
      </Col>
      <Col sm="1">
        <Form.Check inline type="checkbox" id="noDataCheckbox" checked={noDataCheckbox}
                    onChange={(evt) => {
                       if (evt.target.checked) { dispatch(changeFieldEntityAddGeneralField({target: {id: 'noDataCheckbox', value: true }})); }
                       else { dispatch(changeFieldEntityAddGeneralField({target: {id: 'noDataCheckbox', value: false }})); } }}/>
        No Data
      </Col>
      <Col sm="1">
         <PulldownMenu id='entityTypeSelect' value={entityTypeSelect} pdList={entityTypeList} optionToName={curieToNameEntityType} />
      </Col>
      <Col sm="1">
         <PulldownMenu id='taxonSelect' value={taxonSelect} pdList={taxonList} optionToName={curieToNameTaxon} />
      </Col>
      <Col className="form-label col-form-label" sm="2" >
        {currentView === 'list' && (
          <Form.Control as="textarea" id="entitytextarea" type="entitytextarea" value={entityText} disabled={disabledEntityList} onChange={(e) => { dispatch(changeFieldEntityAddGeneralField(e)); } } />
	)}
	{currentView === 'autocomplete' && (
          <AsyncTypeahead
            multiple
            isLoading={speciesSelectLoading}
            placeholder="enter species name"
            ref={speciesTypeaheadRef}
            onSearch={(query) => {
              setSpeciesSelectLoading(true);
              axios.post(process.env.REACT_APP_ATEAM_API_BASE_URL + 'api/ncbitaxonterm/search?limit=10&page=0',
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
                setSpeciesSelectLoading(false);
                if (res.data.results) {
                  setTypeaheadOptions(res.data.results.map(item => item.name + ' ' + item.curie));
                }
              });
            }}
            onChange={(selected) => {
	      const extractCurie = specie => {
                const match = specie.match(/(NCBITaxon:\d+)/);
		return match ? match[1] : '';
	      };
	      const selectedCuries = selected.map(extractCurie);
	      const combinedCuries = selectedCuries.join('\n');

              // update entityText state with the extracted curies
	      dispatch(changeFieldEntityAddGeneralField({ target: { id: 'entitytextarea', value: combinedCuries } }));

	      // Store the selected species' NCBITaxon IDs in the entityResultList state
              const entityResults = selectedCuries.map(curie => ({ entityTypeSymbol: "Species", curie: curie }));
	      // dispatch(changeFieldEntityEntityList(combinedCuries, accessToken, taxonSelect, curieToNameEntityType[entityTypeSelect]));
	      dispatch(changeFieldEntityAddGeneralField({ target: { id: 'entityResultList', value: entityResults } }));
            }}
            options={typeaheadOptions}
	    selected={selectedSpecies}
          />            
        )}
      </Col>
      <Col className="form-label col-form-label" sm="2" >
        <Container>
          { entityResultList && entityResultList.length > 0 && entityResultList.map( (entityResult, index) => {
            //const colDisplayClass = (entityResult.curie === 'no Alliance curie') ? 'Col-display-warn' : 'Col-display';
            const colDisplayClass = (entityResult.curie.startsWith('NCBITaxon') || entityResult.curie !== 'no Alliance curie') ? 'Col-display' : 'Col-display-warn';
            return (
              <Row key={`entityEntityContainerrows ${index}`}>
                <Col className={`Col-general ${colDisplayClass} Col-display-left`} sm="5">{entityResult.entityTypeSymbol}</Col>
                <Col className={`Col-general ${colDisplayClass} Col-display-right`} sm="7">{entityResult.curie}</Col>
              </Row>)
          } ) }
        </Container>
      </Col>
      <Col className="form-label col-form-label" sm="2">
        <Form.Control as="textarea" id="notetextarea" type="notetextarea" value={noteText} onChange={(e) => dispatch(changeFieldEntityAddGeneralField(e))} />
      </Col>
      <Col className="form-label col-form-label" sm="1"><Button variant="outline-primary" disabled={disabledAddButton} onClick={() => createEntities(referenceJsonLive.curie)} >{biblioUpdatingEntityAdd > 0 ? <Spinner animation="border" size="sm"/> : "Add"}</Button></Col>
    </Row></Container>);
} 

export default TopicEntityCreate;
