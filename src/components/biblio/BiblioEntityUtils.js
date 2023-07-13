import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';

export function pulldownMenu(id, value, pdList, curieToName, dispatch, changeFieldEntityAddGeneralField) {
  return (<div>
    <Form.Control
      as="select"
      id="{id}"
      type="{id}"
      value={value}
      onChange={(e) => { dispatch(changeFieldEntityAddGeneralField(e)) } } >
      { pdList.map((optionValue, index) => (
        <option key={`{id} ${optionValue}`}
	  value={optionValue}>{curieToName[optionValue]}
	</option>
      ))}
    </Form.Control>
  </div>);
}

export function textArea(id, value, dispatch, changeFieldEntityAddGeneralField, disabledEntityList) {
  return (
    <Form.Control
      as="textarea"
      id="{id}"
      type="{id}"
      value={value}
      disabled={disabledEntityList}
      onChange={(e) => { dispatch(changeFieldEntityAddGeneralField(e)); }} 
    />
  );
}

export function entityValidation(entityResultList) {
  { entityResultList && entityResultList.length > 0 && entityResultList.map( (entityResult, index) => {
    const colDisplayClass = (entityResult.curie === 'no Alliance curie') ? 'Col-display-warn' : 'Col-display';
    return (
      <Row key={`entityEntityContainerrows ${index}`}>
        <Col className={`Col-general ${colDisplayClass} Col-display-left`} sm="5">{entityResult.entityTypeSymbol}</Col>
        <Col className={`Col-general ${colDisplayClass} Col-display-right`} sm="7">{entityResult.curie}</Col>
      </Row>)
  })}
}


