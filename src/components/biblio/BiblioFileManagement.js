import {useCallback, useEffect, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import Container from 'react-bootstrap/Container';
import { biblioQueryReferenceCurie } from '../../actions/biblioActions';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Spinner from "react-bootstrap/Spinner";
import Button from 'react-bootstrap/Button';
import Alert from 'react-bootstrap/Alert';
import Form from 'react-bootstrap/Form';
import axios from "axios";
import Modal from 'react-bootstrap/Modal';

import { faTrash } from '@fortawesome/free-solid-svg-icons'

import RowDivider from './RowDivider';
import {RowDisplayString} from './BiblioDisplay';
import ModalGeneric from './ModalGeneric';

import {
  downloadReferencefile,
  fileUploadResult,
  setReferenceFiles,
  setFileUploadingCount,
  setFileUploadingShowModal,
  setFileUploadingShowSuccess
} from '../../actions/biblioActions';
import { mergeAteamQueryAtp } from '../../actions/mergeActions';

import {useDropzone} from 'react-dropzone';
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";

const BiblioFileManagement = () => {
  const fileUploadingIsUploading = useSelector(state => state.biblio.fileUploadingCount) > 0;

  return (
      <>
        <Container>
          <BiblioCitationDisplay key="filemanagementCitationDisplay" />
          <AlertDismissibleFileUploadSuccess />
          {fileUploadingIsUploading ? <Spinner animation={"border"}/> : null}
          <FileUpload main_or_supp="main" />
          <FileUpload main_or_supp="supplement" />
	  <OpenAccess />
	  <Workflow />
          <RowDivider />
          <FileEditor />
        </Container>
      </>
  );
}

const Workflow = () => {
  const dispatch = useDispatch();
  const referenceJsonLive = useSelector(state => state.biblio.referenceJsonLive);
  const referenceCurie = referenceJsonLive["curie"]
  const accessToken = useSelector(state => state.isLogged.accessToken);
  const [alert, setAlert] = useState(false);
  let [showAlert, setShowAlert] = useState(false);
  const ateamResults = useSelector(state => state.merge.ateamResults);
  const atpParents = ['ATP:0000140'];
  const atpOntology = useSelector(state => state.merge.atpOntology);

  const oktaMod = useSelector(state => state.isLogged.oktaMod);
  const testerMod = useSelector(state => state.isLogged.testerMod);
  let accessLevel = oktaMod;
  if (testerMod !== 'No') { accessLevel = testerMod; }
  // Workflow accessLevel cannot be developer, is mod-specific

  const mods = ['FB', 'MGI', 'RGD', 'SGD', 'WB', 'XB', 'ZFIN']

  const atpMappings = {
    '': 'Pick file status',
    'ATP:0000134': 'files uploaded',
    'ATP:0000135': 'file unavailable',
    'ATP:0000139': 'file upload in progress',
    'ATP:0000141': 'file needed',
  };
  Object.entries(atpOntology['ATP:0000140']).map(
    ([atp, obj]) => (atpMappings[atp] = obj['name'])
  );

  const referenceFiles = useSelector(state => state.biblio.referenceFiles);
  let referenceFilesWithAccess = referenceFiles.filter(
    referenceFile =>
      referenceJsonLive['copyright_license_open_access'] === true ||
      referenceFile.referencefile_mods.some(
        mod =>
          mod.mod_abbreviation === accessLevel || mod.mod_abbreviation === null
      )
  );
    
  if ( (ateamResults === 0) && (accessToken) ) {
    dispatch(mergeAteamQueryAtp(accessToken, atpParents));
  }

  const deriveModFileStatus = (wfTags) => {
    const modFileStatus =  {};
    mods.map(
      (mod, index) =>
	(modFileStatus[mod] = {
	  'workflow_tag_id': '',
	  'reference_workflow_tag_id': '',
	    'atpName': ''
	})
    );
    for (const [index, wfTag] of wfTags.entries()) {
      const reference_workflow_tag_id = wfTag['reference_workflow_tag_id'];
      let atp = ''; let atpName = '';
      if ('workflow_tag_id' in wfTag && wfTag['workflow_tag_id'] !== null && wfTag['workflow_tag_id'] !== '') {
        atp = wfTag['workflow_tag_id'];
        if (atp in atpMappings) { atpName = atpMappings[atp]; }
      }
      if (atpName !== '' && 'mod_abbreviation' in wfTag && wfTag['mod_abbreviation'] !== null && wfTag['mod_abbreviation'] !== '') {
        const mod = wfTag['mod_abbreviation'];
        modFileStatus[mod] = { 'workflow_tag_id': atp, 'reference_workflow_tag_id': reference_workflow_tag_id, 'atpName': atpName };
      }
    }
    return modFileStatus;
  }

  const modFileStatus = deriveModFileStatus(referenceJsonLive["workflow_tags"]);
  if (!(accessLevel in modFileStatus)) {
    return (
      <>
        <Row key='workflowFileStatus'>
          <Col className="Col-general Col-display Col-display-left" lg={{ span: 2 }}>workflow</Col>
          <Col className="Col-general Col-display Col-display-right" lg={{ span: 10 }}>Your okta credenditals must belong to a mod</Col>
        </Row>
      </>
    );
  }

  const isMainPDFuploaded = modFileStatus[oktaMod]['atpName'] === 'files uploaded';
  const isDeveloperWithoutTester = oktaMod === 'developer' && testerMod === 'No';
  const hideFileUnavailableButton = isMainPDFuploaded || isDeveloperWithoutTester;
    
  const handleFileUnavailableClick = () => {
    let url =
      process.env.REACT_APP_RESTAPI +
      '/workflow_tag/transition_to_workflow_status/';
    let postData = {
      curie_or_reference_id: referenceCurie,
      mod_abbreviation: accessLevel,
      new_workflow_tag_atp_id: 'ATP:0000135',
      transition_type: 'manual',
    };
    axios
      .patch(url, postData, {
        headers: {
          Authorization: 'Bearer ' + accessToken,
          mode: 'cors',
          'Content-Type': 'application/json',
        },
      })
      .then(res => {
        setAlert("Transitioned to 'file unavailable' status!");
        setShowAlert(true);
        setTimeout(() => {
          setShowAlert(false);
          dispatch(biblioQueryReferenceCurie(referenceCurie));
        }, 2000);
      })
      .catch(error => {
        setAlert(error.message);
        setShowAlert(true);
      });
  };

  return (
      <>
        <Row key='workflowFileStatus'>
          <Col className="Col-general Col-display Col-display-left" lg={{ span: 2 }}>workflow</Col>
          <Col className="Col-general Col-display Col-display-right" lg={{ span: 10 }}>
            <Container>
              {!hideFileUnavailableButton && (
                <div
                  className="form-control biblio-button"
                  type="submit"
                  onClick={handleFileUnavailableClick}
                  style={{ width: '160px' }}
                >
                  file unavailable
                </div>
              )}
              <RowDivider />
              <Row key="fileStatusDisplay">
                {mods.map((mod, index) => (
                  <Col className="Col-general Col-display" lg={{span: 4}} style={{ display: 'flex'}} key={`fileStatusDisplay ${mod}`}>{mod} {modFileStatus[mod]['atpName']}</Col>)) }
              </Row>
            </Container>
          </Col>
        </Row>
        {showAlert && alert && <Alert variant="success">{alert}</Alert>}
      </>
  );
}

const OpenAccess = () => {

  const dispatch = useDispatch();
  const [licenseData, setLicenseData] = useState([]);
  const [newLicense, setNewLicense] = useState('');
  const referenceJsonLive = useSelector(state => state.biblio.referenceJsonLive);
  const referenceCurie = referenceJsonLive["curie"]
  const accessToken = useSelector(state => state.isLogged.accessToken);
  const [alert, setAlert] = useState(false);
  let [showAlert, setShowAlert] = useState(false);

  const fetchLicenseData = async () => {
    try {
      const result = await axios.get(process.env.REACT_APP_RESTAPI + "/copyright_license/all");
      setLicenseData(result.data);
    } catch (error) {
      console.log(error);
    }
  }

  useEffect(() => {
    fetchLicenseData().finally();
  }, []);

  const licenseName = referenceJsonLive["copyright_license_name"];
  const licenseToShow = licenseName ? `${licenseName} (${referenceJsonLive["copyright_license_open_access"] ? "open access" : "not open access"})` : '';

  let lastUpdatedBy = ''
  if (referenceJsonLive["copyright_license_last_updated_by"] && referenceJsonLive["copyright_license_last_updated_by"] !== 'default_user') {
    lastUpdatedBy = referenceJsonLive["copyright_license_last_updated_by"];
  }

  let licenseNames = ['Pick a license', ...licenseData.map(x => x.name)]
  if (licenseName !== '' && lastUpdatedBy !== '') {
    licenseNames.push('No license');
  }

  const addLicense = (e) => {
    if (!newLicense || newLicense === 'Pick a license' || newLicense === licenseName) return false;
    let license = newLicense.replace(' ', '+')
    const url = process.env.REACT_APP_RESTAPI + "/reference/add_license/" + referenceCurie + "/" + license;
    axios.post(url, {}, {
      headers: {
        'Authorization': 'Bearer ' + accessToken,
        'mode': 'cors',
        'Content-Type': 'application/json',
      }
    }).then((res) => {
      setAlert("License Updated!");
      setShowAlert(true);
      setTimeout(() => {
        setShowAlert(false);
        dispatch(biblioQueryReferenceCurie(referenceCurie));
      }, 2000);
    }).catch((error) => {
      setAlert(error);
      setShowAlert(true);
    });
  }

  return (
      <>
        <Row key='open_access'>
          <Col className="Col-general Col-display Col-display-left" lg={{ span: 2 }}>open access</Col>
          <Col className="Col-general Col-display Col-display-right" lg={{ span: 10 }} style={{ display: 'flex', alignItems: 'center'}}>
            {lastUpdatedBy !== '' ?
                <div>
                  <span style={{ marginRight: '10px' }}>{licenseToShow}</span>
                  updated by <span style={{ margin: '0 10px' }}>{lastUpdatedBy}</span>
                </div>
                :
                null
            }
            {licenseToShow !== '' && lastUpdatedBy === '' ?
                <span>{licenseToShow}</span>
                :
                <>
                  <Form.Control as='select' id='license' name='license' style={{width: "10em"}} value={newLicense} onChange={(e) => setNewLicense(e.target.value)} >
                    {licenseNames.map((optionValue, index) => (
                        <option value={optionValue} defaultValue={licenseToShow !== '' ? licenseName : null} key={index}>{optionValue}</option>
                    ))}
                  </Form.Control>
                  &nbsp;
                  <div className={`form-control biblio-button`} type="submit" onClick={(e) => addLicense(e)} style={{ width: '160px' }}>{licenseToShow !== '' ? "Update" : "Add"} License</div>
                </>
            }
          </Col>
        </Row>
        {showAlert && alert && <Alert variant="success">{alert}</Alert>}
      </>
  );
}

const FileUpload = ({main_or_supp}) => {
  const dispatch = useDispatch();
  const referenceCurie = useSelector(state => state.biblio.referenceCurie);
  const accessToken = useSelector(state => state.isLogged.accessToken);
  const fileUploadingShowModal = useSelector(state => state.biblio.fileUploadingShowModal);
  const fileUploadingModalText = useSelector(state => state.biblio.fileUploadingModalText);

  const oktaMod = useSelector(state => state.isLogged.oktaMod);
  const testerMod = useSelector(state => state.isLogged.testerMod);
  const oktaDeveloper = useSelector(state => state.isLogged.oktaDeveloper);
  let accessLevel = oktaMod;

  if (testerMod !== 'No') { accessLevel = testerMod; }
    else if (oktaDeveloper) { accessLevel = 'developer'; }
  // FileUpload accessLevel can be developer to see all files and upload as PMC
    
  if (accessLevel === 'developer') {
    if (process.env.REACT_APP_DEV_OR_STAGE_OR_PROD === 'prod') {
      accessLevel = 'No';
    } else {
      // This means that developers upload files with PMC (all) access in dev environment only - no access on prod
      accessLevel = null;
    }
  }
  
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [fileToReUpload, setFileToReUpload] = useState(null);

  const handleConfirmUpload = () => {
    console.log('Hello Confirm upload');	
    setShowConfirmModal(false);
    if (fileToReUpload) {
	uploadFile(fileToReUpload, true);
	setFileToReUpload(null); // reset fileToReUpload
    }
  };

  const handleCancelUpload = () => {
    console.log('Hello Cancel upload');
    setShowConfirmModal(false);
    setFileToReUpload(null);
    dispatch(setFileUploadingCount(0)); // reset file uploading count
  };
    
  const uploadFile = (file, uploadIfAlreadyConverted = false) => {
    //  const reader = new FileReader()
    //  reader.onabort = () => console.log('file reading was aborted')
    //  reader.onerror = () => console.log('file reading has failed')
    //  reader.onload = () => {}
    //  reader.readAsBinaryString(file);
    const formData = new FormData();
    formData.append("file", file);
    let fileName = "";
    let fileExtension = "";
    if (file.name.toLowerCase().endsWith(".tar.gz")) {
      fileName = file.name.split(".").slice(0, -2).join(".");
      fileExtension = file.name.split(".").slice(-2).join(".");
    } else {
      fileName = file.name.split(".").slice(0, -1).join(".");
      fileExtension = file.name.split(".").pop();
    }

    let url = `${process.env.REACT_APP_RESTAPI}/reference/referencefile/file_upload/?reference_curie=${referenceCurie}&display_name=${fileName}&file_class=${main_or_supp}&file_publication_status=final&file_extension=${fileExtension}&is_annotation=false`;
    if (accessLevel !== null) {
      url += `&mod_abbreviation=${accessLevel}`;
    }
    if (uploadIfAlreadyConverted) {
      url += "&upload_if_already_converted=True";
    }

    if (accessLevel !== 'No') {
      axios.post(url, formData, {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "multipart/form-data",
        }
      }).then((res) => {
        dispatch(fileUploadResult(`<strong>${file.name}</strong>`, 'success<br/>'));
        dispatch(setFileUploadingCount(0)); // Reset file uploading count on success
      }).catch((error) => {
        console.error('Upload Error:', error);
        const errorMessage = error.response && error.response.data && error.response.data.detail
          ? error.response.data.detail
          : 'An error occurred during the file upload';
        if (error.response && error.response.status === 422 && errorMessage.includes("File already converted to text")) {
          setFileToReUpload(file);
          setShowConfirmModal(true);
        } else {
          dispatch(fileUploadResult(`<strong>${file.name}</strong><br/>`, `${errorMessage}<br/>`));
          dispatch(setFileUploadingCount(0)); // Reset file uploading count on error
        }
      });
    }
  };

    
  // https://react-dropzone.js.org/
  const onDrop = useCallback((acceptedFiles) => {
    dispatch(setFileUploadingCount(acceptedFiles.length));

    acceptedFiles.forEach((file) => {
      uploadFile(file);
    });
  }, [accessLevel, dispatch, accessToken, main_or_supp, referenceCurie]);

  const {getRootProps, getInputProps} = useDropzone({onDrop})

  return (
      <>
        <ModalGeneric showGenericModal={fileUploadingShowModal}
                      genericModalHeader="File Upload Result"
                      genericModalBody={fileUploadingModalText.replaceAll(". ", ".<br/>")}
                      onHideAction={setFileUploadingShowModal(false)} />
        <Row key={main_or_supp} >
          <Col className="Col-general Col-display Col-display-left" lg={{ span: 2 }}>{main_or_supp} file</Col>
          <Col className="Col-general Col-display Col-display-right" lg={{ span: 10 }} style={{ display: 'flex', alignItems: 'center'}}>
            { (() => {
              if (accessLevel !== 'No') {
                return (
                  <div className="dropzone" {...getRootProps()} >
                    <input {...getInputProps()} />
                    <p>Drag and drop {main_or_supp} file here, or click to select files</p>
                  </div>
                ) }
              else { return ( <div>You must be in an Okta curator group to upload files in production</div>) } } )() }
          </Col>
        </Row>

        <Modal show={showConfirmModal} onHide={handleCancelUpload}>
          <Modal.Header closeButton>
            <Modal.Title>Confirm Re-upload</Modal.Title>
          </Modal.Header>
          <Modal.Body>Do you really want to re-upload the file and re-run entity extraction pipelines?</Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCancelUpload}>Cancel</Button>
            <Button variant="primary" onClick={handleConfirmUpload}>Confirm</Button>
          </Modal.Footer>
        </Modal>
      
      </>
  );
}

