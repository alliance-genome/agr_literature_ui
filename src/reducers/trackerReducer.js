const initialState = {
  missingFileResults: [],
  isLoading: false
};

export default function(state = initialState, action) {
  // action will have a type.  common to evaluate with a switch
  switch (action.type) {

    case 'SET_MISSING_FILE_RESULTS':
      return {
        ...state,
        missingFileResults: action.payload
      }

    default:
      return state;
  }
}
