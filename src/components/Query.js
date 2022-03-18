import { Link } from 'react-router-dom'
import { useHistory } from "react-router-dom";
import { useSelector, useDispatch } from 'react-redux';

import { changeQueryField } from '../actions/queryActions';
import { queryButtonCrossRefCurie } from '../actions/queryActions';
import { resetQueryRedirect } from '../actions/queryActions';
// import { resetQueryState } from '../actions/queryActions';	// replaced by resetBiblioIsLoading
import { queryButtonTitle } from '../actions/queryActions';

import { resetBiblioIsLoading } from '../actions/biblioActions';
// import { resetBiblioReferenceCurie } from '../actions/biblioActions';	// replaced by setReferenceCurie + setGetReferenceCurieFlag
import { setReferenceCurie } from '../actions/biblioActions';
import { setGetReferenceCurieFlag } from '../actions/biblioActions';

import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';



const Query = () => {
  const xrefcurieField = useSelector(state => state.query.xrefcurieField);
  const queryResponseField = useSelector(state => state.query.responseField);
  const queryResponseColor = useSelector(state => state.query.responseColor);
  const queryRedirectToBiblio = useSelector(state => state.query.redirectToBiblio);
  const queryQuerySuccess = useSelector(state => state.query.querySuccess);
  const titleField = useSelector(state => state.query.titleField);
  const titleSearchInput = useSelector(state => state.query.titleSearchInput);
  const titleQuerySuccess = useSelector(state => state.query.titleQuerySuccess);
  const titleQueryResponseColor = useSelector(state => state.query.titleQueryResponseColor);
  const referencesReturned = useSelector(state => state.query.referencesReturned);
  const dispatch = useDispatch();
  const history = useHistory();

  function pushHistory(referenceCurie) {
    console.log('history push');
    dispatch(resetQueryRedirect());
    // dispatch(resetQueryState());	// replaced by resetBiblioIsLoading
    dispatch(resetBiblioIsLoading());
    // dispatch(resetBiblioReferenceCurie());	// replaced by setReferenceCurie + setGetReferenceCurieFlag
    dispatch(setGetReferenceCurieFlag(true));
    dispatch(setReferenceCurie(referenceCurie));
    history.push("/Biblio/?action=display&referenceCurie=" + referenceCurie);
  }

  return (
    <div>
      <h4>Look up Reference by exact cross reference curie.<br/>e.g. PMID:24895670 or RGD:13542090 or WB:WBPaper00010006</h4>
      <input type="text" id="xrefcurieField" name="xrefcurieField" value={xrefcurieField} onChange={(e) => dispatch(changeQueryField(e))} />
      {queryRedirectToBiblio && pushHistory(queryResponseField)}
      <button type="submit" onClick={() => dispatch(queryButtonCrossRefCurie(xrefcurieField))}>Query External Identifier Curie</button>
      <div>{queryQuerySuccess ? <Link to={{pathname: "/Biblio", search: "?action=display&referenceCurie=" + queryResponseField}}><span style={{color: queryResponseColor}}>{queryResponseField}</span></Link> : <span style={{color: queryResponseColor}}>{queryResponseField}</span>}</div>
      <hr/>
      <h4>Look up References by title.<br/></h4>
      <input type="text" id="titleField" name="titleField" value={titleField} onChange={(e) => dispatch(changeQueryField(e))} />
      <button type="submit" onClick={() => dispatch(queryButtonTitle(titleField))}>Query Titles</button>
      { 
        titleSearchInput &&
        <Container>
        <Row><Col>&nbsp;</Col></Row>
        { referencesReturned.length > 0 ?
          <>
            <Row key="reference header"><Col><span style={{color: titleQueryResponseColor}}>{titleSearchInput}</span> returned</Col></Row>
            <Row>
              <Col lg={3} className="Col-general Col-display Col-display-left" >Curie</Col>
              <Col lg={9} className="Col-general Col-display Col-display-right" >Title</Col>
            </Row>
            { referencesReturned.map((reference, index) => (
              <Row key={`reference ${index}`}>
                <Col lg={3} className="Col-general Col-display Col-display-left" ><Link to={{pathname: "/Biblio", search: "?action=display&referenceCurie=" + reference.curie}} onClick={() => { dispatch(setReferenceCurie(reference.curie)); dispatch(setGetReferenceCurieFlag(true)); }}>{reference.curie}</Link></Col>
                <Col lg={9} className="Col-general Col-display Col-display-right" ><Link to={{pathname: "/Biblio", search: "?action=display&referenceCurie=" + reference.curie}} onClick={() => { dispatch(setReferenceCurie(reference.curie)); dispatch(setGetReferenceCurieFlag(true)); }}>{reference.title}</Link></Col>
              </Row>
            )) }
          </>
        :
          <Row key="reference header"><Col><span style={{color: titleQueryResponseColor}}>{titleSearchInput}</span> returned <span style={{color: titleQueryResponseColor}}>no match</span></Col></Row>
        }
        </Container>
      }
      <hr/>
      <Link to='/'>Go Back</Link>
    </div>
  )
}


