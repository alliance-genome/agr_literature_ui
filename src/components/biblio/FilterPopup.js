import React from 'react';

export const FilterPopup = ({ show, options, selectedOptions, optionToName, onOptionChange, onClearClick, position }) => {
  return (
    show && (
      <div
        className="filter-popup"
        style={{
          position: 'absolute',
          top: position.top + 'px',
          left: position.left + 'px',
          zIndex: 999,
          background: '#EBF4FA',
          padding: '10px',
          borderRadius: '5px',
          boxShadow: '0 2px 5px rgba(0, 0, 0, 0.2)',
        }}
      >
          {Array.from(options).map((option) => (
          <div
            key={option}
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '5px',
            }}
          >
            <input
              type="checkbox"
              id={option}
              value={option}
              checked={selectedOptions.includes(option)}
              onChange={() => onOptionChange(option)}
              style={{ marginRight: '5px', alignSelf: 'flex-start' }}
            />
            <label
              htmlFor={option}
              style={{
                fontWeight: 'normal',
                whiteSpace: 'nowrap',
                display: 'inline-block',
              }}
            >
              {optionToName[option]}
            </label>
          </div>
        ))}
        <div>
          <button
            style={{
              background: 'white',
              border: '1px solid #ccc',
              padding: '5px',
              cursor: 'pointer',
              textAlign: 'left',
            }}
            onClick={onClearClick}
          >
            Clear
          </button>
        </div>
      </div>
    )
  );
};


