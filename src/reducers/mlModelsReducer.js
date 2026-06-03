const initialState = {
  data: [],
  loading: false,
  error: null,
  hasFetched: false,
};

export default function mlModelsReducer(state = initialState, action) {
  switch (action.type) {
    case 'ML_MODELS_SET_LOADING':
      return { ...state, loading: action.payload };
    case 'ML_MODELS_SET_DATA':
      return { ...state, data: action.payload, hasFetched: true, error: null };
    case 'ML_MODELS_SET_ERROR':
      return { ...state, error: action.payload, hasFetched: true };
    default:
      return state;
  }
}
