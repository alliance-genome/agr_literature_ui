import React from 'react';
import { useSelector } from 'react-redux';
import MultiFilter from './MultiFilter';

// `items` arrives via colDef.filterParams (SCRUM-6618): curie-valued
// {value, label} options for server-side filtering. Without it, fall back to
// the legacy redux name list, matching the hand-rolled checkbox filter this
// wrapper replaced.
const EntityTypeFilter = ({ model, onModelChange, items, serverMode }) => {
    const allEntityTypes = useSelector(state => state.biblio.allEntityTypes);
    // valueField only in curie mode: the name-list fallback's model holds
    // names and must match entity_type_name (review finding).
    const curieMode = !!(serverMode || (items && items.length > 0));
    return (
        <MultiFilter
            model={model}
            onModelChange={onModelChange}
            items={curieMode ? (items || []) : (allEntityTypes || [])}
            label="entity_type_name"
            valueField={curieMode ? 'entity_type' : undefined}
        />
    );
};

export default EntityTypeFilter;
