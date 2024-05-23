import { useGridFilter } from 'ag-grid-react';
import React, { useCallback, useEffect, useState } from 'react';
import {useSelector} from "react-redux";


export default ({ model, onModelChange }) => {
    const [closeFilter, setCloseFilter] = useState();
    const [unappliedModel, setUnappliedModel] = useState(model);
    const allEntityTypes = useSelector(state => state.biblio.allEntityTypes);
    const doesFilterPass = useCallback((params) => {
        // doesFilterPass only gets called if the filter is active
        return model.includes(params.data.entity_type_name);
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

    const onEntityTypesChange = ({ target: { value,checked } } ) => {
        let newModel = [];
        value = value === 'None' ? null : value;
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
        <div className="custom-filter">
            <div>Select Entity Type</div><hr/>
            {allEntityTypes.map((entityType) => {
                let DisplayEntityType = entityType ? entityType : 'None';
                return  <div>
                    <input type="checkbox" id={entityType} value ={DisplayEntityType} onChange={onEntityTypesChange}/>
                    <label htmlFor={entityType}> {DisplayEntityType}</label>
                </div>
            })}
            <hr/><button onClick={onClick}>Apply</button>
        </div>
    );
};
