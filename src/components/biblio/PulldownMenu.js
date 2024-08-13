import React from "react";
import PropTypes from 'prop-types';
import Form from "react-bootstrap/Form";
import { useDispatch } from "react-redux";
import { changeFieldEntityAddGeneralField } from "../../actions/biblioActions";

export const PulldownMenu = ({ id, value, pdList, optionToName, onChange }) => {
  const dispatch = useDispatch();

  const handleChange = (e) => {
    if (onChange) {
      onChange(e.target.value);
    } else {
      dispatch(changeFieldEntityAddGeneralField(e));
    }
  };

  return (
    <div>
      <Form.Control
        as="select"
        id={id}
        type={id}
        value={value}
        onChange={handleChange}
      >
        {pdList.map((optionValue) => (
          <option key={`${id} ${optionValue}`} value={optionValue}>
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
  onChange: PropTypes.func
};