export default Query


// this will redirect to wanted Biblio page, but does not reset redirectToBiblio flag, so going back to Query page will auto-redirect to Biblio page.  Doing it through a function and history.push allows dispatching to reset flag as well as pushing to Biblio page
// import { Redirect } from "react-router";
//       {crossRefCurieQueryRedirectToBiblio && <Redirect push to={{pathname: "/Biblio", search: "?action=display&referenceCurie=" + crossRefCurieQueryResponseField}} />}

//       <button type="button" onClick={() => pushHistory(crossRefCurieQueryResponseField)}>history button</button>
//       <button type="button" onClick={() => history.push("/Biblio/?action=display&referenceCurie=" + crossRefCurieQueryResponseField)}>history button</button>

//       {crossRefCurieQueryRedirectToBiblio && <Redirect push to={`/Biblio/${crossRefCurieQueryResponseField}`} />}
//       <div>{crossRefCurieQueryQuerySuccess ? <Link to={`/Biblio/${crossRefCurieQueryResponseField}`}><span style={{color: crossRefCurieQueryResponseColor}}>{crossRefCurieQueryResponseField}</span></Link> : <span style={{color: crossRefCurieQueryResponseColor}}>{crossRefCurieQueryResponseField}</span>}</div>

// import history from "../history";
//
// import { useHistory } from "react-router-dom";
//
//   const history = useHistory();


// {/*
//       <h4>crossRefCurieQueryResponseField: <span style={{color: crossRefCurieQueryResponseColor}}>{crossRefCurieQueryResponseField}</span></h4>
//  */}

//     <button type="button" onClick={() => history.push({
//       pathname: "/Biblio",
//       search: "?query=abc", 
//       state: {
// pie: "the pie" }
//       })}>
//       Go Biblio
//     </button>

//       {crossRefCurieQueryResponseColor === 'blue' && <Redirect to={`/Biblio/${crossRefCurieQueryResponseField}`} />}
//       <button type="submit" onClick={() => dispatch(queryButtonCrossRefCurie(crossRefCurieQueryField))}>Query Reference Curie</button>

//       <button type="submit" onClick={() => nextStep()}>Query Reference Curie</button>

//       {crossRefCurieQueryResponseColor === 'blue' && <Redirect push to={{
// pathname: "/Biblio",
//       state: {
// pie: "the pie" }
//       }} />}

//       {crossRefCurieQueryRedirectToBiblio && <Redirect push to={`/Biblio/${crossRefCurieQueryResponseField}`} />}

//       <h4>Counter {counter}</h4>
//       <button onClick={() => dispatch(increment(5))}>+</button>
//       <button onClick={() => dispatch(decrement())}>-</button>

// import { increment } from '../actions';
// import { decrement } from '../actions';
//   const counter = useSelector(state => state.counter);
