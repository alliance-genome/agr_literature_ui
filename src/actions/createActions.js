const restUrl = process.env.REACT_APP_RESTAPI;

export const changeCreateActionToggler = (e) => {
  console.log('action change create action toggler radio ' + e.target.id + ' to ' + e.target.value);
  let createActionTogglerSelected = 'pubmed';
  if (e.target.id === 'create-toggler-alliance') { createActionTogglerSelected = 'alliance'; }
  return {
    type: 'CHANGE_CREATE_ACTION_TOGGLER',
    payload: createActionTogglerSelected
  };
};

export const setCreateActionToggler = (value) => {
  console.log('action set create action toggler radio to ' + value);
  return {
    type: 'CHANGE_CREATE_ACTION_TOGGLER',
    payload: value
  };
};

export const changeCreateField = (e) => {
  return {
    type: 'CREATE_CHANGE_FIELD',
    payload: {
      field: e.target.id,
      value: e.target.value
    }
  };
};

export const changeCreatePmidField = (e) => {
  return {
    type: 'CREATE_CHANGE_PMID_FIELD',
    payload: {
      value: e.target.value
    }
  };
};

export const createQueryPubmed = (pmid) => dispatch => {
  dispatch(setCreatePmidSearchLoading());
  pmid = pmid.replace(/[^\d.]/g, '');
  console.log("action createQueryPubmed " + pmid);
  const createQueryPmid = async () => {
    const urlApi = restUrl + '/cross_reference/PMID:' + pmid;
    console.log(urlApi);
    const res = await fetch(urlApi, {
      method: 'GET',
      mode: 'cors',
      headers: {
        'content-type': 'application/json'
      }
    })
    const response = await res.json();
    let response_payload = 'not found';
    if (response.reference_curie !== undefined) {
      console.log('response not undefined');
      response_payload = response.reference_curie;
      dispatch({
        type: 'CREATE_QUERY_PMID_XREF',
        payload: response_payload
      })}
    else {
      const url = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&retmode=xml&id=' + pmid;
      console.log(url);
      const res = await fetch(url, {
        method: 'GET',
        mode: 'cors',
        headers: {
          'content-type': 'text/plain'
        }
      })
      const response_text = await res.text();
      // console.log(response_text);
      let title = '';
      if ( response_text.match(/<ArticleTitle[^>]*?>(.+?)<\/ArticleTitle>/) ) {
        const matches = response_text.match(/<ArticleTitle[^>]*?>(.+?)<\/ArticleTitle>/);
        title = matches[1]; }
      else if ( response_text.match(/<BookTitle[^>]*?>(.+?)<\/BookTitle>/) ) {
        const matches = response_text.match(/<BookTitle[^>]*?>(.+?)<\/BookTitle>/);
        title = matches[1]; }
      else if ( response_text.match(/<VernacularTitle[^>]*?>(.+?)<\/VernacularTitle>/) ) {
        const matches = response_text.match(/<VernacularTitle[^>]*?>(.+?)<\/VernacularTitle>/);
        title = matches[1]; }
      console.log(title);
      // need dispatch because "Actions must be plain objects. Use custom middleware for async actions."
      dispatch({
        type: 'CREATE_QUERY_PMID_PUBMED',
        payload: title
      })
    }
  }
  createQueryPmid();
};

export const setCreatePmidSearchLoading = () => ({
  type: 'CREATE_SET_PMID_SEARCH_LOADING'
});

export const setCreateAction = (createAction) => {
  console.log("action setCreateAction");
  return {
    type: 'SET_CREATE_ACTION',
    payload: createAction
  };
};

export const resetCreateRedirect = () => {
  return {
    type: 'RESET_CREATE_REDIRECT'
  };
};

export const setCreatePmidCreateLoading = () => ({
  type: 'CREATE_SET_PMID_CREATE_LOADING'
});

export const setCreateAllianceCreateLoading = () => ({
  type: 'CREATE_SET_ALLIANCE_CREATE_LOADING'
});

