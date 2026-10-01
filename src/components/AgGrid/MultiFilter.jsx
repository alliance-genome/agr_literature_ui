import { useGridFilter } from 'ag-grid-react';
import React, { useCallback, useEffect, useState } from 'react';
import Select from 'react-select';

// `items` may be plain strings (legacy: display names, matched client-side via
// `label`) or {value, label} objects (SCRUM-6618: curie values with resolved
// name labels, for grids whose filtering happens server-side). The filter
// model is always the array of selected item VALUES. `valueField` names the
// row field the values match (defaults to `label` for the legacy string mode).
const MultiFilter = ({ model: rawModel, onModelChange, items, label, valueField }) => {
    const model = Array.isArray(rawModel) ? rawModel : null;
    const [closeFilter, setCloseFilter] = useState();
    const [unappliedModel, setUnappliedModel] = useState(model);
    const options = (items || []).map((item) =>
        item && typeof item === 'object' ? item : { value: item, label: item }
    );
    const doesFilterPass = useCallback((params) => {
        // doesFilterPass only gets called if the filter is active; with the
        // infinite row model the server has already filtered and this never runs.
        return model ? model.includes(params.data[valueField || label]) : true;
    }, [model, label, valueField]);

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

    const customStyles = {
        menu: (provided) => ({
            ...provided,
            zIndex: 9999,
        }),
        menuList: (provided) => ({
            ...provided,
            maxHeight: 200, 
        }),
        dropdownIndicator: () => ({
            display: 'none'
        }),
    };

    const sortedOptions = options.slice().sort((a, b) => {
	if (a.label === null && b.label === null) return 0;
	if (a.label === null) return 1;
	if (b.label === null) return -1;
	return a.label.localeCompare(b.label);
    });
    const labelByValue = new Map(options.map((o) => [o.value, o.label]));

    return (
        <div className="custom-filter">
            <div>Select {label.replace("_name", "")}</div><hr/>
            {options.length <= 10 ? (
                sortedOptions.map((option) => {
                    const displayLabel = option.label ? option.label : 'None';
                    return (
                        <div key={option.value}>
                            <input
                                type="checkbox"
                                id={option.value}
                                value={option.value ? option.value : 'None'}
                                onChange={onItemsChangeCheckbox}
                                checked={unappliedModel && unappliedModel.includes(option.value)}
                            />
                            <label htmlFor={option.value}> {displayLabel}</label>
                        </div>
                    );
                })
            ) : (
                <div style={{ height: '250px' }}>
                    <Select
                        isMulti
                        defaultMenuIsOpen={true}
                        menuIsOpen={true}
                        styles={customStyles}
                        options={sortedOptions.map((o) => ({ value: o.value, label: o.label ? o.label : 'None' }))}
                        onChange={onItemsChangeTypeAhead}
                        value={unappliedModel
                            ? unappliedModel.map((v) => ({ value: v, label: labelByValue.get(v) || v || 'None' }))
                            : []}
                    />
                </div>
            )}
            <hr/><button onClick={onClick}>Apply</button>
        </div>
    );
};

export default MultiFilter;
