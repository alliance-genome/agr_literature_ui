
import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';

import { changeFieldEntityGeneList } from '../../actions/biblioActions';
import { changeFieldEntityAddGeneralField } from '../../actions/biblioActions';
import { updateButtonBiblioEntityAdd } from '../../actions/biblioActions';
import { setBiblioUpdatingEntityAdd } from '../../actions/biblioActions';
import { updateButtonBiblioEntityEditEntity } from '../../actions/biblioActions';
import { setBiblioEntityRemoveEntity } from '../../actions/biblioActions';
import { setEntityModalText } from '../../actions/biblioActions';
import { changeFieldEntityEditor } from '../../actions/biblioActions';
import { setFieldEntityEditor } from '../../actions/biblioActions';
import { changeFieldEntityEditorPriority } from '../../actions/biblioActions';

import RowDivider from './RowDivider';
import ModalGeneric from './ModalGeneric';

import { getOktaModAccess } from '../Biblio';

import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button'
import Spinner from 'react-bootstrap/Spinner'


const BiblioEntity = () => {
  return (<><EntityCreate key="entityCreate" />
            <EntityEditor key="entityEditor" /></>); }

  const curieToNameAtp = { 'ATP:0000005': 'gene', 'ATP:0000122': 'entity type', 'ATP:0000132': 'additional display', 'ATP:0000129': 'headline display', 'ATP:0000131': 'other primary display', 'ATP:0000130': 'review display', 'ATP:0000116': 'high priority', '': '' };
  const qualifierList = [ '', 'ATP:0000131', 'ATP:0000132', 'ATP:0000130', 'ATP:0000129', 'ATP:0000116' ];
  const curieToNameTaxon = { 'NCBITaxon:4932': 'Saccharomyces cerevisiae', 'NCBITaxon:6239': 'Caenorhabditis elegans', 'NCBITaxon:7227': 'Drosophila melanogaster', 'NCBITaxon:7955': 'Danio rerio', 'NCBITaxon:10116': 'Rattus norvegicus', 'NCBITaxon:10090': 'Mus musculus', 'NCBITaxon:8355': 'Xenopus laevis', 'NCBITaxon:8364': 'Xenopus tropicalis', 'NCBITaxon:9606': 'Homo sapiens', '': '' };

