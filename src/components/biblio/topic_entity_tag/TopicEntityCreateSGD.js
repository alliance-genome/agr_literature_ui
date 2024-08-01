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
  setEditTag,
  updateButtonBiblioEntityAdd
} from "../../../actions/biblioActions";
import { checkForExistingTags, setupEventListeners } from './TopicEntityUtils';
import {
  checkTopicEntitySetDisplayTag,
  setDisplayTag,
  sgdTopicList
} from "./BiblioEntityUtilsSGD";
import { PulldownMenu } from "../PulldownMenu";
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
import Button from "react-bootstrap/Button";
import Spinner from "react-bootstrap/Spinner";

const defaultEntityTypeGene = "ATP:0000005";
const defaultSpecies = "NCBITaxon:559292"; // saccharomyces cerevisiae S288C

const TopicEntityCreateSGD = () => {
  const dispatch = useDispatch();
  const editTag = useSelector(state => state.biblio.editTag);
  const referenceJsonLive = useSelector((state) => state.biblio.referenceJsonLive);
  const accessToken = useSelector((state) => state.isLogged.accessToken);
  const oktaMod = useSelector((state) => state.isLogged.oktaMod);
  const testerMod = useSelector((state) => state.isLogged.testerMod);
  const accessLevel = testerMod !== "No" ? testerMod : oktaMod;
  const uid = useSelector(state => state.isLogged.uid);

  const [displayTagData, setDisplayTagData] = useState([]);
  const biblioUpdatingEntityAdd = useSelector(
    (state) => state.biblio.biblioUpdatingEntityAdd
  );
  const entityModalText = useSelector((state) => state.biblio.entityModalText);
  const [warningMessage, setWarningMessage] = useState("");
  const [tagExistingMessage, setTagExistingMessage] = useState("");
  const [existingTagResponses, setExistingTagResponses] = useState([]);
  const [rows, setRows] = useState([createNewRow()]); // Initialize with one row
  const [isTagExistingMessageVisible, setIsTagExistingMessageVisible] = useState(false);

  const curieToNameDisplayTag = displayTagData.reduce((acc, option) => {
    acc[option.curie] = option.name;
    return acc;
  }, {});
  const displayTagList = displayTagData.map(option => option.curie);
  displayTagList.unshift('');

  const [topicEntitySourceId, setTopicEntitySourceId] = useState(undefined);

  const curieToNameEntityType = {
    '': 'no value',
    'ATP:0000005': 'gene',
    'ATP:0000006': 'allele',
    'ATP:0000128': 'complex',
    'ATP:0000022': 'pathway'
  };

  const [curieToNameTaxon, setCurieToNameTaxon] = useState({});
  const [modToTaxon, setModToTaxon] = useState({});

  // Fetch taxon and mod data
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
  const entityTypeList = Object.keys(curieToNameEntityType);

  // Fetch curator source ID
  useEffect(() => {
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

  // Update taxon select based on access level
  useEffect(() => {
    if (modToTaxon && accessLevel in modToTaxon && modToTaxon[accessLevel].length > 0) {
      dispatch(changeFieldEntityAddGeneralField({ target: { id: 'taxonSelect', value: modToTaxon[accessLevel][0] } }));
    }
  }, [modToTaxon, accessLevel, dispatch]);

  // Fetch topic descendants
  useEffect(() => {
    if (topicDescendants.size === 0 && accessToken !== null) {
      dispatch(ateamGetTopicDescendants(accessToken));
    }
  }, [topicDescendants, accessToken, dispatch]);

  // Fetch display tag data and set default entity type
  useEffect(() => {
    fetchDisplayTagData(accessToken).then((data) => setDisplayTagData(data));
    dispatch(
      changeFieldEntityAddGeneralField({
        target: { id: "entityTypeSelect", value: "ATP:0000005" },
      })
    );
  }, [accessLevel, accessToken, dispatch]);

  // Clear fields when editTag is null
  useEffect(() => {
    if (editTag === null) {
      dispatch(changeFieldEntityAddGeneralField({ target: { id: 'entityResultList', value: [] } }));
      dispatch(changeFieldEntityAddGeneralField({ target: { id: 'entitytextarea', value: '' } }));
    }
  }, [dispatch, editTag]);

  // Update entity list based on row data
  useEffect(() => {
    rows.forEach((row, index) => {
      if (
        row.taxonSelect !== "" &&
        row.taxonSelect !== undefined &&
        row.entityTypeSelect !== ""
      ) {
        const entityIdValidation = (curieToNameEntityType[row.entityTypeSelect] === 'complex' || curieToNameEntityType[row.entityTypeSelect] === 'pathway') ? 'sgd' : 'alliance';
        dispatch(
          changeFieldEntityEntityList(
            row.entityText,
            accessToken,
            entityIdValidation,
            row.taxonSelect,
            curieToNameEntityType[row.entityTypeSelect]
          )
        );
      }
    });
  }, [rows, accessToken, dispatch, curieToNameEntityType]);

  // Update taxon select based on access level
  useEffect(() => {
    if (accessLevel in modToTaxon) {
      dispatch(
        changeFieldEntityAddTaxonSelect(modToTaxon[accessLevel][0])
      );
    }
  }, [accessLevel, modToTaxon, dispatch]); // eslint-disable-line react-hooks/exhaustive-deps

  // Setup event listeners for existing tags
  useEffect(() => {
    if (tagExistingMessage) {
      setupEventListeners(existingTagResponses, accessToken, accessLevel, dispatch,
        updateButtonBiblioEntityAdd);
    }
  }, [tagExistingMessage, existingTagResponses, accessToken, accessLevel, dispatch]);

  function createNewRow() {
    return {
      topicSelect: "",
      entityTypeSelect: defaultEntityTypeGene,
      taxonSelect: defaultSpecies,
      tetdisplayTagSelect: "",
      entityText: "",
      noteText: "",
      entityResultList: []
    };
  }

  const addRow = () => {
    setRows([...rows, createNewRow()]);
  };

  const handleRowChange = (index, field, value) => {
    console.log(`Updating row ${index}, field ${field}, value ${value}`);
    const newRows = [...rows];
    newRows[index][field] = value;

    // Set default values based on topic selection
    if (field === 'topicSelect') {
      if (value === 'ATP:0000022' || value === 'ATP:0000128') {
        newRows[index].entityTypeSelect = value;
      } else {
        newRows[index].entityTypeSelect = defaultEntityTypeGene;
      }
      newRows[index].taxonSelect = defaultSpecies;

      // Set default display tag
      const displayTag = setDisplayTag(value);
      newRows[index].tetdisplayTagSelect = displayTag;
      dispatch(changeFieldEntityAddDisplayTag(displayTag));
    }

    setRows(newRows);
    console.log("Updated rows:", newRows);
  };

  const patchEntities = async (refCurie, index) => {
    const row = rows[index];
    if (row.topicSelect === null) {
      return;
    }
    const subPath = 'topic_entity_tag/' + editTag;
    const method = 'PATCH';
    const entityResultList = row.entityResultList || [];
    if (entityResultList.length > 1) {
      console.error("Error processing entry: too many entities");
      dispatch({
        type: 'UPDATE_BUTTON_BIBLIO_ENTITY_ADD',
        payload: { responseMessage: 'Only one entity allowed on edit. Please create additional tags with the add function.', accessLevel: accessLevel }
      });
    } else {
      let entityResult = entityResultList[0];
      let updateJson = initializeUpdateJson(refCurie, row);
      updateJson['entity_id_validation'] = (row.entityTypeSelect === '') ? null : 'alliance';
      updateJson['entity_type'] = (row.entityTypeSelect === '') ? null : row.entityTypeSelect;
      updateJson['species'] = (row.taxonSelect === '') ? null : row.taxonSelect;
      if (entityResult) {
        updateJson['entity'] = entityResult.curie;
      }
      updateJson['updated_by'] = uid;
      let array = [accessToken, subPath, updateJson, method];
      dispatch(setBiblioUpdatingEntityAdd(1));
      await dispatch(updateButtonBiblioEntityAdd(array, accessLevel));
      dispatch(changeFieldEntityAddGeneralField({ target: { id: 'topicSelect', value: null } }));
      dispatch(setEditTag(null));
    }
    removeRow(index);
    ensureAtLeastOneRow();
  };

  const createEntities = async (refCurie, index) => {
    const row = rows[index];
    if (row.topicSelect === null) {
      return;
    }
    const entityResultList = row.entityResultList || [];
    const [warningMessage, displayTag] = checkTopicEntitySetDisplayTag(row.entityText,
      entityResultList,
      row.topicSelect);
    if (warningMessage) {
      setWarningMessage(warningMessage)
      setTimeout(() => {
        setWarningMessage('');
      }, 8000);
      return;
    }
    dispatch(changeFieldEntityAddDisplayTag(displayTag));
    const forApiArray = [];
    const subPath = 'topic_entity_tag/';
    const method = 'POST';
    if (entityResultList.length > 0) {
      for (const entityResult of entityResultList.values()) {
        if ((entityResult.curie !== 'no Alliance curie') && (entityResult.curie !== 'no SGD curie') && (entityResult.curie !== 'duplicate')) {
          let updateJson = initializeUpdateJson(refCurie, row);
          if (row.entityTypeSelect === 'ATP:0000128' || row.entityTypeSelect === 'ATP:0000022') {
            updateJson['entity_id_validation'] = 'SGD';
          } else {
            updateJson['entity_id_validation'] = 'alliance';
          }
          updateJson['entity_type'] = (row.entityTypeSelect === '') ? null : row.entityTypeSelect;
          updateJson['entity'] = entityResult.curie;
          let array = [subPath, updateJson, method];
          forApiArray.push(array);
        }
      }
    } else if (row.taxonSelect !== '' && row.taxonSelect !== undefined) {
      let updateJson = initializeUpdateJson(refCurie, row);
      updateJson['entity_type'] = (row.entityTypeSelect === '') ? null : row.entityTypeSelect;
      let array = [subPath, updateJson, method];
      forApiArray.push(array);
    }
    dispatch(setBiblioUpdatingEntityAdd(forApiArray.length));

    const result = await checkForExistingTags(forApiArray, accessToken, accessLevel,
      dispatch, updateButtonBiblioEntityAdd);
    if (result) {
      setTagExistingMessage(result.html);
      setIsTagExistingMessageVisible(true);
      setExistingTagResponses(result.existingTagResponses);
    }
    dispatch(
      changeFieldEntityAddGeneralField({
        target: { id: "topicSelect", value: "" },
      })
    );
    removeRow(index);
    ensureAtLeastOneRow();
  };

  const handleAddAll = async () => {
    for (let index = 0; index < rows.length; index++) {
      await createEntities(referenceJsonLive.curie, index);
    }
    ensureAtLeastOneRow();
  };

  const removeRow = (index) => {
    const newRows = [...rows];
    newRows.splice(index, 1);
    setRows(newRows);
  };

  const ensureAtLeastOneRow = () => {
    if (rows.length === 0) {
      addRow();
    }
  };

  function initializeUpdateJson(refCurie, row) {
    let updateJson = {};
    updateJson["reference_curie"] = refCurie;
    updateJson["topic"] = row.topicSelect;
    updateJson["species"] = row.taxonSelect;
    updateJson['note'] = row.noteText !== "" ? row.noteText : null;
    updateJson['negated'] = false;
    updateJson['confidence_level'] = null;
    updateJson['topic_entity_tag_source_id'] = topicEntitySourceId;
    if (row.tetdisplayTagSelect && row.tetdisplayTagSelect !== "") {
      updateJson["display_tag"] = row.tetdisplayTagSelect;
    }
    return updateJson;
  }

  const handleCloseTagExistingMessage = () => {
    setIsTagExistingMessageVisible(false); // hide the message
  };

  if (accessLevel in modToTaxon) {
    let filteredTaxonList = taxonList.filter(
      (x) => !modToTaxon[accessLevel].includes(x)
    );
    taxonList = modToTaxon[accessLevel].concat(filteredTaxonList);
  }

  const disabledEntityList = rows.some(row => row.taxonSelect === "" || row.taxonSelect === undefined) ? "disabled" : "";
  const disabledAddButton = rows.some(row => row.taxonSelect === "" || row.taxonSelect === undefined || topicEntitySourceId === undefined) ? "disabled" : "";

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
      {rows.map((row, index) => (
        <React.Fragment key={index}>
          <Row className="form-group row">
            <Col sm="3">
              <div>
                <label>Topic:</label>
              </div>
              <Form.Control
                as="select"
                id={`topicSelect-${index}`}
                type="topicSelect"
                value={row.topicSelect}
                onChange={(e) => handleRowChange(index, 'topicSelect', e.target.value)}
              >
                <option value="">Pick a topic</option>
                {sgdTopicList.map((option, idx) => (
                  <option key={idx} value={option.curie}>
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
                id={`entityTypeSelect-${index}`}
                value={row.entityTypeSelect}
                pdList={entityTypeList}
                optionToName={curieToNameEntityType}
                onChange={(value) => handleRowChange(index, 'entityTypeSelect', value)}
              />
            </Col>
            <Col sm="3">
              <div>
                <label>Species:</label>
              </div>
              <PulldownMenu
                id={`taxonSelect-${index}`}
                value={row.taxonSelect}
                pdList={taxonList}
                optionToName={curieToNameTaxon}
                onChange={(value) => handleRowChange(index, 'taxonSelect', value)}
              />
            </Col>
            <Col sm="3">
              <div>
                <label>Display Tag:</label>
              </div>
              <PulldownMenu
                id={`tetdisplayTagSelect-${index}`}
                value={row.tetdisplayTagSelect}
                pdList={displayTagList}
                optionToName={curieToNameDisplayTag}
                onChange={(value) => handleRowChange(index, 'tetdisplayTagSelect', value)}
              />
            </Col>
          </Row>
          <Row className="form-group row">
            <Col sm="3">
              <div><label>Entity List (one per line, case insensitive)</label></div>
              <Form.Control
                as="textarea"
                id={`entitytextarea-${index}`}
                type="entitytextarea"
                value={row.entityText}
                onChange={(e) => handleRowChange(index, 'entityText', e.target.value)}
              />
            </Col>
            <Col sm="3">
              <div><label>Entity Validation:</label></div>
              <Container>
                {row.entityResultList && row.entityResultList.length > 0 && row.entityResultList.map((entityResult, idx) => {
                  let colDisplayClass = 'Col-display';
                  if (['no Alliance curie', 'obsolete entity'].includes(entityResult.curie)) { colDisplayClass = 'Col-display-warn'; }
                  else if (entityResult.curie === 'duplicate') { colDisplayClass = 'Col-display-grey'; }
                  return (
                    <Row key={`entityEntityContainerrows ${idx}`}>
                      <Col className={`Col-general ${colDisplayClass} Col-display-left`} sm="5">{entityResult.entityTypeSymbol}</Col>
                      <Col className={`Col-general ${colDisplayClass} Col-display-right`} sm="7">{entityResult.curie}</Col>
                    </Row>)
                })}
              </Container>
            </Col>
            <Col sm="3">
              <div><label>Comment/internal notes:</label></div>
              <Form.Control
                as="textarea"
                id={`notetextarea-${index}`}
                type="notetextarea"
                value={row.noteText}
                onChange={(e) => handleRowChange(index, 'noteText', e.target.value)}
              />
            </Col>
            <Col sm="3" className="d-flex align-items-center">
              <div className="mt-3">
                {editTag ?
                  <Button variant="outline-danger" onClick={() => patchEntities(referenceJsonLive.curie, index)}>
                    {biblioUpdatingEntityAdd > 0 ? (
                      <Spinner animation="border" size="sm" />
                    ) : (
                      "Edit"
                    )}
                  </Button>
                :
                  <Button
                    variant="outline-primary"
                    onClick={() => createEntities(referenceJsonLive.curie, index)}
                  >
                    {biblioUpdatingEntityAdd > 0 ? (
                      <Spinner animation="border" size="sm" />
                    ) : (
                      "Add"
                    )}
                  </Button>
                }
                {rows.length > 1 && index === rows.length - 1 && (
                  <Button
                    variant="outline-primary"
                    onClick={handleAddAll}
                    className="ml-2"
                  >
                    Add All
                  </Button>
                )}
              </div>
            </Col>
          </Row>
        </React.Fragment>
      ))}
      <Row>
        <Col sm="2">
          <Button variant="outline-secondary" onClick={addRow}>
            Add Additional Row
          </Button>
        </Col>
        <Col sm="8"></Col>
      </Row>
    </Container>
  );
};

export default TopicEntityCreateSGD;
