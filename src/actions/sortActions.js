// import history from "../history";

// import notGithubVariables from './notGithubVariables';

const restUrl = process.env.REACT_APP_RESTAPI;
// const restUrl = 'stage-literature-rest.alliancegenome.org';
// const port = 11223;
// const port = 49161;

export const changeFieldSortMods = (e) => {
  console.log('action change field ' + e.target.name + ' to ' + e.target.value);
  return {
    type: 'CHANGE_FIELD_SORT_MODS',
    payload: {
      field: e.target.id,
      value: e.target.value
    }
  };
};

export const sortButtonModsQuery = (payload) => dispatch => {
  console.log('in sortButtonModsQuery action');
  // console.log("payload " + payload);
  // https://dev4004-literature-rest.alliancegenome.org/search/need_review?mod_abbreviation=RGD&count=2
  const sortGetModsQuery = async () => {
    const url = restUrl + '/search/need_review?count=5&mod_abbreviation=' + payload;
    // console.log(url);
    const res = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      headers: {
        'content-type': 'application/json'
      }
    })
    const response = await res.json();
    // console.log(response);
    let response_payload = payload + ' not found';
    let response_found = 'not found';
    if (response !== undefined) {
      // console.log('response not undefined');
      response_found = 'found';
      response_payload = response;
    }
    // need dispatch because "Actions must be plain objects. Use custom middleware for async actions."
    console.log('dispatch QUERY_BUTTON');
    dispatch({
      type: 'SORT_BUTTON_MODS_QUERY',
      payload: response_payload,
      responseFound: response_found
    })
  }
  sortGetModsQuery()
};

export const changeSortCorpusToggler = (e) => {
  console.log('action change sort corpus toggler radio ' + e.target.id + ' to ' + e.target.value);
  return {
    type: 'CHANGE_SORT_CORPUS_TOGGLER',
    payload: e.target.id
  };
};

// // replaced by biblioActions : setReferenceCurie + setGetReferenceCurieFlag
// // export const resetQueryState = () => {
// //   return {
// //     type: 'RESET_QUERY_STATE'
// //   };
// // };
// 
// export const resetQueryRedirect = () => {
//   return {
//     type: 'RESET_QUERY_REDIRECT'
//   };
// };
// 
// export const queryButtonCrossRefCurie = (payload) => dispatch => {
//   console.log('in queryButtonCrossRefCurie action');
//   console.log("payload " + payload);
//   const createGetQueryCrossRefCurie = async () => {
// //     const url = 'http://dev.alliancegenome.org:49161/cross_reference/' + payload;
// //     const url = 'http://dev.alliancegenome.org:' + port + '/cross_reference/' + payload;
// //     const url = 'https://' + restUrl + '/cross_reference/' + payload;
//     const url = restUrl + '/cross_reference/' + payload;
//     // console.log(url);
//     const res = await fetch(url, {
//       method: 'GET',
//       mode: 'cors',
//       headers: {
//         'content-type': 'application/json'
//       }
//     })
//     const response = await res.json();
//     let response_payload = payload + ' not found';
//     let response_found = 'not found';
//     if (response.reference_curie !== undefined) {
//       console.log('response not undefined');
//       response_found = 'found';
//       response_payload = response.reference_curie;
//     }
// //     history.push("/Biblio");	// value hasn't been set in store yet
//     // need dispatch because "Actions must be plain objects. Use custom middleware for async actions."
//     console.log('dispatch QUERY_BUTTON');
//     dispatch({
//       type: 'QUERY_BUTTON',
//       payload: response_payload,
//       responseFound: response_found
//     })
//   }
//   createGetQueryCrossRefCurie()
// };