const EntityEditor = () => {
  const dispatch = useDispatch();
//   const curieToNameAtp = { 'ATP:0000005': 'gene', 'ATP:0000122': 'entity type', 'ATP:0000132': 'additional display', 'ATP:0000129': 'headline display', 'ATP:0000131': 'other primary display', 'ATP:0000130': 'review display', 'ATP:0000116': 'high priority', '': '' };
//   const qualifierList = [ '', 'ATP:0000132', 'ATP:0000129', 'ATP:0000131', 'ATP:0000130', 'ATP:0000116' ];
//   const curieToNameTaxon = { 'NCBITaxon:4932': 'S. cerevisiae S288C', 'NCBITaxon:6239': 'Caenorhabditis elegans' };

  const biblioAction = useSelector(state => state.biblio.biblioAction);
  const accessToken = useSelector(state => state.isLogged.accessToken);
  const entityEntityMappings = useSelector(state => state.biblio.entityEntityMappings);
  const referenceJsonLive = useSelector(state => state.biblio.referenceJsonLive);
  const biblioUpdatingEntityRemoveEntity = useSelector(state => state.biblio.biblioUpdatingEntityRemoveEntity);

  return (
    <Container fluid>
    <RowDivider />
    <Row className="form-group row" >
      <Col className="form-label col-form-label" sm="3"><h3>{biblioAction.charAt(0).toUpperCase() + biblioAction.slice(1)} Editor</h3></Col></Row>
    <Row className="form-group row" >
      <Col className="div-grey-border" sm="1">topic</Col>
      <Col className="div-grey-border" sm="1">entity type</Col>
      <Col className="div-grey-border" sm="1">species (taxon)</Col>
      <Col className="div-grey-border" sm="2">entity name</Col>
      <Col className="div-grey-border" sm="2">entity curie</Col>
      <Col className="div-grey-border" sm="1">qualifier</Col>
      <Col className="div-grey-border" sm="3">notes</Col>
      <Col className="div-grey-border" sm="1">button</Col>
    </Row>
    { 'topic_entity_tags' in referenceJsonLive && referenceJsonLive['topic_entity_tags'].length > 0 && referenceJsonLive['topic_entity_tags'].map( (tetDict, index) => {
      let qualifierValue = ''; let qualifierId = ''; let qualifierIndex = '';
      // UI only allows display/selection of one priority qualifier, but someone could connect in the database multiple priority qualifier in topic_entity_tag_prop to the same topic_entity_tag, even though that would be wrong.
      if ('props' in tetDict && tetDict['props'].length > 0) {
        // for (const tetpDict of tetDict['props'].values())
        for (const[indexPriority, tetpDict] of tetDict['props'].entries()) {
          if ('qualifier' in tetpDict && tetpDict['qualifier'] !== '' && qualifierList.includes(tetpDict['qualifier'])) {
            qualifierId = tetpDict['topic_entity_tag_prop_id'];
            qualifierIndex = indexPriority;
            qualifierValue = tetpDict['qualifier']; } } }
      const entityName = (tetDict.entity_type in entityEntityMappings && tetDict.taxon in entityEntityMappings[tetDict.entity_type] &&
                          tetDict.alliance_entity in entityEntityMappings[tetDict.entity_type][tetDict.taxon]) ?
                          entityEntityMappings[tetDict.entity_type][tetDict.taxon][tetDict.alliance_entity] : 'unknown';
      if ( (biblioAction === 'entity') && (tetDict.topic !== 'ATP:0000122') ) { return ""; }
      else if ( (biblioAction === 'topic') && (tetDict.topic === 'ATP:0000122') ) { return ""; }
      else {
        return (
          <Row key={`geneEntityContainerrows ${tetDict.topic_entity_tag_id}`}>
            <Col className="div-grey-border" sm="1">{tetDict.topic in curieToNameAtp ? curieToNameAtp[tetDict.topic] : tetDict.topic }</Col>
            <Col className="div-grey-border" sm="1">{tetDict.entity_type in curieToNameAtp ? curieToNameAtp[tetDict.entity_type] : tetDict.entity_type }</Col>
            <Col className="div-grey-border" sm="1">{tetDict.taxon in curieToNameTaxon ? curieToNameTaxon[tetDict.taxon] : tetDict.taxon }</Col>
            <Col className="div-grey-border" sm="2">{entityName}</Col>
            <Col className="div-grey-border" sm="2">{tetDict.alliance_entity}</Col>

            <Col sm="1">
              {/* changeFieldEntityEditorPriority changes which value to display, but does not update database. ideally this would update the databasewithout reloading referenceJsonLive, because API would return entities in a different order, so things would jump. but if creating a new qualifier where there wasn't any, there wouldn't be a tetpId until created, and it wouldn't be in the prop when changing again. could get the tetpId from the post and inject it, but it starts to get more complicated.  needs to display to patch existing tetp prop, or post to create a new one */}
              <Form.Control as="select" id={`qualifier ${index} ${qualifierIndex} ${qualifierId}`} type="tetqualifierSelect" disabled="disabled" value={qualifierValue} onChange={(e) => dispatch(changeFieldEntityEditorPriority(e))} >
                { qualifierList.map((optionValue, index) => (
                  <option key={`tetqualifierSelect ${optionValue}`} value={optionValue}>{curieToNameAtp[optionValue]}</option>
                ))}
              </Form.Control>
            </Col>

            <Col className="form-label col-form-label" sm="3" style={{position: 'relative'}}>
              <span style={{position: 'absolute', top: '0.2em', right: '1.2em'}}>
                <span style={{color: '#007bff'}}
                  onClick={() => {
                    dispatch(updateButtonBiblioEntityEditEntity(accessToken, tetDict.topic_entity_tag_id, {'note': tetDict.note || ''}, 'PATCH', 'UPDATE_BUTTON_BIBLIO_ENTITY_EDIT_NOTE')) } } >&#10003;</span><br/>
                <span style={{color: '#dc3545'}}
                  onClick={() => {
                    dispatch(setFieldEntityEditor('note ' + index, ''));
                    dispatch(updateButtonBiblioEntityEditEntity(accessToken, tetDict.topic_entity_tag_id, {'note': ''}, 'PATCH', 'UPDATE_BUTTON_BIBLIO_ENTITY_EDIT_NOTE')) } } >X</span>
              </span>
              <Form.Control as="textarea" id={`note ${index}`} type="note" value={tetDict.note || ''} onChange={(e) => dispatch(changeFieldEntityEditor(e))} />
              <Button variant="outline-primary"
                onClick={() => {
                  dispatch(updateButtonBiblioEntityEditEntity(accessToken, tetDict.topic_entity_tag_id, {'note': tetDict.note || ''}, 'PATCH', 'UPDATE_BUTTON_BIBLIO_ENTITY_EDIT_NOTE')) } } >
                Update note</Button>&nbsp;
              <Button variant="outline-danger"
                onClick={() => {
                  dispatch(setFieldEntityEditor('note ' + index, ''));
                  dispatch(updateButtonBiblioEntityEditEntity(accessToken, tetDict.topic_entity_tag_id, {'note': ''}, 'PATCH', 'UPDATE_BUTTON_BIBLIO_ENTITY_EDIT_NOTE')) } } >
                Remove note</Button>
            </Col>
            <Col className="form-label col-form-label" sm="1">
              <Button variant="outline-danger" 
                disabled={biblioUpdatingEntityRemoveEntity[tetDict.topic_entity_tag_id] === true ? 'disabled' : ''}
                onClick={() => {
                  dispatch(setBiblioEntityRemoveEntity(tetDict.topic_entity_tag_id, true));
                  dispatch(updateButtonBiblioEntityEditEntity(accessToken, tetDict.topic_entity_tag_id, null, 'DELETE', 'UPDATE_BUTTON_BIBLIO_ENTITY_REMOVE_ENTITY')) } } >
              {biblioUpdatingEntityRemoveEntity[tetDict.topic_entity_tag_id] === true ? <Spinner animation="border" size="sm"/> : "Remove Entity"}</Button></Col>
          </Row> ) }
    } ) }
    </Container>);
} // const EntityEditor


