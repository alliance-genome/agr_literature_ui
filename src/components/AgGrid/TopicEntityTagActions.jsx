import React, {useState} from 'react';
import {useSelector} from "react-redux";
import axios from "axios";

export default (props) => {
    const accessToken = useSelector(state => state.isLogged.accessToken);
    const oktaMod = useSelector(state => state.isLogged.oktaMod);
    const testerMod = useSelector(state => state.isLogged.testerMod);
    const accessLevel = (testerMod !== 'No') ? testerMod : oktaMod;

    const handleDeleteClick = async () => {
        let mod = props.data.topic_entity_tag_source.secondary_data_provider_abbreviation;
        let id = props.data.topic_entity_tag_id;
        if (mod !== accessLevel) {
            console.error("Permission denied. Cannot delete this row.");
            return;
        }
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
    };


    return (
    <span>
        {props.data.topic_entity_tag_source.secondary_data_provider_abbreviation === accessLevel ? <button onClick={() => handleDeleteClick()}>Delete</button> : null}
    </span>
    );
};