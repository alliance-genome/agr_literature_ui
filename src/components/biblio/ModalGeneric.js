import { useDispatch } from 'react-redux';

import Modal from 'react-bootstrap/Modal'

const ModalGeneric = ({showGenericModal, genericModalHeader, genericModalBody, onHideAction}) => {
  const dispatch = useDispatch();
  if (showGenericModal) {
    return (<Modal size="lg" show={showGenericModal} backdrop="static" onHide={() => dispatch(onHideAction)} >
             <Modal.Header closeButton><Modal.Title>{genericModalHeader}</Modal.Title></Modal.Header>
             <Modal.Body><div dangerouslySetInnerHTML={{__html:`${genericModalBody}`}}/></Modal.Body>
            </Modal>); }
  return null;
}

export default ModalGeneric;
