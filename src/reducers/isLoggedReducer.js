import jwt_decode from 'jwt-decode';

const INTIAL_STATE = {
  isSignedIn: null,
  everSignedIn: null,
  userId: null,
  oktaGroups: null,
  oktaMod: 'No',
  oktaDeveloper: false,
  oktaTester: false,
  testerMod: 'No',
  accessToken: null,
  uid: null
};

const loggedReducer = (state = INTIAL_STATE, action) => {
  const devOrStageOrProd = process.env.REACT_APP_DEV_OR_STAGE_OR_PROD;
  switch (action.type) {
    case 'SET_TESTER_MOD':
      return { ...state, testerMod: action.payload }
    case 'SIGN_IN':
      const jsonToken = jwt_decode(action.payload.accessToken);
      let oktaMod = 'No';
      let oktaDeveloper = false;
      let oktaTester = false;
      if (jsonToken.Groups) {
        for (const oktaGroup of jsonToken.Groups) {
          if (oktaGroup.endsWith('Developer')) { oktaDeveloper = true; }
          if (oktaGroup === 'Tester' && devOrStageOrProd !== 'prod') { oktaTester = true; }
            else if (oktaGroup === 'POTester' && devOrStageOrProd === 'prod') { oktaTester = true; }
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
        everSignedIn: true,
        userId: action.payload.userId,
        accessToken: action.payload.accessToken,
        testerMod: 'No',
        oktaMod: oktaMod,
        oktaDeveloper: oktaDeveloper,
        oktaTester: oktaTester,
        oktaGroups: jsonToken.Groups,
        uid: jsonToken.uid}
    case 'SIGN_OUT':
      return {...state, isSignedIn: false, userId: null, oktaGroups: null, oktaMod: 'No', oktaDeveloper: false, oktaTester: false, testerMod: 'No', uid: null}
    default:
      return state;
  }
};

export default loggedReducer;
