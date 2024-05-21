import { useGridFilter } from 'ag-grid-react';
import React, { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import Select from 'react-select';

export default ({ model, onModelChange }) => {
    const [closeFilter, setCloseFilter] = useState();
    const [unappliedModel, setUnappliedModel] = useState(model);
    const allEntities = useSelector(state => state.biblio.allEntities);
    const doesFilterPass = useCallback((params) => {
        // doesFilterPass only gets called if the filter is active
        return model.includes(params.data.entity_name);
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

    const onEntitiesChangeCheckbox = ({ target: { value, checked } }) => {
        let newModel = [];
        value = value === 'None' ? null : value;
        if (checked) {
            newModel = unappliedModel ? unappliedModel.concat([value]) : [value];
        } else {
            newModel = unappliedModel.filter(f => f !== value);
        }
        setUnappliedModel(newModel.length === 0 ? null : newModel);
    };

    const onEntitiesChangeTypeAhead = (selectedOptions) => {
        const newModel = selectedOptions ? selectedOptions.map(option => option.value) : [];
        setUnappliedModel(newModel.length === 0 ? null : newModel);
    };

    const onClick = () => {
        onModelChange(unappliedModel);
        if (closeFilter) {
            closeFilter();
        }
    };

    return (
        <div className="custom-filter">
            <div>Select Entity</div><hr/>
            {allEntities.length <= 10 ? (
                allEntities.map((entity) => {
                    let DisplayEntity = entity ? entity : 'None';
                    return (
                        <div key={entity}>
                            <input
                                type="checkbox"
                                id={entity}
                                value={DisplayEntity}
                                onChange={onEntitiesChangeCheckbox}
                                checked={unappliedModel && unappliedModel.includes(DisplayEntity)}
                            />
                            <label htmlFor={entity}> {DisplayEntity}</label>
                        </div>
                    );
                })
            ) : (
                <Select
                    isMulti
                    options={allEntities.map(entity => ({ value: entity, label: entity }))}
                    onChange={onEntitiesChangeTypeAhead}
                    value={unappliedModel ? unappliedModel.map(entity => ({ value: entity, label: entity })) : []}
                />
            )}
            <hr/><button onClick={onClick}>Apply</button>
        </div>
    );
};
