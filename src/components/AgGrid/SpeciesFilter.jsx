import React from 'react';
import { useSelector } from 'react-redux';
import MultiFilter from './MultiFilter';

// `items` arrives via colDef.filterParams (SCRUM-6618): curie-valued
// {value, label} options for server-side filtering. Without it, fall back to
// the taxon map scoped to the loaded tags' species — the model was already
// curie-valued in the hand-rolled checkbox filter this wrapper replaced.
const SpeciesFilter = ({ model, onModelChange, items }) => {
    const curieToNameTaxon = useSelector(state => state.biblio.curieToNameTaxon);
    const allSpecies = useSelector(state => state.biblio.allSpecies);
    const fallback = Object.entries(curieToNameTaxon || {})
        .filter(([curie]) => (allSpecies || []).includes(curie))
        .map(([curie, name]) => ({ value: curie, label: name }));
    return (
        <MultiFilter
            model={model}
            onModelChange={onModelChange}
            items={items && items.length > 0 ? items : fallback}
            label="species_name"
            valueField="species"
        />
    );
};

export default SpeciesFilter;
