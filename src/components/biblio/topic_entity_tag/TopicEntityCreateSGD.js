import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
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
  // setTypeaheadName2CurieMap,
  updateButtonBiblioEntityAdd
} from "../../../actions/biblioActions";
import { checkForExistingTags } from './TopicEntityUtils';
import {
  checkTopicEntitySetDisplayTag,
  setDisplayTag,
  sgdTopicList
} from "./BiblioEntityUtilsSGD";
import {PulldownMenu} from "../PulldownMenu"
import {
  getCurieToNameTaxon,
  getModToTaxon  
} from "./TaxonUtils";
import Container from "react-bootstrap/Container";
import ModalGeneric from "../ModalGeneric";
import RowDivider from "../RowDivider";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";
// import { AsyncTypeahead } from "react-bootstrap-typeahead";
import Button from "react-bootstrap/Button";
import Spinner from "react-bootstrap/Spinner";

const TopicEntityCreateSGD = () => {
  const dispatch = useDispatch();
  const referenceJsonLive = useSelector((state) => state.biblio.referenceJsonLive);
  const accessToken = useSelector((state) => state.isLogged.accessToken);
  const oktaMod = useSelector((state) => state.isLogged.oktaMod);
  const testerMod = useSelector((state) => state.isLogged.testerMod);
  const accessLevel = testerMod !== "No" ? testerMod : oktaMod;
  const [displayTagData, setDisplayTagData] = useState([]);
  const biblioUpdatingEntityAdd = useSelector(
    (state) => state.biblio.biblioUpdatingEntityAdd
  );
  const entityModalText = useSelector((state) => state.biblio.entityModalText);
  const entityText = useSelector((state) => state.biblio.entityAdd.entitytextarea);
  const noteText = useSelector((state) => state.biblio.entityAdd.notetextarea);
  const topicSelect = useSelector((state) => state.biblio.entityAdd.topicSelect);
  // const [topicSelectLoading, setTopicSelectLoading] = useState(false);
  // const topicTypeaheadRef = useRef(null);
  // const [typeaheadOptions, setTypeaheadOptions] = useState([]);
  //const typeaheadName2CurieMap = useSelector(
  //  (state) => state.biblio.typeaheadName2CurieMap
  // );
  const [warningMessage, setWarningMessage] = useState("");
  const [tagExistingMessage, setTagExistingMessage] = useState("");
    
  const tetdisplayTagSelect = useSelector(
    (state) => state.biblio.entityAdd.tetdisplayTagSelect
  );
  const taxonSelect = useSelector((state) => state.biblio.entityAdd.taxonSelect);
  const entityTypeSelect = useSelector(
    (state) => state.biblio.entityAdd.entityTypeSelect
  );
  const entityResultList = useSelector(
    (state) => state.biblio.entityAdd.entityResultList
  );

  const curieToNameDisplayTag = displayTagData.reduce((acc, option) => {
    acc[option.curie] = option.name;
    return acc;
  }, {});
  const displayTagList = displayTagData.map(option=> option.curie);
  displayTagList.unshift('');

  const [topicEntitySourceId, setTopicEntitySourceId] = useState(undefined);

  const curieToNameEntityType = {
    '': 'no value',
    'ATP:0000005': 'gene',
    'ATP:0000006': 'allele'
  };

  const [curieToNameTaxon, setCurieToNameTaxon] = useState({});
  const [modToTaxon, setModToTaxon] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      const taxonData = await getCurieToNameTaxon(accessToken);
      const modData = await getModToTaxon();
      setCurieToNameTaxon(taxonData);
      setModToTaxon(modData);
    };
    fetchData();
  }, [accessToken]);

  let unsortedTaxonList = Object.values(modToTaxon).flat();
  unsortedTaxonList.push('');
  unsortedTaxonList.push('NCBITaxon:9606');  
  let taxonList = unsortedTaxonList.sort((a, b) => (curieToNameTaxon[a] > curieToNameTaxon[b] ? 1 : -1));
  const entityTypeList = ['', 'ATP:0000005', 'ATP:0000006'];

  useEffect(() => {
    // ... (fetchSourceId useEffect)
    const fetchSourceId = async () => {
      if (accessToken !== null) {
        setTopicEntitySourceId(await getCuratorSourceId(accessLevel, accessToken));
      }
    }
    fetchSourceId().catch(console.error);
  }, [accessLevel, accessToken]);

  const topicDescendants = useSelector(
    (state) => state.biblio.topicDescendants
  );

  useEffect(() => {
    if (modToTaxon && accessLevel in modToTaxon && modToTaxon[accessLevel].length > 0) {
      dispatch(changeFieldEntityAddGeneralField({ target: { id: 'taxonSelect', value: modToTaxon[accessLevel][0] } }));
    }
  }, [modToTaxon, accessLevel, dispatch]);
    
  useEffect(() => {
    if (topicDescendants.size === 0 && accessToken !== null) {
      dispatch(ateamGetTopicDescendants(accessToken));
    }
  }, [topicDescendants, accessToken, dispatch]);

  useEffect(() => {
    fetchDisplayTagData(accessToken).then((data) => setDisplayTagData(data));
    dispatch(
      changeFieldEntityAddGeneralField({
        target: { id: "entityTypeSelect", value: "ATP:0000005" },
      })
    );
  }, [accessLevel, accessToken, dispatch]);

  useEffect(() => {
    if (
      taxonSelect !== "" &&
      taxonSelect !== undefined &&
      entityTypeSelect !== ""
    ) {
      dispatch(
        changeFieldEntityEntityList(
          entityText,
          accessToken,
          taxonSelect,
          curieToNameEntityType[entityTypeSelect]
        )
      );
    }
  }, [entityText, taxonSelect]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (accessLevel in modToTaxon) {
      dispatch(
        changeFieldEntityAddTaxonSelect(modToTaxon[accessLevel][0])
      );
    }
  }, [accessLevel]); // eslint-disable-line react-hooks/exhaustive-deps

 
  useEffect(() => {
    fetchDisplayTagData(accessToken).then((data) => setDisplayTagData(data));
    dispatch(
      changeFieldEntityAddGeneralField({
        target: { id: "entityTypeSelect", value: "ATP:0000005" },
      })
    );
  }, [accessLevel, accessToken, dispatch]);

  useEffect(() => {
    if (
      taxonSelect !== "" &&
      taxonSelect !== undefined &&
      entityTypeSelect !== ""
    ) {
      dispatch(
        changeFieldEntityEntityList(
          entityText,
          accessToken,
          taxonSelect,
          curieToNameEntityType[entityTypeSelect]
        )
      );
    }
  }, [entityText, taxonSelect]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (accessLevel in modToTaxon) {
      dispatch(
        changeFieldEntityAddTaxonSelect(modToTaxon[accessLevel][0])
      );
    }
  }, [accessLevel]); // eslint-disable-line react-hooks/exhaustive-deps

  function initializeUpdateJson(refCurie) {
    let updateJson = {};
    updateJson["reference_curie"] = refCurie;
    updateJson["topic"] = topicSelect;
    updateJson["species"] = taxonSelect;
    updateJson['note'] = noteText !== "" ? noteText : null;
    updateJson['negated'] = false;
    updateJson['confidence_level'] = null;
    updateJson['topic_entity_tag_source_id'] = topicEntitySourceId;
    if (tetdisplayTagSelect && tetdisplayTagSelect !== "") {
      updateJson["display_tag"] = tetdisplayTagSelect;
    }
    return updateJson;
  }

  function getDisplayTagForTopic(topicSelect) {
    dispatch(
      changeFieldEntityAddGeneralField({
        target: { id: "topicSelect", value: topicSelect },
      })
    );
    return setDisplayTag(topicSelect);
  }

  async function createEntities(refCurie) {
    if (topicSelect === null) {
      return;
    }
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
    const forApiArray = []
    const subPath = 'topic_entity_tag/';
    const method = 'POST';
    if ( entityResultList && entityResultList.length > 0 ) {
      for (const entityResult of entityResultList.values()) {
        console.log(entityResult);
        console.log(entityResult.curie);
        if ( (entityResult.curie !== 'no Alliance curie') && (entityResult.curie !== 'duplicate') ) {
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

    const message = await checkForExistingTags(forApiArray, accessToken, accessLevel,
						 dispatch, updateButtonBiblioEntityAdd);
    if (message) {
        setTagExistingMessage(message);
	setTimeout(() => {
          setTagExistingMessage('');
        }, 8000);
    }
      
    dispatch(
      changeFieldEntityAddGeneralField({
        target: { id: "topicSelect", value: "" },
      })
    );
  }

  if (accessLevel in modToTaxon) {
    let filteredTaxonList = taxonList.filter(
      (x) => !modToTaxon[accessLevel].includes(x)
    );
    taxonList = modToTaxon[accessLevel].concat(filteredTaxonList);
  }

  const disabledEntityList =
    taxonSelect === "" || taxonSelect === undefined ? "disabled" : "";
  const disabledAddButton =
    taxonSelect === "" ||
    taxonSelect === undefined ||
    topicEntitySourceId === undefined
      ? "disabled"
      : "";

  return (
    <Container fluid>
      <ModalGeneric
        showGenericModal={entityModalText !== "" ? true : false}
        genericModalHeader="Entity Error"
        genericModalBody={entityModalText}
        onHideAction={() => setEntityModalText("")}
      />
      <RowDivider />
      <Row className="form-group row" style={{ display: "flex", alignItems: "center" }}>
        <Col className="form-label col-form-label" sm="10" align="left">
          <h3>Entity and Topic Addition</h3>
        </Col>
      </Row>
      {warningMessage && (
        <Row className="form-group row">
          <Col sm="10">
            <div className="alert alert-warning" role="alert">
              {warningMessage}
            </div>
          </Col>
        </Row>
      )}
      {tagExistingMessage && (
        <Row className="form-group row">       
          <Col sm="10">
	    <div className="alert alert-warning" role="alert">
		<pre style={{ textAlign: 'left', whiteSpace: 'pre-wrap' }}>{tagExistingMessage}</pre>
            </div>                                                                                                                                                                                                
          </Col>                                                                                                                                                                                                  
        </Row>
      )}     
      <Row className="form-group row">
        <Col sm="3">
          <div>
            <label>Topic:</label>
          </div>
          <Form.Control
            as="select"
            id="topicSelect"
            type="topicSelect"
            value={topicSelect}
            onChange={(e) =>
              dispatch(
                changeFieldEntityAddDisplayTag(getDisplayTagForTopic(e.target.value))
              )
            }
          >
            <option value=""> Pick a topic </option>
            {sgdTopicList.map((option, index) => (
              <option key={`topicSelect-${index}`} value={option.curie}>
                {option.name}
              </option>
            ))}
          </Form.Control>
        </Col>
        <Col sm="3">
          <div>
            <label>Entity Type:</label>
          </div>
          <PulldownMenu
            id="entityTypeSelect"
            value={entityTypeSelect}
            pdList={entityTypeList}
            optionToName={curieToNameEntityType}
          />
        </Col>
        <Col sm="3">
          <div>
            <label>Species:</label>
          </div>
          <PulldownMenu
            id="taxonSelect"
            value={taxonSelect}
            pdList={taxonList}
            optionToName={curieToNameTaxon}
          />
        </Col>
        <Col sm="2">
          <div>
            <label>Display Tag:</label>
          </div>
          <PulldownMenu
            id="tetdisplayTagSelect"
            value={tetdisplayTagSelect}
            pdList={displayTagList}
            optionToName={curieToNameDisplayTag}
          />
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
             let colDisplayClass = 'Col-display';
             if (entityResult.curie === 'no Alliance curie') { colDisplayClass = 'Col-display-warn'; }
               else if (entityResult.curie === 'duplicate') { colDisplayClass = 'Col-display-grey'; }
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
              {biblioUpdatingEntityAdd > 0 ? (
                <Spinner animation="border" size="sm" />
              ) : (
                "Add"
              )}
            </Button>
          </div>
        </Col>
      </Row>
    </Container>
  );
};

export default TopicEntityCreateSGD;

