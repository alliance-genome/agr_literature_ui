import React from 'react';
import { useSelector } from 'react-redux';
import MultiFilter from './MultiFilter';

// `items` arrives via colDef.filterParams (SCRUM-6618): curie-valued
// {value, label} options for server-side filtering. Without it, fall back to
// the legacy redux name list (client-side grids).
const EntityFilter = ({ model, onModelChange, items }) => {
    const allEntities = useSelector(state => state.biblio.allEntities);
    return (
        <MultiFilter
            model={model}
            onModelChange={onModelChange}
            items={items && items.length > 0 ? items : (allEntities || [])}
            label="entity_name"
            valueField="entity"
        />
    );
};

export default EntityFilter;
