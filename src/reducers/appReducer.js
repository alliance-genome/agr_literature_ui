
const initialState = {
  mods: ['FB', 'MGI', 'RGD', 'SGD', 'WB', 'XB', 'ZFIN']		// just in case, but could cause issues if more mods get added and the endpoint to load the mods doesn't work
};

// to ignore a warning about Unexpected default export of anonymous function
// eslint-disable-next-line
export default function(state = initialState, action) {
  // action will have a type.  common to evaluate with a switch
  switch (action.type) {
    case 'SET_MODS':
      // console.log(action.payload);
      return {
        ...state,
        mods: action.payload
      }
    default:
      return state;
  }
}
