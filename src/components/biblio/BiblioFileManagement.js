import {useCallback, useEffect, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Spinner from "react-bootstrap/Spinner";
import Button from 'react-bootstrap/Button';
import Alert from 'react-bootstrap/Alert';
import Form from 'react-bootstrap/Form';
import axios from "axios";

import { faTrash } from '@fortawesome/free-solid-svg-icons'

import RowDivider from './RowDivider';
import {RowDisplayString} from './BiblioDisplay';
import ModalGeneric from './ModalGeneric';

import {
  downloadReferencefile,
  fileUploadResult,
  setFileUploadingCount,
  setFileUploadingShowModal,
  setFileUploadingShowSuccess
} from '../../actions/biblioActions';

import {useDropzone} from 'react-dropzone';
import {getOktaModAccess} from "../Biblio";
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
          <RowDivider />
          <FileEditor />
        </Container>
      </>
  );
}

const OpenAccess = () => {

  const [licenseData, setLicenseData] = useState([]);
  const [newLicense, setNewLicense] = useState(''); 
  const referenceJsonLive = useSelector(state => state.biblio.referenceJsonLive);
  const accessToken = useSelector(state => state.isLogged.accessToken);
  const [alert, setAlert] = useState(false);
  let [showAlert, setShowAlert] = useState(false);
  const handleShowAlert = () => {
    setShowAlert(true);
    setTimeout(() => {
      setShowAlert(false);
    }, 2000); // 2000 ms = 2 seconds
  };
    
  const licenseName = referenceJsonLive["copyright_license_name"];
  let licenseToShow = '';
  if (referenceJsonLive["copyright_license_open_access"] === true) {
    licenseToShow = licenseName + " (open access)"
  }
  else if (referenceJsonLive["copyright_license_open_access"] === false) {
    licenseToShow = licenseName + " (not open access)"
  }

  let lastUpdatedBy = ''
  if (referenceJsonLive["copyright_license_last_updated_by"] && referenceJsonLive["copyright_license_last_updated_by"] !== 'default_user') {
    lastUpdatedBy = referenceJsonLive["copyright_license_last_updated_by"]
  }
    
  let referenceCurie = referenceJsonLive["curie"]
    
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
  
  let license_names = ['Pick a license']
  for (let x of licenseData) {
    license_names.push(x['name'])
  }
  if (licenseName !== '' && lastUpdatedBy !== '') {
    license_names.push('No license')
  }

  const handleChange = (e) => {
    setNewLicense(e.target.value);
  }

  const addLicense = (e) => {
    if (newLicense === '' || newLicense === 'Pick a license') {
      return false;
    }
    if (licenseName !== '' && newLicense === licenseName) {
      return false;
    }
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
      handleShowAlert(); // show the alert and hide it after 2 seconds
    }).catch((error) => {
      setAlert(error);
      setShowAlert(true);
    });
  }

  const License = () => {
    let colSize = 6;
    if (licenseToShow !== '') {
      if (lastUpdatedBy === '') {
	return (<Col sm={colSize}>{licenseToShow}</Col>);
      }
      else {
        return (<Row>
          <Col sm={colSize}>
	    <Form.Control as='select' id='license' name='license' value={newLicense} onChange={(e) => handleChange(e)} >
	      {license_names.map((optionValue, index) => (
                <option value={optionValue} defaultValue={licenseName} key={index}>
                  {optionValue}
                </option>
              ))}
            </Form.Control>
          </Col>
          <Col sm={colSize}>
	    <div className={`form-control biblio-button`} type="submit" onClick={(e) => addLicense(e)} style={{ width: '150px' }}>Update License</div>
          </Col></Row>);
      }
    }
    return (<Row>
        <Col sm={colSize}>
          <Form.Control as='select' id='license' name='license' value={newLicense} onChange={(e) => handleChange(e)} >
            {license_names.map((optionValue, index) => (
              <option value={optionValue} key={index}>{optionValue}</option>
            ))}
          </Form.Control>
	</Col>
	<Col sm={colSize}>
          <div className={`form-control biblio-button`} type="submit" onClick={(e) => addLicense(e)} style={{ width: '150px' }}>Add License</div>
        </Col></Row>);
  }

  if (lastUpdatedBy !== '') {
    return (
      <Row key='open_access'>
        <Col className="Col-general Col-display Col-display-left" lg={{ span: 2 }}>open access</Col>
        <Col className="Col-general Col-display Col-display-right" lg={{ span: 10 }} style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ marginRight: '10px' }}>{licenseToShow}</span>
          updated by <span style={{ margin: '0 10px' }}>{lastUpdatedBy}</span>
          <License />
          {showAlert && alert && <span style={{ marginLeft: '10px' }}>{alert}</span>}
        </Col>
      </Row>
    );
  }
  else {
    return (
      <Row key='open_access'>
        <Col className="Col-general Col-display Col-display-left" lg={{ span: 2 }}>open access</Col>
        <Col className="Col-general Col-display Col-display-right" lg={{ span: 10 }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <License />
          {showAlert && alert && <span style={{ marginLeft: '10px' }}>{alert}</span>}
        </Col>
      </Row>
    );
  }
    
}

