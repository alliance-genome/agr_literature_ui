import {useCallback} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Spinner from "react-bootstrap/Spinner";
import Button from 'react-bootstrap/Button';
import axios from "axios";
import RowDivider from './RowDivider';
import {RowDisplayString} from './BiblioDisplay';
import ModalGeneric from './ModalGeneric';

import {
  downloadReferencefile,
  fileUploadResult,
  setFileUploadingCount,
  setFileUploadingModalText,
  setFileUploadingShowModal
} from '../../actions/biblioActions';

import {useDropzone} from 'react-dropzone';
import {getOktaModAccess} from "../Biblio";

const BiblioFileManagement = () => {
  return (
      <>
        <Container>
          <FileEditor />
          <RowDivider />
          <BiblioCitationDisplay key="filemanagementCitationDisplay" />
          <FileUpload main_or_supp="main" />
          <FileUpload main_or_supp="supplement" />
        </Container>
      </>
  );
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
      access = null;
    }
  }

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
        let url = process.env.REACT_APP_RESTAPI + "/reference/referencefile/file_upload/?reference_curie=" + referenceCurie + "&display_name=" + file.name.split(".").slice(0, -1) + "&file_class=" + main_or_supp + "&file_publication_status=final&file_extension=" + file.name.split(".").pop()+ "&is_annotation=false";
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
            dispatch(fileUploadResult(file.name, 'success'))
          }).catch((error) => {
            dispatch(fileUploadResult(file.name, error.response.data.detail))
            console.log(error)
          });
        }
        //reader.readAsBinaryString();
      });
    }
  }, [access, dispatch, accessToken, main_or_supp, referenceCurie]);

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
  const loadingFileNames = useSelector(state => state.biblio.loadingFileNames);

  const compareFn = (a, b) => {
    if (a.file_class + a.display_name + a.file_extension > b.file_class + b.display_name + b.file_extension) {
      return 1;
    }
    if (a.file_class + a.display_name + a.file_extension < b.file_class + b.display_name + b.file_extension) {
      return -1;
    }
    return 0;
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
            <Col className={`Col-general ${cssDisplay} `}
                 lg={{span: 1}}>{referenceFile.pdf_type === null ? 'pdf' : referenceFile.pdf_type}</Col>
            <Col className={`Col-general ${cssDisplay} `}
                 lg={{span: 2}}>{referenceFile.file_publication_status}</Col>
            <Col className={`Col-general ${cssDisplayRight} `} lg={{span: 2}}><Button
                variant="outline-primary">delete</Button></Col>
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
  if ('referencefiles' in referenceJsonLive && referenceJsonLive['referencefiles'] !== null) {
    let referenceFilesWithAccess = referenceJsonLive['referencefiles']
        .filter((referenceFile) => access === 'developer' || referenceFile.referencefile_mods
            .some((mod) => mod.mod_abbreviation === access || mod.mod_abbreviation === null));

    let referenceFilesNoAccess = referenceJsonLive['referencefiles']
        .filter((referenceFile) => access !== 'developer' && referenceFile.referencefile_mods
            .every((mod) => mod.mod_abbreviation !== access && mod.mod_abbreviation !== null));

    referenceFilesWithAccess.sort(compareFn);
    referenceFilesNoAccess.sort(compareFn);
    rowReferencefileElements = [...getDisplayRowsFromReferenceFiles(referenceFilesWithAccess, true),
        ...getDisplayRowsFromReferenceFiles(referenceFilesNoAccess, false)];
    }
    if (rowReferencefileElements.length > 0) {
      const referencefileHeaderRow = (
          <Row key={`${fieldName} header`} className="Row-general" xs={2} md={4} lg={6}>
            <Col className={`Col-general ${cssDisplayLeft} `} lg={{ span: 2 }}><strong>File Class</strong></Col>
            <Col className={`Col-general ${cssDisplay} `} lg={{ span: 3 }}><strong>File Name</strong></Col>
            <Col className={`Col-general ${cssDisplay} `} lg={{ span: 2 }}><strong>Source</strong></Col>
            <Col className={`Col-general ${cssDisplay} `} lg={{ span: 1 }}><strong>Pdf Type</strong></Col>
            <Col className={`Col-general ${cssDisplay} `} lg={{ span: 2 }}><strong>File Publication Status</strong></Col>
            <Col className={`Col-general ${cssDisplayRight} `} lg={{ span: 2 }}><strong>Delete placeholder</strong></Col>
          </Row>);
      rowReferencefileElements.unshift( referencefileHeaderRow );
      return (<>{rowReferencefileElements}</>);
    } else { return null; }
}

export default BiblioFileManagement;
