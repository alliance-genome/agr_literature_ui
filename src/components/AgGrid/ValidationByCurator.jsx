import React, {useState} from 'react';
import {useDispatch, useSelector} from "react-redux";
import axios from "axios";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheckCircle, faTimesCircle} from '@fortawesome/free-solid-svg-icons'
import {updateButtonBiblioEntityAdd} from "../../actions/biblioActions";

export default (props) => {
    const dispatch = useDispatch();
    const allOktaStuff = useSelector(state => state.isLogged);
    const uid = useSelector(state => state.isLogged.uid);
    const accessToken = useSelector(state => state.isLogged.accessToken);
    const oktaMod = useSelector(state => state.isLogged.oktaMod);
    const testerMod = useSelector(state => state.isLogged.testerMod);
    const referenceCurie = useSelector(state => state.biblio.referenceCurie);
    const topicEntitySourceId = useSelector(state => state.biblio.topicEntitySourceId);
    const accessLevel = (testerMod !== 'No') ? testerMod : oktaMod;
    const state = useSelector(state => state.biblio);

    const checkBoxElement = () => {
        console.log(topicEntitySourceId);
        console.log(state);
        //Should entity_id_validation always be alliance?
        //Should source Id always be 290? NO
        //source method abc_literature_system
        //source assertion ATP:0000036
        //Need to generate id.
        const handleValidationClick = (validation) => {
            let payload = {
                confidence_level: props.data.confidence_level,
                entity_type: props.data.entity_type,
                entity: props.data.entity,
                entity_id_validation: props.data.entity ? "alliance" : null,
                negated: validation === 'positive' ? props.data.negated : !props.data.negated,
                note: null,
                novel_topic_data: props.data.novel_topic_data,
                reference_curie: props.data.reference_id,
                species: props.data.species,
                topic: props.data.topic,
                topic_entity_tag_source_id: topicEntitySourceId
            }
            console.log(payload);
            dispatch(updateButtonBiblioEntityAdd([accessToken, 'topic_entity_tag/', payload, 'POST'],accessLevel));

        }
        return(
            <span>
                <FontAwesomeIcon icon={faCheckCircle} onClick={function(){handleValidationClick('positive')}} style={{color: "#28a745"}}/>
                <FontAwesomeIcon icon={faTimesCircle} onClick={function(){handleValidationClick('negative')}} style={{color: "#dc3545"}}/>
            </span>
        )
    }


    return (
        <span>{(props.data.topic_entity_tag_source.secondary_data_provider_abbreviation === accessLevel) && (uid !== props.data.created_by) ? checkBoxElement() : null}{props.data.validation_by_professional_biocurator}</span>
    );
};