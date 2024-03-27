import React, {useState} from 'react';
import {useSelector} from "react-redux";
import axios from "axios";
import Modal from "react-bootstrap/Modal";
import Button from 'react-bootstrap/Button';

export default (props) => {
    const accessToken = useSelector(state => state.isLogged.accessToken);
    const oktaMod = useSelector(state => state.isLogged.oktaMod);
    const testerMod = useSelector(state => state.isLogged.testerMod);
    const accessLevel = (testerMod !== 'No') ? testerMod : oktaMod;
    const [showModal, setShowModal] = useState(true);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const handleClose = () => { setShowModal(false);}
    const handleConfirm = () => {setConfirmDelete(true);}

    //popup for TET delete confirmation
    const handleTETDeleteConfirmModal = ({ title, body, showModal }) => {
    // function handleTETDeleteConfirmModal  ({ title, body, showModal, onHide }) {
        console.log("enter handleTETDeleteConfirmModal.");
        return (
            <Modal  show={showModal} >
                <Modal.Header closeButton>
                 <Modal.Title>{title}</Modal.Title>
                </Modal.Header>
                <Modal.Body>{body}</Modal.Body>
                <Modal.Footer>
                  <Button variant="cancel" onClick={handleClose}>
                   Cancel
                  </Button>
                  <Button variant="confirm" onClick={handleConfirm()}>
                   Confirm
                  </Button>
                 </Modal.Footer>
            </Modal>
        );
    };
    const handleDeleteClick = async () => {
        let mod = props.data.topic_entity_tag_source.secondary_data_provider_abbreviation;
        let id = props.data.topic_entity_tag_id;
        if (mod !== accessLevel) {
            console.error("Permission denied. Cannot delete this row.");
            return;
        }
        //call to confirm the TET delete
       console.log("start here1.");
        // handleTETDeleteConfirmModal("Full Note" , "body here ", showModal, false) ;
       { showModal && (  <handleTETDeleteConfirmModal title="Full Note" body="body here " show={showModal}  />)}
        console.log("come to here 2.");

     if (confirmDelete) {
        console.log("start to delete");
        try {
            const url = process.env.REACT_APP_RESTAPI + "/topic_entity_tag/" + id;
            const response = await axios.delete(url, {
                headers: {
                    "Authorization": "Bearer " + accessToken,
                    "Content-Type": "application/json"
                }
            });

            // status_code=status.HTTP_204_NO_CONTENT
            if (response.status === 204) {
                // remove the deleted item from the state so that the UI updates
                props.api.applyTransaction({ remove: [ props.api.getRowNode(props.node.id).data ] });

            } else {
                console.error("Failed to delete the item:", response.data);
            }
        } catch (error) {
            console.error("Error deleting item:", error);
        }
     }
    };


    return (
    <span>
        {props.data.topic_entity_tag_source.secondary_data_provider_abbreviation === accessLevel ? <button onClick={() => handleDeleteClick()}>Delete</button> : null}
    </span>
    );
};