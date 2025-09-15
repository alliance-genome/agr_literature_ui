import React from 'react';
import {useDispatch, useSelector} from "react-redux";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheckCircle, faTimesCircle} from '@fortawesome/free-solid-svg-icons'
import {updateButtonBiblioEntityAdd, setBiblioUpdatingEntityAdd} from "../../actions/biblioActions";
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

export default (props) => {
    const dispatch = useDispatch();
    const uid = useSelector(state => state.isLogged.uid);
    const accessToken = useSelector(state => state.isLogged.accessToken);
    const oktaMod = useSelector(state => state.isLogged.oktaMod);
    const testerMod = useSelector(state => state.isLogged.testerMod);
    const referenceCurie = useSelector(state => state.biblio.referenceCurie);
    const topicEntitySourceId = useSelector(state => state.biblio.topicEntitySourceId);
    const accessLevel = (testerMod !== 'No') ? testerMod : oktaMod;

    const checkBoxElement = () => {
        const handleValidationClick = async (validation) => {
            let payload = {
                confidence_level: null,
                entity_type: props.data.entity_type,
                entity: props.data.entity,
                entity_id_validation: props.data.entity ? "alliance" : null,
                negated: validation === 'positive' ? props.data.negated : !props.data.negated,
                note: null,
                data_novelty: props.data.data_novelty,
                reference_curie: referenceCurie,
                species: props.data.species,
                topic: props.data.topic,
                topic_entity_tag_source_id: topicEntitySourceId,
                force_insertion: true
            }
            
            // Follow the same pattern as TopicEntityCreate - set counter to 1 before action
            dispatch(setBiblioUpdatingEntityAdd(1));
            await dispatch(updateButtonBiblioEntityAdd([accessToken, 'topic_entity_tag/', payload, 'POST'],accessLevel));
            // updateButtonBiblioEntityAdd will decrement the counter, making it 0
            // The change from 1 to 0 should trigger the table reload
        }

        return(
            <span>
                <FontAwesomeIcon 
                    icon={faCheckCircle} 
                    size='lg' 
                    onClick={function(){handleValidationClick('positive')}} 
                    style={{color: "#28a745", cursor: "pointer"}}
                    title="Validate as correct"
                />
                &nbsp;
                <FontAwesomeIcon 
                    icon={faTimesCircle} 
                    size='lg' 
                    onClick={function(){handleValidationClick('negative')}} 
                    style={{color: "#dc3545", cursor: "pointer"}}
                    title="Validate as incorrect"
                />
            </span>
        )
    }


    return (
        <Container style={{ padding: '0px'}}><Row>
            <Col xs={3}>
                {(props.data.topic_entity_tag_source.secondary_data_provider_abbreviation === accessLevel) && (uid !== props.data.created_by) && (!props.data.validating_users || !props.data.validating_users.includes(uid)) ? checkBoxElement() : null}
            </Col>
            <Col style={{textOverflow: 'ellipsis', overflow: 'hidden'}}>
                {props.data.validation_by_professional_biocurator}
            </Col>
        </Row></Container>
    );
};