const AlertDismissibleFileUploadSuccess = () => {
  const dispatch = useDispatch();
  const fileUploadingShowSuccess = useSelector(state => state.biblio.fileUploadingShowSuccess);
  if (fileUploadingShowSuccess) {
    setTimeout(() => {
      dispatch(setFileUploadingShowSuccess(false))
    }, 2000);
    return (
      <Alert variant="success" onClose={() => dispatch(setFileUploadingShowSuccess(false))} dismissible>
        <Alert.Heading>All files uploaded</Alert.Heading>
      </Alert>
    );
  } else { return null; }
}

export const BiblioCitationDisplay = () => {
  const referenceJsonLive = useSelector(state => state.biblio.referenceJsonLive);
  const referenceJsonDb = useSelector(state => state.biblio.referenceJsonDb);
  const fieldName = 'citation';
  return (<RowDisplayString key={fieldName} fieldName={fieldName} referenceJsonLive={referenceJsonLive} referenceJsonDb={referenceJsonDb} />);
}

export const reffileCompareFn = (a, b) => {
  if (a.file_class + a.display_name + a.file_extension > b.file_class + b.display_name + b.file_extension) {
    return 1;
  }
  if (a.file_class + a.display_name + a.file_extension < b.file_class + b.display_name + b.file_extension) {
    return -1;
  }
  return 0;
}


