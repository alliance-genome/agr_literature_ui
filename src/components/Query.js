import { Link } from 'react-router-dom'

import { useSelector, useDispatch } from 'react-redux';
import { changeField } from '../actions';
import { queryButtonCrossRefCurie } from '../actions';

import { Redirect } from "react-router";


const Query = () => {
  const crossRefCurieQueryField = useSelector(state => state.crossRefCurieQuery.queryField);
  const crossRefCurieQueryResponseField = useSelector(state => state.crossRefCurieQuery.responseField);
  const crossRefCurieQueryResponseColor = useSelector(state => state.crossRefCurieQuery.responseColor);
  const crossRefCurieQueryRedirectToBiblio = useSelector(state => state.crossRefCurieQuery.redirectToBiblio);
  const crossRefCurieQueryQuerySuccess = useSelector(state => state.crossRefCurieQuery.querySuccess);
  const dispatch = useDispatch();

  return (
    <div>
      <h4>Look up Reference by exact cross reference curie. e.g. RGD:10002756</h4>
      <input type="text" name="crossRefCurieQuery" value={crossRefCurieQueryField} onChange={(e) => dispatch(changeField(e))} />
      <button type="submit" onClick={() => dispatch(queryButtonCrossRefCurie(crossRefCurieQueryField))}>Query Reference Curie</button>
      {crossRefCurieQueryRedirectToBiblio && <Redirect push to={{pathname: "/Biblio", search: "?action=display&referenceCurie=" + crossRefCurieQueryResponseField}} />}
      <div>{crossRefCurieQueryQuerySuccess ? <Link to={{pathname: "/Biblio", search: "?action=display&referenceCurie=" + crossRefCurieQueryResponseField}}><span style={{color: crossRefCurieQueryResponseColor}}>{crossRefCurieQueryResponseField}</span></Link> : <span style={{color: crossRefCurieQueryResponseColor}}>{crossRefCurieQueryResponseField}</span>}</div>
      <hr/>
      <Link to='/'>Go Back</Link>
    </div>
  )
}

export default Query

//       {crossRefCurieQueryRedirectToBiblio && <Redirect push to={`/Biblio/${crossRefCurieQueryResponseField}`} />}
//       <div>{crossRefCurieQueryQuerySuccess ? <Link to={`/Biblio/${crossRefCurieQueryResponseField}`}><span style={{color: crossRefCurieQueryResponseColor}}>{crossRefCurieQueryResponseField}</span></Link> : <span style={{color: crossRefCurieQueryResponseColor}}>{crossRefCurieQueryResponseField}</span>}</div>

// import history from "../history";
//
// import { useHistory } from "react-router-dom";
//
//   const history = useHistory();
//     <button type="button" onClick={() => history.push("/Biblio")}>


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
