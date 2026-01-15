import axios from 'axios';

// Store reference - will be set after store is created to avoid circular dependency
let store = null;

export const setStore = (storeInstance) => {
    store = storeInstance;
};

const apiClient = axios.create({
    baseURL: process.env.REACT_APP_RESTAPI,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor - adds auth token to every request
apiClient.interceptors.request.use(
    (config) => {
        if (store) {
            const state = store.getState();
            const token = state.isLogged.accessToken;
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor - handles 401 errors for re-authentication
apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Check for 401 Unauthorized and that this isn't already a retry
        if (error.response?.status === 401 && !originalRequest._retry && store) {
            originalRequest._retry = true;

            // Dynamically import to avoid circular dependency
            const { showReauthModal, addPendingRequest } = await import('../actions/authActions');

            // Show re-auth modal
            store.dispatch(showReauthModal());

            // Return a promise that will be resolved after re-auth
            return new Promise((resolve, reject) => {
                store.dispatch(addPendingRequest({
                    resolve,
                    reject,
                    config: originalRequest
                }));
            });
        }

        return Promise.reject(error);
    }
);

// Function to retry pending requests after successful re-auth
export const retryPendingRequests = () => {
    if (!store) return;

    const state = store.getState();
    const pendingRequests = state.isLogged.pendingRequests || [];
    const newToken = state.isLogged.accessToken;

    pendingRequests.forEach(({ resolve, reject, config }) => {
        // Update the authorization header with new token
        config.headers.Authorization = `Bearer ${newToken}`;
        // Remove the retry flag to allow fresh request
        delete config._retry;

        // Retry the request
        apiClient.request(config)
            .then(resolve)
            .catch(reject);
    });
};

export default apiClient;
