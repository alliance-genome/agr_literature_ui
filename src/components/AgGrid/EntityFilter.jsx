import React from 'react';
import { useSelector } from 'react-redux';
import MultiFilter from './MultiFilter';

const EntityFilter = ({ model, onModelChange }) => {
    const allEntities = useSelector(state => state.biblio.allEntities);
    return (
        <MultiFilter
            model={model}
            onModelChange={onModelChange}
            items={allEntities}
            label="entity_name"
        />
    );
};

export default EntityFilter;
