
import { useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Spinner from "react-bootstrap/Spinner";
import Button from 'react-bootstrap/Button';
import axios from "axios";


import { getOktaModAccess } from '../Biblio';
import RowDivider from './RowDivider';
import { RowDisplayString } from './BiblioDisplay';
import ModalGeneric from './ModalGeneric';

import { fileUploadResult, setFileUploadingModalText } from '../../actions/biblioActions';
import { setFileUploadingCount } from '../../actions/biblioActions';
import { setFileUploadingShowModal } from '../../actions/biblioActions';
import {
  downloadReferencefile,
  queryId,
  setReferenceCurie
} from '../../actions/biblioActions';

import {useDropzone} from 'react-dropzone';


export const curieToNameEntityType = { 'ATP:0000005': 'gene', 'ATP:0000006': 'allele' };

const BiblioFileManagement = () => {
  return (<>
            <Container>
              <FileEditor />
              <RowDivider />
              <BiblioCitationDisplay key="filemanagementCitationDisplay" />
              <FileUpload main_or_supp="main" />
              <FileUpload main_or_supp="supplement" />
            </Container>
          </>); }

const FileUpload = ({main_or_supp}) => {
  const dispatch = useDispatch();
  const referenceCurie = useSelector(state => state.biblio.referenceCurie);
  const accessToken = useSelector(state => state.isLogged.accessToken);
  const fileUploadingShowModal = useSelector(state => state.biblio.fileUploadingShowModal);
  const fileUploadingModalText = useSelector(state => state.biblio.fileUploadingModalText);

  // https://react-dropzone.js.org/
  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.filter( (file) => file.name.split('.').length !== 2).length > 0) {
      dispatch(setFileUploadingModalText('Upload files need to have exactly one period'));
      dispatch(setFileUploadingShowModal(true));
    } else {
      dispatch(setFileUploadingCount(acceptedFiles.length));
      acceptedFiles.forEach((file) => {
        const reader = new FileReader()
        reader.onabort = () => console.log('file reading was aborted')
        reader.onerror = () => console.log('file reading has failed')
        reader.onload = () => {}
        reader.readAsBinaryString(file);
        const formData = new FormData();
          formData.append("file", file);
          let url = process.env.REACT_APP_RESTAPI + "/reference/referencefile/file_upload/?reference_curie=" + referenceCurie + "&display_name=" + file.name.split(".").slice(0, -1) + "&file_class=" + main_or_supp + "&file_publication_status=final&file_extension=" + file.name.split(".").pop()+ "&pdf_type=null&is_annotation=false&mod_abbreviation=WB";
          axios.post(url, formData, {
            headers: {
              "Authorization": "Bearer " + accessToken,
              "Content-Type": "multipart/form-data",
            }
          })
          .then((res) => {
            dispatch(fileUploadResult(file.name, 'success'))
          })
          .catch((error) => {
            dispatch(fileUploadResult(file.name, error.response.data.detail))
            console.log(error)
          });
        //reader.readAsBinaryString();
      });
    }
  }, [dispatch, accessToken, main_or_supp, referenceCurie]);

  const {getRootProps, getInputProps} = useDropzone({onDrop})

  return (
    <>
      <ModalGeneric showGenericModal={fileUploadingShowModal}
                    genericModalHeader="File Upload Result"
                    genericModalBody={fileUploadingModalText}
                    onHideAction={setFileUploadingShowModal(false)} />
      <Row key={main_or_supp} >
        <Col className="Col-general Col-display Col-display-left" lg={{ span: 2 }}>{main_or_supp} file</Col>
        <Col lg={{ span: 10 }}>
          <div className="dropzone" {...getRootProps()} >
            <input {...getInputProps()} />
            <p>Drag and drop {main_or_supp} file here, or click to select files</p>
          </div></Col>
      </Row>
    </>
  );
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
  const referenceJsonLive = useSelector(state => state.biblio.referenceJsonLive);

  const dispatch = useDispatch();
  const oktaGroups = useSelector(state => state.isLogged.oktaGroups);
  const accessToken = useSelector(state => state.isLogged.accessToken);
  const supplementExpand = useSelector(state => state.biblio.supplementExpand);
  const loadingFileNames = useSelector(state => state.biblio.loadingFileNames);
  let cssDisplayLeft = 'Col-display Col-display-left';
  let cssDisplay = 'Col-display';
  let cssDisplayRight = 'Col-display Col-display-right';
  if (displayOrEditor === 'editor') {
    cssDisplay = 'Col-editor-disabled';
    cssDisplayLeft = ''; cssDisplayRight = 'Col-editor-disabled'; }
  const access = getOktaModAccess(oktaGroups);
  if ('referencefiles' in referenceJsonLive && referenceJsonLive['referencefiles'] !== null) {
    let tarballChecked = ''; let listChecked = '';
    if (supplementExpand === 'tarball') { tarballChecked = 'checked'; }
      else if (supplementExpand === 'list') { listChecked = 'checked'; }
    const rowReferencefileElements = []

    // for (const[index, referencefileDict] of referenceJsonLive['referencefiles'].filter(x => x['file_class'] === 'main').entries())
    let hasAccessToTarball = false;
    for (const[index, referencefileDict] of referenceJsonLive['referencefiles'].entries()) {
      let is_ok = false;
      let allowed_mods = [];
      for (const rfm of referencefileDict['referencefile_mods']) {
        if (rfm['mod_abbreviation'] !== null) { allowed_mods.push(rfm['mod_abbreviation']); }
          else { allowed_mods.push('PMC'); }
        if (rfm['mod_abbreviation'] === null || rfm['mod_abbreviation'] === access) { is_ok = true; }
      }
      const source = allowed_mods.join(", ");
      let filename = referencefileDict['display_name'] + '.' + referencefileDict['file_extension'];
      let referencefileValue = (<div>{filename}</div>);
      if (access === 'developer') { is_ok = true; }
        else if (access === 'No') { is_ok = false; referencefileValue = (<div>{filename}</div>); }
      if (is_ok) {
        hasAccessToTarball = true;
        referencefileValue = (<div><button className='button-to-link' onClick={ () =>
            dispatch(downloadReferencefile(referencefileDict['referencefile_id'], filename, accessToken))
        } >{filename}</button>&nbsp;{loadingFileNames.has(filename) ? <Spinner animation="border" size="sm"/> : null}</div>); }
        const referencefileRow = (
            <Row key={`${fieldName} ${index}`} className="Row-general" xs={2} md={4} lg={6}>
              <Col className={`Col-general ${cssDisplayLeft} `} lg={{ span: 2 }}>{referencefileDict['file_class']}</Col>
              <Col className={`Col-general ${cssDisplay} `} lg={{ span: 2 }}>{referencefileValue}</Col>
              <Col className={`Col-general ${cssDisplay} `} lg={{ span: 2 }}>{source}</Col>
              <Col className={`Col-general ${cssDisplay} `} lg={{ span: 2 }}>{ referencefileDict['pdf_type'] === 'null' ? 'pdf' : referencefileDict['pdf_type'] }</Col>
              <Col className={`Col-general ${cssDisplay} `} lg={{ span: 2 }}>{referencefileDict['file_publication_status']}</Col>
              <Col className={`Col-general ${cssDisplayRight} `} lg={{ span: 2 }}><Button variant="outline-primary">delete</Button></Col>
            </Row>);
        rowReferencefileElements.push( referencefileRow );
      }

    if (rowReferencefileElements.length > 0) {
      const referencefileHeaderRow = (
              <Row key={`${fieldName} header`} className="Row-general" xs={2} md={4} lg={6}>
                <Col className={`Col-general ${cssDisplayLeft} `} lg={{ span: 2 }}><strong>File Class</strong></Col>
                <Col className={`Col-general ${cssDisplay} `} lg={{ span: 2 }}><strong>File Name</strong></Col>
                <Col className={`Col-general ${cssDisplay} `} lg={{ span: 2 }}><strong>Source</strong></Col>
                <Col className={`Col-general ${cssDisplay} `} lg={{ span: 2 }}><strong>Pdf Type</strong></Col>
                <Col className={`Col-general ${cssDisplay} `} lg={{ span: 2 }}><strong>File Publication Status</strong></Col>
                <Col className={`Col-general ${cssDisplayRight} `} lg={{ span: 2 }}><strong>Delete placeholder</strong></Col>
              </Row>);
      rowReferencefileElements.unshift( referencefileHeaderRow ); }

    return (<>{rowReferencefileElements}</>); }
  else { return null; } 
}

export default BiblioFileManagement;
