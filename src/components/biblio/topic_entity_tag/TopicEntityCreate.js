import React, { useEffect, useRef, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
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
  updateButtonBiblioEntityAdd,
  setTopicEntitySourceId,
  setEditTag,
} from "../../../actions/biblioActions";
import { checkForExistingTags, setupEventListeners } from "./TopicEntityUtils";
import { getCurieToNameTaxon, getModToTaxon } from "./TaxonUtils";
import { PulldownMenu } from "../PulldownMenu";
import { FetchTypeaheadOptions } from "../FetchTypeahead";
import Container from "react-bootstrap/Container";
import ModalGeneric from "../ModalGeneric";
import RowDivider from "../RowDivider";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";
import { AsyncTypeahead } from "react-bootstrap-typeahead";
import Button from "react-bootstrap/Button";
import Spinner from "react-bootstrap/Spinner";
import { debounce } from 'lodash';

const TopicEntityCreate = () => {
  const dispatch = useDispatch();
  const editTag = useSelector((state) => state.biblio.editTag);
  const referenceJsonLive = useSelector((state) => state.biblio.referenceJsonLive);
  const accessToken = useSelector((state) => state.isLogged.accessToken);
  const oktaMod = useSelector((state) => state.isLogged.oktaMod);
  const testerMod = useSelector((state) => state.isLogged.testerMod);
  const accessLevel = testerMod !== "No" ? testerMod : oktaMod;
  const uid = useSelector((state) => state.isLogged.uid);

  const biblioUpdatingEntityAdd = useSelector((state) => state.biblio.biblioUpdatingEntityAdd);
  const entityModalText = useSelector((state) => state.biblio.entityModalText);
  const entityText = useSelector((state) => state.biblio.entityAdd.entitytextarea);
  const noteText = useSelector((state) => state.biblio.entityAdd.notetextarea);
  const topicSelect = useSelector((state) => state.biblio.entityAdd.topicSelect);
  const [topicSelectLoading, setTopicSelectLoading] = useState(false);
  const topicTypeaheadRef = useRef(null);
  const [typeaheadOptions, setTypeaheadOptions] = useState([]);
  const typeaheadName2CurieMap = useSelector((state) => state.biblio.typeaheadName2CurieMap);

  const taxonSelect = useSelector((state) => state.biblio.entityAdd.taxonSelect);
  const taxonSelectWB = useSelector((state) => state.biblio.entityAdd.taxonSelectWB);
  const noDataCheckbox = useSelector((state) => state.biblio.entityAdd.noDataCheckbox);
  const novelCheckbox = useSelector((state) => state.biblio.entityAdd.novelCheckbox);
  const entityTypeSelect = useSelector((state) => state.biblio.entityAdd.entityTypeSelect);
  const entityResultList = useSelector((state) => state.biblio.entityAdd.entityResultList);
  const topicEntitySourceId = useSelector((state) => state.biblio.topicEntitySourceId);

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
  // const [rows, setRows] = useState([createNewRow()]);
  const [rows, setRows] = useState([
    { topicSelect: "", entityTypeSelect: "", taxonSelect: "", entityText: "", entityResultList: [] }
  ]);
  const inputRefs = useRef([]);
    
  const taxonToMod = {};
  for (const [mod, taxons] of Object.entries(modToTaxon)) {
    taxons.forEach((taxon) => {
      taxonToMod[taxon] = mod;
    });
  }

  useEffect(() => {
    const fetchData = async () => {
      const taxonData = await getCurieToNameTaxon(accessToken);
      const modData = await getModToTaxon();
      taxonData["use_wb"] = "other nematode";
      setCurieToNameTaxon(taxonData);
      setModToTaxon(modData);
    };
    fetchData();
  }, [accessToken]);

  let unsortedTaxonList = Object.values(modToTaxon).flat();
  unsortedTaxonList.push("");
  unsortedTaxonList.push("use_wb");
  unsortedTaxonList.push("NCBITaxon:9606");

  let taxonList = unsortedTaxonList.sort((a, b) => (curieToNameTaxon[a] > curieToNameTaxon[b] ? 1 : -1));

  const unsortedTaxonListWB = [
    "",
    "NCBITaxon:135651",
    "NCBITaxon:6238",
    "NCBITaxon:6279",
    "NCBITaxon:281687",
    "NCBITaxon:6282",
    "NCBITaxon:54126",
    "NCBITaxon:31234",
    "NCBITaxon:34506",
    "NCBITaxon:70415",
  ];
  const curieToNameTaxonWB = {
    "NCBITaxon:135651": "Caenorhabditis brenneri",
    "NCBITaxon:6238": "Caenorhabditis briggsae",
    "NCBITaxon:6279": "Brugia malayi",
    "NCBITaxon:281687": "Caenorhabditis japonica",
    "NCBITaxon:6282": "Onchocerca volvulus",
    "NCBITaxon:54126": "Pristionchus pacificus",
    "NCBITaxon:31234": "Caenorhabditis remanei",
    "NCBITaxon:34506": "Strongyloides ratti",
    "NCBITaxon:70415": "Trichuris muris",
    "": "",
  };
  const taxonListWB = unsortedTaxonListWB.sort((a, b) => (curieToNameTaxonWB[a] > curieToNameTaxonWB[b] ? 1 : -1));

  const curieToNameEntityType = {
    "": "no value",
    "ATP:0000005": "gene",
    "ATP:0000006": "allele",
    "ATP:0000123": "species",
    "ATP:0000014": "AGMs",
    "ATP:0000027": "strain",
    "ATP:0000025": "genotype",
    "ATP:0000026": "fish",
    "ATP:0000013": "transgenic construct",
  };
  const entityTypeList = [
    "",
    "ATP:0000005",
    "ATP:0000006",
    "ATP:0000123",
    "ATP:0000014",
    "ATP:0000027",
    "ATP:0000025",
    "ATP:0000026",
    "ATP:0000013",
  ];
  const speciesATP = "ATP:0000123";
  const renderView = (row) => {
    if (!row) return "list"; // return default view if row is undefined
    return row.topicSelect === speciesATP ? "autocomplete" : "list";
  };

  useEffect(() => {
    getDescendantATPIds(accessToken, "ATP:0000005").then((data) => setGeneDescendants(data));
    getDescendantATPIds(accessToken, "ATP:0000006").then((data) => setAlleleDescendants(data));
  }, [accessLevel, accessToken, dispatch]);

  useEffect(() => {
    if (editTag === null) {
      if (entityTypeList.includes(topicSelect)) {
        dispatch(changeFieldEntityAddGeneralField({ target: { id: "entityTypeSelect", value: topicSelect } }));
        if (topicSelect === speciesATP) {
          dispatch(changeFieldEntityAddGeneralField({ target: { id: "taxonSelect", value: "" } }));
          setIsSpeciesSelected(true);
        }
      } else if (geneDescendants !== null && geneDescendants.includes(topicSelect)) {
        dispatch(changeFieldEntityAddGeneralField({ target: { id: "entityTypeSelect", value: "ATP:0000005" } }));
      } else if (alleleDescendants !== null && alleleDescendants.includes(topicSelect)) {
        dispatch(changeFieldEntityAddGeneralField({ target: { id: "entityTypeSelect", value: "ATP:0000006" } }));
      } else {
        setSelectedSpecies([]);
        dispatch(changeFieldEntityAddGeneralField({ target: { id: "entityTypeSelect", value: "" } }));
        dispatch(changeFieldEntityAddGeneralField({ target: { id: "entityResultList", value: [] } }));
      }
    }
    if (topicSelect !== speciesATP) {
      if (modToTaxon && accessLevel in modToTaxon && modToTaxon[accessLevel].length > 0 && editTag === null) {
        dispatch(changeFieldEntityAddGeneralField({ target: { id: "taxonSelect", value: modToTaxon[accessLevel][0] } }));
      }
    }
    if (editTag === null) {
      dispatch(changeFieldEntityAddGeneralField({ target: { id: "entitytextarea", value: "" } }));
      dispatch(changeFieldEntityAddGeneralField({ target: { id: "notetextarea", value: "" } }));
      dispatch(changeFieldEntityAddGeneralField({ target: { id: "noDataCheckbox", value: false } }));
      dispatch(changeFieldEntityAddGeneralField({ target: { id: "novelCheckbox", value: false } }));
    }
  }, [topicSelect, dispatch]);

  useEffect(() => {
    if (editTag === null) {
      dispatch(changeFieldEntityAddGeneralField({ target: { id: "entityResultList", value: [] } }));
      dispatch(changeFieldEntityAddGeneralField({ target: { id: "entitytextarea", value: "" } }));
    }
  }, [entityTypeSelect, dispatch]);

  useEffect(() => {
    const fetchSourceId = async () => {
      if (accessToken !== null) {
        dispatch(setTopicEntitySourceId(await getCuratorSourceId(accessLevel, accessToken)));
      }
    };
    fetchSourceId().catch(console.error);
  }, [accessLevel, accessToken]);

  const topicDescendants = useSelector((state) => state.biblio.topicDescendants);
  useEffect(() => {
    if (topicDescendants.size === 0 && accessToken !== null) {
      dispatch(ateamGetTopicDescendants(accessToken));
    }
  }, [topicDescendants, accessToken, dispatch]);

  useEffect(() => {
    if (taxonSelect === "use_wb" && taxonSelectWB !== "" && taxonSelectWB !== undefined && entityTypeSelect !== "") {
      dispatch(
        changeFieldEntityEntityList(entityText, accessToken, "wb", taxonSelectWB, curieToNameEntityType[entityTypeSelect], taxonToMod)
      );
    } else if (taxonSelect !== "" && taxonSelect !== undefined && entityTypeSelect !== "") {
      dispatch(
        changeFieldEntityEntityList(entityText, accessToken, "alliance", taxonSelect, curieToNameEntityType[entityTypeSelect], taxonToMod)
      );
    }
  }, [entityText, taxonSelect]);

  /*
  useEffect(() => {
    if (accessLevel in modToTaxon) {
      dispatch(changeFieldEntityAddTaxonSelect(modToTaxon[accessLevel][0]));
    }
  }, [accessLevel]);
  */

  useEffect(() => {
    if (modToTaxon && accessLevel in modToTaxon && modToTaxon[accessLevel].length > 0) {
      // update each row's taxonSelect field with the default species based on accessLevel
      setRows((prevRows) => prevRows.map((row, index) => ({
        ...row,
        taxonSelect: modToTaxon[accessLevel][0]
      })));
    }
  }, [modToTaxon, accessLevel]);

 
  useEffect(() => {
     // ensure that species can be adjusted manually and prevent errors
    setRows((prevRows) =>
      prevRows.map((row) => {
        const defaultTaxon = modToTaxon && modToTaxon[accessLevel] && modToTaxon[accessLevel][0] ? modToTaxon[accessLevel][0] : "";
        return {
          ...row,
          taxonSelect: row.taxonSelect !== "" && row.taxonSelect !== undefined ? row.taxonSelect : defaultTaxon,
        };
      })
    );
  }, [modToTaxon, accessLevel]);
  
    
  useEffect(() => {
    if (tagExistingMessage) {
      setupEventListeners(existingTagResponses, accessToken, accessLevel, dispatch, updateButtonBiblioEntityAdd);
    }
  }, [tagExistingMessage, existingTagResponses]);

  const getMapKeyByValue = (mapObj, value) => {
    const objEntries = Object.entries(mapObj);
    const keyByValue = objEntries.filter((e) => e[1] === value);
    return keyByValue.map((e) => e[0])[0];
  };

  function initializeUpdateJson(refCurie, entityType = undefined, entity = undefined, taxonID, entityIdValidation = "alliance") {
    let updateJson = {};
    updateJson["reference_curie"] = refCurie;
    updateJson["topic"] = topicSelect;
    updateJson["species"] = taxonSelect;
    updateJson["note"] = noteText !== "" ? noteText : null;
    updateJson["negated"] = noDataCheckbox;
    updateJson["novel_topic_data"] = novelCheckbox;
    updateJson["confidence_level"] = null;
    updateJson["topic_entity_tag_source_id"] = topicEntitySourceId;
    if (entityType !== undefined && entity !== undefined) {
      updateJson["entity_id_validation"] = entityIdValidation;
      updateJson["entity_type"] = entityType === "" ? null : entityType;
      updateJson["species"] = taxonID === "" ? null : taxonID;
      updateJson["entity"] = entity;
    }
    return updateJson;
  }

  const handleCloseTagExistingMessage = () => {
    setIsTagExistingMessageVisible(false);
  };

  function createNewRow() {
    return {
      topicSelect: "",
      entityTypeSelect: "",
      taxonSelect: "",
      entityText: "",
      noteText: "",
      entityResultList: [],
      noDataCheckbox: false,
      novelCheckbox: false
    };
  }

  const handleEntityValidation = useCallback(
     debounce((index, value) => {
	// console.log("Validating entity for row index:", index)
        setRows((prevRows) => {
            const newRows = [...prevRows]; // copy data
            const row = newRows[index];
            if (row.entityText === "") {
		console.log("Entity text is empty, resetting entityResultList");
                row.entityResultList = []; // reset entityResultList if entityText is empty
            } else if (
                row.taxonSelect !== "" &&
                row.taxonSelect !== undefined &&
                row.entityTypeSelect !== ""
            ) {
		// console.log("Validating entity:", row.entityText);
                let entityIdValidation = row.taxonSelect === "use_wb" ? "wb" : "alliance";
                // if (row.taxonSelect === "use_wb" && row.taxonSelectWB !== "" && row.taxonSelectWB !== undefined && row.entityTypeSelect !== "") {
                //    entityIdValidation = 'wb';
		//}
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
    //console.log("handleRowChange triggered:", { index, field, value });
    setRows((prevRows) => {
      const newRows = [...prevRows];
      newRows[index] = { ...newRows[index], [field]: value };

      if (field === 'topicSelect') {
	//console.log("Topic selected:", value, 'Entity type list:', entityTypeList);
        if (entityTypeList.includes(value)) {
          //console.log("Setting entityTypeSelect to:", value);
          newRows[index].entityTypeSelect = value;
        } else {
	  //console.log("Resetting entityTypeSelect");
          newRows[index].entityTypeSelect = "";
        }
      }

      if (field === 'entityText') {
        inputRefs.current[index] = value; // store the current input value
      }

      if (field === 'selectedSpecies') {
        newRows[index].selectedSpecies = value; // Store selected species
      }
	
      // Validate the row when relevant fields change
      if (['entityText', 'taxonSelect', 'entityTypeSelect'].includes(field)) {
        handleEntityValidation(index, value);
      }
      return newRows;
    });
  };

    
  async function createEntities(refCurie) {
    if (topicSelect === null) {
      return;
    }
    const forApiArray = [];
    const subPath = "topic_entity_tag/";
    const method = "POST";

    if (entityResultList && entityResultList.length > 0) {
      for (const entityResult of entityResultList.values()) {
        if (!["no Alliance curie", "duplicate", "obsolete entity", "not found at WB", "no WB curie", "no SGD curie"].includes(entityResult.curie)) {
          let taxonId = taxonSelect;
          let entityIdValidation = "alliance";
          if (taxonSelect === "use_wb" && taxonSelectWB !== "" && taxonSelectWB !== undefined && entityTypeSelect !== "") {
            entityIdValidation = "WB";
            taxonId = taxonSelectWB;
          }
          let updateJson = initializeUpdateJson(refCurie, entityTypeSelect, entityResult.curie, taxonId, entityIdValidation);
          if (taxonSelect === "use_wb" && taxonSelectWB !== "" && taxonSelectWB !== undefined && entityTypeSelect !== "") {
            updateJson["entity_id_validation"] = "WB";
            updateJson["species"] = taxonSelectWB;
          }
          let array = [subPath, updateJson, method];
          forApiArray.push(array);
        }
      }
    } else if (taxonSelect !== "" && taxonSelect !== undefined) {
      let updateJson = initializeUpdateJson(refCurie);
      let array = [subPath, updateJson, method];
      forApiArray.push(array);
    }

    dispatch(setBiblioUpdatingEntityAdd(forApiArray.length));

    const result = await checkForExistingTags(forApiArray, accessToken, accessLevel, dispatch, updateButtonBiblioEntityAdd);
    if (result) {
      setTagExistingMessage(result.html);
      setIsTagExistingMessageVisible(true);
      setExistingTagResponses(result.existingTagResponses);
    }

    setTypeaheadOptions([]);
    dispatch(changeFieldEntityAddGeneralField({ target: { id: "topicSelect", value: null } }));
    if (topicTypeaheadRef.current !== null) {
      topicTypeaheadRef.current.clear();
    }
  }

  async function patchEntities(refCurie) {
    if (topicSelect === null) {
      return;
    }
    const subPath = "topic_entity_tag/" + editTag;
    const method = "PATCH";
    if (entityResultList && entityResultList.length > 1) {
      console.error("Error processing entry: too many entities");
      dispatch({
        type: "UPDATE_BUTTON_BIBLIO_ENTITY_ADD",
        payload: {
          responseMessage: "Only one entity allowed on edit. Please create additional tags with the add function.",
          accessLevel: accessLevel,
        },
      });
    } else {
      let entityResult = entityResultList[0];
      let updateJson = initializeUpdateJson(refCurie);
      updateJson["entity_id_validation"] = entityTypeSelect === "" ? null : "alliance";
      updateJson["entity_type"] = entityTypeSelect === "" ? null : entityTypeSelect;
      updateJson["species"] = taxonSelect === "" ? null : taxonSelect;
      if (taxonSelect === "use_wb" && taxonSelectWB !== "" && taxonSelectWB !== undefined && entityTypeSelect !== "") {
        updateJson["entity_id_validation"] = "WB";
        updateJson["species"] = taxonSelectWB;
      }
      if (entityResult) {
        updateJson["entity"] = entityResult.curie;
      }
      updateJson["updated_by"] = uid;
      let array = [accessToken, subPath, updateJson, method];
      dispatch(setBiblioUpdatingEntityAdd(1));
      const response = await dispatch(updateButtonBiblioEntityAdd(array, accessLevel));

      setTypeaheadOptions([]);
      dispatch(changeFieldEntityAddGeneralField({ target: { id: "topicSelect", value: null } }));
      if (topicTypeaheadRef.current !== null) {
        topicTypeaheadRef.current.clear();
      }
      dispatch(setEditTag(null));
    }
  }

  if (accessLevel in modToTaxon) {
    let filteredTaxonList = taxonList.filter((x) => !modToTaxon[accessLevel].includes(x));
    taxonList = modToTaxon[accessLevel].concat(filteredTaxonList);
  }

  const disabledEntityList = taxonSelect === "" || taxonSelect === undefined;
  const disabledAddButton =
    (topicSelect === speciesATP && !isSpeciesSelected) ||
    (topicSelect !== speciesATP && (taxonSelect === "" || taxonSelect === undefined)) ||
    topicEntitySourceId === undefined ||
    topicSelect === undefined;

  return (
    <Container fluid>
      <ModalGeneric
        showGenericModal={entityModalText !== "" ? true : false}
        genericModalHeader="Entity Error"
        genericModalBody={entityModalText}
        onHideAction={() => dispatch(setEntityModalText(""))}
      />
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
      <Row className="form-group row">
        <Col className="form-label col-form-label" sm="3">
          <h3>Entity and Topic Addition</h3>
        </Col>
      </Row>
      <Row className="form-group row">
        <Col className="div-grey-border" sm="2">
          topic
        </Col>
        <Col className="div-grey-border" sm="1">
          checkbox
        </Col>
        <Col className="div-grey-border" sm="1">
          entity type
        </Col>
        <Col className="div-grey-border" sm="1">
          species
        </Col>
        <Col className="div-grey-border" sm="2">
          entity list (one per line, case insensitive)
        </Col>
        <Col className="div-grey-border" sm="2">
          entity validation
        </Col>
        <Col className="div-grey-border" sm="2">
          internal notes
        </Col>
        <Col className="div-grey-border" sm="1">
          button
        </Col>
      </Row>
      {rows.map((row, index) => (
        <Row className="form-group row" key={index}>
	  <Col sm="2">
            <AsyncTypeahead
              isLoading={topicSelectLoading}
              useCache={false}
              placeholder="Start typing to search topics"
              ref={topicTypeaheadRef}
              id={`topicTypeahead-${index}`}
              onSearch={async (query) => {
	        setTopicSelectLoading(true);	    
                try {
                  const results = await FetchTypeaheadOptions(
                    `${process.env.REACT_APP_ATEAM_API_BASE_URL}api/atpterm/search?limit=10&page=0`,
                    query,
                    accessToken
		  );

		  //console.log("API Results:", results);
		    
                  // make sure results is an array before processing
                  const filteredResults = (results || [])
                    .filter((item) => !item.obsolete)
                    .map((item) => [item.name, item.curie]);

                  dispatch(setTypeaheadName2CurieMap(Object.fromEntries(filteredResults)));

		  // setTopicSelectLoading(false);
		    
                  setTypeaheadOptions(
                    filteredResults
		      .filter((item) => topicDescendants.has(item[1])) // check against topicDescendants by curie
			  .map((item) => item[0]) // extract the name for display
                  );
                } catch (error) {
                  console.error("Error during topic search:", error);
                  // setTopicSelectLoading(false);
                  setTypeaheadOptions([]); // clear options on error
                } finally {
		  setTopicSelectLoading(false);
		}  
              }}
              onChange={(selected) => {
                if (selected.length > 0) {
                  const selectedCurie = typeaheadName2CurieMap[selected[0]];
                  handleRowChange(index, 'topicSelect', selectedCurie);
                } else {
		  handleRowChange(index, 'topicSelect', "");
		}
              }}
              options={typeaheadOptions}
              selected={row.topicSelect ? [getMapKeyByValue(typeaheadName2CurieMap, row.topicSelect)] : []}
            />		
          </Col>
	  <Col sm="1">
            <div style={{ textAlign: "left" }}>
              <Form.Check
                inline
                type="checkbox"
                id={`noDataCheckbox-${index}`}
                checked={row.noDataCheckbox}
                onChange={(evt) => {
                  const updatedRows = [...rows];
                  updatedRows[index] = { ...updatedRows[index], noDataCheckbox: evt.target.checked };
                  setRows(updatedRows);
                }}
              />
              No Data
              <br />
              <Form.Check
                inline
                type="checkbox"
                id={`novelCheckbox-${index}`}
                checked={row.novelCheckbox}
                onChange={(evt) => {
                  const updatedRows = [...rows];
                  updatedRows[index] = { ...updatedRows[index], novelCheckbox: evt.target.checked };
                  setRows(updatedRows);
                }}
              />
              Novel Data
            </div>
          </Col>
          <Col sm="1">
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
          <Col sm="1">
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
	      	      
            {row.taxonSelect === "use_wb" && (
	      <Form.Control
                as="select"
                id={`taxonSelectWB-${index}`}
                type="taxonSelectWB"
                value={row.taxonSelectWB}
                onChange={(e) => handleRowChange(index, 'taxonSelectWB', e.target.value)}
              >
	        {taxonListWB.map((option, idx) => (
                  <option key={idx} value={option}>
                     {curieToNameTaxonWB[option]}   
                  </option>
		))}
              </Form.Control>	
            )}
          </Col>
          <Col className="form-label col-form-label" sm="2">
            {renderView(row) === "autocomplete" ? (
              <AsyncTypeahead
                  multiple
                  isLoading={speciesSelectLoading}
                  placeholder="enter species name"
                  ref={speciesTypeaheadRef}
                  onSearch={async (query) => {
	            setSpeciesSelectLoading(true);
		    try {
		      const results = await FetchTypeaheadOptions(
                        `${process.env.REACT_APP_ATEAM_API_BASE_URL}api/ncbitaxonterm/search?limit=10&page=0`,
                        query,
                        accessToken
                      );
                      setSpeciesSelectLoading(false);
                      if (results) {
                        setTypeaheadOptions(results.map((item) => item.name + " " + item.curie));
                      }
                    } catch (error) {
		       console.error("Error fetching typeahead options:", error);
                        setSpeciesSelectLoading(false);
                    }
		  }}
                  onChange={(selected) => {
                    const extractedStrings = selected
                      .map((specie) => {
                        const match = specie.match(/(.+) (NCBITaxon:\d+)/);
                        return match ? `${match[1]} ${match[2]}` : null;
                      })
		      .filter((item) => item);

	              handleRowChange(index, 'entityResultList', entityResultList);
		      // set the selected species in the input box
                      handleRowChange(index, 'selectedSpecies', selected.map(s => s));
                  }}
                  options={typeaheadOptions}
                  // selected={row.entityResultList.map(entity => `${entity.entityTypeSymbol} ${entity.curie}`)}
		  selected={row.selectedSpecies || row.entityResultList.map(entity => `${entity.entityTypeSymbol} ${entity.curie}`)}
	      />
	    ) : ( 	
              <Form.Control
                as="textarea"
                id={`entitytextarea-${index}`}
                value={row.entityText}
                disabled={disabledEntityList}
                onChange={(e) => handleRowChange(index, 'entityText', e.target.value)}
              />
            )}
          </Col>
          <Col className="form-label col-form-label" sm="2">
            <Container>
              {renderView(row) === "list" &&
                row.entityResultList &&
                row.entityResultList.length > 0 &&
                row.entityResultList.map((entityResult, idx) => {
                  let colDisplayClass = "Col-display";
                  if (["no Alliance curie", "obsolete entity", "not found at WB", "no WB curie", "no SGD curie"].includes(entityResult.curie)) {
                    colDisplayClass = "Col-display-warn";
                  } else if (entityResult.curie === "duplicate") {
                    colDisplayClass = "Col-display-grey";
                  }
                  return (
                    <Row key={`entityEntityContainerrows-${idx}`}>
                      <Col className={`Col-general ${colDisplayClass} Col-display-left`} sm="5">
                        {entityResult.entityTypeSymbol}
                      </Col>
                      <Col className={`Col-general ${colDisplayClass} Col-display-right`} sm="7">
                        {entityResult.curie}
                      </Col>
                    </Row>
                  );
                })}
            </Container>
          </Col>
          <Col className="form-label col-form-label" sm="2">
            <Form.Control as="textarea" id={`notetextarea-${index}`} type="notetextarea" value={row.noteText} onChange={(e) => {
              const updatedRows = [...rows];
              updatedRows[index] = { ...updatedRows[index], noteText: e.target.value };
              setRows(updatedRows);
            }} />
          </Col>
          <Col className="form-label col-form-label" sm="1">
            {editTag ? (
              <Button variant="outline-danger" onClick={() => patchEntities(referenceJsonLive.curie, index)}>
                {biblioUpdatingEntityAdd > 0 ? <Spinner animation="border" size="sm" /> : "Edit"}
              </Button>
            ) : (
              <Button variant="outline-primary" disabled={disabledAddButton} onClick={() => createEntities(referenceJsonLive.curie, index)}>
                {biblioUpdatingEntityAdd > 0 ? <Spinner animation="border" size="sm" /> : "Submit"}
              </Button>
            )}
          </Col>
        </Row>
      ))}
      <Row>
        <Col sm="2">
          <Button variant="outline-secondary" onClick={() => setRows([...rows, createNewRow()])}>
            New row
          </Button>
        </Col>
        <Col sm="8"></Col>
      </Row>
    </Container>
  );
};

export default TopicEntityCreate;