const FileUpload = ({main_or_supp}) => {
  const dispatch = useDispatch();
  const referenceCurie = useSelector(state => state.biblio.referenceCurie);
  const accessToken = useSelector(state => state.isLogged.accessToken);
  const oktaGroups = useSelector(state => state.isLogged.oktaGroups);
  const fileUploadingShowModal = useSelector(state => state.biblio.fileUploadingShowModal);
  const fileUploadingModalText = useSelector(state => state.biblio.fileUploadingModalText);

  let access = getOktaModAccess(oktaGroups);
  if (access === 'developer') {
    if (process.env.REACT_APP_DEV_OR_STAGE_OR_PROD === 'prod') {
      access = 'No';
    } else {
      // This means that developers upload files with PMC (all) access in dev environment only - no access on prod
      access = null;
    }
  }

  // https://react-dropzone.js.org/
  const onDrop = useCallback((acceptedFiles) => {
    dispatch(setFileUploadingCount(acceptedFiles.length));

    acceptedFiles.forEach((file) => {
      const reader = new FileReader()
      reader.onabort = () => console.log('file reading was aborted')
      reader.onerror = () => console.log('file reading has failed')
      reader.onload = () => {}
      reader.readAsBinaryString(file);
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
      let url = process.env.REACT_APP_RESTAPI + "/reference/referencefile/file_upload/?reference_curie=" + referenceCurie + "&display_name=" + fileName + "&file_class=" + main_or_supp + "&file_publication_status=final&file_extension=" + fileExtension + "&is_annotation=false";
      if (access !== null) {
        url += "&mod_abbreviation=" + access
      }
      if (access !== 'No') {
        axios.post(url, formData, {
          headers: {
            "Authorization": "Bearer " + accessToken,
            "Content-Type": "multipart/form-data",
          }
        }).then((res) => {
          dispatch(fileUploadResult('<strong>' + file.name + '</strong>', 'success<br/>'))
        }).catch((error) => {
          dispatch(fileUploadResult('<strong>' + file.name + '</strong><br/>', error.response.data.detail + '<br/>'))
          console.log(error)
        });
      }
      //reader.readAsBinaryString();
    });
  }, [access, dispatch, accessToken, main_or_supp, referenceCurie]);

  const {getRootProps, getInputProps} = useDropzone({onDrop})

  return (
      <>
        <ModalGeneric showGenericModal={fileUploadingShowModal}
                      genericModalHeader="File Upload Result"
                      genericModalBody={fileUploadingModalText.replaceAll(". ", ".<br/>")}
                      onHideAction={setFileUploadingShowModal(false)} />
        <Row key={main_or_supp} >
          <Col className="Col-general Col-display Col-display-left" lg={{ span: 2 }}>{main_or_supp} file</Col>
          <Col lg={{ span: 10 }}>
            <div className="dropzone" {...getRootProps()} >
              <input {...getInputProps()} />
              <p>Drag and drop {main_or_supp} file here, or click to select files</p>
            </div>
          </Col>
        </Row>
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

const BiblioCitationDisplay = () => {
  const referenceJsonLive = useSelector(state => state.biblio.referenceJsonLive);
  const referenceJsonDb = useSelector(state => state.biblio.referenceJsonDb);
  const fieldName = 'citation';
  return (<RowDisplayString key={fieldName} fieldName={fieldName} referenceJsonLive={referenceJsonLive} referenceJsonDb={referenceJsonDb} />);
}

const FileEditor = () => {
  const displayOrEditor = 'display';
  const fieldName = 'referencefiles';

  const dispatch = useDispatch();
  const oktaGroups = useSelector(state => state.isLogged.oktaGroups);
  const accessToken = useSelector(state => state.isLogged.accessToken);
  const loadingFileNames = useSelector(state => state.biblio.loadingFileNames);
  const referenceCurie = useSelector(state => state.biblio.referenceCurie);
  const fileUploadingShowSuccess = useSelector(state => state.biblio.fileUploadingShowSuccess);
  const referenceJsonLive = useSelector(state => state.biblio.referenceJsonLive);
  const [referencefiles, setReferencefiles] = useState([]);
  const [referencefilesLoading, setReferencefilesLoading] = useState(false);

  const fetchReferencefiles = async () => {
    setReferencefilesLoading(true);
    const referencefiles = await axios.get(process.env.REACT_APP_RESTAPI + "/reference/referencefile/show_all/" + referenceCurie);
    setReferencefiles(referencefiles.data);
    setReferencefilesLoading(false);
  }

  useEffect(() => {
    fetchReferencefiles().finally();
  }, [referenceCurie]);

  useEffect(() => {
    if (fileUploadingShowSuccess) {
      fetchReferencefiles().finally();
    }
  }, [fileUploadingShowSuccess]);

  const compareFn = (a, b) => {
    if (a.file_class + a.display_name + a.file_extension > b.file_class + b.display_name + b.file_extension) {
      return 1;
    }
    if (a.file_class + a.display_name + a.file_extension < b.file_class + b.display_name + b.file_extension) {
      return -1;
    }
    return 0;
  }

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
  const access = getOktaModAccess(oktaGroups);
  let referenceFilesWithAccess = referencefiles
      .filter((referenceFile) => referenceJsonLive["copyright_license_open_access"] === true || access === 'developer' || referenceFile.referencefile_mods
          .some((mod) => mod.mod_abbreviation === access || mod.mod_abbreviation === null));

  let referenceFilesNoAccess = referencefiles
      .filter((referenceFile) => referenceJsonLive["copyright_license_open_access"] !== true && access !== 'developer' && referenceFile.referencefile_mods
          .every((mod) => mod.mod_abbreviation !== access && mod.mod_abbreviation !== null));

  referenceFilesWithAccess.sort(compareFn);
  referenceFilesNoAccess.sort(compareFn);
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
