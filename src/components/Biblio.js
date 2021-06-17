// import { useState } from 'react'
// import { useEffect } from 'react';
// import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

import { useSelector, useDispatch } from 'react-redux';
// import { useSelector } from 'react-redux';

// import { resetQueryRedirect } from '../actions';
import { setReferenceCurie } from '../actions';
// import { setLoadingQuery } from '../actions';
import { biblioQueryReferenceCurie } from '../actions';

import { changeFieldReferenceJson } from '../actions';

import { useLocation } from 'react-router-dom';

import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';

import loading_gif from '../images/loading_cat.gif';

// http://dev.alliancegenome.org:49161/reference/AGR:AGR-Reference-0000000001


// if passing an object with <Redirect push to={{ pathname: "/Biblio", state: { pie: "the pie" } }} />, would access new state with
// const Biblio = ({ appState, someAction, location }) => {
// console.log(location.state);  }

const fieldsSimple = ['curie', 'reference_id', 'title', 'category', 'citation', 'volume', 'pages', 'language', 'abstract', 'publisher', 'issue_name', 'issue_date', 'date_published', 'date_arrived_in_pubmed', 'date_last_modified', 'resource_curie', 'resource_title' ];
const fieldsArrayString = ['keywords', 'pubmed_type' ];


const BiblioEditor = () => {
  const dispatch = useDispatch();
  const referenceJson = useSelector(state => state.biblio.referenceJson);
  const fieldSimpleElements = []
  for (const field of fieldsSimple.values()) {
    let fieldType = 'input';
    let value = referenceJson[field] || '';
    if (field === 'abstract') { fieldType = 'textarea'; }
//     if (referenceJson[field] !== null) {
    fieldSimpleElements.push(
      <Form.Group as={Row} key={field} controlId={field}>
        <Form.Label column sm="2">{field}</Form.Label>
        <Col sm="10">
          <Form.Control as={fieldType} type="{field}" value={value} placeholder={field} onChange={(e) => dispatch(changeFieldReferenceJson(e))} />
        </Col>
      </Form.Group>);
//     }
  }

  return (<Container><Form>{fieldSimpleElements}</Form></Container>);
}

