import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import {
  ateamGetTopicDescendants,
  changeFieldEntityAddDisplayTag,
  changeFieldEntityAddGeneralField,
  changeFieldEntityEntityList,
  fetchDisplayTagData,
  getCuratorSourceId,
  setBiblioUpdatingEntityAdd,
  setEntityModalText,
  setEditTag,
  updateButtonBiblioEntityAdd,
} from "../../../actions/biblioActions";
import { checkForExistingTags } from './TopicEntityUtils';
import {
  checkTopicEntitySetDisplayTag,
  setDisplayTag,
  sgdTopicList,
  geneATP,
  alleleATP,
  complexATP,
  pathwayATP
} from "./BiblioEntityUtilsSGD";
import {
  getCurieToNameTaxon,
  getModToTaxon,
} from "./TaxonUtils";
import Container from "react-bootstrap/Container";
import ModalGeneric from "../ModalGeneric";
import RowDivider from "../RowDivider";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import Spinner from "react-bootstrap/Spinner";
import { debounce } from 'lodash';

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
  const [rows, setRows] = useState([createNewRow()]);
  const [isTagExistingMessageVisible, setIsTagExistingMessageVisible] = useState(false);
  const [topicEntityTags, setTopicEntityTags] = useState([]);
  const inputRefs = useRef([]);

  const curieToNameDisplayTag = displayTagData.reduce((acc, option) => {
    acc[option.curie] = option.name;
    return acc;
  }, {});
  const displayTagList = displayTagData.map(option => option.curie);
  displayTagList.unshift('');

  const [topicEntitySourceId, setTopicEntitySourceId] = useState(undefined);

  const curieToNameEntityType = useMemo(() => ({
    '': 'no value',
    [geneATP]: 'gene',
    [alleleATP]: 'allele',
    [complexATP]: 'complex',
    [pathwayATP]: 'pathway'
  }), []);

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
  const entityTypeList = Object.keys(curieToNameEntityType);

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
        target: { id: "entityTypeSelect", value: geneATP },
      })
    );
  }, [accessLevel, accessToken, dispatch]);

  useEffect(() => {
    const fetchTopicEntityTags = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_RESTAPI}/topic_entity_tag/${editTag}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        });
        setTopicEntityTags(response.data);
      } catch (error) {
        console.error("Error fetching topic entity tags:", error);
      }
    };

    if (editTag !== null) {
      fetchTopicEntityTags();
    }
  }, [editTag, accessToken]);

  useEffect(() => {
    if (editTag !== null && topicEntityTags) {
      const editRow = topicEntityTags;
      if (editRow) {
        setRows([{
          topicSelect: editRow.topic || "",
          entityTypeSelect: editRow.entity_type || geneATP,
          taxonSelect: editRow.species || "NCBITaxon:559292",
          tetdisplayTagSelect: editRow.display_tag || "",
          entityText: editRow.entity_name || editRow.entity || "",
          noteText: editRow.note || "",
          entityResultList: editRow.entityResultList || []
        }]);
        dispatch(changeFieldEntityAddGeneralField({ target: { id: 'entityResultList', value: editRow.entityResultList || [] } }));
        dispatch(changeFieldEntityAddGeneralField({ target: { id: 'entitytextarea', value: editRow.entity || '' } }));
      }
    } else {
      setRows([createNewRow()]);
      dispatch(changeFieldEntityAddGeneralField({ target: { id: 'entityResultList', value: [] } }));
      dispatch(changeFieldEntityAddGeneralField({ target: { id: 'entitytextarea', value: '' } }));
    }
  }, [editTag, topicEntityTags, dispatch]);

  const handleEntityValidation = useCallback(
    debounce((index, value) => {
      setRows((prevRows) => {
        const newRows = [...prevRows];
        const row = newRows[index];
        if (row.entityText === "") {
          row.entityResultList = [];
        } else if (
          row.taxonSelect !== "" &&
          row.taxonSelect !== undefined &&
          row.entityTypeSelect !== ""
        ) {
          // const entityIdValidation = (row.entityTypeSelect === complexATP || row.entityTypeSelect === pathwayATP) ? 'sgd' : 'alliance';
          const entityIdValidation = 'sgd';  
          dispatch(
            changeFieldEntityEntityList(
              row.entityText,
              accessToken,
              entityIdValidation,
              row.taxonSelect,
              curieToNameEntityType[row.entityTypeSelect],
              (result) => {
                setRows((updatedRows) => {
                  const finalRows = [...updatedRows];
                  if (inputRefs.current[index] === value) {
                    finalRows[index].entityResultList = result;
                  }
                  return finalRows;
                });
              }
            )
          );
        }
        return newRows;
      });
    }, 300),
    [rows, accessToken, dispatch, curieToNameEntityType]
  );

  const handleRowChange = (index, field, value) => {
    setRows((prevRows) => {
      const newRows = [...prevRows];
      newRows[index] = { ...newRows[index], [field]: value };

      if (field === 'topicSelect') {
        if (value !== alleleATP && entityTypeList.includes(value)) {
          newRows[index].entityTypeSelect = value;
          newRows[index].tetdisplayTagSelect = value;
        } else {
          newRows[index].entityTypeSelect = geneATP;
          newRows[index].tetdisplayTagSelect = setDisplayTag(value);
        }
      }

      if (field === 'entityText') {
        inputRefs.current[index] = value;
      }

      if (field === 'entityText' || field === 'taxonSelect' || field === 'entityTypeSelect') {
        handleEntityValidation(index, value);
      }
      return newRows;
    });
  };

  const handleAddAll = async () => {
    for (let index = rows.length - 1; index >= 0; index--) {
      await createEntities(referenceJsonLive.curie, index, 'ATP:0000275');
    }
    setRows([createNewRow()]);
  };

  const addRow = () => {
    setRows((prevRows) => [...prevRows, createNewRow()]);
  };

  const cloneRow = (index) => {
    setRows((prevRows) => {
      const newRows = [...prevRows];
      newRows.splice(index + 1, 0, { ...newRows[index] });
      return newRows;
    });
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
  };

  const createEntities = async (refCurie, index, index_wft) => {
    const row = rows[index];
    if (row.topicSelect === null) {
      return;
    }

    // fetch the display tag name based on the selected curie
    const displayTagName = curieToNameDisplayTag[row.tetdisplayTagSelect] || "";

    // validation: check if display tag is "primary display" or "additional display"
    if (displayTagName === "primary display" || displayTagName === "additional display") {
      // check if entityText is entered
      if (!row.entityText || row.entityText.trim() === "") {
        setWarningMessage("Entity must be entered when display tag is 'primary display' or 'additional display'.");
        setTimeout(() => setWarningMessage(""), 8000);
        return;
      }

      // check if entityResultList has at least one valid entity
      const hasValidEntity = row.entityResultList.some(entity => 
        !['no Alliance curie', 'no SGD curie', 'duplicate', 'obsolete entity'].includes(entity.curie)
      );

      if (!hasValidEntity) {
        setWarningMessage("Entity must be validated when display tag is 'primary display' or 'additional display'.");
        setTimeout(() => setWarningMessage(""), 8000);
        return;
      }
    }

    const entityResultList = row.entityResultList || [];
    const [warningMsg, displayTag] = checkTopicEntitySetDisplayTag(row.entityText,
      entityResultList,
      row.topicSelect);
    if (warningMsg) {
      setWarningMessage(warningMsg)
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
          if (row.entityTypeSelect === complexATP || row.entityTypeSelect === pathwayATP) {
            updateJson['entity_id_validation'] = 'SGD';
          } else {
            updateJson['entity_id_validation'] = 'alliance';
          }
          updateJson['entity_type'] = (row.entityTypeSelect === '') ? null : row.entityTypeSelect;
          updateJson['entity'] = entityResult.curie;
          updateJson['index_wft'] = index_wft   
          let array = [subPath, updateJson, method];
          forApiArray.push(array);
        }
      }
    } else if (row.taxonSelect !== '' && row.taxonSelect !== undefined) {
      let updateJson = initializeUpdateJson(refCurie, row);
      updateJson['entity_type'] = (row.entityTypeSelect === '') ? null : row.entityTypeSelect;
      updateJson['index_wft'] = index_wft
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
  };

  const removeRow = (index) => {
    setRows((prevRows) => {
      const newRows = [...prevRows];
      newRows.splice(index, 1);
      if (newRows.length === 0) {
        newRows.push(createNewRow());
      }
      return newRows;
    });
  };

  function createNewRow() {
    return {
      topicSelect: "",
      entityTypeSelect: geneATP,
      taxonSelect: "NCBITaxon:559292",
      tetdisplayTagSelect: "",
      entityText: "",
      noteText: "",
      entityResultList: []
    };
  }

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
    setIsTagExistingMessageVisible(false);
  };

  if (accessLevel in modToTaxon) {
    let filteredTaxonList = taxonList.filter(
      (x) => !modToTaxon[accessLevel].includes(x)
    );
    taxonList = modToTaxon[accessLevel].concat(filteredTaxonList);
  }

  const disabledAddButton = rows.some(row => row.taxonSelect === "" || row.taxonSelect === undefined || topicEntitySourceId === undefined);

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
          <Row className="form-group row mb-3">
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
              <Form.Control
                as="select"
                id={`entityTypeSelect-${index}`}
                type="entityTypeSelect"
                value={row.entityTypeSelect}
                onChange={(e) => handleRowChange(index, 'entityTypeSelect', e.target.value)}
              >
                {entityTypeList.map((option, idx) => (
                  <option key={idx} value={option}>
                    {curieToNameEntityType[option]}
                  </option>
                ))}
              </Form.Control>
            </Col>
            <Col sm="3">
              <div>
                <label>Species:</label>
              </div>
              <Form.Control
                as="select"
                id={`taxonSelect-${index}`}
                type="taxonSelect"
                value={row.taxonSelect}
                onChange={(e) => handleRowChange(index, 'taxonSelect', e.target.value)}
              >
                {taxonList.map((option, idx) => (
                  <option key={idx} value={option}>
                    {curieToNameTaxon[option]}
                  </option>
                ))}
              </Form.Control>
            </Col>
            <Col sm="3">
              <div>
                <label>Display Tag:</label>
              </div>
              <Form.Control
                as="select"
                id={`tetdisplayTagSelect-${index}`}
                type="tetdisplayTagSelect"
                value={row.tetdisplayTagSelect}
                onChange={(e) => handleRowChange(index, 'tetdisplayTagSelect', e.target.value)}
              >
                {displayTagList.map((option, idx) => (
                  <option key={idx} value={option}>
                    {curieToNameDisplayTag[option]}
                  </option>
                ))}
              </Form.Control>
            </Col>
          </Row>
          <Row className="form-group row mb-3">
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
                  if (['no Alliance curie', 'no SGD curie', 'obsolete entity'].includes(entityResult.curie)) { colDisplayClass = 'Col-display-warn'; }
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
                    size="sm"
                    disabled={disabledAddButton}
                    onClick={() => createEntities(referenceJsonLive.curie, index, 'ATP:0000276')}
                  >
                    {biblioUpdatingEntityAdd > 0 ? (
                      <Spinner animation="border" size="sm" />
                    ) : (
                      "Submit"
                    )}
                  </Button>
                }
                {index === rows.length - 1 && (
                  <div style={{ display: 'inline-block', marginLeft: '30px' }}>      
                    <Button
                      variant="primary"
                      onClick={handleAddAll}
                      className="ml-2"
                    >
                      Submit All
                    </Button>
                  </div>
                )}
              </div>
            </Col>
          </Row>
          <Row className="mb-3">
            <Col sm="3">
              <Button variant="outline-secondary" onClick={() => cloneRow(index)}>
                Clone row
              </Button>
              {index === rows.length - 1 && (
                <Button variant="outline-secondary" onClick={addRow} className="ml-2">
                  New row
                </Button>
              )}
            </Col>
          </Row>
        </React.Fragment>
      ))}
    </Container>
  );
};

export default TopicEntityCreateSGD;
