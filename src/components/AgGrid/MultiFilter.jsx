import { useGridFilter } from 'ag-grid-react';
import React, { useCallback, useEffect, useState } from 'react';
import Select from 'react-select';

const MultiFilter = ({ model: rawModel, onModelChange, items, label }) => {
    const model = Array.isArray(rawModel) ? rawModel : null;
    const [closeFilter, setCloseFilter] = useState();
    const [unappliedModel, setUnappliedModel] = useState(model);
    const doesFilterPass = useCallback((params) => {
        // doesFilterPass only gets called if the filter is active
        return model ? model.includes(params.data[label]) : true;
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

    // const sortedItems = items.slice().sort((a, b) => a.localeCompare(b));
    const sortedItems = items.slice().sort((a, b) => {
	if (a === null && b === null) return 0;
	if (a === null) return 1;
	if (b === null) return -1;
	return a.localeCompare(b);
    });
    
    return (
        <div className="custom-filter">
            <div>Select {label.replace("_name", "")}</div><hr/>
            {items.length <= 10 ? (
                sortedItems.map((item) => {
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
                <div style={{ height: '250px' }}>
                    <Select
                        isMulti
                        defaultMenuIsOpen={true}
                        menuIsOpen={true}
                        styles={customStyles}
                        options={sortedItems.map(item => ({ value: item, label: item }))}
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
