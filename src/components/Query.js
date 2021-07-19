import { Link } from 'react-router-dom'
import { useHistory } from "react-router-dom";
import { useSelector, useDispatch } from 'react-redux';

import { changeQueryField } from '../actions/queryActions';
import { queryButtonCrossRefCurie } from '../actions/queryActions';
import { resetQueryRedirect } from '../actions/queryActions';
import { resetQueryState } from '../actions/queryActions';


const Query = () => {
  const queryField = useSelector(state => state.query.queryField);
  const queryResponseField = useSelector(state => state.query.responseField);
  const queryResponseColor = useSelector(state => state.query.responseColor);
  const queryRedirectToBiblio = useSelector(state => state.query.redirectToBiblio);
  const queryQuerySuccess = useSelector(state => state.query.querySuccess);
  const dispatch = useDispatch();
  const history = useHistory();

  function pushHistory(referenceCurie) {
    console.log('history push');
    dispatch(resetQueryRedirect());
    dispatch(resetQueryState());
    history.push("/Biblio/?action=display&referenceCurie=" + referenceCurie);
  }

  return (
    <div>
      <h4>Look up Reference by exact cross reference curie.<br/>e.g. PMID:24895670 or RGD:13542090 or WB:WBPaper00010006</h4>
      <input type="text" name="crossRefCurieQuery" value={queryField} onChange={(e) => dispatch(changeQueryField(e))} />
      {queryRedirectToBiblio && pushHistory(queryResponseField)}
      <button type="submit" onClick={() => dispatch(queryButtonCrossRefCurie(queryField))}>Query Reference Curie</button>
      <div>{queryQuerySuccess ? <Link to={{pathname: "/Biblio", search: "?action=display&referenceCurie=" + queryResponseField}}><span style={{color: queryResponseColor}}>{queryResponseField}</span></Link> : <span style={{color: queryResponseColor}}>{queryResponseField}</span>}</div>
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
