import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Spinner, Button, ButtonGroup, Dropdown, Form, Modal, Container, Row, Col } from 'react-bootstrap';
import axios from 'axios';
import { AgGridReact } from 'ag-grid-react';
import { FaGear } from "react-icons/fa6";

import {
  setCurieToNameTaxon,
  setAllSpecies,
  setAllEntities,
  setAllTopics,
  setAllEntityTypes
} from '../../../actions/biblioActions';

import { getCurieToNameTaxon } from './TaxonUtils';
import TopicEntityTagActions from '../../AgGrid/TopicEntityTagActions.jsx';
import ValidationByCurator from '../../AgGrid/ValidationByCurator.jsx';
import SpeciesFilter from '../../AgGrid/SpeciesFilter.jsx';
import EntityTypeFilter from '../../AgGrid/EntityTypeFilter.jsx';
import TopicFilter from '../../AgGrid/TopicFilter.jsx';
import EntityFilter from '../../AgGrid/EntityFilter.jsx';
import { timestampToDateFormatter } from '../BiblioWorkflow';

import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';

// ===== reusable utils for user preferences
import {
  applyGridState,
  applyGridStateFromPayload,
  columnStateFromColDefs
} from '../../../utils/gridState';
import { usePersonSettings } from '../../settings/usePersonSettings';
import SettingsDropdown from '../../settings/SettingsDropdown';

export const handleDownload = (option, gridRef, colDefs, topicEntityTags, fileNameFront) => {
    let dataToDownload = [];
    let headers = [];
    let fields = [];

    // get headers and fields from visible columns only
    colDefs
      .filter(col => option === 'allColumns' || !col.hide) // include hidden columns only for 'allColumns' option
      .forEach(col => {
        headers.push(col.headerName);
        fields.push(col.field);
      });

    // find the index of the Entity column so later we can add entity curie (in the "entity" field)
    const entityIndex = fields.indexOf("entity_name");

    // add entity CURIE field and header next to the Entity column
    // entity curie is in "entity" field, entity (name) is in "entity_name" field
    if (entityIndex !== -1) {
      headers.splice(entityIndex + 1, 0, "Entity CURIE"); // insert "Entity CURIE" after "Entity"
      fields.splice(entityIndex + 1, 0, "entity");        // insert "entity" field after "entity_name"
    }

    if ( (option === "allColumns") || (option === "multiHeader") ) {
      // download all columns, even hidden ones
      gridRef.current.api.forEachNode((node) => {
        dataToDownload.push(node.data);
      });
    } else if (option === "withoutFilters") {
      // download all data without applying filters
      const allData = topicEntityTags;
      dataToDownload = [...allData]; // copy all data from API
    } else {
      // default download with current filters and shown columns
      gridRef.current.api.forEachNodeAfterFilterAndSort((node) => {
        dataToDownload.push(node.data);
      });
    }

    if (option === "multiHeader") {
      headers = headers.flatMap(header =>
        header === "" ? "status" : [`${header}_num`, `${header}_perc`]
      );
      fields = fields.flatMap(field =>
        field === "status" ? [field] : [`${field}_num`, `${field}_perc`]
      );
    }

    // helper function to get nested values
    // if the field is "topic_name", it will return row.topic_name
    // if the field is "topic_entity_tag_source.secondary_data_provider_abbreviation",
    // it will return row.topic_entity_tag_source.secondary_data_provider_abbreviation
    const getNestedValue = (obj, field) => {
      return field.split('.').reduce((acc, key) => acc && acc[key] ? acc[key] : '', obj);
    };

    // convert headers and data to TSV format
    const tsvHeaders = headers.join('\t'); 
    const tsvRows = dataToDownload.map((row) =>
      fields.map((field) => `"${getNestedValue(row, field) || ''}"`).join('\t')
    );
    const tsvContent = `data:text/tab-separated-values;charset=utf-8,${tsvHeaders}\n${tsvRows.join('\n')}`;
    const encodedUri = encodeURI(tsvContent);

    const fileName = `${fileNameFront}_${option}.tsv`;

    // trigger file download
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};


export const DownloadMultiHeaderButton = ({option, gridRef, colDefs, rowData, fileNameFront, buttonLabel}) => {
  return(
    <Button
      variant="primary"
      size="sm"
      onClick={() => handleDownload('multiHeader', gridRef, colDefs, rowData, fileNameFront)}
    >{buttonLabel}</Button>
  );
};

export const DownloadAllColumnsButton = ({option, gridRef, colDefs, rowData, fileNameFront, buttonLabel}) => {
  return(
    <Button
      variant="primary"
      size="sm"
      onClick={() => handleDownload('allColumns', gridRef, colDefs, rowData, fileNameFront)}
    >{buttonLabel}</Button>
  );
};

export const DownloadDropdownOptionsButton = ({option, gridRef, colDefs, rowData, fileNameFront}) => {
  return(
    <Dropdown className="ms-auto">
      <Dropdown.Toggle variant="primary" id="dropdown-download-options">
        Download Options
      </Dropdown.Toggle>

      <Dropdown.Menu>
        <Dropdown.Item onClick={() => handleDownload('displayedData', gridRef, colDefs, rowData, fileNameFront)}>
          Download Displayed Data
        </Dropdown.Item>
        <Dropdown.Item onClick={() => handleDownload('allColumns', gridRef, colDefs, rowData, fileNameFront)}>
          Download All Columns
        </Dropdown.Item>
        <Dropdown.Item onClick={() => handleDownload('withoutFilters', gridRef, colDefs, rowData, fileNameFront)}>
          Download Without Filters
        </Dropdown.Item>
      </Dropdown.Menu>
    </Dropdown>
  );
};

