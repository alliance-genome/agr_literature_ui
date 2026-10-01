import React from 'react';
import { useSelector } from 'react-redux';
import MultiFilter from './MultiFilter';

// `items` arrives via colDef.filterParams (SCRUM-6618): curie-valued
// {value, label} options for server-side filtering. Without it, fall back to
// the legacy redux name list (client-side grids).
const TopicFilter = ({ model, onModelChange, items }) => {
    const allTopics = useSelector(state => state.biblio.allTopics);
    return (
        <MultiFilter
            model={model}
            onModelChange={onModelChange}
            items={items && items.length > 0 ? items : (allTopics || [])}
            label="topic_name"
            valueField="topic"
        />
    );
};

export default TopicFilter;
