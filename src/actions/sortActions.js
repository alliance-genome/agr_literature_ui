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
  dispatch({
    type: 'SORT_SET_IS_LOADING',
    payload: true
  });
  console.log('in sortButtonModsQuery action');
  // console.log("payload " + payload);
  // https://dev4004-literature-rest.alliancegenome.org/search/need_review?mod_abbreviation=RGD&count=2
  const sortGetModsQuery = async () => {
    const url = restUrl + '/search/need_review?count=20&mod_abbreviation=' + payload;
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
    });
    dispatch({
      type: 'SORT_SET_IS_LOADING',
      payload: false
    });
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

export const changeSortWorkflowToggler = (e) => {
  console.log('action change sort workflow toggler radio ' + e.target.id + ' to ' + e.target.value);
  return {
    type: 'CHANGE_SORT_WORKFLOW_TOGGLER',
    payload: e.target.id
  };
};

export const updateButtonSort = (updateArrayData) => dispatch => {
  // console.log('in updateButtonSort action');
  const [accessToken, subPath, payload, method, index, field, subField] = updateArrayData;
  // console.log("payload "); console.log(updateArrayData);
  let newId = null;
  const createUpdateButtonSort = async () => {
    const url = restUrl + '/' + subPath;
    console.log(url);
    // console.log(notGithubVariables.authToken);
    const res = await fetch(url, {
      method: method,
      mode: 'cors',
      headers: {
        'content-type': 'application/json',
        'authorization': 'Bearer ' + accessToken
      },
      body: JSON.stringify( payload )
    })
  // to test without updating through api, remove body line and change method to GET
//       method: 'GET',
    let response_message = 'update success';
    if ((method === 'DELETE') && (res.status === 204)) { }      // success of delete has no res.text so can't process like others
    else {
      // const response = await res.json();     // successful POST to related table (e.g. mod_reference_types) returns an id that is not in json format
      const response_text = await res.text();
      const response = JSON.parse(response_text);
      if ( ((method === 'PATCH') && (res.status !== 202)) ||
           ((method === 'DELETE') && (res.status !== 204)) ||
           ((method === 'POST') && (res.status !== 201)) ) {
        console.log('updateButtonSort action response not updated');
        if (typeof(response.detail) !== 'object') {
            response_message = response.detail; }
          else if (typeof(response.detail[0].msg) !== 'object') {
            response_message = 'error: ' + subPath + ' : ' + response.detail[0].msg + ': ' + response.detail[0].loc[1]; }
          else {
            response_message = 'error: ' + subPath + ' : API status code ' + res.status; }
      }
      if ((method === 'POST') && (res.status === 201)) {
        newId = parseInt(response_text); }
      // need dispatch because "Actions must be plain objects. Use custom middleware for async actions."
      console.log('dispatch UPDATE_BUTTON_SORT');
    }
    setTimeout(() => {
      dispatch({
        type: 'UPDATE_BUTTON_SORT',
        payload: {
          responseMessage: response_message,
          index: index,
          value: newId,
          field: field,
          subField: subField
        }
      })
    }, 500);
  }
  createUpdateButtonSort()
};

export const closeSortUpdateAlert = () => {
  console.log("action closeSortUpdateAlert");
  return {
    type: 'CLOSE_SORT_UPDATE_ALERT'
  };
};

export const setSortUpdating = (payload) => {
  return {
    type: 'SET_SORT_UPDATING',
    payload: payload
  };
};

export const sortButtonSetRadiosAll = (payload) => {
  console.log("action sortButtonSetRadiosAll");
  return {
    type: 'SORT_BUTTON_SET_RADIO_ALL',
    payload: payload
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
