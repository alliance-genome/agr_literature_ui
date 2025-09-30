import React, { useEffect, useRef, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import {
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
  biblioQueryReferenceCurie,
} from "../../../actions/biblioActions";
import { checkForExistingTags, setupEventListeners } from "./TopicEntityUtils";
import { getCurieToNameTaxon, getModToTaxon } from "./TaxonUtils";
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
import Alert from "react-bootstrap/Alert";

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
  const newDataCheckbox = useSelector((state) => state.biblio.entityAdd.newDataCheckbox);
  const newToDbCheckbox = useSelector((state) => state.biblio.entityAdd.newToDbCheckbox);
  const newToFieldCheckbox = useSelector((state) => state.biblio.entityAdd.newToFieldCheckbox);
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
  const [rows, setRows] = useState([
    { topicSelect: "", topicSelectValue: "", entityTypeSelect: "", taxonSelect: "", entityText: "", entityResultList: [] }
  ]);
  const [topicEntityTags, setTopicEntityTags] = useState([]);
  const inputRefs = useRef([]);

  const [messages, setMessages] = useState([]);

  const curieToNameMap = Object.fromEntries(
    Object.entries(typeaheadName2CurieMap).map(([name, curie]) => [curie, name])
  );

  const taxonToMod = {};
  for (const [mod, taxons] of Object.entries(modToTaxon)) {
    taxons.forEach((taxon) => {
      taxonToMod[taxon] = mod;
    });
  }

  const warnTypesEntityValidation = ["no Alliance curie", "obsolete entity", "not found at WB", "no WB curie", "no SGD curie", "no mod curie"];

  useEffect(() => {
    const fetchData = async () => {
      const taxonData = await getCurieToNameTaxon();
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
    "ATP:0000110": "transgenic allele",
    "ATP:0000093": "sequence targeting reagent"
  };
  const entityTypeList = [
    "",
    "ATP:0000005",
    "ATP:0000006",
    "ATP:0000110",
    "ATP:0000123",
    "ATP:0000014",
    "ATP:0000027",
    "ATP:0000025",
    "ATP:0000026",
    "ATP:0000013",
    "ATP:0000093"
  ];
  const speciesATP = "ATP:0000123";
  const renderView = (row) => {
    if (!row || !row.topicSelect) return "list";
    return row.topicSelect === speciesATP ? "autocomplete" : "list";
  };

  useEffect(() => {
    getDescendantATPIds("ATP:0000005").then((data) => setGeneDescendants(data));
    getDescendantATPIds("ATP:0000006").then((data) => setAlleleDescendants(data));
  }, [accessLevel, accessToken, dispatch]);

  useEffect(() => {
    const fetchTopicEntityTags = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_RESTAPI}/topic_entity_tag/${editTag}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        });
	console.log("TET response.data=", response.data)
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
    console.log("useEffect triggered: editTag =", editTag);
    console.log("topicEntityTags =", topicEntityTags);
    if (editTag !== null && topicEntityTags) {
      const editRow = topicEntityTags;
      console.log("Found editRow:", editRow);
      if (editRow) {
        setRows([{
          topicSelect: editRow.topic || "",
	  topicSelectValue: curieToNameMap[editRow.topic] || "",
          entityTypeSelect: editRow.entity_type || "",
          taxonSelect: editRow.species || "",
          noDataCheckbox: editRow.negated || false,
          newDataCheckbox: editRow.data_novelty === 'ATP:0000321' ? true : false,
          newToDbCheckbox: editRow.data_novelty === 'ATP:0000228' ? true : false,
          newToFieldCheckbox: editRow.data_novelty === 'ATP:0000229' ? true : false,
	  confidence_score: editRow.confidence_score || null,
          confidence_level: editRow.confidence_level || false,
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

  const addMessage = (text, variant) => {
    setMessages((prev) => [...prev, { text, variant }]);
  };

  const handleCloseMessage = (index) => {
    setMessages((prev) => prev.filter((_, idx) => idx !== index));
  };

  useEffect(() => {	// this whole section might not do anything, can't tell if topicSelect is used at all
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
      dispatch(changeFieldEntityAddGeneralField({ target: { id: "newDataCheckbox", value: false } }));
      dispatch(changeFieldEntityAddGeneralField({ target: { id: "newToDbCheckbox", value: false } }));
      dispatch(changeFieldEntityAddGeneralField({ target: { id: "newToFieldCheckbox", value: false } }));
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

  // unselect New checkboxes if the topic and entity type are the same, and there's a validated entity
  useEffect(() => {
    let updated = false;
    const newRows = rows.map((row) => {
      const hasBlockingEntity =
        row.topicSelectValue === curieToNameEntityType[row.entityTypeSelect] &&
        row.entityResultList?.some(
          entity =>
            !warnTypesEntityValidation.includes(entity.curie) &&
            entity.curie !== "duplicate"
        );
      if (hasBlockingEntity &&
          (row.newDataCheckbox || row.newToDbCheckbox || row.newToFieldCheckbox)) {
        updated = true;
        return {
          ...row,
          newDataCheckbox: false,
          newToDbCheckbox: false,
          newToFieldCheckbox: false
        };
      }
      return row;
    });
    if (updated) { setRows(newRows); }
  }, [rows]);

  const getMapKeyByValue = (mapObj, value) => {
    const objEntries = Object.entries(mapObj);
    const keyByValue = objEntries.filter((e) => e[1] === value);
    return keyByValue.map((e) => e[0])[0];
  };

  function initializeUpdateJson(refCurie, row, entityCurie, entityIdValidation, dataNoveltyAtp) {
    let json_data = {
	reference_curie: refCurie,
	topic: row.topicSelect || null,
	species: row.taxonSelect || null,
	note: row.noteText !== "" ? row.noteText : null,
	negated: row.noDataCheckbox || false,
	data_novelty: dataNoveltyAtp,
	confidence_score: null,
	confidence_level: null,
	topic_entity_tag_source_id: topicEntitySourceId || null
    }
    if (entityCurie) {
	json_data['entity_type'] = row.entityTypeSelect;
	json_data['entity'] = entityCurie;
        json_data['entity_id_validation'] = entityIdValidation;
    }
    return json_data;
  }


  const handleCloseTagExistingMessage = () => {
    setIsTagExistingMessageVisible(false);
  };

  function createNewRow() {	
    return {
      topicSelect: "",
      topicSelectValue: "",
      entityTypeSelect: "",
      taxonSelect: modToTaxon[accessLevel] && modToTaxon[accessLevel][0] ? modToTaxon[accessLevel][0] : "",
      entityText: "",
      noteText: "",
      entityResultList: [],
      newDataCheckbox: false,
      newToDbCheckbox: false,
      newToFieldCheckbox: false,
      noDataCheckbox: false
    };
  }

  const handleEntityValidation = useCallback(
     debounce((index, value) => {
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

  const [tetDataLoading, setTetDataLoading] = useState(false);

  const handleTetDataClick = async (action) => {
    setTetDataLoading(true);

    const atpMap = {
      inProgress: "ATP:0000276",
      complete: "ATP:0000275",
    };

    try {
      const response = await axios.post(
        `${process.env.REACT_APP_RESTAPI}/workflow_tag/transition_to_workflow_status`,
        {
          curie_or_reference_id: referenceJsonLive.curie,
          mod_abbreviation: accessLevel,
          new_workflow_tag_atp_id: atpMap[action],
          transition_type: "manual",
        },
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      console.log(`The manual indexing WFT has been successfully set to ${action}:`, response.data);
      addMessage(`The manual indexing WFT has been successfully set to ${action}.`, "success");
      dispatch(biblioQueryReferenceCurie(referenceJsonLive.curie));	// fetch referenceJsonLive from db after successful update
    } catch (error) {
      console.error(`Error setting WFT to ${action}:`, error);
      addMessage(`Failed to set WFT to ${action}.`, "danger");
    } finally {
      setTetDataLoading(false);
    }
  };

  const handleSpeciesSelection = (index, selectedSpecies) => {
    setRows((prevRows) => {
      const newRows = [...prevRows];
      newRows[index].selectedSpecies = selectedSpecies;
      newRows[index].isSpeciesSelected = selectedSpecies.length > 0;  // Ensure this is updated correctly
      return newRows;
    });
  };

  const handleRowChange = (index, field, value) => {
    setRows((prevRows) => {
      const newRows = [...prevRows];
      newRows[index] = { ...newRows[index], [field]: value };
      const currentRow = newRows[index];
	
      if (field === 'entityResultList') {
        // make sure entityResultList is always treated as an array
        currentRow.entityResultList = Array.isArray(value) ? value : [];
      } else {
        currentRow[field] = value;
      }
	
      if (field === 'topicSelect') {
	currentRow.topicSelect = value || "";

	if (!currentRow.isCloned) {
          if (entityTypeList.includes(value)) {
            currentRow.entityTypeSelect = value;
          } else {
            currentRow.entityTypeSelect = "";
          }
	  if (value === speciesATP) {
            currentRow.taxonSelect = ""; // clear the species column
            currentRow.selectedSpecies = []; // optionally clear any selected species in the typeahead
          }

	  if (value === "" || value === null) {
            currentRow.newDataCheckbox = false;
            currentRow.newToDbCheckbox = false;
            currentRow.newToFieldCheckbox = false;
            currentRow.noDataCheckbox = false;
            currentRow.entityText = ""; // clear the entity text
            currentRow.entityResultList = []; // clear the entity list
            currentRow.selectedSpecies = []; // clear any selected species in the typeahead
	  }
	}
      }

      // Calculate disabledAddButton for the current row
      const disabledAddButton =
        (currentRow.topicSelect === speciesATP && !currentRow.isSpeciesSelected) ||
        (currentRow.topicSelect !== speciesATP && (!currentRow.taxonSelect || currentRow.taxonSelect === "")) ||
        !topicEntitySourceId ||
        !currentRow.topicSelect;

      currentRow.disabledAddButton = disabledAddButton;
	
      if (field === 'entityText') {
        inputRefs.current[index] = value; // store the current input value
      }

      if (field === 'selectedSpecies') {
        newRows[index].selectedSpecies = value; // store selected species
      }
	
      // Validate the row when relevant fields change
      if (['entityText', 'taxonSelect', 'entityTypeSelect'].includes(field)) {
        handleEntityValidation(index, value);
      }
      newRows[index] = currentRow;
      return newRows;
    });
  };


  const handleSubmitAll = async () => {
    for (let index = 0; index < rows.length; index++) {
      await createEntities(referenceJsonLive.curie, index);
    }
    setRows([createNewRow()]);
  };

  const cloneRow = (index) => {
    setRows((prevRows) => {
      const newRows = [...prevRows];
      const clonedRow = { ...newRows[index], isCloned: true };
      newRows.splice(index + 1, 0, clonedRow);
      return newRows;
    });
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

  function getDataNoveltyAtpArray(row) {
    const dataNoveltyAtpArray = [];
    if (row.newDataCheckbox) { dataNoveltyAtpArray.push('ATP:0000321'); }
    else if ( row.newToDbCheckbox || row.newToFieldCheckbox ) {
      if (row.newToDbCheckbox) { dataNoveltyAtpArray.push('ATP:0000228'); }
      if (row.newToFieldCheckbox) { dataNoveltyAtpArray.push('ATP:0000229'); } }
    else if (	// has a valid entity and the topic is the same as the entity_type
      row.topicSelectValue === curieToNameEntityType[row.entityTypeSelect] &&
      row.entityResultList?.some(
        entity =>
          !warnTypesEntityValidation.includes(entity.curie) &&
          entity.curie !== "duplicate"
      ) ) { dataNoveltyAtpArray.push('ATP:0000334'); }
    else { dataNoveltyAtpArray.push('ATP:0000335'); }
    return dataNoveltyAtpArray;
  }

  async function createEntities(refCurie, index) {
    const row = rows[index]
    if (!row.topicSelect) {
      return;
    }
    const forApiArray = [];
    const subPath = "topic_entity_tag/";
    const method = "POST";

    const dataNoveltyAtpArray = getDataNoveltyAtpArray(row);
    for (const dataNoveltyAtp of dataNoveltyAtpArray.values()) {
      if (row.entityResultList && row.entityResultList.length > 0) {
        for (const entityResult of row.entityResultList.values()) {
          if (!warnTypesEntityValidation.includes(entityResult.curie)) {
            let entityIdValidation = "alliance";
            if (row.taxonSelect === "use_wb" && row.taxonSelectWB && row.entityTypeSelect) {
              entityIdValidation = "WB";
            }
            let entityCurie = entityResult.curie;
            if (row.topicSelect === speciesATP) {
                entityCurie = entityResult;
            } 
            const updateJson = initializeUpdateJson(refCurie, row, entityCurie, entityIdValidation, dataNoveltyAtp)

            if (entityIdValidation === "WB") {
              updateJson["entity_id_validation"] = "WB";
              updateJson["species"] = row.taxonSelectWB;
            }

            // console.log("updateJson = " + JSON.stringify(updateJson, null, 2));
            forApiArray.push([subPath, updateJson, method]);
          }
        }	
      } else if (row.taxonSelect !== "" && row.taxonSelect !== undefined) {
        //const updateJson = initializeUpdateJson(refCurie, row, null, "alliance");
        const updateJson = initializeUpdateJson(refCurie, row, null, null, dataNoveltyAtp);
        // console.log("updateJson = " + JSON.stringify(updateJson, null, 2));
        forApiArray.push([subPath, updateJson, method]);
    } }

    if (forApiArray.length === 0) {
      console.error("No valid data to submit.");
      return;
    }

    dispatch(setBiblioUpdatingEntityAdd(forApiArray.length));

    const result = await checkForExistingTags(forApiArray, accessToken,
					      accessLevel, dispatch,
					      updateButtonBiblioEntityAdd);
    if (result) {
      setTagExistingMessage(result.html);
      setIsTagExistingMessageVisible(true);
      setExistingTagResponses(result.existingTagResponses);
    }

    setTypeaheadOptions([]);

    // remove the row after submission
    setRows((prevRows) => {
      const newRows = prevRows.filter((_, i) => i !== index);
      // if no rows are left, add an empty row
      return newRows.length === 0 ? [createNewRow()] : newRows;
    });
  }

  async function patchEntities(refCurie, index) {
    const row = rows[index];
    if (row.topicSelect === null) {
      return;
    }
    const subPath = "topic_entity_tag/" + editTag;
    const method = "PATCH";
    const entityResultList = row.entityResultList || [];
    const dataNoveltyAtpArray = getDataNoveltyAtpArray(row);
    if (entityResultList.length > 1) {
      console.error("Error processing entry: too many entities");
      dispatch({
        type: "UPDATE_BUTTON_BIBLIO_ENTITY_ADD",
        payload: {
          responseMessage: "Only one entity allowed on edit. Please create additional tags with the add function.",
          accessLevel: accessLevel,
        },
      });
    } else if (dataNoveltyAtpArray.length > 1) {
      console.error("Error processing entry: too many Data Novelty ATP values");
      dispatch({
        type: "UPDATE_BUTTON_BIBLIO_ENTITY_ADD",
        payload: {
          responseMessage: "Only one data novelty value allowed on edit. Please create additional tags with the add function.",
          accessLevel: accessLevel,
        },
      });
    } else {
      let entityResult = entityResultList[0];
      let updateJson = initializeUpdateJson(refCurie, row, null, null, dataNoveltyAtpArray[0]);
      delete updateJson["topic_entity_tag_source_id"];	// initializeUpdateJson populates this but API will fail if sent with PATCH request
      delete updateJson["reference_curie"];		// initializeUpdateJson populates this but API will fail if sent with PATCH request
      updateJson["entity_id_validation"] = (row.entityTypeSelect) === "" ? null : "alliance";
      updateJson["entity_type"] = (row.entityTypeSelect) === "" ? null : row.entityTypeSelect;
      updateJson["species"] = (row.taxonSelect) === "" ? null : row.taxonSelect;
      if (row.taxonSelect === "use_wb" && row.taxonSelectWB !== "" && row.taxonSelectWB !== undefined && row.entityTypeSelect !== "") {
        updateJson["entity_id_validation"] = "WB";
        updateJson["species"] = row.taxonSelectWB;
      }
      if (entityResult) {
        updateJson["entity"] = entityResult.curie;
      }
      updateJson["updated_by"] = uid;
      let array = [accessToken, subPath, updateJson, method];
      dispatch(setBiblioUpdatingEntityAdd(1));
      await dispatch(updateButtonBiblioEntityAdd(array, accessLevel));

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

  // const disabledEntityList = taxonSelect === "" || taxonSelect === undefined;

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


      {/* Title and "No TET data" Button */}
      <Row className="form-group row mb-3" style={{ alignItems: "center" }}>
        <Col sm="12" style={{ display: "flex", alignItems: "center" }}>
          <h3 style={{ marginRight: "10px" }}>Entity and Topic Addition</h3>

          {["inProgress", "complete"].map((statusKey) => {
            const workflowTagId = statusKey === "inProgress" ? "ATP:0000276" : "ATP:0000275";
            const isTagged = referenceJsonLive?.workflow_tags?.some(
              (tag) => tag.mod_abbreviation === accessLevel && tag.workflow_tag_id === workflowTagId
            );

            const buttonText = statusKey === "inProgress"
              ? "In progress adding TET data"
              : "Done adding TET / No TET data";

            const disabledText = statusKey === "inProgress"
              ? "Is In Progress adding TET"
              : "Is Done adding TET";

            return (
              <Button
                key={statusKey}
                variant={isTagged ? "outline-secondary" : "outline-primary"}
                size="sm"
                disabled={isTagged || tetDataLoading}
                onClick={!isTagged ? () => handleTetDataClick(statusKey) : undefined}
                style={{ marginRight: statusKey === "inProgress" ? "10px" : undefined }}
              >
                {tetDataLoading && !isTagged ? (
                  <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                ) : (
                  isTagged ? disabledText : buttonText
                )}
              </Button>
            );
          })}
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
      {rows.map((row, index) => {
        const hasBlockingEntity =
          row.topicSelectValue === curieToNameEntityType[row.entityTypeSelect] &&
          row.entityResultList?.some(entity => !warnTypesEntityValidation.includes(entity.curie) && entity.curie !== "duplicate");
        return (
          <React.Fragment key={index}>
            <Row className="form-group row" style={{ marginBottom: '15px' }}>
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
                      let url =`${process.env.REACT_APP_RESTAPI}/topic_entity_tag/search_topic/${encodeURIComponent(query)}`;
                      if (accessLevel) {
                        url += "?mod_abbr=" + accessLevel
                      }
                      const results = await FetchTypeaheadOptions(url);
                      if (!Array.isArray(results)) {
                         throw new Error("Invalid response format");
                      }
          	    const nameToCurie = {};
          	    for (const item of results) {
          		nameToCurie[item.name] = item.curie;
          	    }

          	    dispatch(setTypeaheadName2CurieMap(nameToCurie));
          	    setTypeaheadOptions(Object.keys(nameToCurie));
                    } catch (error) {
                      console.error("Error during topic search:", error);
                      setTypeaheadOptions([]);
                    } finally {
                      setTopicSelectLoading(false);
          	  }
                  }}
                  onChange={(selected) => {
                    if (selected.length > 0) {
                      const selectedCurie = typeaheadName2CurieMap[selected[0]];
          	    const selectedValue = selected[0];
                      handleRowChange(index, 'topicSelect', selectedCurie);
          	    handleRowChange(index, "topicSelectValue", selectedValue);
                    } else {
          	    handleRowChange(index, 'topicSelect', "");
          	    handleRowChange(index, "topicSelectValue", "");
          	  }
                  }}
                  options={typeaheadOptions}
                  selected={row.topicSelectValue ? [row.topicSelectValue] : []}	
                />		
              </Col>
              <Col sm="1">
                <div style={{ textAlign: "left" }}>
                  <Form.Check
                    inline
                    type="checkbox"
                    id={`newDataCheckbox-${index}`}
                    checked={row.newDataCheckbox}
                    disabled={ row.newToDbCheckbox || row.newToFieldCheckbox || row.noDataCheckbox || hasBlockingEntity }
                    onChange={(evt) => {
                      const updatedRows = [...rows];
                      updatedRows[index] = { ...updatedRows[index], newDataCheckbox: evt.target.checked };
                      setRows(updatedRows);
                    }}
                  />
                  <span style={{ color: row.newToDbCheckbox || row.newToFieldCheckbox || row.noDataCheckbox || hasBlockingEntity ? 'gray' : 'inherit', }} >New Data</span>
                  <br />
                  <span style={{ display: 'inline-block', width: '1rem' }} />
                  <Form.Check
                    inline
                    type="checkbox"
                    id={`newToDbCheckbox-${index}`}
                    checked={row.newToDbCheckbox}
                    disabled={ row.newDataCheckbox || row.noDataCheckbox || hasBlockingEntity || (editTag && row.newToFieldCheckbox) }
                    onChange={(evt) => {
                      const updatedRows = [...rows];
                      updatedRows[index] = { ...updatedRows[index], newToDbCheckbox: evt.target.checked };
                      setRows(updatedRows);
                    }}
                  />
                  <span style={{ color: row.newDataCheckbox || row.noDataCheckbox || hasBlockingEntity || (editTag && row.newToFieldCheckbox) ? 'gray' : 'inherit', }} >New to DB</span>
                  <br />
                  <span style={{ display: 'inline-block', width: '1rem' }} />
                  <Form.Check
                    inline
                    type="checkbox"
                    id={`newToFieldCheckbox-${index}`}
                    checked={row.newToFieldCheckbox}
                    disabled={ row.newDataCheckbox || row.noDataCheckbox || hasBlockingEntity || (editTag && row.newToDbCheckbox) }
                    onChange={(evt) => {
                      const updatedRows = [...rows];
                      updatedRows[index] = { ...updatedRows[index], newToFieldCheckbox: evt.target.checked };
                      setRows(updatedRows);
                    }}
                  />
                  <span style={{ color: row.newDataCheckbox || row.noDataCheckbox || hasBlockingEntity || (editTag && row.newToDbCheckbox) ? 'gray' : 'inherit', }} >New to Field</span>
                  <br />
                  <Form.Check
                    inline
                    type="checkbox"
                    id={`noDataCheckbox-${index}`}
                    checked={row.noDataCheckbox}
                    disabled={ row.newToDbCheckbox || row.newToFieldCheckbox || row.newDataCheckbox }
                    onChange={(evt) => {
                      const updatedRows = [...rows];
                      updatedRows[index] = { ...updatedRows[index], noDataCheckbox: evt.target.checked };
                      setRows(updatedRows);
                    }}
                  />
                  <span style={{ color: row.newToDbCheckbox || row.newToFieldCheckbox || row.newDataCheckbox ? 'gray' : 'inherit', }} >No Data</span>
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
          	  id={`species-typeahead-${index}`}
                    multiple
                    isLoading={speciesSelectLoading}
                    placeholder="enter species name"
                    ref={speciesTypeaheadRef}
                    onSearch={async (query) => {
                      setSpeciesSelectLoading(true);
                      try {
                        const url = `${process.env.REACT_APP_RESTAPI}/topic_entity_tag/search_species/${encodeURIComponent(query)}`;
                        const results = await FetchTypeaheadOptions(url);

                        setSpeciesSelectLoading(false);
                        if (results) {
                          setTypeaheadOptions(results.map((item) => `${item.name} ${item.curie}`));
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
          		return match ? `${match[2]}` : null;
                        })
                        .filter((item) => item);

          	      handleSpeciesSelection(index, extractedStrings);
          	      handleRowChange(index, 'entityResultList', extractedStrings);
                        handleRowChange(index, 'selectedSpecies', selected.map(s => s));
                    }}
                    options={typeaheadOptions}
          	  selected={row.selectedSpecies || row.entityResultList.map(entity => `${entity.entityTypeSymbol} ${entity.curie}`)}
                  />
                ) : ( 	
                  <Form.Control
                    as="textarea"
                    id={`entitytextarea-${index}`}
                    value={row.entityText}
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
                        if (warnTypesEntityValidation.includes(entityResult.curie)) {
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
                  <Button variant="outline-primary" disabled={row.disabledAddButton} onClick={() => createEntities(referenceJsonLive.curie, index)}>
                    {biblioUpdatingEntityAdd > 0 ? <Spinner animation="border" size="sm" /> : "Submit"}
                  </Button>
                )}
              </Col>
            </Row>
            <Row className="mb-3" style={{ marginBottom: '20px' }}>
              <Col sm="6" className="d-flex align-items-center">
                <Button variant="outline-secondary"  onClick={() => cloneRow(index)} style={{ marginRight: '10px' }}>
                  Clone row
                </Button>
                {rows.length - 1 === index && (
                  <Button variant="outline-secondary"  onClick={() => setRows([...rows, createNewRow()])}>
                    New row
                  </Button>
                )}
              </Col>
              {rows.length - 1 === index && rows.length > 1 && (
                <Col sm="6" className="d-flex justify-content-end align-items-center">
                  <Button variant="outline-primary" onClick={handleSubmitAll}>
                    Submit All
                  </Button>
                </Col>
              )}
            </Row>
          </React.Fragment>
      )})}
    </Container>
  );
};

export default TopicEntityCreate;
