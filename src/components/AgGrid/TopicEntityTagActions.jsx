import React, {useState} from 'react';
import {useDispatch, useSelector} from "react-redux";
import axios from "axios";
import Modal from "react-bootstrap/Modal";
import Button from 'react-bootstrap/Button';
import {
    changeFieldEntityAddGeneralField,
    setEditTag,
    setTypeaheadName2CurieMap
} from "../../actions/biblioActions";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faEdit, faTrashAlt} from "@fortawesome/free-solid-svg-icons";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";

export default (props) => {
    const dispatch = useDispatch();
    const accessToken = useSelector(state => state.isLogged.accessToken);
    const oktaMod = useSelector(state => state.isLogged.oktaMod);
    const testerMod = useSelector(state => state.isLogged.testerMod);
    const editTag = useSelector(state => state.biblio.editTag);
    const accessLevel = (testerMod !== 'No') ? testerMod : oktaMod;
    const [showModal, setShowModal] = useState(false);
    const handleClose = () => { setShowModal(false);}
    const title = "Please confirm delete here:";
    const [topicBody, setTopicBody] = useState("");
    const [entityTypeBody, setEntityTypeBody] = useState("");
    const [entityBody, setEntityBody] = useState("");
    const [noDataBody, setNoDataBody] = useState("");
    const [novelDataBody, setNovelDataBody] = useState("");

    const handleDeleteClick = async () => {
        let mod = props.data.topic_entity_tag_source.secondary_data_provider_abbreviation;
        if (mod !== accessLevel) {
            console.error("Permission denied. Cannot delete this row.");
            return;
        }
        let topic=props.data.topic_name;
        let entityType=props.data.entity_type_name;
        let entity=props.data.entity_name;
        let noData=(props.data.negated === null) ? "null" : props.data.negated.toString();
        let novelData=(props.data.novel_topic_data  === null) ? "null" : props.data.novel_topic_data.toString();
        setTopicBody(topic);
        setEntityTypeBody(entityType);
        setEntityBody(entity);
        setNoDataBody(noData);
        setNovelDataBody(novelData);
        setShowModal(true);
    }

    const handleDeleteConfirm = async () => {
        let id = props.data.topic_entity_tag_id;
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
        setShowModal(false);
    };

    const handleEditClick = () => {
        if(editTag === props.data.topic_entity_tag_id){
            dispatch(setEditTag(null));
            dispatch(changeFieldEntityAddGeneralField({ target: { id: 'topicSelect', value: ''} }));
        }
        else{
            dispatch(setEditTag(props.data.topic_entity_tag_id));
            dispatch(setTypeaheadName2CurieMap({[props.data.topic_name]: props.data.topic}));
            dispatch(changeFieldEntityAddGeneralField({ target: { id: 'topicSelect', value: props.data.topic} }));
            if (props.data.entity_id_validation === 'WB') {
                dispatch(changeFieldEntityAddGeneralField({ target: { id: 'taxonSelect', value: 'use_wb' } }));
                dispatch(changeFieldEntityAddGeneralField({ target: { id: 'taxonSelectWB', value: props.data.species } }));
            }
            else{
                dispatch(changeFieldEntityAddGeneralField({ target: { id: 'taxonSelect', value: props.data.species } }));
            }
            dispatch(changeFieldEntityAddGeneralField({ target: { id: 'novelCheckbox', value: props.data.novel_topic_data } }));
            dispatch(changeFieldEntityAddGeneralField({ target: { id: 'noDataCheckbox', value: props.data.negated } }));
            dispatch(changeFieldEntityAddGeneralField({ target: { id: 'notetextarea', value: props.data.note ? props.data.note : '' } }));
            if (props.data.entity_type){
                dispatch(changeFieldEntityAddGeneralField({ target: { id: 'entitytextarea', value: props.data.entity_name } }));
                dispatch(changeFieldEntityAddGeneralField({ target: { id: 'entityTypeSelect', value: props.data.entity_type } }));
            }
            else{
                dispatch(changeFieldEntityAddGeneralField({ target: { id: 'entitytextarea', value: '' } }));
                dispatch(changeFieldEntityAddGeneralField({ target: { id: 'entityTypeSelect', value: '' } }));
            }
        }
    }


    let show_del = props.data.topic_entity_tag_source.validation_type === 'professional_biocurator' &&
        props.data.topic_entity_tag_source.secondary_data_provider_abbreviation === accessLevel;
    return (
    <span>
    { show_del   ?
        <div>
            <Modal show={showModal} onHide={handleClose}>
                <Modal.Header closeButton>
                    <Modal.Title>{title}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Container>
                        <Row><Col md="4">Topic:</Col><Col>{topicBody}</Col></Row>
                        <Row><Col md="4">Entity Type:</Col><Col>{entityTypeBody}</Col></Row>
                        <Row><Col md="4">Entity:</Col><Col>{entityBody}</Col></Row>
                        <Row><Col md="4">No Data:</Col><Col>{noDataBody}</Col></Row>
                        <Row><Col md="4">Novel Data:</Col><Col>{novelDataBody}</Col></Row>
                    </Container>
                </Modal.Body>
                <Modal.Footer>
                    <Button onClick={handleClose}>
                        Cancel
                    </Button>
                    <Button variant="danger" onClick={handleDeleteConfirm}>
                        Confirm
                    </Button>
                </Modal.Footer>
            </Modal>
            <Button onClick={() => handleDeleteClick()} size='sm'><FontAwesomeIcon icon={faTrashAlt}/></Button>
            &nbsp;
            <Button onClick={() => handleEditClick()} size='sm' variant={editTag === props.data.topic_entity_tag_id ? 'danger' : 'primary'}><FontAwesomeIcon icon={faEdit}/></Button>


        </div> : null}
    </span>
    );
};
