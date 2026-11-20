import React from 'react';
import { useSelector } from 'react-redux';
import MultiFilter from './MultiFilter';

// `items` arrives via colDef.filterParams (SCRUM-6618): curie-valued
// {value, label} options for server-side filtering. Without it, fall back to
// the legacy redux name list (client-side grids).
const TopicFilter = ({ model, onModelChange, items, serverMode }) => {
    const allTopics = useSelector(state => state.biblio.allTopics);
    // valueField only in curie mode: in the name-list fallback (and the
    // client-side grids — BiblioWorkflow, QuickTopicAddition — which never
    // pass items), the model holds names and must match topic_name, not a
    // topic field their rows don't have (review finding).
    const curieMode = !!(serverMode || (items && items.length > 0));
    return (
        <MultiFilter
            model={model}
            onModelChange={onModelChange}
            items={curieMode ? (items || []) : (allTopics || [])}
            label="topic_name"
            valueField={curieMode ? 'topic' : undefined}
        />
    );
};

export default TopicFilter;
