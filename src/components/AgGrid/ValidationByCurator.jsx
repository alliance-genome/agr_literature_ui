import React, {useState} from 'react';
import {useSelector} from "react-redux";
import axios from "axios";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheckCircle, faTimesCircle} from '@fortawesome/free-solid-svg-icons'

export default (props) => {
    const accessToken = useSelector(state => state.isLogged.accessToken);
    const oktaMod = useSelector(state => state.isLogged.oktaMod);
    const testerMod = useSelector(state => state.isLogged.testerMod);
    const accessLevel = (testerMod !== 'No') ? testerMod : oktaMod;

    const checkBoxElement = () => {
        const handleValidationClick = (validation) => {
            console.log(validation);
        }
        return(
            <span>
                <FontAwesomeIcon icon={faCheckCircle} onClick={function(){handleValidationClick('positive')}} style={{color: "#28a745"}}/>
                <FontAwesomeIcon icon={faTimesCircle} onClick={function(){handleValidationClick('negative')}} style={{color: "#dc3545"}}/>
            </span>
        )
    }


    return (
        <span>{props.data.topic_entity_tag_source.secondary_data_provider_abbreviation === accessLevel ? checkBoxElement() : null}{props.data.validation_by_professional_biocurator}</span>
    );
};