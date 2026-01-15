// Action types for re-authentication modal and pending request queue
export const SHOW_REAUTH_MODAL = 'SHOW_REAUTH_MODAL';
export const HIDE_REAUTH_MODAL = 'HIDE_REAUTH_MODAL';
export const ADD_PENDING_REQUEST = 'ADD_PENDING_REQUEST';
export const CLEAR_PENDING_REQUESTS = 'CLEAR_PENDING_REQUESTS';
export const SET_AUTH_LOADING = 'SET_AUTH_LOADING';
export const SET_DEV_TESTING_REAUTH = 'SET_DEV_TESTING_REAUTH';

// Show the re-authentication modal
export const showReauthModal = () => ({
    type: SHOW_REAUTH_MODAL
});

// Set dev testing mode for re-auth (prevents auto-hide)
export const setDevTestingReauth = (enabled) => ({
    type: SET_DEV_TESTING_REAUTH,
    payload: enabled
});

// Hide the re-authentication modal
export const hideReauthModal = () => ({
    type: HIDE_REAUTH_MODAL
});

// Add a pending request to the queue (to be retried after re-auth)
export const addPendingRequest = (request) => ({
    type: ADD_PENDING_REQUEST,
    payload: request
});

// Clear all pending requests from the queue
export const clearPendingRequests = () => ({
    type: CLEAR_PENDING_REQUESTS
});

// Set loading state for auth check
export const setAuthLoading = (isLoading) => ({
    type: SET_AUTH_LOADING,
    payload: isLoading
});
