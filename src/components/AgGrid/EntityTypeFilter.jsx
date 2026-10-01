import React from 'react';
import { useSelector } from 'react-redux';
import MultiFilter from './MultiFilter';

// `items` arrives via colDef.filterParams (SCRUM-6618): curie-valued
// {value, label} options for server-side filtering. Without it, fall back to
// the legacy redux name list, matching the hand-rolled checkbox filter this
// wrapper replaced.
const EntityTypeFilter = ({ model, onModelChange, items }) => {
    const allEntityTypes = useSelector(state => state.biblio.allEntityTypes);
    return (
        <MultiFilter
            model={model}
            onModelChange={onModelChange}
            items={items && items.length > 0 ? items : (allEntityTypes || [])}
            label="entity_type_name"
            valueField="entity_type"
        />
    );
};

export default EntityTypeFilter;
