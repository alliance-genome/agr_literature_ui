export const signIn = (userId, accessToken) => {
    return {
        type: 'SIGN_IN',
        payload:{userId: userId, accessToken:accessToken}
    };
};

export const signOut = () => {
    return {
        type: 'SIGN_OUT',
    };
};