
import { useState, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import axios from "axios";

import { RowDisplayString } from './BiblioDisplay';
import ModalGeneric from './ModalGeneric';

import {fileUploadResult, setFileUploadingModalText} from '../../actions/biblioActions';
import { setFileUploadingCount } from '../../actions/biblioActions';
import { setFileUploadingShowModal } from '../../actions/biblioActions';

import {useDropzone} from 'react-dropzone';

export const curieToNameEntityType = { 'ATP:0000005': 'gene', 'ATP:0000006': 'allele' };

const BiblioFileManagement = () => {
  return (<>
            <Container>
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
  const fileUploadResultMap = useSelector(state => state.biblio.fileUploadResultMap);

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
  }, [])
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

export default BiblioFileManagement;
