import { Link } from 'react-router-dom'
import { useHistory } from "react-router-dom";
import { useSelector, useDispatch } from 'react-redux';
import { changeQueryField } from '../actions/searchActions';
import { searchButtonCrossRefCurie } from '../actions/searchActions';
import { resetSearchRedirect } from '../actions/searchActions';
import { resetBiblioIsLoading } from '../actions/biblioActions';
import { setReferenceCurie } from '../actions/biblioActions';
import { setGetReferenceCurieFlag } from '../actions/biblioActions';
import SearchLayout from './search/SearchLayout';

import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';



const Search = () => {
  const xrefcurieField = useSelector(state => state.search.xrefcurieField);
  const searchResponseField = useSelector(state => state.search.responseField);
  const searchResponseColor = useSelector(state => state.search.responseColor);
  const searchRedirectToBiblio = useSelector(state => state.search.redirectToBiblio);
  const searchQuerySuccess = useSelector(state => state.search.querySuccess);
  const dispatch = useDispatch();
  const history = useHistory();

  function pushHistory(referenceCurie) {
    console.log('history push');
    dispatch(resetSearchRedirect());
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
      <div style={{width: "28em", margin: "auto"}}>
        <InputGroup className="mb-2">
          <Form.Control type="text" id="xrefcurieField" name="xrefcurieField" value={xrefcurieField} onChange={(e) => dispatch(changeQueryField(e))} />
          {searchRedirectToBiblio && pushHistory(searchResponseField)}
          <Button type="submit" size="sm" onClick={() => dispatch(searchButtonCrossRefCurie(xrefcurieField))}>Query External Identifier Curie</Button>
        </InputGroup>
      </div>
      <div>{searchQuerySuccess ? <Link to={{pathname: "/Biblio", search: "?action=display&referenceCurie=" + searchResponseField}}><span style={{color: searchResponseColor}}>{searchResponseField}</span></Link> : <span style={{color: searchResponseColor}}>{searchResponseField}</span>}</div>
      <hr/>
      <h4>Search References<br/></h4>
        <SearchLayout/>
      <hr/>
      <Link to='/'>Go Back</Link>
    </div>
  )
}


export default Search


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
//       <button type="submit" onClick={() => dispatch(searchButtonCrossRefCurie(crossRefCurieQueryField))}>Query Reference Curie</button>

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
