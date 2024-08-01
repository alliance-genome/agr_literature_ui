import React from "react";
import {useDispatch} from "react-redux";
import {changeFieldEntityAddGeneralField} from "../../actions/biblioActions";
import Form from "react-bootstrap/Form"

export const PulldownMenu = ({id, value, pdList, optionToName}) => {
  const dispatch = useDispatch();
  return (<div>                                                                                                                         
    <Form.Control
      as="select"
      id={id}
      type={id}
      value={value}
      onChange={(e) => { dispatch(changeFieldEntityAddGeneralField(e)) } } >                                                            
      { pdList.map((optionValue, index) => (
        <option key={`{id} ${optionValue}`}
          value={optionValue}>{optionToName[optionValue]}                                                                                
        </option>
      ))}                                                                                                                               
    </Form.Control>                                                                                                                     
  </div>);
}