//           <Col className="form-label col-form-label" sm="1"><Button variant="outline-danger" >Remove Entity</Button></Col>
//           <Col className="form-label col-form-label" sm="1"><Button variant="outline-primary" disabled={disabledAddButton} onClick={() => createEntities(referenceJsonLive.curie)} >{biblioUpdatingEntityAdd > 0 ? <Spinner animation="border" size="sm"/> : "Add"}</Button></Col>


// const ModalGeneric = ({showGenericModal, genericModalHeader, genericModalBody, onHideAction}) => {
//   const dispatch = useDispatch();
//   if (showGenericModal) {
//     return (<Modal size="lg" show={showGenericModal} backdrop="static" onHide={() => dispatch(onHideAction)} >
//              <Modal.Header closeButton><Modal.Title>{genericModalHeader}</Modal.Title></Modal.Header>
//              <Modal.Body><div dangerouslySetInnerHTML={{__html:`${genericModalBody}`}}/></Modal.Body>
//             </Modal>); }
//   return null;
// }

const EntityCreate = () => {
  const dispatch = useDispatch();
  const referenceJsonLive = useSelector(state => state.biblio.referenceJsonLive);
  const oktaGroups = useSelector(state => state.isLogged.oktaGroups);
  const accessToken = useSelector(state => state.isLogged.accessToken);
  const biblioAction = useSelector(state => state.biblio.biblioAction);
  const biblioUpdatingEntityAdd = useSelector(state => state.biblio.biblioUpdatingEntityAdd);
  const entityModalText = useSelector(state => state.biblio.entityModalText);
  const geneText = useSelector(state => state.biblio.entityAdd.genetextarea);
  const noteText = useSelector(state => state.biblio.entityAdd.notetextarea);
  const tetqualifierSelect = useSelector(state => state.biblio.entityAdd.tetqualifierSelect);
  const taxonSelect = useSelector(state => state.biblio.entityAdd.taxonSelect);
  const geneResultList = useSelector(state => state.biblio.entityAdd.geneResultList);
//   let geneStringListDash = [];
//   let geneStringListParen = [];
//   if (geneResultList) {
//     for (const geneResObject of geneResultList) {
//       geneStringListParen.push(geneResObject.geneSymbol + " ( " + geneResObject.curie + " ) ");
//       geneStringListDash.push(geneResObject.geneSymbol + " -- " + geneResObject.curie); } }

  useEffect( () => {
    if (!(taxonSelect === '' || taxonSelect === undefined)) {
      dispatch(changeFieldEntityGeneList(geneText, accessToken, taxonSelect)) }
  }, [geneText, taxonSelect]); // eslint-disable-line react-hooks/exhaustive-deps

  function createEntities(refCurie) {
    const forApiArray = []
    if ( geneResultList && geneResultList.length > 0 ) {
      for (const geneResult of geneResultList.values()) {
        console.log(geneResult);
        console.log(geneResult.curie);
        if (geneResult.curie !== 'no Alliance curie') {
          let updateJson = {};
          updateJson['reference_curie'] = refCurie;
          updateJson['topic'] = biblioAction === 'entity' ? 'ATP:0000122' : 'insert topic here';
          updateJson['entity_type'] = 'ATP:0000005';
          updateJson['alliance_entity'] = geneResult.curie;
          // updateJson['taxon'] = 'NCBITaxon:4932';	// to hardcode if they don't want a dropdown
          updateJson['taxon'] = taxonSelect;
          updateJson['note'] = noteText;
          if (tetqualifierSelect && tetqualifierSelect !== '') {
            updateJson['props'] = [ { 'qualifier': tetqualifierSelect } ]; }
          // console.log(updateJson);
          let subPath = 'topic_entity_tag/';
          let method = 'POST';
          // let array = [ subPath, updateJson, method, 0, null, null]
          let array = [ subPath, updateJson, method]
          forApiArray.push( array );
    } } }

    let dispatchCount = forApiArray.length;

    // console.log('dispatchCount ' + dispatchCount)
    dispatch(setBiblioUpdatingEntityAdd(dispatchCount))

    for (const arrayData of forApiArray.values()) {
      arrayData.unshift(accessToken);
      console.log(arrayData);
      dispatch(updateButtonBiblioEntityAdd(arrayData))
    }
  }

  const modToTaxon = { 'ZFIN': ['NCBITaxon:7955'], 'FB': ['NCBITaxon:7227'], 'WB': ['NCBITaxon:6239'], 'RGD': ['NCBITaxon:10116'], 'MGI': ['NCBITaxon:10090'], 'SGD': ['NCBITaxon:4932'], 'XB': ['NCBITaxon:8355', 'NCBITaxon:8364'] }
  const unsortedTaxonList = [ '', 'NCBITaxon:4932', 'NCBITaxon:6239', 'NCBITaxon:7227', 'NCBITaxon:7955', 'NCBITaxon:10116', 'NCBITaxon:10090', 'NCBITaxon:8355', 'NCBITaxon:8364', 'NCBITaxon:9606' ];
  let taxonList = unsortedTaxonList.sort((a, b) => (curieToNameTaxon[a] > curieToNameTaxon[b] ? 1 : -1));
  const access = getOktaModAccess(oktaGroups);
  // const access = 'WB';	// uncomment if you have developer okta access and need to test a specific mod
  if (access in modToTaxon) {
    let filteredTaxonList = taxonList.filter((x) => !modToTaxon[access].includes(x));
    taxonList = modToTaxon[access].concat(filteredTaxonList); }

  // const taxonSelect = 'NCBITaxon:4932';	// to hardcode if they don't want a dropdown
  // const taxonSelect = 'NCBITaxon:6239';	// to hardcode if they don't want a dropdown
  // figure out if they want general disabling to work the same for the whole row, in which case combine the next two variables
  const disabledEntityList = (taxonSelect === '' || taxonSelect === undefined) ? 'disabled' : '';
  const disabledAddButton = (taxonSelect === '' || taxonSelect === undefined) ? 'disabled' : '';

  return (
    <Container fluid>
    <ModalGeneric showGenericModal={entityModalText !== '' ? true : false} genericModalHeader="Entity Error"
                  genericModalBody={entityModalText} onHideAction={setEntityModalText('')} />
    <RowDivider />
    <Row className="form-group row" >
      <Col className="form-label col-form-label" sm="3"><h3>{biblioAction.charAt(0).toUpperCase() + biblioAction.slice(1)} Addition</h3></Col></Row>
    <Row className="form-group row" >
      <Col className="div-grey-border" sm="1">topic</Col>
      <Col className="div-grey-border" sm="1">entity type</Col>
      <Col className="div-grey-border" sm="1">species</Col>
      <Col className="div-grey-border" sm="2">entity list</Col>
      <Col className="div-grey-border" sm="2">entity validation</Col>
      <Col className="div-grey-border" sm="1">qualifier</Col>
      <Col className="div-grey-border" sm="3">notes</Col>
      <Col className="div-grey-border" sm="1">button</Col>
    </Row>
    <Row className="form-group row" >
      <Col className="div-grey-border" sm="1">
        { biblioAction === 'entity' ?
          'entity type ATP:0000122' :
          'insert topic here'}
      </Col>
      <Col className="div-grey-border" sm="1">gene ATP:0000005</Col>
      <Col sm="1">
        <Form.Control as="select" id="taxonSelect" type="taxonSelect" value={taxonSelect} onChange={(e) => { dispatch(changeFieldEntityAddGeneralField(e)) } } >
          { taxonList.map((optionValue, index) => (
            <option key={`taxonSelect ${optionValue}`} value={optionValue}>{curieToNameTaxon[optionValue]}</option>
          ))}
        </Form.Control>
      </Col>
      <Col className="form-label col-form-label" sm="2" >
        <Form.Control as="textarea" id="genetextarea" type="genetextarea" value={geneText} disabled={disabledEntityList} onChange={(e) => { dispatch(changeFieldEntityAddGeneralField(e)); } } />
      </Col>
      <Col className="form-label col-form-label" sm="2" >
        <Container>
          { geneResultList && geneResultList.length > 0 && geneResultList.map( (geneResult, index) => {
            return (
              <Row key={`geneEntityContainerrows ${index}`}>
                <Col className="Col-general Col-display Col-display-left" sm="5">{geneResult.geneSymbol}</Col>
                <Col className="Col-general Col-display Col-display-right" sm="7">{geneResult.curie}</Col>
              </Row>)
          } ) }
        </Container>
      </Col>
      <Col sm="1">
        <Form.Control as="select" id="tetqualifierSelect" type="tetqualifierSelect" value={tetqualifierSelect} onChange={(e) => dispatch(changeFieldEntityAddGeneralField(e))} >
          { qualifierList.map((optionValue, index) => (
            <option key={`tetqualifierSelect ${optionValue}`} value={optionValue}>{curieToNameAtp[optionValue]}</option>
          ))}
        </Form.Control>
      </Col>
      <Col className="form-label col-form-label" sm="3">
        <Form.Control as="textarea" id="notetextarea" type="notetextarea" value={noteText} onChange={(e) => dispatch(changeFieldEntityAddGeneralField(e))} />
      </Col>
      <Col className="form-label col-form-label" sm="1"><Button variant="outline-primary" disabled={disabledAddButton} onClick={() => createEntities(referenceJsonLive.curie)} >{biblioUpdatingEntityAdd > 0 ? <Spinner animation="border" size="sm"/> : "Add"}</Button></Col>
    </Row></Container>);
}

export default BiblioEntity;
