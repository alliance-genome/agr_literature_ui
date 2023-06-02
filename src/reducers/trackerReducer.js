const initialState = {
  missingFileResults: [],
  isLoading: false,
  orderBy: 'desc',
  trackerPage: 1,
  trackerFilter: 'default'
};

// eslint-disable-next-line
export default function(state = initialState, action) {
  // action will have a type.  common to evaluate with a switch
  switch (action.type) {

    case 'SET_MISSING_FILE_RESULTS':
      return {
        ...state,
        missingFileResults: action.payload
      }

    case 'SET_ORDER_BY':
      return{
        ...state,
        orderBy:action.payload
      }

    case 'SET_IS_LOADING':
      return{
        ...state,
        isLoading:action.payload
      }
    case 'SET_TRACKER_PAGE':
      return{
        ...state,
        trackerPage:action.payload
      }
    case 'SET_TRACKER_FILTER':
      return{
        ...state,
        trackerFilter:action.payload
      }

    default:
      return state;
  }
}
