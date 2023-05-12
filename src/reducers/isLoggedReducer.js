import jwt_decode from 'jwt-decode';

const INTIAL_STATE = {
  isSignedIn: null,
  userId: null,
  oktaGroups: null,
  oktaMod: 'No',
  oktaDeveloper: false,
  oktaTester: false,
  oktaPOTester: false,
  testerMod: 'No',
  accessToken: null
};

const loggedReducer = (state = INTIAL_STATE, action) => {
  switch (action.type) {
    case 'SET_TESTER_MOD':
      return { ...state, testerMod: action.payload }
    case 'SIGN_IN':
      const jsonToken = jwt_decode(action.payload.accessToken);
      let oktaMod = null;
      let oktaDeveloper = null;
      let oktaTester = null;
      let oktaPOTester = null;
      if (jsonToken.Groups) {
        for (const oktaGroup of jsonToken.Groups) {
          if (oktaGroup.endsWith('Developer')) { oktaDeveloper = true; }
          if (oktaGroup === 'Tester') { oktaTester = true; }
          if (oktaGroup === 'POTester') { oktaPOTester = true; }
          if (oktaGroup.startsWith('SGD')) { oktaMod = 'SGD'; }
            else if (oktaGroup.startsWith('RGD')) { oktaMod = 'RGD'; }
            else if (oktaGroup.startsWith('MGI')) { oktaMod = 'MGI'; }
            else if (oktaGroup.startsWith('ZFIN')) { oktaMod = 'ZFIN'; }
            else if (oktaGroup.startsWith('Xen')) { oktaMod = 'XB'; }
            else if (oktaGroup.startsWith('Fly')) { oktaMod = 'FB'; }
            else if (oktaGroup.startsWith('Worm')) { oktaMod = 'WB'; } }
      }
      return {
        ...state,
        isSignedIn: true,
        userId: action.payload.userId,
        accessToken: action.payload.accessToken,
        testerMod: 'No',
        oktaMod: oktaMod,
        oktaDeveloper: oktaDeveloper,
        oktaTester: oktaTester,
        oktaPOTester: oktaPOTester,
        oktaGroups: jsonToken.Groups }
    case 'SIGN_OUT':
      return {...state, isSignedIn: false, userId: null, oktaGroups: null, oktaMod: 'No', oktaDeveloper: false, oktaTester: false, oktaPOTester: false, testerMod: 'No'}
    default:
      return state;
  }
};

export default loggedReducer;
