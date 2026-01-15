import jwt_decode from 'jwt-decode';
import {
  SHOW_REAUTH_MODAL,
  HIDE_REAUTH_MODAL,
  ADD_PENDING_REQUEST,
  CLEAR_PENDING_REQUESTS,
  SET_AUTH_LOADING,
  SET_DEV_TESTING_REAUTH
} from '../actions/authActions';

const INTIAL_STATE = {
  isSignedIn: null,
  everSignedIn: null,
  userId: null,
  cognitoGroups: null,
  cognitoMod: 'No',
  cognitoDeveloper: false,
  cognitoTester: false,
  testerMod: 'No',
  accessToken: null,
  uid: null,
  email: null,
  // Re-authentication state
  reauthRequired: false,
  pendingRequests: [],
  isLoading: true,
  devTestingReauth: false
};

const loggedReducer = (state = INTIAL_STATE, action) => {
  const devOrStageOrProd = process.env.REACT_APP_DEV_OR_STAGE_OR_PROD;
  switch (action.type) {
    case 'SET_TESTER_MOD':
      return { ...state, testerMod: action.payload }
    case 'SIGN_IN':
      const jsonToken = jwt_decode(action.payload.accessToken);
      let cognitoMod = 'No';
      let cognitoDeveloper = false;
      let cognitoTester = false;
      // Cognito uses 'cognito:groups' claim for groups (same group names as Okta)
      const groups = jsonToken['cognito:groups'] || jsonToken.Groups || [];
      if (groups && groups.length > 0) {
        for (const group of groups) {
          if (group.endsWith('Developer')) { cognitoDeveloper = true; }
          if (group === 'Tester' && devOrStageOrProd !== 'prod') { cognitoTester = true; }
            else if (group === 'POTester' && devOrStageOrProd === 'prod') { cognitoTester = true; }
          if (group.startsWith('SGD')) { cognitoMod = 'SGD'; }
            else if (group.startsWith('RGD')) { cognitoMod = 'RGD'; }
            else if (group.startsWith('MGI')) { cognitoMod = 'MGI'; }
            else if (group.startsWith('ZFIN')) { cognitoMod = 'ZFIN'; }
            else if (group.startsWith('Xen')) { cognitoMod = 'XB'; }
            else if (group.startsWith('Fly')) { cognitoMod = 'FB'; }
            else if (group.startsWith('Worm')) { cognitoMod = 'WB'; } }
      }
      return {
        ...state,
        isSignedIn: true,
        everSignedIn: true,
        userId: action.payload.userId,
        accessToken: action.payload.accessToken,
        testerMod: 'No',
        cognitoMod: cognitoMod,
        cognitoDeveloper: cognitoDeveloper,
        cognitoTester: cognitoTester,
        cognitoGroups: groups,
        uid: jsonToken.sub || jsonToken.uid,
        email: action.payload.email,
        // Clear re-auth state on successful sign in (unless dev testing)
        reauthRequired: state.devTestingReauth ? state.reauthRequired : false,
        pendingRequests: state.devTestingReauth ? state.pendingRequests : [],
        isLoading: false
      }
    case 'SIGN_OUT':
      return {
        ...state,
        isSignedIn: false,
        userId: null,
        cognitoGroups: null,
        cognitoMod: 'No',
        cognitoDeveloper: false,
        cognitoTester: false,
        testerMod: 'No',
        uid: null,
        accessToken: null,
        email: null,
        reauthRequired: false,
        pendingRequests: [],
        isLoading: false
      }
    case SHOW_REAUTH_MODAL:
      return { ...state, reauthRequired: true }
    case HIDE_REAUTH_MODAL:
      return { ...state, reauthRequired: false }
    case ADD_PENDING_REQUEST:
      return {
        ...state,
        pendingRequests: [...state.pendingRequests, action.payload]
      }
    case CLEAR_PENDING_REQUESTS:
      return { ...state, pendingRequests: [] }
    case SET_AUTH_LOADING:
      return { ...state, isLoading: action.payload }
    case SET_DEV_TESTING_REAUTH:
      return { ...state, devTestingReauth: action.payload }
    default:
      return state;
  }
};

export default loggedReducer;
