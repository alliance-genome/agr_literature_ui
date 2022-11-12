import jwt_decode from 'jwt-decode';

const INTIAL_STATE = {
  isSignedIn: null,
  userId: null,
  oktaGroups: null,
  accessToken: null
};

const loggedReducer = (state = INTIAL_STATE, action) => {
  switch (action.type) {
    case 'SIGN_IN':
      const jsonToken = jwt_decode(action.payload.accessToken);
      return {...state, isSignedIn: true, userId: action.payload.userId, accessToken: action.payload.accessToken, oktaGroups: jsonToken.Groups}
    case 'SIGN_OUT':
      return {...state, isSignedIn: false, userId: null, oktaGroups: null}
    default:
      return state;
  }
};

export default loggedReducer;
