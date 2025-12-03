export const signIn = (userId, accessToken, email) => {
    return {
        type: 'SIGN_IN',
        payload: { userId, accessToken, email }
    };
};

export const signOut = () => {
    return {
        type: 'SIGN_OUT',
    };
};

export const setTesterMod = (mod) => {
    return { type: 'SET_TESTER_MOD', payload: mod };
};
