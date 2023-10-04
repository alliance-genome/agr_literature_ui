import React, { useState, useEffect } from 'react';

export const SpeciesFilter = ({ show, speciesInResultSet, selectedSpecies, curieToNameTaxon, onCheckboxChange, onClearButtonClick, position }) => {
  return (
    show && (
      <div
        className="species-filter-popup"
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
        {Array.from(speciesInResultSet).map((curie) => (
          <div
            key={curie}
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '5px',
            }}
          >
            <input
              type="checkbox"
              id={curie}
              value={curie}
              checked={selectedSpecies.includes(curie)}
              onChange={() => onCheckboxChange(curie)}
              style={{ marginRight: '5px', alignSelf: 'flex-start' }}
            />
            <label
              htmlFor={curie}
              style={{
                fontWeight: 'normal',
                whiteSpace: 'nowrap',
                display: 'inline-block',
              }}
            >
              {curieToNameTaxon[curie]}
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
            onClick={onClearButtonClick}
          >
            Clear
          </button>
        </div>
      </div>
    )
  );
};