/* -------------------------------------------
   Small UI helpers
--------------------------------------------*/
const CheckboxMenu = React.forwardRef(
  (
    {
      children,
      style,
      className,
      "aria-labelledby": labeledBy,
      onSelectAll,
      onSelectNone,
      onDefault
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        style={style}
        className={`${className} CheckboxMenu`}
        aria-labelledby={labeledBy}
      >
        <div
          className="d-flex flex-column"
          style={{ maxHeight: "calc(100vh)", overflow: "none" }}
        >
          <div className="dropdown-item border-top pt-2 pb-0">
            <ButtonGroup size="sm">
              <Button variant="link" onClick={onSelectAll}>
                Show All
              </Button>
              <Button variant="link" onClick={onSelectNone}>
                Hide All
              </Button>
              <Button variant="link" onClick={onDefault}>
                Restore Default
              </Button>
            </ButtonGroup>
          </div>
          <ul
            className="list-unstyled flex-shrink mb-0"
            style={{ overflow: "auto" }}
          >
            {children}
          </ul>

        </div>
      </div>
    );
  }
);

const CheckDropdownItem = React.forwardRef(
  ({ children, id, checked, onChange }, ref) => {
    return (
      <Form.Group ref={ref} className="dropdown-item mb-0" controlId={id}>
        <Form.Check
          type="checkbox"
          label={children}
          checked={checked}
          onChange={onChange && onChange.bind(onChange, id)}
        />
      </Form.Group>
    );
  }
);

const GenericTetTableModal = ({ title, body, show, onHide }) => {
  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>{body}</Modal.Body>
    </Modal>
  );
};