const Biblio = () => {

  const dispatch = useDispatch();

  const crossRefCurieQueryRedirectToBiblio = useSelector(state => state.crossRefCurieQuery.redirectToBiblio);
//   console.log("biblio crossRefCurieQueryRedirectToBiblio " + crossRefCurieQueryRedirectToBiblio);

  const crossRefCurieQueryResponseField = useSelector(state => state.crossRefCurieQuery.responseField);
  if ( crossRefCurieQueryRedirectToBiblio ) {
    console.log('biblio from redirect');
// this is needed to keep the query page from redirecting here if going back to it, but changing it triggers a change there, which somehow triggers a dispatch of a bunch of stuff, including a double dispatch(biblioQueryReferenceCurie(referenceCurie)), which is wrong
// Warning: Cannot update a component (`Biblio`) while rendering a different component (`Biblio`). To locate the bad setState() call inside `Biblio`, follow the stack trace as described in https://reactjs.org/link/setstate-in-render
//     dispatch(resetQueryRedirect());
    dispatch(setReferenceCurie(crossRefCurieQueryResponseField));
  }

  const referenceCurie = useSelector(state => state.biblio.referenceCurie);
  const alreadyGotJson = useSelector(state => state.biblio.alreadyGotJson);
  const loadingQuery = useSelector(state => state.biblio.loadingQuery);
//   const queryFailure = useSelector(state => state.biblio.queryFailure);	// do something when user puts in invalid curie

  const useQuery = () => { return new URLSearchParams(useLocation().search); }
  let query = useQuery();
  if (referenceCurie === '') {
    console.log(query);
    let paramAction = query.get('action');
    let paramReferenceCurie = query.get('referenceCurie');
    console.log("biblio urlParam paramAction", paramAction);
    console.log("biblio urlParam paramReferenceCurie", paramReferenceCurie);
//     if (paramReferenceCurie !== null) { dispatch(setLoadingQuery(true)); }
    if (paramReferenceCurie !== null) { dispatch(setReferenceCurie(paramReferenceCurie)); }
  }

  if (referenceCurie !== '' && (alreadyGotJson === false)) {
    console.log('biblio DISPATCH biblioQueryReferenceCurie ' + referenceCurie);
    dispatch(biblioQueryReferenceCurie(referenceCurie));
  }

// set in reducer when BIBLIO_GET_REFERENCE_CURIE populates referenceJson
//   if ((setLoadingQuery === true) && (alreadyGotJson === true)) { 
//     console.log('biblio dispatch setLoadingQuery false');
//     dispatch(setLoadingQuery(false));
//   }

  const referenceJson = useSelector(state => state.biblio.referenceJson);

//     <Row className="Row-general" xs={2} md={4} lg={6}>
//       <Col className="Col-general">reference_id</Col>
//       <Col className="Col-general" lg={{ span: 10 }}>{referenceJson.reference_id}</Col>
//     </Row>

//       <Row className="Row-general" xs={2} md={4} lg={6}>
//         <Col className="Col-general">value</Col>
//         <Col className="Col-general" lg={{ span: 10 }}>{referenceJson.value}</Col>
//       </Row>

// this works, but want to try jsx map
//   const items = []
//   for (const [index, value] of fieldsSimple.entries()) {
// //     items.push(<div align="left" className="task" key={index}>{value} to {referenceJson[value]}</div>)
//     if (referenceJson[value] !== null) {
//     items.push(
//       <Row className="Row-general" xs={2} md={4} lg={6}>
//         <Col className="Col-general">{value}</Col>
//         <Col className="Col-general" lg={{ span: 10 }}>{referenceJson[value]}</Col>
//       </Row>);
//     }
//   }
//       {items}

//   const fieldsSimple = ['curie', 'reference_id', 'title', 'category', 'citation', 'volume', 'pages', 'language', 'abstract', 'publisher', 'issue_name', 'issue_date', 'date_published', 'date_arrived_in_pubmed', 'date_last_modified', 'resource_curie', 'resource_title' ];

  function BiblioDisplay() {
    const fieldSimpleElements = fieldsSimple
// to filter out fields without data
//       .filter((value) => referenceJson[value] !== null)
      .map((value, index) => (
      <Row key={index} className="Row-general" xs={2} md={4} lg={6}>
        <Col className="Col-general Col-left">{value}</Col>
        <Col className="Col-general Col-right" lg={{ span: 10 }}>{referenceJson[value]}</Col>
      </Row>
    ));
//         <Col className="Col-left"><div className="Col-left-in">{value}</div></Col>
//         <Col className="Col-right" lg={{ span: 10 }}><div className="Col-right-in">{referenceJson[value]}</div></Col>
//         <Col className="Col-general Col-left">{value}</Col>
//         <Col className="Col-general Col-right" lg={{ span: 10 }}>{referenceJson[value]}</Col>
//       <div key={index} align="left" className="task" >{value} to {referenceJson[value]}</div>

    const fieldArrayStringElements = []
    for (const [fieldIndex, fieldValue] of fieldsArrayString.entries()) {
      if (fieldValue in referenceJson && referenceJson[fieldValue] !== null) {	// need this because referenceJson starts empty before values get added
        if (referenceJson[fieldValue].length === 0) {
          fieldArrayStringElements.push(
              <Row key={fieldValue} className="Row-general" xs={2} md={4} lg={6}>
                <Col className="Col-general Col-left">{fieldValue}</Col>
                <Col className="Col-general Col-right" lg={{ span: 10 }}></Col>
              </Row>); }
        else {
          for (const [index, value] of referenceJson[fieldValue].entries()) {
            const key = fieldIndex + ' ' + index;
            fieldArrayStringElements.push(
              <Row key={key} className="Row-general" xs={2} md={4} lg={6}>
                <Col className="Col-general Col-left">{fieldValue}</Col>
                <Col className="Col-general Col-right" lg={{ span: 10 }}>{value}</Col>
              </Row>); } } } }

    const crossReferencesElements = []
    if ('cross_references' in referenceJson && referenceJson['cross_references'] !== null) {
      for (const[index, value] of referenceJson['cross_references'].entries()) {
        let url = value['url'];
        if ('pages' in value && value['pages'] !== null) { url = value['pages'][0]['url']; }
        crossReferencesElements.push(
          <Row key={index} className="Row-general" xs={2} md={4} lg={6}>
            <Col className="Col-general Col-left">cross_references</Col>
            <Col className="Col-general Col-right" lg={{ span: 10 }}><a href={url}  rel="noreferrer noopener" target="_blank">{value['curie']}</a></Col>
          </Row>); } }

    const tagsElements = []
    if ('tags' in referenceJson && referenceJson['tags'] !== null) {
      for (const[index, value] of referenceJson['tags'].entries()) {
        tagsElements.push(
          <Row key={index} className="Row-general" xs={2} md={4} lg={6}>
            <Col className="Col-general Col-left">tags</Col>
            <Col className="Col-general " lg={{ span: 2 }}>{value['tag_source']}</Col>
            <Col className="Col-general Col-right" lg={{ span: 8 }}>{value['tag_name']}</Col>
          </Row>); } }

    const modReferenceTypesElements = []
    if ('mod_reference_types' in referenceJson && referenceJson['mod_reference_types'] !== null) {
      for (const[index, value] of referenceJson['mod_reference_types'].entries()) {
        let source = value['source'];
        let ref_type = value['reference_type'];
        modReferenceTypesElements.push(
          <Row key={index} className="Row-general" xs={2} md={4} lg={6}>
            <Col className="Col-general Col-left">mod_reference_types</Col>
            <Col className="Col-general " lg={{ span: 2 }}>{source}</Col>
            <Col className="Col-general Col-right" lg={{ span: 8 }}>{ref_type}</Col>
          </Row>); } }

    const meshTermsElements = []
    if ('mesh_terms' in referenceJson && referenceJson['mesh_terms'] !== null) {
      for (const[index, value] of referenceJson['mesh_terms'].entries()) {
        meshTermsElements.push(
          <Row key={index} className="Row-general" xs={2} md={4} lg={6}>
            <Col className="Col-general Col-left">mesh_terms</Col>
            <Col className="Col-general " lg={{ span: 5 }}>{value['heading_term']}</Col>
            <Col className="Col-general Col-right" lg={{ span: 5 }}>{value['qualifier_term']}</Col>
          </Row>); } }

    const authorsElements = []
    // e.g. orcid/affiliation PMID:24895670   affiliations PMID:24913562
    if ('authors' in referenceJson && referenceJson['authors'] !== null) {
      for (const value  of referenceJson['authors'].values()) {
        let index = value['order'] - 1;
        let orcid_curie = '';
        let orcid_url = '';
        if ('orcid' in value) {
          orcid_curie = value['orcid']['curie'] || '';
          orcid_url = value['orcid']['url'] || ''; }
        let affiliations = [];
        if ('affiliation' in value) {
          for (const index_aff in value['affiliation']) { affiliations.push(<div key={index_aff} className="affiliation">- {value['affiliation'][index_aff]}</div>); }
        }
        authorsElements[index] = 
          <Row key={index} className="Row-general" xs={2} md={4} lg={6}>
            <Col className="Col-general Col-left">author {value['order']}</Col>
            <Col className="Col-general " lg={{ span: 10 }}><div key={index}>{value['name']} <a href={orcid_url}  rel="noreferrer noopener" target="_blank">{orcid_curie}</a>{affiliations}</div></Col>
          </Row>; } }

//             <Col className="Col-general Col-right" lg={{ span: 4 }}><a href={orcid_url}  rel="noreferrer noopener" target="_blank">{orcid_curie}</a></Col>

//         authorElements.push(
//           <Row key={index} className="Row-general" xs={2} md={4} lg={6}>
//             <Col className="Col-general Col-left">author</Col>
//             <Col className="Col-general " lg={{ span: 2 }}>{value['mesh_detail_id']}</Col>
//             <Col className="Col-general " lg={{ span: 4 }}>{value['heading_term']}</Col>
//             <Col className="Col-general Col-right" lg={{ span: 4 }}>{value['qualifier_term']}</Col>
//           </Row>);

    return (<Container>{fieldSimpleElements}{fieldArrayStringElements}{crossReferencesElements}{modReferenceTypesElements}{tagsElements}{authorsElements}{meshTermsElements}</Container>);
  }

  function LoadingElement() {
    return (<Container><img src={loading_gif} className="loading_gif" alt="loading" /></Container>);
  }

  return (
    <div>
      <h4>Biblio about this Reference</h4>
      <div align="center" className="task" >{referenceCurie}</div>
      { loadingQuery ? <LoadingElement /> : <BiblioDisplay /> }
      <Link to='/'>Go Back</Link>
    </div>
  )

// this in return works
//       <input type="text" name="crossRefCurieQuery" value={tempField} onChange={(e) => dispatch(changeTemp(e))} />

// all of these in return lose focus if they're defined as functional components inside the Biblio functional component, but work fine if created outside
//       <BiblioEditor />
//       { loadingQuery ? <LoadingElement /> : <BiblioDisplay /> }
//       { loadingQuery ? <LoadingElement /> : <BiblioEditor /> }

// manual field definition
//       <div align="left" className="task" >reference_id: {referenceJson.reference_id}</div>
//       <div align="left" className="task" >title: {referenceJson.title}</div>
//       <div align="left" className="task" >volume: {referenceJson.volume}</div>
//       <div align="left" className="task" >date_updated: {referenceJson.date_updated}</div>
//       <div align="left" className="task" >abstract: {referenceJson.abstract}</div>


//   const [tasks, setTasks] = useState([
//     {
//       id: 1,
//       text: 'something first',
//       day: 'Feb 5th at 2:30pm',
//       reminder: true,
//     },
//     {
//       id: 2,
//       text: 'something second',
//       day: 'Feb 6th at 1:30pm',
//       reminder: true,
//     },
//     {
//       id: 3,
//       text: 'something third',
//       day: 'Feb 5th at 1:00pm',
//       reminder: false,
//     }
//   ])

//   const [tasks, setTasks] = useState({
//     "data": [
//         {
//             "datePublished": "1978",
//             "citation": "Abdul Kader N et al. (1978) Revue de Nematologie \"Induction, detection and isolation of temperature-sensitive lethal and/or ....\"",
//             "pages": "27-37",
//             "primaryId": "WB:WBPaper00000003",
//             "volume": "1"
//         }]
//   })
// 
//   useEffect(() => {
//     const getTasks = async () => {
//       const tasksFromServer = await fetchTasks()
//       setTasks(tasksFromServer)
//     }
// 
//     getTasks()
//   }, [])
// 
//   const fetchTasks = async () => {
//     const res = await fetch('http://dev.alliancegenome.org/azurebrd/agr-lit/sample.json', {mode: 'cors'})
//     const data = await res.json()
//     return data
//   }
// 
//   return (
//     <div>
//       <h4>Biblio about this Reference</h4>
//       <div>{crossRefCurieQueryResponseField}</div>
//       <Link to='/'>Go Back</Link>
//       {tasks['data'].map((task, index) => (
//         <div align="left" key={index} className={`task ${task.reminder && 'reminder'}`}><h5>{task.primaryId}</h5>pages : {task.pages}<div>{task.citation}</div></div>
//       ))}
//     </div>
//   )

}

//       {tasks.length > 0 ? ( <div>hello</div> ) : ( <div>nothing</div> )}
//       {tasks.map((task, index) => (
//         <>
//         <div className={`task ${task.reminder && 'reminder'}`}>{task.id} : {task.text}<div>{task.day}</div></div>
//         </>
//       ))}

export default Biblio
