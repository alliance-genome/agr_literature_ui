const INTIAL_STATE = {
  isSignedIn:null,
  userId: null,
  accessToken:null
};



const loggedReducer = (state = INTIAL_STATE, action) => {
  switch (action.type) {
    case 'SIGN_IN':
      return {...state, isSignedIn: true, userId: action.payload.userId, accessToken: action.payload.accessToken}
    case 'SIGN_OUT':
      return {...state, isSignedIn: false, userId: null}
    default:
      return state;
  }
};

export default loggedReducer;
