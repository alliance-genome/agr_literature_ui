import { api } from '../api';

export const fetchMLModelsIfNeeded = () => (dispatch, getState) => {
  const { mlModels } = getState();
  if (mlModels.hasFetched || mlModels.loading) return;
  dispatch({ type: 'ML_MODELS_SET_LOADING', payload: true });
  api.get('/ml_model/all')
    .then(response => {
      dispatch({ type: 'ML_MODELS_SET_DATA', payload: response.data || [] });
    })
    .catch(err => {
      console.error('Error fetching ml_model/all:', err);
      dispatch({ type: 'ML_MODELS_SET_ERROR', payload: err.message || 'Failed to fetch ml_model/all' });
    })
    .finally(() => {
      dispatch({ type: 'ML_MODELS_SET_LOADING', payload: false });
    });
};