// Notification (inline, above the table)
const Notification = ({ show, message, variant, onClose }) => {
  if (!show) return null;

  const alertClass = {
    success: 'alert-success',
    error: 'alert-danger',
    warning: 'alert-warning',
    info: 'alert-info'
  }[variant] || 'alert-info';

  return (
    <div className={`alert ${alertClass} alert-dismissible fade show mb-3`} role="alert">
      <div className="d-flex justify-content-between align-items-start">
        <div>{message}</div>
        <button
          type="button"
          className="btn btn-link p-0 ms-3 text-decoration-underline"
          onClick={onClose}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
};

// Custom SettingsGearModal with inline rename
const CustomSettingsGearModal = ({
  show,
  onHide,
  settings,
  nameEdits,
  setNameEdits,
  onCreate,
  onRename,
  onDelete,
  onMakeDefault,
  canCreateMore,
  busy
}) => {
  const [newSettingName, setNewSettingName] = useState('');
  // to track which row (setting) is currently performing an async action -
  // like renaming, deleting, or setting as default
  const [rowBusyId, setRowBusyId] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleCreate = async () => {
    setErrorMsg('');
    if (!newSettingName.trim()) return;
    try {
      await onCreate(newSettingName.trim());
      setNewSettingName('');
    } catch (error) {
      console.error('Failed to create setting:', error);
      setErrorMsg(error?.message || 'Failed to create setting.');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') handleCreate();
  };

  const handleMakeDefaultClick = async (setting) => {
    setErrorMsg('');
    setRowBusyId(setting.person_setting_id);
    try {
      await onMakeDefault(setting.person_setting_id);
      onHide?.();
    } catch (error) {
      console.error('Failed to set default:', error);
      setErrorMsg(error?.message || 'Failed to set default.');
    } finally {
      setRowBusyId(null);
    }
  };

  // Handle inline rename
  const handleRenameStart = (setting) => {
    setNameEdits(prev => ({
      ...prev,
      [setting.person_setting_id]: setting.setting_name || setting.name
    }));
  };

  const handleRenameCancel = (settingId) => {
    setNameEdits(prev => {
      const newEdits = { ...prev };
      delete newEdits[settingId];
      return newEdits;
    });
  };

  const handleRenameSave = async (setting) => {
    const newName = nameEdits[setting.person_setting_id]?.trim();
    if (!newName) {
      setErrorMsg("Setting name cannot be empty.");
      return;
    }
    if (newName === (setting.setting_name || setting.name)) {
      handleRenameCancel(setting.person_setting_id);
      return;
    }

    setRowBusyId(setting.person_setting_id);
    try {
      await onRename(setting.person_setting_id, newName);
      handleRenameCancel(setting.person_setting_id);
    } catch (error) {
      setErrorMsg(error?.message || 'Failed to rename setting.');
    } finally {
      setRowBusyId(null);
    }
  };

  const handleRenameKeyPress = (e, setting) => {
    if (e.key === 'Enter') {
      handleRenameSave(setting);
    } else if (e.key === 'Escape') {
      handleRenameCancel(setting.person_setting_id);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Manage Table Preferences</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {/* Error banner */}
        {errorMsg && (
          <div className="alert alert-danger mb-3" role="alert">
            {errorMsg}
          </div>
        )}

        {/* Create new setting section */}
        <div className="mb-4">
          <Form.Group>
            <Form.Label>Create New Setting</Form.Label>
            <div className="d-flex gap-2">
              <Form.Control
                type="text"
                placeholder="Enter setting name"
                value={newSettingName}
                onChange={(e) => setNewSettingName(e.target.value)}
                onKeyDown={handleKeyPress}
                disabled={busy || !canCreateMore}
              />
              <Button
                variant="primary"
                onClick={handleCreate}
                disabled={!newSettingName.trim() || busy || !canCreateMore}
              >
                Create
              </Button>
            </div>
            {!canCreateMore && (
              <Form.Text className="text-warning">
                Maximum of 10 settings reached. Delete some settings to create new ones.
              </Form.Text>
            )}
          </Form.Group>
        </div>

        {/* Existing settings list */}
        <div>
          <h6>Existing Settings</h6>
          {settings.length === 0 ? (
            <p className="text-muted">No settings saved yet.</p>
          ) : (
            <div className="list-group">
              {settings.map((setting) => {
                const isEditing = Object.prototype.hasOwnProperty.call(nameEdits, setting.person_setting_id);
                const isBusy = rowBusyId === setting.person_setting_id;
                
                return (
                  <div
                    key={setting.person_setting_id}
                    className="list-group-item d-flex justify-content-between align-items-center"
                  >
                    <div className="d-flex align-items-center flex-grow-1 me-3">
                      <span className="me-2">{setting.default_setting && '★'}</span>
                      
                      {isEditing ? (
                        <div className="d-flex align-items-center flex-grow-1">
                          <Form.Control
                            type="text"
                            size="sm"
                            value={nameEdits[setting.person_setting_id] || ''}
                            onChange={(e) => setNameEdits(prev => ({
                              ...prev,
                              [setting.person_setting_id]: e.target.value
                            }))}
                            onKeyDown={(e) => handleRenameKeyPress(e, setting)}
                            disabled={isBusy}
                            autoFocus
                            className="me-2"
                          />
                          <Button
                            variant="success"
                            size="sm"
                            onClick={() => handleRenameSave(setting)}
                            disabled={isBusy}
                            className="me-1"
                          >
                            ✓
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleRenameCancel(setting.person_setting_id)}
                            disabled={isBusy}
                          >
                            ✗
                          </Button>
                        </div>
                      ) : (
                        <span className="me-3 flex-grow-1">
                          {setting.setting_name || setting.name}
                        </span>
                      )}
                    </div>
                    
                    <div className="d-flex gap-2">
                      {!setting.default_setting && (
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => handleMakeDefaultClick(setting)}
                          disabled={busy || isBusy}
                          title="Set as default"
                        >
                          {isBusy ? 'Setting…' : 'Set Default'}
                        </Button>
                      )}
                      
                      {!isEditing && (
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          onClick={() => handleRenameStart(setting)}
                          disabled={busy || isBusy}
                          title="Rename setting"
                        >
                          Rename
                        </Button>
                      )}
                      
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => onDelete(setting.person_setting_id)}
                        disabled={busy || isBusy}
                        title="Delete setting"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Modal.Body>
    </Modal>
  );
};


/* -------------------------------------------
   Main component
--------------------------------------------*/
const TopicEntityTable = () => {
  const dispatch = useDispatch();
  const accessToken = useSelector(state => state.isLogged.accessToken);
  const oktaMod = useSelector(state => state.isLogged.oktaMod);
  const testerMod = useSelector((state) => state.isLogged.testerMod);
  const uid = useSelector(state => state.isLogged.uid);  
  const accessLevel = testerMod !== "No" ? testerMod : oktaMod;
  const [topicEntityTags, setTopicEntityTags] = useState([]);
  const biblioUpdatingEntityAdd = useSelector(state => state.biblio.biblioUpdatingEntityAdd);
  const filteredTags = useSelector(state => state.biblio.filteredTags);
  const referenceCurie = useSelector(state => state.biblio.referenceCurie);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [selectedCurie, setSelectedCurie] = useState(null);
  const [showCurieModal, setShowCurieModal] = useState(false);
  const [fullNote, setFullNote] = useState('');
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [fullSourceDesc, setFullSourceDesc] = useState('');
  const [showSourceDescModal, setShowSourceDescModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [nameEdits, setNameEdits] = useState({});
  const [isGridReady, setIsGridReady] = useState(false);
  const gridRef = useRef();
  
  // Notification state
  const [notification, setNotification] = useState({ show: false, message: '', variant: 'success' });

  // Define component name for settings - specific to this component
  const componentName = "tet_table";
    
  // Settings via shared hook
  const {
    settings, selectedSettingId, setSelectedSettingId, busy, maxCount,
    load, seed, create, rename, remove, makeDefault, savePayloadTo
  } = usePersonSettings({
    baseUrl: process.env.REACT_APP_RESTAPI,
    token: accessToken,
    oktaId: uid,
    componentName,
    maxCount: 10  // Maximum 10 stored preferences
  });

  // Notification helpers
  const showNotification = (message, variant = 'success') => {
    setNotification({ show: true, message, variant });
  };
  const hideNotification = () => setNotification({ show: false, message: '', variant: 'success' });

  useEffect(() => {
    if (notification.show) {
      const timer = setTimeout(() => hideNotification(), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification.show]);

  // Load settings on mount
  useEffect(() => {
    if (accessToken && uid) {
      load();
    }
  }, [accessToken, uid, load]);

  useEffect(() => {
    const fetchData = async () => {
      const taxonData = await getCurieToNameTaxon();
      dispatch(setCurieToNameTaxon(taxonData));
    };
    fetchData();
  }, [accessToken, dispatch]);

  const fetchTableData = useCallback(async () => {
    let url = process.env.REACT_APP_RESTAPI + '/topic_entity_tag/by_reference/' + referenceCurie + "?page=" + 1 + "&page_size=" + 8000;
    setIsLoadingData(true);
    try {
      const resultTags = await axios.get(url);
      resultTags.data.forEach(arrElement => {
        if ('validation_by_author' in arrElement) {
          if (arrElement['validation_by_author'] === 'validated_right_self') { arrElement['validation_by_author'] = ''; }
          else if (arrElement['validation_by_author'] === 'validated_right') { arrElement['validation_by_author'] = 'agree'; }
          else if (arrElement['validation_by_author'] === 'validated_wrong') { arrElement['validation_by_author'] = 'disagree'; }
          else if (arrElement['validation_by_author'] === 'not_validated')   { arrElement['validation_by_author'] = 'no entry'; }
        }
        if ('validation_by_professional_biocurator' in arrElement) {
          if (arrElement['validation_by_professional_biocurator'] === 'validated_right_self') {
            arrElement['validation_by_professional_biocurator'] = '';
          }
        }
      });
      setTopicEntityTags(resultTags.data);
      const uniqueSpecies = [...new Set(resultTags.data.map(obj => obj.species))];
      const uniqueEntityTypes = [...new Set(resultTags.data.map(obj => obj.entity_type_name))];
      const uniqueTopics = [...new Set(resultTags.data.map(obj => obj.topic_name))];
      const uniqueEntities = [...new Set(resultTags.data.map(obj => obj.entity_name))];

      dispatch(setAllSpecies(uniqueSpecies));
      dispatch(setAllEntityTypes(uniqueEntityTypes));
      dispatch(setAllTopics(uniqueTopics));
      dispatch(setAllEntities(uniqueEntities));
    } catch (error) {
      console.error("Error fetching data:" + error);
    } finally {
      setIsLoadingData(false);
    }
  }, [accessToken, referenceCurie, dispatch]);

  useEffect(() => {
    fetchTableData();
  }, [biblioUpdatingEntityAdd, fetchTableData]);

  const handleSourceDescClick = (fullSourceDesc) => {
    setFullSourceDesc(fullSourceDesc);
    setShowSourceDescModal(true);
  };

  const handleNoteClick = (fullNote) => {
    setFullNote(fullNote);
    setShowNoteModal(true);
  };

  const handleCurieClick = (curie) => {
    if (curie !== "null:null") {
      setSelectedCurie(curie);
      setShowCurieModal(true);
    }
  };

  // initial items (SGD vs others)
  let itemsInit = [
    { headerName: "Topic", field: "topic_name", id: 1, checked: true },
    { headerName: "Entity Type", field: "entity_type_name", id: 2, checked: true },
    { headerName: "Species", field: "species_name", id: 3, checked: true},
    { headerName: "Entity", field: "entity_name", id: 4, checked: true},
    { headerName: "Entity Published As", field: "entity_published_as", id: 5, checked: false },
    { headerName: "No Data", field: "negated", id: 6, checked: true },
    { headerName: "Data Novelty", field: "data_novelty", id: 7, checked: false },
    { headerName: "Confidence Score", field:"confidence_score", id: 8, checked: false },	
    { headerName: "Confidence Level", field:"confidence_level", id: 9, checked: false },
    { headerName: "Created By", field: "created_by", id: 10, checked: true},
    { headerName: "Note", field: "note", id: 11, checked: true},
    { headerName: "Entity ID Validation", field: "entity_id_validation", id: 12 , checked: false},
    { headerName: "Date Created", field: "date_created", id: 13, checked: true},
    { headerName: "Updated By", field: "updated_by", id: 14, checked: false },
    { headerName: "Date Updated", field: "date_updated", id: 15, checked: true},
    { headerName: "Author Response", field: "validation_by_author", id: 16, checked: false },
    { headerName: "Validation By Professional Biocurator", field: "validation_by_professional_biocurator", id: 17, checked: false },
    { headerName: "Display Tag", field: "display_tag_name", id: 18, checked: false},
    { headerName: "Source Secondary Data Provider", field: "topic_entity_tag_source.secondary_data_provider_abbreviation", id: 19, checked: true },
    { headerName: "Source Data Provider", field: "topic_entity_tag_source.data_provider", id: 20, checked: false },
    { headerName: "Source Evidence Assertion", field: "topic_entity_tag_source.source_evidence_assertion_name" , id: 21, checked: false},
    { headerName: "Source Method", field: "topic_entity_tag_source.source_method", id: 22, checked: false },
    { headerName: "Source Validation Type", field: "topic_entity_tag_source.validation_type", id: 23, checked: false },
    { headerName: "Source Description", field: "topic_entity_tag_source.description" , id: 24, checked: false},
    { headerName: "Source Created By", field: "topic_entity_tag_source.created_by", id: 25, checked: false },
    { headerName: "Source Date Updated", field: "topic_entity_tag_source.date_updated" , id: 26, checked: false },
    { headerName: "Source Date Created", field: "topic_entity_tag_source.date_created", id: 27, checked: false },
    { headerName: "Model ID", field: "ml_model_id", id: 28, checked: false },
    { headerName: "Model Version", field: "ml_model_version", id: 29, checked: false },
    { headerName: "Topic Entity Tag Id", field: "topic_entity_tag_id" , id: 30, checked: false },
    { headerName: "Topic Entity Tag Source Id", field: "topic_entity_tag_source.topic_entity_tag_source_id" , id: 31, checked: false }
  ];

  let itemsInitSGD = [
    { headerName: "Topic", field: "topic_name", id: 1, checked: true },
    { headerName: "Entity Type", field: "entity_type_name", id: 2, checked: true },
    { headerName: "Species", field: "species_name", id: 3, checked: true},
    { headerName: "Entity", field: "entity_name", id: 4, checked: true},
    { headerName: "Entity Published As", field: "entity_published_as", id: 5, checked: false },
    { headerName: "No Data", field: "negated", id: 6, checked: false },
    { headerName: "Data Novelty", field: "data_novelty", id: 7, checked: false },
    { headerName: "Confidence Score", field:"confidence_score", id: 8, checked: false },
    { headerName: "Confidence Level", field:"confidence_level", id: 9, checked: false },
    { headerName: "Created By", field: "created_by", id: 10, checked: true},
    { headerName: "Note", field: "note", id: 11, checked: true},
    { headerName: "Entity ID Validation", field: "entity_id_validation", id: 12 , checked: false},
    { headerName: "Date Created", field: "date_created", id: 13, checked: true},
    { headerName: "Updated By", field: "updated_by", id: 14, checked: false },
    { headerName: "Date Updated", field: "date_updated" , id: 15, checked: true},
    { headerName: "Author Response", field: "validation_by_author", id: 16, checked: false },
    { headerName: "Validation By Professional Biocurator", field: "validation_by_professional_biocurator", id: 17, checked: false },
    { headerName: "Display Tag", field: "display_tag_name", id: 18, checked: true},
    { headerName: "Source Secondary Data Provider", field: "topic_entity_tag_source.secondary_data_provider_abbreviation", id: 19, checked: false },
    { headerName: "Source Data Provider", field: "topic_entity_tag_source.data_provider", id: 20, checked: false },
    { headerName: "Source Evidence Assertion", field: "topic_entity_tag_source.source_evidence_assertion_name" , id: 21, checked: false},
    { headerName: "Source Method", field: "topic_entity_tag_source.source_method", id: 22, checked: false },
    { headerName: "Source Validation Type", field: "topic_entity_tag_source.validation_type", id: 23, checked: false },
    { headerName: "Source Description", field: "topic_entity_tag_source.description" , id: 24, checked: false},
    { headerName: "Source Created By", field: "topic_entity_tag_source.created_by", id: 25, checked: false },
    { headerName: "Source Date Updated", field: "topic_entity_tag_source.date_updated" , id: 26, checked: false },
    { headerName: "Source Date Created", field: "topic_entity_tag_source.date_created" , id: 27, checked: false },
    { headerName: "Model ID", field: "ml_model_id", id: 28, checked: false },
    { headerName: "Model Version", field: "ml_model_version", id: 29, checked: false },
    { headerName: "Topic Entity Tag Id", field: "topic_entity_tag_id" , id: 30, checked: false },
    { headerName: "Topic Entity Tag Source Id", field: "topic_entity_tag_source.topic_entity_tag_source_id" , id: 31, checked: false }
  ];

  // initial items by access level
  const getInitialItems = useCallback(() => {
    return accessLevel === "SGD" ? [...itemsInitSGD] : [...itemsInit];
  }, [accessLevel]);

  const [items, setItems] = useState(getInitialItems());

  // grid state extraction
  // extractCurrentGridState gathers the current visual configuration of the AG Grid table - that is:
  // * which columns are visible or hidden,
  // * what filters are applied, and
  // * how the table is sorted.
  // Then it packages that info into a JSON object that can be stored in person_setting.json_settings
  const extractCurrentGridState = useCallback(async () => {
    if (!gridRef.current || !gridRef.current.columnApi) {
      console.error('Grid or column API not available');
      return null;
    }
    // These lines force AG Grid to update internal states before capturing them
    gridRef.current.api.refreshHeader();
    gridRef.current.api.refreshCells({ force: true });
    gridRef.current.api.onFilterChanged();
    // The 150 ms delay to make sure the grid’s async rendering (column widths, filters, etc.)
    // settles before reading.  
    await new Promise(r => setTimeout(r, 150));

    // This retrieves an array of column states - one per column
    // Each state object includes things like:
    // {
    //   colId: "entity_name",
    //   width: 150,
    //   hide: false,
    //   sort: "asc",
    //   sortIndex: 0
    // }
    const columnState = gridRef.current.columnApi.getColumnState();
    // This syncs the AG Grid’s column visibility with our React state items
    const syncedColumnState = columnState.map(colState => {
      const item = items.find(i => i.field === colState.colId);
      return item ? { ...colState, hide: !item.checked } : colState;
    });

    return {
      columnState: syncedColumnState,
      filterModel: gridRef.current.api.getFilterModel(),
      sortModel: gridRef.current.api.getSortModel()
    };
  }, [items]);
    
  // Checkbox dropdown
  const CheckboxDropdown =  ({ items }) => {
    const handleChecked = (key, event) => {
      const newItems = [...items];
      let item = newItems.find(i => i.id === key);
      item.checked = event.target.checked;

      gridRef.current.api.applyColumnState({
        state: [{ colId: item.field, hide: !item.checked }],
      });

      setItems(newItems);
      setTimeout(() => gridRef.current.api.refreshHeader(), 10);
    };

    const handleSelectAll = () => {
      const newItems = [...items];
      newItems.forEach(i => {
        i.checked = true;
        gridRef.current.api.applyColumnState({ state: [{ colId: i.field, hide: false }] });
      });
      setItems(newItems);
      setTimeout(() => gridRef.current.api.refreshHeader(), 10);
    };

    const handleSelectNone = () => {
      const newItems = [...items];
      newItems.forEach(i => {
        i.checked = false;
        gridRef.current.api.applyColumnState({ state: [{ colId: i.field, hide: true }] });
      });
      setItems(newItems);
      setTimeout(() => gridRef.current.api.refreshHeader(), 10);
    };

    const handleSelectDefault = () => {
      const defaultItems = getInitialItems();
      setItems(defaultItems);
      defaultItems.forEach(i => {
        gridRef.current.api.applyColumnState({ state: [{ colId: i.field, hide: !i.checked }] });
      });
      setTimeout(() => gridRef.current.api.refreshHeader(), 10);
    };

    return (
      <Dropdown>
        <Dropdown.Toggle variant="primary" id="dropdown-basic">
          Hide/Show Columns
        </Dropdown.Toggle>
        <Dropdown.Menu
          as={CheckboxMenu}
          onSelectAll={handleSelectAll}
          onSelectNone={handleSelectNone}
          onDefault={handleSelectDefault}
          renderOnMount={false}
        >
          {items.map(i => (
            <Dropdown.Item
              key={i.field}
              as={CheckDropdownItem}
              id={i.id}
              checked={i.checked}
              onChange={handleChecked}
            >
              {i.headerName}
            </Dropdown.Item>
          ))}
        </Dropdown.Menu>
      </Dropdown>
    );
  };

  const caseInsensitiveComparator = (valueA, valueB) => {
    if (valueA === null && valueB === null) {
      return 0;
    }
    if (valueA === null) {
      return -1;
    }
    if (valueB === null) {
      return 1;
    }
    return valueA.toLowerCase().localeCompare(valueB.toLowerCase());
  };

  const dataNoveltyMap = {
    "ATP:0000321": "new data",
    "ATP:0000228": "new to database",
    "ATP:0000229": "new to field",
    "ATP:0000335": " ",
    "ATP:0000334": "existing data"
  };

  let cols=[
    { field: "Actions" , lockPosition: 'left' , sortable: false, cellRenderer: TopicEntityTagActions},
    { headerName: "Topic", field: "topic_name", comparator: caseInsensitiveComparator, filter: TopicFilter, onCellClicked: (p) => {handleCurieClick(p.value+":"+p.data.topic)}},
    { headerName: "Entity Type", field: "entity_type_name", comparator: caseInsensitiveComparator, filter: EntityTypeFilter, onCellClicked: (p) => {handleCurieClick(p.value+":"+p.data.entity_type)} },
    { headerName: "Species", field: "species_name", comparator: caseInsensitiveComparator, filter: SpeciesFilter, onCellClicked: (p) => {handleCurieClick(p.value+":"+p.data.species)}},
    { headerName: "Entity", field: "entity_name", comparator: caseInsensitiveComparator, filter: EntityFilter, onCellClicked: (p) => {handleCurieClick(p.value+":"+p.data.entity)}},
    { headerName: "Entity Published As", field: "entity_published_as", comparator: caseInsensitiveComparator },
    { headerName: "No Data", field: "negated", cellDataType: "text", valueGetter: (p) => p.data.negated === true ? 'no data': '' },
    { headerName: "Data Novelty", field: "data_novelty", valueGetter: (p) => dataNoveltyMap[p.data.data_novelty] || p.data.data_novelty },
    { headerName: "Confidence Score", field:"confidence_score" },
    { headerName: "Confidence Level", field:"confidence_level" },
    { headerName: "Created By", field: "created_by"},
    { headerName: "Note", field: "note", comparator: caseInsensitiveComparator, onCellClicked: (p) => {handleNoteClick(p.value)}},
    { headerName: "Entity ID Validation", field: "entity_id_validation" },
    { headerName: "Date Created", field: "date_created", valueFormatter: timestampToDateFormatter },
    { headerName: "Updated By", field: "updated_by" },
    { headerName: "Date Updated", field: "date_updated" , valueFormatter: timestampToDateFormatter },
    { headerName: "Author Response", field: "validation_by_author" },
    { headerName: "Validation By Professional Biocurator", field: "validation_by_professional_biocurator", cellRenderer: ValidationByCurator},
    { headerName: "Display Tag", field: "display_tag_name", comparator: caseInsensitiveComparator },
    { headerName: "Source Secondary Data Provider", field: "topic_entity_tag_source.secondary_data_provider_abbreviation" },
    { headerName: "Source Data Provider", field: "topic_entity_tag_source.data_provider" },
    { headerName: "Source Evidence Assertion", field: "topic_entity_tag_source.source_evidence_assertion_name", comparator: caseInsensitiveComparator, onCellClicked: (p) => {handleCurieClick(p.value+":"+p.data.topic_entity_tag_source.source_evidence_assertion)}},
    { headerName: "Source Method", field: "topic_entity_tag_source.source_method" },
    { headerName: "Source Validation Type", field: "topic_entity_tag_source.validation_type" },
    { headerName: "Source Description", field: "topic_entity_tag_source.description", onCellClicked: (p) => {handleSourceDescClick(p.value)} },
    { headerName: "Source Created By", field: "topic_entity_tag_source.created_by" },
    { headerName: "Source Date Updated", field: "topic_entity_tag_source.date_updated" , valueFormatter: timestampToDateFormatter },
    { headerName: "Source Date Created", field: "topic_entity_tag_source.date_created" , valueFormatter: timestampToDateFormatter },
    { headerName: "Model ID", field: "ml_model_id" },
    { headerName: "Model Version", field: "ml_model_version" },
    { headerName: "Topic Entity Tag Id", field: "topic_entity_tag_id" },
    { headerName: "Topic Entity Tag Source Id", field: "topic_entity_tag_source.topic_entity_tag_source_id" }
  ];

  const gridOptions = {
    autoSizeStrategy: {
      type: 'fitCellContents',
      skipHeader: false
    }
  };

  // sync visible columns with items
  const updateColDefsWithItems = useCallback((currentItems) => {
    const updatedCols = cols.map(col => {
      const item = currentItems.find(i => i.field === col.field);
      return item ? { ...col, hide: !item.checked } : col;
    });
    return updatedCols;
  }, [cols]);

  const [colDefs, setColDefs] = useState(() => updateColDefsWithItems(getInitialItems()));

  const paginationPageSizeSelector = useMemo(() => [10, 25, 50, 100, 500], []);

  // Build a state even if the grid isn't ready yet
  const getSafeCurrentState = useCallback(async () => {
    if (isGridReady && gridRef.current?.api && gridRef.current?.columnApi) {
      return await extractCurrentGridState();
    }
    // Fallback: derive columnState from current colDefs / items
    const columnState = columnStateFromColDefs(updateColDefsWithItems(items));
    return {
      columnState,
      filterModel: {},
      sortModel: []
    };
  }, [isGridReady, extractCurrentGridState, items, updateColDefsWithItems]);

  function isExternalFilterPresent() {
    return filteredTags;
  }

  function doesExternalFilterPass(node) {
    if (node.data && filteredTags){
      return (filteredTags.validating_tags.includes(node.data.topic_entity_tag_id) || filteredTags.validated_tag === node.data.topic_entity_tag_id);
    } else {
      return false;
    }
  }

  const buildSeedPresetName = useCallback(() => {
    return accessLevel === "SGD" ? "SGD Default" : "MOD Default";
  }, [accessLevel]);

  // Apply settings to grid and update UI state
  const applySettingsToGrid = useCallback(async (payload, settingId = null) => {
    if (!gridRef.current) return;

    try {
      applyGridStateFromPayload(gridRef, payload);
      await new Promise(r => setTimeout(r, 100));
      gridRef.current.api.onFilterChanged();
      gridRef.current.api.refreshClientSideRowModel("filter");
      gridRef.current.api.refreshCells({ force: true });

      const columnState = payload.columnState || [];
      const updatedItems = getInitialItems().map(item => {
        const colState = columnState.find(col => col.colId === item.field);
        return { ...item, checked: colState ? !colState.hide : item.checked };
      });

      setItems(updatedItems);
      setColDefs(updateColDefsWithItems(updatedItems));

      if (settingId) setSelectedSettingId(settingId);
    } catch (error) {
      console.error("Error applying settings:", error);
      const fallbackItems = getInitialItems();
      setItems(fallbackItems);
      setColDefs(updateColDefsWithItems(fallbackItems));
    }
  }, [getInitialItems, updateColDefsWithItems, setSelectedSettingId]);

  const onGridReady = useCallback(async () => {
    try {
      setIsGridReady(true);
      const { existing, picked } = await load();

      if (existing && existing.length > 0) {
        const settingToApply = picked || existing.find(s => s.default_setting) || existing[0];
        if (settingToApply) {
          const payload = settingToApply.json_settings || settingToApply.payload || {};
          await applySettingsToGrid(payload, settingToApply.person_setting_id);
          return;
        }
      }

      const modTemplateItems = getInitialItems();
      const seedState = {
        columnState: columnStateFromColDefs(updateColDefsWithItems(modTemplateItems)),
        filterModel: {},
        sortModel: []
      };

      setItems(modTemplateItems);
      setColDefs(updateColDefsWithItems(modTemplateItems));
      applyGridState(gridRef, seedState);

      const created = await seed({
        name: buildSeedPresetName(),
        payload: { ...seedState, meta: { accessLevel } },
        isDefault: true
      });
      if (created) setSelectedSettingId(created.person_setting_id);

    } catch (error) {
      console.error("Failed to load person settings:", error);
      const fallbackItems = getInitialItems();
      setItems(fallbackItems);
      setColDefs(updateColDefsWithItems(fallbackItems));
      applyGridState(gridRef, {
        columnState: columnStateFromColDefs(updateColDefsWithItems(fallbackItems)),
        filterModel: {},
        sortModel: []
      });
    }
  }, [load, seed, applySettingsToGrid, getInitialItems, updateColDefsWithItems, buildSeedPresetName, accessLevel, setSelectedSettingId]);

  const onColumnResized = useCallback((params)=>{
    let colState = gridRef.current.api.getColumnState();
    if(params.source === 'autosizeColumns') {
      colState.forEach((element) => {
        if (element.colId === 'note' && element.width > 300){
          gridRef.current.api.applyColumnState({
            state: [{ colId: 'note', width: 300 }],
          });
        }
      });
    }
  },[]);

  const getRowId = useMemo(() => (params) => String(params.data.topic_entity_tag_id), []);

  const fileNameFront = `${referenceCurie}_tet_data`;

  // Pick setting from dropdown
  const handlePickSetting = async (person_setting_id) => {
    const s = settings.find(x => x.person_setting_id === person_setting_id);
    if (!s) return;
    const payload = s.json_settings || s.payload || {};
    await applySettingsToGrid(payload, person_setting_id);
  };

  // Create new setting (uses current grid state)
  const handleCreateSetting = async (name) => {
    const clean = (name ?? '').trim();
    if (!clean) {
      showNotification("Setting name cannot be empty.", "warning");
      return null;
    }
    const exists = (settings || []).some(
      s => (s.setting_name || s.name || '').trim().toLowerCase() === clean.toLowerCase()
    );
    if (exists) {
      showNotification(`A setting named "${clean}" already exists.`, "warning");
      return null;
    }
    const state = await getSafeCurrentState();
    try {
      const created = await create(clean, { ...state, meta: { accessLevel } });
      await load();
      if (created?.person_setting_id) setSelectedSettingId(created.person_setting_id);
      showNotification(`Setting "${clean}" created successfully!`, "success");
      return created;
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.message || String(err);
      showNotification(`Failed to create setting: ${msg}`, "error");
      return null;
    }
  };

  // Rename (from modal)
  const handleRename = async (person_setting_id, newName) => {
    const clean = (newName ?? '').trim();
    if (!clean) {
      showNotification("Setting name cannot be empty.", "warning");
      return false;
    }
    const exists = (settings || []).some(
      s =>
        s.person_setting_id !== person_setting_id &&
        (s.setting_name || s.name || '').trim().toLowerCase() === clean.toLowerCase()
    );
    if (exists) {
      showNotification(`A setting named "${clean}" already exists.`, "warning");
      return false;
    }
    try {
      await rename(person_setting_id, clean);
      await load();
      showNotification(`Renamed to "${clean}".`, "success");
      return true;
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.message || String(err);
      showNotification(`Failed to rename: ${msg}`, "error");
      return false;
    }
  };

  return (
    <div>
      {/* Curie Popup */}
      {selectedCurie && (
        <GenericTetTableModal title="CURIE Information" body={selectedCurie} show={showCurieModal} onHide={() => setShowCurieModal(false)} />
      )}
      {/* Note Popup */}
      {showNoteModal && (
        <GenericTetTableModal title="Full Note" body={fullNote} show={showNoteModal} onHide={() => setShowNoteModal(false)} />
      )}
      {/* Source Description Popup */}
      {showSourceDescModal && (
        <GenericTetTableModal title="Full Source Description" body={fullSourceDesc} show={showSourceDescModal} onHide={() => setShowSourceDescModal(false)} />
      )}

      {isLoadingData && (
        <div className="text-center">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        </div>
      )}

      <Container fluid>
        <Row>
          <Col>
            <div className="d-flex justify-content-between align-items-center" style={{ paddingBottom: '10px' }}>
              {/* Left controls: Hide/Show + Preferences + Load setting */}
              <div className="d-flex align-items-center" style={{ gap: '14px' }}>
                <CheckboxDropdown items={items} />

                <Button
                  variant="outline-primary"
                  size="sm"
                  title="Manage table preferences"
                  onClick={() => setShowSettingsModal(true)}
                >
                  <FaGear size={14} style={{ marginRight: '6px' }} />
                  Preferences
                </Button>

                <SettingsDropdown
                  settings={settings}
                  selectedId={selectedSettingId}
                  onPick={handlePickSetting}
                />
              </div>

              {/* Right controls: Download */}
              <DownloadDropdownOptionsButton
                gridRef={gridRef}
                colDefs={colDefs}
                rowData={topicEntityTags}
                fileNameFront={fileNameFront}
              />
            </div>
          </Col>
        </Row>
        {/* Notification above the table */}
        <Row>
          <Col>
            <Notification 
              show={notification.show}
              message={notification.message}
              variant={notification.variant}
              onClose={hideNotification}
            />
          </Col>
        </Row>

        <Row>
          <Col>
            <div className="ag-theme-quartz" style={{height: 500}}>
              <AgGridReact
                ref={gridRef}
                reactiveCustomComponents
                rowData={topicEntityTags}
                onGridReady={onGridReady}
                onColumnResized={onColumnResized}
                getRowId={getRowId}
                columnDefs={colDefs}
                onColumnMoved={() => {}}
                onRowDataUpdated={() => gridRef.current.api.refreshCells({force : true})}
                pagination={true}
                paginationPageSize={25}
                gridOptions={gridOptions}
                paginationPageSizeSelector={paginationPageSizeSelector}
                isExternalFilterPresent={isExternalFilterPresent}
                doesExternalFilterPass={doesExternalFilterPass}
              />
            </div>
          </Col>
        </Row>
      </Container>

      {/* Settings modal */}
      <CustomSettingsGearModal
         show={showSettingsModal}
         onHide={() => {
           setShowSettingsModal(false);
           setNameEdits({});
         }}
         settings={settings}
         nameEdits={nameEdits}
         setNameEdits={setNameEdits}
         onCreate={handleCreateSetting}
         onRename={handleRename}
         onDelete={remove}
         onMakeDefault={makeDefault}
         canCreateMore={settings.length < maxCount}
         busy={busy}
      />
    </div>
  );
}; // const TopicEntityTable

export default TopicEntityTable;
