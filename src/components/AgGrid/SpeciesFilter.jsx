import { useGridFilter } from 'ag-grid-react';
import React, { useCallback, useEffect, useState } from 'react';
import {useSelector} from "react-redux";


export default ({ model, onModelChange }) => {
    const [closeFilter, setCloseFilter] = useState();
    const [unappliedModel, setUnappliedModel] = useState(model);
    const curieToNameTaxon = useSelector(state => state.biblio.curieToNameTaxon);
    const allSpecies = useSelector(state => state.biblio.allSpecies);
    const doesFilterPass = useCallback((params) => {
        // doesFilterPass only gets called if the filter is active
        return model.includes(params.data.species);
    }, [model]);

    const afterGuiAttached = useCallback(({ hidePopup }) => {
        setCloseFilter(() => hidePopup);
    }, []);

    // register filter handlers with the grid
    useGridFilter({
        doesFilterPass,
        afterGuiAttached,
    });

    useEffect(() => {
        setUnappliedModel(model);
    }, [model]);

    const onSpeciesChange = ({ target: { value,checked } } ) => {
        let newModel = [];
        if(checked){
            newModel = unappliedModel ? unappliedModel.concat([value]) : [value];
        }
        else{
            newModel = unappliedModel.filter(f => f !== value)
        }
        setUnappliedModel(newModel.length===0 ? null : newModel);
    };

    const onClick = () => {
        onModelChange(unappliedModel);
        if (closeFilter) {
            closeFilter();
        }
    };

    return (
        <div className="species-filter">
            <div>Select Species</div>
            {Object.entries(curieToNameTaxon).filter(([key, value]) => allSpecies.includes(key)).map( ([key,value]) => {
                return  <div>
                            <input type="checkbox" id={key} value ={key} onChange={onSpeciesChange}/>
                            <label htmlFor={key}> {value}</label>
                        </div>
            })}
            <button onClick={onClick}>Apply</button>
        </div>
    );
};