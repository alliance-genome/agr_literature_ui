import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import {
  changeFieldEntityAddDisplayTag,
  changeFieldEntityAddGeneralField,
  changeFieldEntityEntityList,
  fetchDisplayTagData,
  getCuratorSourceId,
  setBiblioUpdatingEntityAdd,
  setEditTag,
  updateButtonBiblioEntityAdd,
} from "../../../actions/biblioActions";
import { checkForExistingTags } from "./TopicEntityUtils";
import {
  checkTopicEntitySetDisplayTag,
  setDisplayTag,
  sgdTopicList,
  geneATP,
  alleleATP,
  complexATP,
  pathwayATP
} from "./BiblioEntityUtilsSGD";
import { getCurieToNameTaxon, getModToTaxon } from "./TaxonUtils";
import Container from "react-bootstrap/Container";
import RowDivider from "../RowDivider";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import Spinner from "react-bootstrap/Spinner";
import { debounce } from "lodash";
import Alert from "react-bootstrap/Alert";

const TopicEntityCreateSGD = () => {
  const dispatch = useDispatch();
  const editTag = useSelector((state) => state.biblio.editTag);
  const referenceJsonLive = useSelector((state) => state.biblio.referenceJsonLive);
  const accessToken = useSelector((state) => state.isLogged.accessToken);
  const oktaMod = useSelector((state) => state.isLogged.oktaMod);
  const testerMod = useSelector((state) => state.isLogged.testerMod);
  const accessLevel = testerMod !== "No" ? testerMod : oktaMod;
  const uid = useSelector((state) => state.isLogged.uid);

  const [displayTagData, setDisplayTagData] = useState([]);
  const biblioUpdatingEntityAdd = useSelector(
    (state) => state.biblio.biblioUpdatingEntityAdd
  );

  const [messages, setMessages] = useState([]);

  const [existingTagResponses, setExistingTagResponses] = useState([]);
  const [isTagExistingMessageVisible, setIsTagExistingMessageVisible] = useState(false);

  const [rows, setRows] = useState([createNewRow()]);
  const [topicEntityTags, setTopicEntityTags] = useState([]);

  const inputRefs = useRef([]);

  const curieToNameDisplayTag = useMemo(() => {
    const out = {};
    displayTagData.forEach((option) => {
      out[option.curie] = option.name;
    });
    return out;
  }, [displayTagData]);

  const displayTagList = useMemo(() => {
    const arr = displayTagData.map((option) => option.curie);
    arr.unshift("");
    return arr;
  }, [displayTagData]);

  const [topicEntitySourceId, setTopicEntitySourceId] = useState(undefined);
  const topicDescendants = useSelector((state) => state.biblio.topicDescendants);
  const [curieToNameTaxonObj, setCurieToNameTaxon] = useState({});
  const [modToTaxonObj, setModToTaxon] = useState({});
  const curieToNameTaxon = curieToNameTaxonObj;
  const modToTaxon = modToTaxonObj;

  const curieToNameEntityType = useMemo(
    () => ({
      "": "no value",
      [geneATP]: "gene",
      [alleleATP]: "allele",
      [complexATP]: "complex",
      [pathwayATP]: "pathway"
    }),
    []
  );
  const entityTypeList = useMemo(() => Object.keys(curieToNameEntityType), [curieToNameEntityType]);

  useEffect(() => {
    const fetchTaxonData = async () => {
      const taxonData = await getCurieToNameTaxon();
      const modData = await getModToTaxon();
      setCurieToNameTaxon(taxonData);
      setModToTaxon(modData);
    };
    fetchTaxonData();
  }, [accessToken]);

  let unsortedTaxonList = Object.values(modToTaxon).flat();
  unsortedTaxonList.push("");
  unsortedTaxonList.push("NCBITaxon:9606");
  let taxonList = unsortedTaxonList.sort((a, b) =>
    curieToNameTaxon[a] > curieToNameTaxon[b] ? 1 : -1
  );

  useEffect(() => {
    fetchDisplayTagData().then((data) => setDisplayTagData(data));
    dispatch(
      changeFieldEntityAddGeneralField({
        target: { id: "entityTypeSelect", value: geneATP },
      })
    );
  }, [accessToken, dispatch]);

  useEffect(() => {
    const fetchSourceId = async () => {
      if (accessToken !== null) {
        setTopicEntitySourceId(await getCuratorSourceId(accessLevel, accessToken));
      }
    };
    fetchSourceId().catch(console.error);
  }, [accessLevel, accessToken]);

  useEffect(() => {
    if (editTag !== null) {
      const fetchTopicEntityTags = async () => {
        try {
          const response = await axios.get(
            `${process.env.REACT_APP_RESTAPI}/topic_entity_tag/${editTag}`,
            {
              headers: { Authorization: `Bearer ${accessToken}` },
            }
          );
          setTopicEntityTags(response.data);
        } catch (error) {
          console.error("Error fetching topic entity tags:", error);
        }
      };
      fetchTopicEntityTags();
    }
  }, [editTag, accessToken]);

  useEffect(() => {
    if (editTag !== null && topicEntityTags) {
      const editRow = topicEntityTags;
      if (editRow) {
        setRows([
          {
            topicSelect: editRow.topic || "",
            entityTypeSelect: editRow.entity_type || geneATP,
            taxonSelect: editRow.species || "NCBITaxon:559292",
            tetdisplayTagSelect: editRow.display_tag || "",
            entityText: editRow.entity_name || editRow.entity || "",
            noteText: editRow.note || "",
            entityResultList: editRow.entityResultList || [],
          },
        ]);
        dispatch(
          changeFieldEntityAddGeneralField({
            target: { id: "entityResultList", value: editRow.entityResultList || [] },
          })
        );
        dispatch(
          changeFieldEntityAddGeneralField({
            target: { id: "entitytextarea", value: editRow.entity || "" },
          })
        );
      }
    } else {
      setRows([createNewRow()]);
      dispatch(changeFieldEntityAddGeneralField({ target: { id: "entityResultList", value: [] } }));
      dispatch(changeFieldEntityAddGeneralField({ target: { id: "entitytextarea", value: "" } }));
    }
  }, [editTag, topicEntityTags, dispatch]);

  const addMessage = (text, variant) => {
    setMessages((prev) => [...prev, { text, variant }]);
  };

  const handleCloseMessage = (index) => {
    setMessages((prev) => prev.filter((_, idx) => idx !== index));
  };

  useEffect(() => {
    if (referenceJsonLive?.workflow_tags) {
      const uniqueMessages = new Set();
      referenceJsonLive.workflow_tags.forEach((tag) => {
        if (tag.updated_by !== uid) {
          if (tag.workflow_tag_id === "ATP:0000276") {
            uniqueMessages.add(
              `${tag.updated_by_email} has started adding the topic/entity tags for this paper.`
            );
          } else if (tag.workflow_tag_id === "ATP:0000275") {
            uniqueMessages.add(
              `${tag.updated_by_email} has completed adding the topic/entity tags for this paper.`
            );
          }
        }
      });
      uniqueMessages.forEach((msg) => addMessage(msg, "warning"));
    }
  }, [referenceJsonLive?.workflow_tags, uid]);

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
          const entityIdValidation = "sgd";
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
    [accessToken, dispatch, curieToNameEntityType]
  );

  const handleRowChange = (index, field, value) => {
    setRows((prevRows) => {
      const newRows = [...prevRows];
      newRows[index] = { ...newRows[index], [field]: value };

      if (field === "topicSelect") {
        if (value !== alleleATP && entityTypeList.includes(value)) {
          newRows[index].entityTypeSelect = value;
          newRows[index].tetdisplayTagSelect = value;
        } else {
          newRows[index].entityTypeSelect = geneATP;
          newRows[index].tetdisplayTagSelect = setDisplayTag(value);
        }
      }

      if (field === "entityText") {
        inputRefs.current[index] = value;
      }

      if (
        field === "entityText" ||
        field === "taxonSelect" ||
        field === "entityTypeSelect"
      ) {
        handleEntityValidation(index, value);
      }
      return newRows;
    });
  };

  const handleAddAll = async () => {
    for (let index = rows.length - 1; index >= 0; index--) {
      await createEntities(referenceJsonLive.curie, index, "ATP:0000275");
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
    const subPath = "topic_entity_tag/" + editTag;
    const method = "PATCH";
    const entityResultList = row.entityResultList || [];
    if (entityResultList.length > 1) {
      console.error("Error processing entry: too many entities");
      addMessage(
        "Only one entity is allowed when editing. Please create additional tags using the add function.",
        "danger"
      );
      return;
    } else {
      let entityResult = entityResultList[0];
      let updateJson = initializeUpdateJson(refCurie, row);
      updateJson["entity_id_validation"] = row.entityTypeSelect === "" ? null : "alliance";
      updateJson["entity_type"] = row.entityTypeSelect === "" ? null : row.entityTypeSelect;
      updateJson["species"] = row.taxonSelect === "" ? null : row.taxonSelect;
      if (entityResult) {
        updateJson["entity"] = entityResult.curie;
      }
      updateJson["updated_by"] = uid;

      const array = [accessToken, subPath, updateJson, method];
      dispatch(setBiblioUpdatingEntityAdd(1));
      await dispatch(updateButtonBiblioEntityAdd(array, accessLevel));
      dispatch(changeFieldEntityAddGeneralField({ target: { id: "topicSelect", value: null } }));
      dispatch(setEditTag(null));
    }
    removeRow(index);
  };

  const createEntities = async (refCurie, index, index_wft) => {
    const row = rows[index];
    if (row.topicSelect === null) {
      return;
    }
    const displayTagName = curieToNameDisplayTag[row.tetdisplayTagSelect] || "";
    if (["primary display", "additional display"].includes(displayTagName)) {
      if (!row.entityText || row.entityText.trim() === "") {
        addMessage(
          "Entity must be entered when display tag is 'primary display' or 'additional display'.",
          "danger"
        );
        return;
      }
      const hasValidEntity = (row.entityResultList || []).some(
        (entity) =>
          ![
            "no Alliance curie",
            "no SGD curie",
            "no mod curie",
            "duplicate",
            "obsolete entity",
          ].includes(entity.curie)
      );
      if (!hasValidEntity) {
        addMessage(
          "Entity must be validated when display tag is 'primary display' or 'additional display'.",
          "danger"
        );
        return;
      }
    }

    const entityResultList = row.entityResultList || [];
    const [warningMsg, displayTag] = checkTopicEntitySetDisplayTag(
      row.entityText,
      entityResultList,
      row.topicSelect
    );
    if (warningMsg) {
      addMessage(warningMsg, "danger");
      return;
    }
    dispatch(changeFieldEntityAddDisplayTag(displayTag));

    const forApiArray = [];
    const subPath = "topic_entity_tag/";
    const method = "POST";

    if (entityResultList.length > 0) {
      for (const entityResult of entityResultList.values()) {
        if (
          ![
            "no Alliance curie",
            "no SGD curie",
            "no mod curie",
            "duplicate",
            "obsolete entity",
          ].includes(entityResult.curie)
        ) {
          let updateJson = initializeUpdateJson(refCurie, row);
          if (row.entityTypeSelect === complexATP || row.entityTypeSelect === pathwayATP) {
            updateJson["entity_id_validation"] = "SGD";
          } else {
            updateJson["entity_id_validation"] = "alliance";
          }
          updateJson["entity_type"] = row.entityTypeSelect === "" ? null : row.entityTypeSelect;
          updateJson["entity"] = entityResult.curie;
          updateJson["index_wft"] = index_wft;

          const arrayElem = [subPath, updateJson, method];
          forApiArray.push(arrayElem);
        }
      }
    } else if (row.taxonSelect !== "" && row.taxonSelect !== undefined) {
      let updateJson = initializeUpdateJson(refCurie, row);
      updateJson["entity_type"] = row.entityTypeSelect === "" ? null : row.entityTypeSelect;
      updateJson["index_wft"] = index_wft;
      const arrayElem = [subPath, updateJson, method];
      forApiArray.push(arrayElem);
    }

    dispatch(setBiblioUpdatingEntityAdd(forApiArray.length));
    const result = await checkForExistingTags(
      forApiArray,
      accessToken,
      accessLevel,
      dispatch,
      updateButtonBiblioEntityAdd
    );
    if (result) {
      // If there's HTML in result.html, show it as interpreted HTML
      setExistingTagResponses([result.html]);
      setIsTagExistingMessageVisible(true);
    }
    dispatch(changeFieldEntityAddGeneralField({ target: { id: "topicSelect", value: "" } }));
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
      entityResultList: [],
    };
  }

  function initializeUpdateJson(refCurie, row) {
    const updateJson = {};
    updateJson["reference_curie"] = refCurie;
    updateJson["topic"] = row.topicSelect;
    updateJson["species"] = row.taxonSelect;
    updateJson["note"] = row.noteText !== "" ? row.noteText : null;
    updateJson["negated"] = false;
    updateJson["confidence_score"] = null;  
    updateJson["confidence_level"] = null;
    updateJson["data_novelty"] = null;
    updateJson["topic_entity_tag_source_id"] = topicEntitySourceId;

    if (row.tetdisplayTagSelect && row.tetdisplayTagSelect !== "") {
       updateJson["display_tag"] = row.tetdisplayTagSelect;
    }   
    return updateJson;
  }

  const handleCloseTagExistingMessage = () => {
    setIsTagExistingMessageVisible(false);
    setExistingTagResponses([]);
  };

  if (accessLevel in modToTaxon) {
    const filteredTaxonList = taxonList.filter((x) => !modToTaxon[accessLevel].includes(x));
    taxonList = modToTaxon[accessLevel].concat(filteredTaxonList);
  }

  const disabledAddButton = rows.some(
    (row) => row.taxonSelect === "" || row.taxonSelect === undefined || topicEntitySourceId === undefined
  );
  const existingTagHtml = existingTagResponses.join("<br/>").trim();

  const [noTetDataLoading, setNoTetDataLoading] = useState(false);

  const handleNoTetDataClick = async () => {
    setNoTetDataLoading(true);
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_RESTAPI}/topic_entity_tag/set_no_tet_status/${accessLevel}/${referenceJsonLive.curie}/${uid}`,
        {},
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      console.log("The manual indexing WFT has been successfully set to complete:", response.data);
      addMessage("The manual indexing WFT has been successfully set to complete.", "success");
    } catch (error) {
      console.error("Error processing the manual indexing WFT:", error);
      addMessage("Failed to process the manual indexing WFT.", "danger");
    } finally {
      setNoTetDataLoading(false);
    }
  };

  return (
    <Container fluid>
      <RowDivider />
      {/* Messages Area */}
      <Row className="form-group row mb-3">
        <Col sm="12">
          {messages
            .filter((msg, index, self) =>
              index === self.findIndex(m => m.text === msg.text)
            )
            .map((msg, idx) => (
              <Alert
                key={idx}
                variant={msg.variant}
                onClose={() => handleCloseMessage(idx)}
                dismissible
              >
                {msg.text}
              </Alert>
            ))}
	</Col>
      </Row>

      {/* Existing Tag Messages */}
      {isTagExistingMessageVisible && existingTagHtml && (
        <Row className="form-group row mb-3">
          <Col sm="12">
            <Alert variant="warning" onClose={handleCloseTagExistingMessage} dismissible>
              {/* Render the string as HTML, not as literal text */}
              <div
                className="table-responsive"
                dangerouslySetInnerHTML={{ __html: existingTagHtml }}
              />
            </Alert>
          </Col>
        </Row>
      )}

      {/* Title and "No TET data" Button */}
      <Row className="form-group row mb-3" style={{ alignItems: "center" }}>
        <Col sm="12" style={{ display: "flex", alignItems: "center" }}>
          <h3 style={{ marginRight: "10px" }}>Entity and Topic Addition</h3>
          <Button
            variant="outline-primary"
            size="sm"
            onClick={handleNoTetDataClick}
            disabled={noTetDataLoading}
          >
            {noTetDataLoading ? (
              <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
            ) : (
              "Done adding TET / No TET data"
            )}
          </Button>
        </Col>
      </Row>

      {/* Entity Rows */}
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
                value={row.topicSelect}
                onChange={(e) => handleRowChange(index, "topicSelect", e.target.value)}
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
                value={row.entityTypeSelect}
                onChange={(e) => handleRowChange(index, "entityTypeSelect", e.target.value)}
              >
                {entityTypeList.map((option, i2) => (
                  <option key={i2} value={option}>
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
                value={row.taxonSelect}
                onChange={(e) => handleRowChange(index, "taxonSelect", e.target.value)}
              >
                {taxonList.map((option, idx2) => (
                  <option key={idx2} value={option}>
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
                value={row.tetdisplayTagSelect}
                onChange={(e) => handleRowChange(index, "tetdisplayTagSelect", e.target.value)}
              >
                {displayTagList.map((option, idx3) => (
                  <option key={idx3} value={option}>
                    {curieToNameDisplayTag[option]}
                  </option>
                ))}
              </Form.Control>
            </Col>
          </Row>

          <Row className="form-group row mb-3">
            <Col sm="3">
              <div>
                <label>Entity List (one per line, case insensitive)</label>
              </div>
              <Form.Control
                as="textarea"
                id={`entitytextarea-${index}`}
                value={row.entityText}
                onChange={(e) => handleRowChange(index, "entityText", e.target.value)}
              />
            </Col>
            <Col sm="3">
              <div>
                <label>Entity Validation:</label>
              </div>
              <Container>
                {row.entityResultList &&
                  row.entityResultList.length > 0 &&
                  row.entityResultList.map((entityResult, idx4) => {
                    let colDisplayClass = "Col-display";
                    if (
                      [
                        "no Alliance curie",
                        "no SGD curie",
                        "no mod curie",
                        "obsolete entity",
                      ].includes(entityResult.curie)
                    ) {
                      colDisplayClass = "Col-display-warn";
                    } else if (entityResult.curie === "duplicate") {
                      colDisplayClass = "Col-display-grey";
                    }
                    return (
                      <Row key={`entityEntityContainerrows-${idx4}`}>
                        <Col
                          className={`Col-general ${colDisplayClass} Col-display-left`}
                          sm="5"
                        >
                          {entityResult.entityTypeSymbol}
                        </Col>
                        <Col
                          className={`Col-general ${colDisplayClass} Col-display-right`}
                          sm="7"
                        >
                          {entityResult.curie}
                        </Col>
                      </Row>
                    );
                  })}
              </Container>
            </Col>
            <Col sm="3">
              <div>
                <label>Comment / internal notes:</label>
              </div>
              <Form.Control
                as="textarea"
                id={`notetextarea-${index}`}
                value={row.noteText}
                onChange={(e) => handleRowChange(index, "noteText", e.target.value)}
              />
            </Col>
            <Col sm="3" className="d-flex align-items-center">
              <div className="mt-3">
                {editTag ? (
                  <Button
                    variant="outline-danger"
                    onClick={() => patchEntities(referenceJsonLive.curie, index)}
                  >
                    {biblioUpdatingEntityAdd > 0 ? (
                      <Spinner animation="border" size="sm" />
                    ) : (
                      "Edit"
                    )}
                  </Button>
                ) : (
                  <Button
                    variant="outline-primary"
                    size="sm"
                    disabled={disabledAddButton}
                    onClick={() =>
                      createEntities(referenceJsonLive.curie, index, "ATP:0000276")
                    }
                  >
                    {biblioUpdatingEntityAdd > 0 ? (
                      <Spinner animation="border" size="sm" />
                    ) : (
                      "Submit"
                    )}
                  </Button>
                )}
                {index === rows.length - 1 && (
                  <div style={{ display: "inline-block", marginLeft: "30px" }}>
                    <Button variant="primary" onClick={handleAddAll} className="ml-2">
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
                <Button
                  variant="outline-secondary"
                  onClick={addRow}
                  className="ml-2"
                >
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

function createNewRow() {
  return {
    topicSelect: "",
    entityTypeSelect: geneATP,
    taxonSelect: "NCBITaxon:559292",
    tetdisplayTagSelect: "",
    entityText: "",
    noteText: "",
    entityResultList: [],
  };
}

export default TopicEntityCreateSGD;
