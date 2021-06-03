// import { useState } from 'react'
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

import { useSelector, useDispatch } from 'react-redux';
// import { useSelector } from 'react-redux';

import { resetQueryRedirect } from '../actions';
import { setReferenceCurie } from '../actions';
import { biblioQueryReferenceCurie } from '../actions';

import { useLocation } from 'react-router-dom';

// http://dev.alliancegenome.org:49161/reference/AGR:AGR-Reference-0000000001


// if passing an object with <Redirect push to={{ pathname: "/Biblio", state: { pie: "the pie" } }} />, would access new state with
// const Biblio = ({ appState, someAction, location }) => {
// console.log(location.state);  }

const Biblio = () => {

  const dispatch = useDispatch();

  const crossRefCurieQueryRedirectToBiblio = useSelector(state => state.crossRefCurieQuery.redirectToBiblio);
  console.log(crossRefCurieQueryRedirectToBiblio);
  // if arrived at this page from a query result redirect, remove the redirect flag so that query page can be revisited without forcing back here
//   crossRefCurieQueryRedirectToBiblio && dispatch(resetQueryRedirect());

  const crossRefCurieQueryResponseField = useSelector(state => state.crossRefCurieQuery.responseField);
  if ( crossRefCurieQueryRedirectToBiblio ) {
    console.log('blah');
    dispatch(resetQueryRedirect());
    dispatch(setReferenceCurie(crossRefCurieQueryResponseField));
  }

  const referenceCurie = useSelector(state => state.biblio.referenceCurie);
  const alreadyGotJson = useSelector(state => state.biblio.alreadyGotJson);

  const useQuery = () => { return new URLSearchParams(useLocation().search); }
  let query = useQuery();
  if (referenceCurie === '') {
    console.log(query);
    let paramAction = query.get('action');
    let paramReferenceCurie = query.get('referenceCurie');
    console.log("urlParam paramAction", paramAction);
    console.log("urlParam paramReferenceCurie", paramReferenceCurie);
    if (paramReferenceCurie !== null) { dispatch(setReferenceCurie(paramReferenceCurie)); }
  }

  if (referenceCurie !== '' && (alreadyGotJson === false)) {
    dispatch(biblioQueryReferenceCurie(referenceCurie));
  }

  const referenceJson = useSelector(state => state.biblio.referenceJson);

  let field = ['reference_id', 'title', 'volume', 'curie', 'issue_name', 'abstract'];

  return (
    <div>
      <h4>Biblio about this Reference</h4>
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
