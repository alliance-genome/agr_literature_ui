import React from 'react';
import { useSelector } from 'react-redux';
import MultiFilter from './MultiFilter';

const TopicFilter = ({ model, onModelChange }) => {
    const allTopics = useSelector(state => state.biblio.allTopics);
    return (
        <MultiFilter
            model={model}
            onModelChange={onModelChange}
            items={allTopics}
            label="topic_name"
        />
    );
};

export default TopicFilter;
