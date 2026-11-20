import { api } from "../api";

export const searchMissingFiles = (mod_abbreviation) => {
  return (dispatch, getState) => {
    const state = getState();
    dispatch(setMissingFileResults(''));
    dispatch(setLoadingState(true));
    api.get('/reference/missing_files/' + mod_abbreviation + "?order_by=" + state.tracker.orderBy + "&page=" + state.tracker.trackerPage + "&filter=" + state.tracker.trackerFilter)
      .then(res => {
        dispatch(setMissingFileResults(res.data));
        dispatch(setLoadingState(false));
      })
      .catch();
  };
};

export const addWorkflowTag = (tag_id, mod_abbreviation, curie, accessToken) => {
  // accessToken parameter kept for backwards compatibility - auth handled by API client interceptor
  return dispatch => {
    // a status change goes through the transition table (SCRUM-6845)
    const params = {
      curie_or_reference_id: curie,
      mod_abbreviation: mod_abbreviation,
      new_workflow_tag_atp_id: tag_id,
      transition_type: 'manual'
    };
    api.post('/workflow_tag/transition_to_workflow_status', params)
      .then(res => {
        dispatch(searchMissingFiles(mod_abbreviation));
      })
      .catch(error => {
        // a move the transition table refuses (e.g. from an unexpected file upload status)
        const detail = error.response?.data?.detail || error.message;
        console.error('Workflow transition failed:', detail);
        window.alert(`Could not change the file status of ${curie}: ${detail}`);
      });
  };
};

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
