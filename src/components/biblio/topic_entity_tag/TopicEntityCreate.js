import {useDispatch, useSelector} from "react-redux";
import React, {useEffect, useRef, useState} from "react";
import {
    ateamGetTopicDescendants,
    getDescendantATPIds,
    changeFieldEntityAddGeneralField,
    changeFieldEntityAddTaxonSelect,
    changeFieldEntityEntityList,
    getCuratorSourceId,
    setBiblioUpdatingEntityAdd,
    setEntityModalText,
    setTypeaheadName2CurieMap,
    updateButtonBiblioEntityAdd
} from "../../../actions/biblioActions";
import { checkForExistingTags, setupEventListeners } from './TopicEntityUtils';
import {
  getCurieToNameTaxon,
  getModToTaxon
} from "./TaxonUtils";
import {PulldownMenu} from "../PulldownMenu";
import {FetchTypeaheadOptions} from "../FetchTypeahead";
import Container from "react-bootstrap/Container";
import ModalGeneric from "../ModalGeneric";
import RowDivider from "../RowDivider";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form"
import {AsyncTypeahead} from "react-bootstrap-typeahead";
import Button from "react-bootstrap/Button"
import Spinner from "react-bootstrap/Spinner";
// import axios from "axios";

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

  const taxonSelect = useSelector(state => state.biblio.entityAdd.taxonSelect);
  const noDataCheckbox = useSelector(state => state.biblio.entityAdd.noDataCheckbox);
  const novelCheckbox = useSelector(state => state.biblio.entityAdd.novelCheckbox);
  const entityTypeSelect = useSelector(state => state.biblio.entityAdd.entityTypeSelect);
  const entityResultList = useSelector(state => state.biblio.entityAdd.entityResultList);
  const [topicEntitySourceId, setTopicEntitySourceId] = useState(undefined);

  // state to track the current view: 'list' or 'autocomplete'
  //const [currentView, setCurrentView] = useState('list');
  const [speciesSelectLoading, setSpeciesSelectLoading] = useState(false);
  const speciesTypeaheadRef = useRef(null);
  const [selectedSpecies, setSelectedSpecies] = useState([]);
  const [isSpeciesSelected, setIsSpeciesSelected] = useState(false);
  const [geneDescendants, setGeneDescendants] = useState([]);
  const [alleleDescendants, setAlleleDescendants] = useState([]);
    
  const [curieToNameTaxon, setCurieToNameTaxon] = useState({});
  const [modToTaxon, setModToTaxon] = useState({});
  const [tagExistingMessage, setTagExistingMessage] = useState("");
  const [existingTagResponses, setExistingTagResponses] = useState([]);
  const [isTagExistingMessageVisible, setIsTagExistingMessageVisible] = useState(false);
  const taxonToMod = {};
  for (const [mod, taxons] of Object.entries(modToTaxon)) {
    taxons.forEach((taxon) => {
    taxonToMod[taxon] = mod;
    });
  };
  useEffect(() => {
    const fetchData = async () => {
      const taxonData = await getCurieToNameTaxon(accessToken);
      const modData = await getModToTaxon();
      setCurieToNameTaxon(taxonData);
      setModToTaxon(modData);
    };
    fetchData();
  }, [accessToken]);

  // const unsortedTaxonList = [ '', 'NCBITaxon:559292', 'NCBITaxon:6239', 'NCBITaxon:7227',
  //                            'NCBITaxon:7955', 'NCBITaxon:10116', 'NCBITaxon:10090',                                                                                  //                            'NCBITaxon:8355', 'NCBITaxon:8364', 'NCBITaxon:9606' ];

  let unsortedTaxonList = Object.values(modToTaxon).flat();
  unsortedTaxonList.push('');
  unsortedTaxonList.push('NCBITaxon:9606');
    
  let taxonList = unsortedTaxonList.sort((a, b) => (curieToNameTaxon[a] > curieToNameTaxon[b] ? 1 : -1));    
    
  const curieToNameEntityType = {
      '': 'no value',
      'ATP:0000005': 'gene',
      'ATP:0000006': 'allele',
      'ATP:0000123': 'species',
      'ATP:0000014': 'AGMs',
      'ATP:0000027': 'strain',
      'ATP:0000025': 'genotype',
      'ATP:0000026': 'fish',
      'ATP:0000013': 'transgenic construct'
  };
  const entityTypeList = ['', 'ATP:0000005', 'ATP:0000006', 'ATP:0000123',
			  'ATP:0000014', 'ATP:0000027', 'ATP:0000025', 'ATP:0000026', 'ATP:0000013'];
  const speciesATP = 'ATP:0000123';
  const renderView = () => {
    return topicSelect === speciesATP ? 'autocomplete' : 'list';
  };

  useEffect(() => {
    getDescendantATPIds(accessToken, 'ATP:0000005').then((data) => setGeneDescendants(data));
    getDescendantATPIds(accessToken, 'ATP:0000006').then((data) => setAlleleDescendants(data));
  }, [accessLevel, accessToken, dispatch]);

  // effect to reset view and other fields when topic changes
  useEffect(() => {
    if (entityTypeList.includes(topicSelect)) {
      dispatch(changeFieldEntityAddGeneralField({ target: { id: 'entityTypeSelect', value: topicSelect } }));
      if (topicSelect === speciesATP) {
	  dispatch(changeFieldEntityAddGeneralField({ target: { id: 'taxonSelect', value: '' } }));
          setIsSpeciesSelected(true); // reset when topic changes
      }
    } else if (geneDescendants.includes(topicSelect)) {
      dispatch(changeFieldEntityAddGeneralField({ target: { id: 'entityTypeSelect', value: 'ATP:0000005' } }));
    } else if (alleleDescendants.includes(topicSelect)) {
      dispatch(changeFieldEntityAddGeneralField({ target: { id: 'entityTypeSelect', value: 'ATP:0000006' } }));
    } else {
      setSelectedSpecies([]); // Clear selected species
      dispatch(changeFieldEntityAddGeneralField({ target: { id: 'entityTypeSelect', value: '' } }));
      dispatch(changeFieldEntityAddGeneralField({ target: { id: 'entityResultList', value: [] } }));
    }
    if (topicSelect !== speciesATP) {
      if (modToTaxon && accessLevel in modToTaxon && modToTaxon[accessLevel].length > 0) {
          dispatch(changeFieldEntityAddGeneralField({ target: { id: 'taxonSelect', value: modToTaxon[accessLevel][0] } }));
      }
    }
    dispatch(changeFieldEntityAddGeneralField({ target: { id: 'entitytextarea', value: '' } }));
    dispatch(changeFieldEntityAddGeneralField({ target: { id: 'notetextarea', value: '' } }));
    dispatch(changeFieldEntityAddGeneralField({ target: { id: 'noDataCheckbox', value: false } }));
    dispatch(changeFieldEntityAddGeneralField({ target: { id: 'novelCheckbox', value: false } }));
  }, [topicSelect, dispatch]);
      
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
      dispatch(changeFieldEntityEntityList(entityText, accessToken, taxonSelect, curieToNameEntityType[entityTypeSelect], taxonToMod)) }
  }, [entityText, taxonSelect]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect( () => {
    if (accessLevel in modToTaxon) {
      dispatch(changeFieldEntityAddTaxonSelect(modToTaxon[accessLevel][0])) }
  }, [accessLevel]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (tagExistingMessage) {
      setupEventListeners(existingTagResponses, accessToken, accessLevel, dispatch,
			  updateButtonBiblioEntityAdd);
    }
  }, [tagExistingMessage, existingTagResponses]);

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
    updateJson['novel_topic_data'] = novelCheckbox;
    updateJson['confidence_level'] = null;
    updateJson['topic_entity_tag_source_id'] = topicEntitySourceId;
    return updateJson;
  }

  const handleCloseTagExistingMessage = () => {
    setIsTagExistingMessageVisible(false); // hide the message
  };
    
  async function createEntities(refCurie) {
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
        if ( (entityResult.curie !== 'no Alliance curie') && (entityResult.curie !== 'duplicate') ) {
          let updateJson = initializeUpdateJson(refCurie);
          updateJson['entity_id_validation'] = 'alliance'; // TODO: make this a select with 'alliance', 'mod', 'new'
          updateJson['entity_type'] = (entityTypeSelect === '') ? null : entityTypeSelect;
	  updateJson['species'] = (taxonSelect === '') ? null : taxonSelect;
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

    const result = await checkForExistingTags(forApiArray, accessToken, accessLevel,
					      dispatch, updateButtonBiblioEntityAdd);
    if (result) {
      setTagExistingMessage(result.html);
      /*
      setTimeout(() => {
        setTagExistingMessage('');
      }, 8000);
      */
      setIsTagExistingMessageVisible(true); // show the message
      setExistingTagResponses(result.existingTagResponses);
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

  const disabledEntityList = (taxonSelect === '' || taxonSelect === undefined) ? true : false;
  const disabledAddButton = 
    (topicSelect === speciesATP && !isSpeciesSelected) ||
    (topicSelect !== speciesATP && (taxonSelect === '' || taxonSelect === undefined)) ||
    (topicEntitySourceId === undefined || topicSelect === undefined) ? true : false;
      
  return (
    <Container fluid>
    <ModalGeneric showGenericModal={entityModalText !== '' ? true : false} genericModalHeader="Entity Error"
                  genericModalBody={entityModalText} onHideAction={setEntityModalText('')} />
    <RowDivider />
    {isTagExistingMessageVisible && tagExistingMessage && (
      <Row className="form-group row">
        <Col sm="12">
          <div className="alert alert-warning" role="alert">
            <div className="table-responsive" dangerouslySetInnerHTML={{ __html: tagExistingMessage }}></div>
	    <Button variant="outline-secondary" size="sm" onClick={handleCloseTagExistingMessage}>
              Close
            </Button>
          </div>
	</Col>
      </Row>
    )}
    <Row className="form-group row" >
      <Col className="form-label col-form-label" sm="3"><h3>Entity and Topic Addition</h3></Col>
    </Row>
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
        <AsyncTypeahead isLoading={topicSelectLoading}
                        useCache={false}
                        placeholder="Start typing to search topics"
                        ref={topicTypeaheadRef} id="topicTypeahead"
                        onSearch={async (query) => {
                          setTopicSelectLoading(true);
                          const results = await FetchTypeaheadOptions(
                              process.env.REACT_APP_ATEAM_API_BASE_URL + 'api/atpterm/search?limit=10&page=0',
                              query,
                              accessToken
                          );
                          setTopicSelectLoading(false);
			  // ensure results is an array
                          // results = Array.isArray(results) ? results : []; 
                          dispatch(setTypeaheadName2CurieMap(Object.fromEntries(results.map(item => [item.name, item.curie]))));
                          setTypeaheadOptions(results.filter(item => { return topicDescendants.has(item.curie) }).map(item => item.name));
                        }}
                        onChange={(selected) => {
                          dispatch(changeFieldEntityAddGeneralField({target: {id: 'topicSelect', value: typeaheadName2CurieMap[selected[0]] }}));
                        }}
                        options={typeaheadOptions}
                        selected={topicSelect !== undefined && topicSelect !== null && topicSelect !== '' ? [getMapKeyByValue(typeaheadName2CurieMap, topicSelect)] : []}
        />
      </Col>
      <Col sm="1">
        <div style={{textAlign: "left"}}>
        <Form.Check inline type="checkbox" id="noDataCheckbox" checked={noDataCheckbox}
                    onChange={(evt) => {
                       if (evt.target.checked) { dispatch(changeFieldEntityAddGeneralField({target: {id: 'noDataCheckbox', value: true }})); }
                       else { dispatch(changeFieldEntityAddGeneralField({target: {id: 'noDataCheckbox', value: false }})); } }}/>
        No Data<br></br>

        <Form.Check inline type="checkbox" id="novelCheckbox" checked={novelCheckbox}
                    onChange={(evt) => {
                       if (evt.target.checked) { dispatch(changeFieldEntityAddGeneralField({target: {id: 'novelCheckbox', value: true }})); }
                       else { dispatch(changeFieldEntityAddGeneralField({target: {id: 'novelCheckbox', value: false }})); } }}/>
        Novel Data
        </div>
      </Col>
      <Col sm="1">
         <PulldownMenu id='entityTypeSelect' value={entityTypeSelect} pdList={entityTypeList} optionToName={curieToNameEntityType} />
      </Col>
      <Col sm="1">
         <PulldownMenu id='taxonSelect' value={taxonSelect} pdList={taxonList} optionToName={curieToNameTaxon} />
      </Col>
      <Col className="form-label col-form-label" sm="2" >
        {renderView() === 'list' ? (
          <Form.Control as="textarea" id="entitytextarea" value={entityText} disabled={disabledEntityList} onChange={(e) => dispatch(changeFieldEntityAddGeneralField(e))} />
        ) : (
	  // the AsyncTypeahead for species will only be shown if species is selected
          topicSelect === speciesATP && (
            <AsyncTypeahead
              multiple
              isLoading={speciesSelectLoading}
              placeholder="enter species name"
              ref={speciesTypeaheadRef}
	      onSearch={async (query) => {
		  setSpeciesSelectLoading(true);
		  const results = await FetchTypeaheadOptions(
		      process.env.REACT_APP_ATEAM_API_BASE_URL + 'api/ncbitaxonterm/search?limit=10&page=0',
		      query,
		      accessToken
		  );
		  setSpeciesSelectLoading(false);
		  if (results) {
		      setTypeaheadOptions(results.map(item => item.name + ' ' + item.curie));
		  }
             }}
	     onChange={(selected) => {
		  // extract species name and curie from the selected options
		  const extractedStrings = selected.map(specie => {
                      const match = specie.match(/(.+) (NCBITaxon:\d+)/);
                      return match ? `${match[1]} ${match[2]}` : null;
		  }).filter(item => item); // filter out any null values

		  setSelectedSpecies(extractedStrings); // set the selected species as strings
		  setIsSpeciesSelected(selected.length > 0);
		  // update entityResultList for display in the verification area
		  const entityResults = extractedStrings.map(specie => {
                      const match = specie.match(/(.+) (NCBITaxon:\d+)/);
                      if (match) {
		  	  return {
		  	      entityTypeSymbol: match[1], 
		  	      curie: match[2]
		  	  };
                      }
                      return null;
		  }).filter(item => item);  // filter out any null values
		  dispatch(changeFieldEntityAddGeneralField({ target: { id: 'entityResultList', value: entityResults } }));
              }}
	      options={typeaheadOptions}
              selected={selectedSpecies}
            />
          )
        )}
      </Col>
      <Col className="form-label col-form-label" sm="2" >
        <Container>
          { renderView() === 'list' && entityResultList && entityResultList.length > 0 && entityResultList.map( (entityResult, index) => {
            let colDisplayClass = 'Col-display';
            if (entityResult.curie === 'no Alliance curie') { colDisplayClass = 'Col-display-warn'; }
              else if (entityResult.curie === 'duplicate') { colDisplayClass = 'Col-display-grey'; }
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
