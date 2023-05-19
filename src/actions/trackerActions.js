import axios from "axios";

const restUrl = process.env.REACT_APP_RESTAPI;

export const searchMissingFiles = (mod_abbreviation, order_by) => {
  return dispatch => {
    dispatch(setLoadingState(true));
    axios.get(restUrl + '/reference/missing_files/'+mod_abbreviation+"?order_by="+order_by)
        .then(res => {
          dispatch(setMissingFileResults(res.data));
          dispatch(setLoadingState(false));
        })
        .catch();
    }
}

export const addWorkflowTag = (tag_id,mod_abbreviation,curie,accessToken) => {
  return (dispatch,getState) => {
    const state = getState();
    let headers = {
      'content-type': 'application/json',
      'mode': 'cors',
      'authorization': 'Bearer ' + accessToken
    }
    let params = {
      workflow_tag_id: tag_id,
      mod_abbreviation: mod_abbreviation,
      reference_curie: curie
    }
    axios.post(restUrl + '/workflow_tag/',params, {headers:headers})
      .then(res => {
        dispatch(searchMissingFiles(mod_abbreviation,state.tracker.orderBy));
      })
  }
}

export const setMissingFileResults = (payload) => {
  return {
    type: 'SET_MISSING_FILE_RESULTS',
    payload: payload
  };
};

export const setOrder = (payload) => {
  return {
    type: 'SET_ORDER_BY',
    payload: payload
  };
};

export const setLoadingState = (payload) => {
  return {
    type: 'SET_IS_LOADING',
    payload: payload
  };
};
