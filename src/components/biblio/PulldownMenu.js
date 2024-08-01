import React from "react";
import PropTypes from 'prop-types';
import Form from "react-bootstrap/Form";

export const PulldownMenu = ({ id, value, pdList, optionToName, onChange }) => {
  return (
    <div>
      <Form.Control
        as="select"
        id={id}
        type={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {pdList.map((optionValue, index) => (
          <option key={`{id} ${optionValue}`} value={optionValue}>
            {optionToName[optionValue]}
          </option>
        ))}
      </Form.Control>
    </div>
  );
};

PulldownMenu.propTypes = {
  id: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  pdList: PropTypes.arrayOf(PropTypes.string).isRequired,
  optionToName: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
};
