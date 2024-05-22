import { useGridFilter } from 'ag-grid-react';
import React, { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import Select from 'react-select';

const MultiFilter = ({ model, onModelChange, items, label }) => {
    const [closeFilter, setCloseFilter] = useState();
    const [unappliedModel, setUnappliedModel] = useState(model);
    const doesFilterPass = useCallback((params) => {
        // doesFilterPass only gets called if the filter is active
        return model.includes(params.data[label]);
    }, [model, label]);

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

    const onItemsChangeCheckbox = ({ target: { value, checked } }) => {
        let newModel = [];
        value = value === 'None' ? null : value;
        if (checked) {
            newModel = unappliedModel ? unappliedModel.concat([value]) : [value];
        } else {
            newModel = unappliedModel.filter(f => f !== value);
        }
        setUnappliedModel(newModel.length === 0 ? null : newModel);
    };

    const onItemsChangeTypeAhead = (selectedOptions) => {
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
            <div>Select {label.replace("_name", "")}</div><hr/>
            {items.length <= 10 ? (
                items.map((item) => {
                    let DisplayItem = item ? item : 'None';
                    return (
                        <div key={item}>
                            <input
                                type="checkbox"
                                id={item}
                                value={DisplayItem}
                                onChange={onItemsChangeCheckbox}
                                checked={unappliedModel && unappliedModel.includes(DisplayItem)}
                            />
                            <label htmlFor={item}> {DisplayItem}</label>
                        </div>
                    );
                })
            ) : (
	      <div style={{ height: '200px' }}> 
                <Select
                    isMulti
                    options={items.map(item => ({ value: item, label: item }))}
                    onChange={onItemsChangeTypeAhead}
                    value={unappliedModel ? unappliedModel.map(item => ({ value: item, label: item })) : []}
                />
	      </div>
            )}
            <hr/><button onClick={onClick}>Apply</button>
        </div>
    );
};

export default MultiFilter;
