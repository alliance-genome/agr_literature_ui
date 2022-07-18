// import { Link } from 'react-router-dom'

import { useSelector, useDispatch } from 'react-redux';

import { downloadActionButtonDownload } from '../actions/downloadActions';
import { changeFieldDownloadMod } from '../actions/downloadActions';
import { setDownloadShowDownloading } from '../actions/downloadActions';

import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button'
import {Spinner} from "react-bootstrap";
import {Modal} from "react-bootstrap";


const Download = () => {
  const mods = ['FB', 'MGI', 'RGD', 'SGD', 'WB', 'XB', 'ZFIN']
  const dispatch = useDispatch();
  const accessToken = useSelector(state => state.isLogged.accessToken);
  const userId = useSelector(state => state.isLogged.userId);
  const isDownloading = useSelector(state => state.download.isDownloading);
  const mod = useSelector(state => state.download.mod);

  const buttonDownloadDisabled = isDownloading ? 'disabled' : '';

  return (
    <Container>
      <ModalDownloading />
      <Row>
        <Col>
          <h4>Download latest MOD reference dump .json</h4>
        </Col>
      </Row>
      <Row><Col>&nbsp;</Col></Row>
      <Row>
        <Col sm={3}></Col>
        <Col sm={2}>
            <Form.Control as="select" value={mod} name="mods" type="select" htmlSize="1" style={{width: '10em'}} onChange={(e) => dispatch(changeFieldDownloadMod(e))} >
              {mods.map((optionValue, index) => (
                  <option key={`mod ${index} ${optionValue}`}>{optionValue}</option>
              ))}
            </Form.Control>
        </Col>
        <Col sm={2}>
            <Button style={{width: "11em"}} disabled={buttonDownloadDisabled} onClick={() => dispatch(downloadActionButtonDownload(accessToken, mod)) }>{isDownloading ? <Spinner animation="border" size="sm"/> : "Download latest json"}</Button>
        </Col>
        <Col sm={2}>
            <Button style={{width: "11em"}} disabled={buttonDownloadDisabled} onClick={() => alert("Generating a dump of " + mod + ". The download link will be emailed to " + userId) }>Request new dump</Button>
        </Col>
        <Col sm={3}></Col>
      </Row>
    </Container>
  )
}

const ModalDownloading = () => {
  const showDownloadingModal = useSelector(state => state.download.showDownloadingModal);
  const dispatch = useDispatch();
  
  return (<Modal size="lg" show={showDownloadingModal} backdrop="static" onHide={() => dispatch(setDownloadShowDownloading(false))} >
           <Modal.Header closeButton><Modal.Title>Downloading</Modal.Title></Modal.Header>
           <Modal.Body>Your file is getting downloaded and will eventually show up in your downloads, no need to click the download button again</Modal.Body>
          </Modal>);
}

export default Download

//             <a
//               href="https://dev4006-literature-rest.alliancegenome.org/reference/dumps/latest/miniSGD"
//               download
//             >
//             <Button style={{width: "12em"}} >Download json</Button></a>