const FileEditor = () => {
  const displayOrEditor = 'display';
  const fieldName = 'referencefiles';

  const dispatch = useDispatch();
  const accessToken = useSelector(state => state.isLogged.accessToken);
  const loadingFileNames = useSelector(state => state.biblio.loadingFileNames);
  const referenceCurie = useSelector(state => state.biblio.referenceCurie);
  const fileUploadingShowSuccess = useSelector(state => state.biblio.fileUploadingShowSuccess);
  const referenceJsonLive = useSelector(state => state.biblio.referenceJsonLive);
  const referenceFiles = useSelector(state => state.biblio.referenceFiles);
  const [referencefilesLoading, setReferencefilesLoading] = useState(false);

  const fetchReferencefiles = async () => {
    setReferencefilesLoading(true);
    const referencefiles = await axios.get(process.env.REACT_APP_RESTAPI + "/reference/referencefile/show_all/" + referenceCurie);
    dispatch(setReferenceFiles(referencefiles.data));
    setReferencefilesLoading(false);
  }

  useEffect(() => {
    fetchReferencefiles().finally();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [referenceCurie]);

  useEffect(() => {
    if (fileUploadingShowSuccess) {
      fetchReferencefiles().finally();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileUploadingShowSuccess]);

  const patchReferencefile = (referencefileId, data, accessToken) => {
    const url = process.env.REACT_APP_RESTAPI + "/reference/referencefile/" + referencefileId;
    axios.patch(url, data, {
      headers: {
        "Authorization": "Bearer " + accessToken,
        "Content-Type": "application/json",
      }
    }).then((res) => {
      fetchReferencefiles().finally();
    }).catch((error) => {
      console.log(error)
    });
  }

  const deleteReferencefile = (referencefileId, accessToken) => {
    const url = process.env.REACT_APP_RESTAPI + "/reference/referencefile/" + referencefileId;
    axios.delete(url, {
      headers: {
        "Authorization": "Bearer " + accessToken,
        "Content-Type": "application/json",
      }
    }).then((res) => {
      fetchReferencefiles().finally();
    }).catch((error) => {
      console.log(error)
    });
  }

  const getDisplayRowsFromReferenceFiles = (referenceFilesArray, hasAccess) => {
    return referenceFilesArray.map((referenceFile, index) => {
      const source = referenceFile.referencefile_mods.map(
          (mod) => mod.mod_abbreviation === null ? "PMC" : mod.mod_abbreviation).join(", ");
      let filename = referenceFile.display_name + '.' + referenceFile.file_extension;
      let referencefileValue = (<div>{filename}</div>);
      if (hasAccess) {
        referencefileValue = (<div>
          <button className='button-to-link' onClick={() =>
              dispatch(downloadReferencefile(referenceFile.referencefile_id, filename, accessToken))
          }>{filename}</button>
          &nbsp;{loadingFileNames.has(filename) ? <Spinner animation="border" size="sm"/> : null}</div>);
      }
      return (
          <Row key={`${fieldName} ${index}`} className="Row-general" xs={2} md={4} lg={6}>
            <Col className={`Col-general ${cssDisplayLeft} `} lg={{span: 2}}>{referenceFile.file_class}</Col>
            <Col className={`Col-general ${cssDisplay} `} lg={{span: 3}}>{referencefileValue}</Col>
            <Col className={`Col-general ${cssDisplay} `} lg={{span: 2}}>{source}</Col>
            <Col className={`Col-general ${cssDisplay} `} lg={{span: 2}}>
              <Form.Control as="select" disabled={!hasAccess}
                            value={referenceFile.pdf_type === null || referenceFile.pdf_type === 'pdf' ? '' : referenceFile.pdf_type}
                            onChange={(event) => patchReferencefile(referenceFile.referencefile_id, {"pdf_type": event.target.value === "" ? null : event.target.value}, accessToken)}>
                <option></option>
                <option>ocr</option>
                <option>tif</option>
                <option>aut</option>
                <option>html</option>
              </Form.Control>
            </Col>
            <Col className={`Col-general ${cssDisplay} `} lg={{span: 2}}>
              <Form.Control as="select" disabled={!hasAccess}
                            value={referenceFile.file_publication_status}
                            onChange={(event) => patchReferencefile(referenceFile.referencefile_id, {"file_publication_status": event.target.value}, accessToken)}>
                <option>prepub</option>
                <option>temp</option>
                <option>final</option>
                <option>other</option>
              </Form.Control>
            </Col>
            <Col className={`Col-general ${cssDisplayRight} `} lg={{span: 1}}><Button
                variant="outline-dark" disabled={!hasAccess} onClick={() => deleteReferencefile(referenceFile.referencefile_id,accessToken)}>
                <FontAwesomeIcon icon={faTrash}/></Button></Col>
          </Row>);
    });
  }
  let cssDisplayLeft = 'Col-display Col-display-left';
  let cssDisplay = 'Col-display';
  let cssDisplayRight = 'Col-display Col-display-right';
  if (displayOrEditor === 'editor') {
    cssDisplay = 'Col-editor-disabled';
    cssDisplayLeft = ''; cssDisplayRight = 'Col-editor-disabled';
  }
  let rowReferencefileElements = [];
  const oktaMod = useSelector(state => state.isLogged.oktaMod);
  const testerMod = useSelector(state => state.isLogged.testerMod);
  const oktaDeveloper = useSelector(state => state.isLogged.oktaDeveloper);
  let accessLevel = oktaMod;
  if (testerMod !== 'No') { accessLevel = testerMod; }
    else if (oktaDeveloper) { accessLevel = 'developer'; }
  // FileEditor accessLevel can be developer to see all files and upload as PMC
  let referenceFilesWithAccess = referenceFiles
      .filter((referenceFile) => referenceJsonLive["copyright_license_open_access"] === true || accessLevel === 'developer' || referenceFile.referencefile_mods
          .some((mod) => mod.mod_abbreviation === accessLevel || mod.mod_abbreviation === null));

  let referenceFilesNoAccess = referenceFiles
      .filter((referenceFile) => referenceJsonLive["copyright_license_open_access"] !== true && accessLevel !== 'developer' && referenceFile.referencefile_mods
          .every((mod) => mod.mod_abbreviation !== accessLevel && mod.mod_abbreviation !== null));

  referenceFilesWithAccess.sort(reffileCompareFn);
  referenceFilesNoAccess.sort(reffileCompareFn);
  rowReferencefileElements = [...getDisplayRowsFromReferenceFiles(referenceFilesWithAccess, true),
    ...getDisplayRowsFromReferenceFiles(referenceFilesNoAccess, false)];
  const referencefileHeaderRow = (
      <Row key={`${fieldName} header`} className="Row-general" xs={2} md={4} lg={6}>
        <Col className={`Col-general ${cssDisplayLeft} `} lg={{ span: 2 }}><strong>File Class</strong></Col>
        <Col className={`Col-general ${cssDisplay} `} lg={{ span: 3 }}><strong>File Name</strong></Col>
        <Col className={`Col-general ${cssDisplay} `} lg={{ span: 2 }}><strong>Source</strong></Col>
        <Col className={`Col-general ${cssDisplay} `} lg={{ span: 2 }}><strong>Special Pdf Type</strong></Col>
        <Col className={`Col-general ${cssDisplay} `} lg={{ span: 2 }}><strong>File Publication Status</strong></Col>
        <Col className={`Col-general ${cssDisplayRight} `} lg={{ span: 1 }}><strong>Delete</strong></Col>
      </Row>);
  rowReferencefileElements.unshift( referencefileHeaderRow );
  return (
      <>
        {referencefilesLoading ? <Spinner animation={"border"}/> : rowReferencefileElements}
      </>);
}

export default BiblioFileManagement;
