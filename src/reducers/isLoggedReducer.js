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
      // Cognito uses 'cognito:groups' claim for groups (same group names as Okta)
      const groups = jsonToken['cognito:groups'] || jsonToken.Groups || [];
      if (groups && groups.length > 0) {
        for (const group of groups) {
          if (group.endsWith('Developer')) { oktaDeveloper = true; }
          if (group === 'Tester' && devOrStageOrProd !== 'prod') { oktaTester = true; }
            else if (group === 'POTester' && devOrStageOrProd === 'prod') { oktaTester = true; }
          if (group.startsWith('SGD')) { oktaMod = 'SGD'; }
            else if (group.startsWith('RGD')) { oktaMod = 'RGD'; }
            else if (group.startsWith('MGI')) { oktaMod = 'MGI'; }
            else if (group.startsWith('ZFIN')) { oktaMod = 'ZFIN'; }
            else if (group.startsWith('Xen')) { oktaMod = 'XB'; }
            else if (group.startsWith('Fly')) { oktaMod = 'FB'; }
            else if (group.startsWith('Worm')) { oktaMod = 'WB'; } }
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
        oktaGroups: groups,
        uid: jsonToken.sub || jsonToken.uid}
    case 'SIGN_OUT':
      return {...state, isSignedIn: false, userId: null, oktaGroups: null, oktaMod: 'No', oktaDeveloper: false, oktaTester: false, testerMod: 'No', uid: null, accessToken: null}
    default:
      return state;
  }
};

export default loggedReducer;
