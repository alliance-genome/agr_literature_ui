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

import { useLocation } from 'react-router-dom';

// http://dev.alliancegenome.org:49161/reference/AGR:AGR-Reference-0000000001


// if passing an object with <Redirect push to={{ pathname: "/Biblio", state: { pie: "the pie" } }} />, would access new state with
// const Biblio = ({ appState, someAction, location }) => {
// console.log(location.state);  }

const Biblio = () => {

  const dispatch = useDispatch();

  const crossRefCurieQueryRedirectToBiblio = useSelector(state => state.crossRefCurieQuery.redirectToBiblio);
  console.log("biblio crossRefCurieQueryRedirectToBiblio " + crossRefCurieQueryRedirectToBiblio);

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
  const queryFailure = useSelector(state => state.biblio.queryFailure);	// do something when user puts in invalid curie

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

//   if (alreadyGotJson === false) {
//     console.log('biblio DISPATCH biblioQueryReferenceCurie ' + paramReferenceCurie);
// //     dispatch(setLoadingQuery(true));
//     dispatch(biblioQueryReferenceCurie(paramReferenceCurie));
//   }

//   if (referenceCurie !== '' && (alreadyGotJson === false)) {
//     console.log('biblio dispatch setLoadingQuery true and biblioQueryReferenceCurie ' + referenceCurie);
//     dispatch(setLoadingQuery(true));
//     dispatch(biblioQueryReferenceCurie(referenceCurie));
//   }

// set in reducer when BIBLIO_GET_REFERENCE_CURIE populates referenceJson
//   if ((setLoadingQuery === true) && (alreadyGotJson === true)) { 
//     console.log('biblio dispatch setLoadingQuery false');
//     dispatch(setLoadingQuery(false));
//   }

  const referenceJson = useSelector(state => state.biblio.referenceJson);

//   let field = ['reference_id', 'title', 'volume', 'curie', 'issue_name', 'abstract'];

  return (
    <div>
      <h4>Biblio about this Reference</h4>
      { loadingQuery && <div>loading</div> }
      <div align="left" className="task" >{referenceCurie}</div>
      <div align="left" className="task" >reference_id: {referenceJson.reference_id}</div>
      <div align="left" className="task" >title: {referenceJson.title}</div>
      <div align="left" className="task" >volume: {referenceJson.volume}</div>
      <div align="left" className="task" >date_updated: {referenceJson.date_updated}</div>
      <div align="left" className="task" >abstract: {referenceJson.abstract}</div>
      <Link to='/'>Go Back</Link>
    </div>
  )


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