export const updateButtonCreate = (updateArrayData, pmidOrAlliance, modCurie) => dispatch => {
  console.log('in updateButtonCreate action');
  const [accessToken, subPath, payload, method, index, field, subField] = updateArrayData;
  console.log("payload "); console.log(payload);
  let newId = null;
  console.log("subPath " + subPath);

  if (pmidOrAlliance === 'alliance') {    dispatch(setCreateAllianceCreateLoading()); }
    else if (pmidOrAlliance === 'pmid') { dispatch(setCreatePmidCreateLoading());     }

  const checkModCurieThenCreate = async () => {
    const url = restUrl + '/cross_reference/' + modCurie;
    fetch(url, {
      method: 'GET',
      mode: 'cors',
      headers: { 'content-type': 'application/json' }
    }).then(res => {
      res.json().then(response => {
        let response_payload = modCurie;
        if (response.reference_curie !== undefined) {
          // console.log(modCurie + ' lookup response not undefined');
          // console.log(response.reference_curie);
          response_payload = response.reference_curie;
          dispatch({
            type: 'UPDATE_BUTTON_CREATE_ALREADY_EXISTS',
            payload: {
              pmidOrAlliance: pmidOrAlliance,
              responseMessage: modCurie + ' already exists as ' + response_payload + ', click <a href="../Biblio/?action=editor&referenceCurie=' + response_payload + '">here</a> to Edit it.'
            }
          })
        } else {
          // console.log(modCurie + ' not in ABC');
          createUpdateButtonCreate();
        }
      });
    })
  }

  const createUpdateButtonCreate = async () => {
    const url = restUrl + '/' + subPath;
    console.log(url);
    const res = await fetch(url, {
      method: method,
      mode: 'cors',
      headers: {
        'content-type': 'application/json',
        'authorization': 'Bearer ' + accessToken
      },
      body: JSON.stringify( payload )
    })

    let response_message = 'update success';
    if ((method === 'DELETE') && (res.status === 204)) { }	// success of delete has no res.text so can't process like others
    else {
      const response_text = await res.text();
      // console.log('response_text');
      // console.log(response_text);
      // console.log('res_status');
      // console.log(res.status);
      let response = JSON.parse(response_text);
      if (pmidOrAlliance === 'pmid') {		// for pmid, API returns an escaped JSON that has to be converted again
        // console.log(typeof(response));
        if (typeof (response) === 'string') {
          // console.log(response);
          if (response === '') {
            response_message = 'error: ' + subPath + ' : returned an empty string';
          }
        }
      }
      // console.log(response);
      // console.log(typeof response);
      if ( ((method === 'PATCH') && (res.status !== 202)) || 
           ((method === 'DELETE') && (res.status !== 204)) || 
           ((method === 'POST') && (res.status !== 201)) ) {
        console.log('updateButtonCreate action response not updated');
        if (typeof(response.detail) !== 'object') {
            response_message = response.detail; }
          else if (typeof(response.detail[0].msg) !== 'object') {
            response_message = 'error: ' + subPath + ' : ' + response.detail[0].msg + ': ' + response.detail[0].loc[1]; }
          else {
            response_message = 'error: ' + subPath + ' : API status code ' + res.status; }
      }
      if ((method === 'POST') && (res.status === 201)) {
        newId = response_text.replace(/^"|"$/g, '');		// posting a new Alliance reference gives back text
      }
      console.log('dispatch UPDATE_BUTTON_CREATE');
    }
    // need dispatch because "Actions must be plain objects. Use custom middleware for async actions."
    dispatch({
      type: 'UPDATE_BUTTON_CREATE',
      payload: {
        responseMessage: response_message,
        index: index,
        value: newId,
        pmidOrAlliance: pmidOrAlliance,
        field: field,
        subField: subField
      }
    })
  }
  checkModCurieThenCreate();
};

export const setCreateModalText = (payload) => {
  return {
    type: 'SET_CREATE_MODAL_TEXT',
    payload: payload
  };
};
