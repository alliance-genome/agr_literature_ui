// import { Link } from 'react-router-dom'

import { useSelector, useDispatch } from 'react-redux';
import { useLocation } from 'react-router-dom';

import { downloadActionButtonDownload } from '../actions/downloadActions';
import { downloadActionButtonGenerate } from '../actions/downloadActions';
import { changeFieldDownloadMod } from '../actions/downloadActions';
// import { setDownloadShowDownloading } from '../actions/downloadActions';
// import { setDownloadShowGenerating } from '../actions/downloadActions';
import { setDownloadShowGeneric } from '../actions/downloadActions';
// import { downloadUpdateGenericModal } from '../actions/downloadActions';

import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button'
import {Spinner} from "react-bootstrap";
import {Modal} from "react-bootstrap";


const Download = () => {
  const dispatch = useDispatch();
  const mods = useSelector(state => state.app.mods);
  const accessToken = useSelector(state => state.isLogged.accessToken);
  const autoDownloadOndemand = useSelector(state => state.download.autoDownloadOndemand);
  const isDownloadingNightly = useSelector(state => state.download.isDownloadingNightly);
  const isDownloadingOndemand = useSelector(state => state.download.isDownloadingOndemand);
  const isRequestingGeneration = useSelector(state => state.download.isRequestingGeneration);
  const mod = useSelector(state => state.download.mod);
  const userId = useSelector(state => state.isLogged.userId);

  const showGenericModal = useSelector(state => state.download.showGenericModal);
  const genericModalHeader = useSelector(state => state.download.genericModalHeader);
  const genericModalBody = useSelector(state => state.download.genericModalBody);

  const buttonDownloadNightlyDisabled = (isDownloadingNightly || (userId === null) || (accessToken === null)) ? 'disabled' : '';
  const buttonDownloadGenerateDisabled = (isRequestingGeneration || (userId === null) || (accessToken === null)) ? 'disabled' : '';

  let notDownloadingMessage = '';

  const useQuery = () => { return new URLSearchParams(useLocation().search); }
  let query = useQuery();
  // console.log(query);
  let paramAction = query.get('action');
  let paramFilename = query.get('filename');
  if ( (paramFilename !== null) && (paramFilename !== '') &&
       (paramAction !== null) && (paramAction === 'filedownload') &&
       autoDownloadOndemand && (isDownloadingOndemand === false) ) {
    if (accessToken === null) { 
      // this if is needed because when page loads, the cognito accessToken isn't there right away
      notDownloadingMessage = (<Row><Col><h4>Your automated download is not happening because you are not Signed In.</h4><br/></Col></Row>);
      // const modalHeader = 'Unauthorized';
      // const modalBody = 'Need to be Signed In to cognito.';
      // dispatch(downloadUpdateGenericModal(modalHeader, modalBody));
      // console.log('need to be signed on');
    } else {
      // console.log(paramFilename);
      dispatch(downloadActionButtonDownload(accessToken, paramFilename, 'ondemand'));
    }
  }
  // console.log(paramAction);
  // console.log(paramFilename);
  // download?action=filedownload&filename=20220618

  return (
    <Container>
      <ModalGeneric showGenericModal={showGenericModal} genericModalHeader={genericModalHeader} genericModalBody={genericModalBody} />
      {notDownloadingMessage}
      <Row>
        <Col>
          <h4>Download latest MOD reference dump .json</h4>
        </Col>
      </Row>
      <Row><Col>&nbsp;</Col></Row>
      <Row>
        <Col sm={2}></Col>
        <Col sm={2}>
            <Form.Control as="select" value={mod} name="mods" type="select" htmlSize="1" style={{width: '10em'}} onChange={(e) => dispatch(changeFieldDownloadMod(e))} >
              {mods.map((optionValue, index) => (
                  <option key={`mod ${index} ${optionValue}`}>{optionValue}</option>
              ))}
            </Form.Control>
        </Col>
        <Col sm={3}>
            <Button style={{width: "12em"}} disabled={buttonDownloadNightlyDisabled} onClick={() => dispatch(downloadActionButtonDownload(accessToken, mod, 'nightly')) }>{isDownloadingNightly ? <Spinner animation="border" size="sm"/> : "Download Nightly File"}</Button>
        </Col>
        <Col sm={3}>
            <Button style={{width: "12em"}} disabled={buttonDownloadGenerateDisabled} onClick={() => dispatch(downloadActionButtonGenerate(accessToken, mod, userId))}>{isRequestingGeneration ? <Spinner animation="border" size="sm"/> : "Generate New File"}</Button>
        </Col>
        <Col sm={2}></Col>
      </Row>
      { isDownloadingOndemand && (
        <>
        <Row><Col>&nbsp;</Col></Row>
        <Row>
          <Col sm={4}></Col>
          <Col sm={3}>Downloading new file in progress {paramFilename} <Spinner animation="border" size="sm"/></Col>
          <Col sm={5}></Col>
        </Row>
        </>
      ) }
    </Container>
  )
}

const ModalGeneric = ({showGenericModal, genericModalHeader, genericModalBody}) => {
  const dispatch = useDispatch();
  if (showGenericModal) { 
    return (<Modal size="lg" show={showGenericModal} backdrop="static" onHide={() => dispatch(setDownloadShowGeneric(false))} >
             <Modal.Header closeButton><Modal.Title>{genericModalHeader}</Modal.Title></Modal.Header>
             <Modal.Body>{genericModalBody}</Modal.Body>
            </Modal>); }
  return null;
}

// const ModalDownloading = () => {
//   const showDownloadingModal = useSelector(state => state.download.showDownloadingModal);
//   const dispatch = useDispatch();
//   
//   return (<Modal size="lg" show={showDownloadingModal} backdrop="static" onHide={() => dispatch(setDownloadShowDownloading(false))} >
//            <Modal.Header closeButton><Modal.Title>Downloading</Modal.Title></Modal.Header>
//            <Modal.Body>Your file is getting downloaded and will eventually show up in your downloads, no need to click the download button again</Modal.Body>
//           </Modal>);
// }

//             <Button style={{width: "12em"}} disabled={buttonDownloadGenerateDisabled} onClick={() => {
// 
//               const modalHeader = 'Generating File';
//               const modalBody = "Generating a new reference file for " + mod + ". A download link will be emailed to " + userId;
//               dispatch(downloadUpdateGenericModal(modalHeader, modalBody));
//               } } >Generate New File</Button>
//             <Button style={{width: "12em"}} disabled={buttonDownloadGenerateDisabled} onClick={() => dispatch(setDownloadShowGenerating(true))}>Generate New File</Button>
// TODO replace this once we have an API for generating. replace setDownloadShowGenerating with new action that calls API and returns a message for generic modal
// const ModalGenerating = () => {
//   const showGeneratingModal = useSelector(state => state.download.showGeneratingModal);
//   const mod = useSelector(state => state.download.mod);
//   const userId = useSelector(state => state.isLogged.userId);
//   const dispatch = useDispatch();
//   
//   return (<Modal size="lg" show={showGeneratingModal} backdrop="static" onHide={() => dispatch(setDownloadShowGenerating(false))} >
//            <Modal.Header closeButton><Modal.Title>Generating</Modal.Title></Modal.Header>
//            <Modal.Body>Generating a new reference file for {mod}. A download link will be emailed to {userId}</Modal.Body>
//           </Modal>);
// }

export default Download

//             <a
//               href="https://dev4006-literature-rest.alliancegenome.org/reference/dumps/latest/miniSGD"
//               download
//             >
//             <Button style={{width: "12em"}} >Download json</Button></a>
