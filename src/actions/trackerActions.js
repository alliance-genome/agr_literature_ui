import axios from "axios";

const restUrl = process.env.REACT_APP_RESTAPI;

export const searchMissingFiles = (mod_abbreviation) => {
  return (dispatch,getState) => {
    const state = getState();
    dispatch(setMissingFileResults(''));
    dispatch(setLoadingState(true));
    axios.get(restUrl + '/reference/missing_files/'+mod_abbreviation+"?order_by="+state.tracker.orderBy+"&page="+state.tracker.trackerPage+"&filter="+state.tracker.trackerFilter)
        .then(res => {
          dispatch(setMissingFileResults(res.data));
          dispatch(setLoadingState(false));
        })
        .catch();
    }
}

export const addWorkflowTag = (tag_id,mod_abbreviation,curie,accessToken) => {
  return dispatch => {
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
        dispatch(searchMissingFiles(mod_abbreviation));
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

export const setTrackerPage = (payload) => {
  return {
    type: 'SET_TRACKER_PAGE',
    payload: payload
  };
};

export const setTrackerFilter = (payload) => {
  return {
    type: 'SET_TRACKER_FILTER',
    payload: payload
  };
};
