import React from 'react';
import { useSelector } from 'react-redux';
import MultiFilter from './MultiFilter';

// `items` arrives via colDef.filterParams (SCRUM-6618): curie-valued
// {value, label} options for server-side filtering. Without it, fall back to
// the legacy redux name list (client-side grids).
const EntityFilter = ({ model, onModelChange, items, serverMode }) => {
    const allEntities = useSelector(state => state.biblio.allEntities);
    // valueField only in curie mode: the name-list fallback's model holds
    // names and must match entity_name (review finding).
    const curieMode = !!(serverMode || (items && items.length > 0));
    return (
        <MultiFilter
            model={model}
            onModelChange={onModelChange}
            items={curieMode ? (items || []) : (allEntities || [])}
            label="entity_name"
            valueField={curieMode ? 'entity' : undefined}
        />
    );
};

export default EntityFilter;
