import apiClient, { retryPendingRequests, setStore } from './apiClient';

// Convenience API methods
export const api = {
    get: (url, config) => apiClient.get(url, config),
    post: (url, data, config) => apiClient.post(url, data, config),
    patch: (url, data, config) => apiClient.patch(url, data, config),
    delete: (url, config) => apiClient.delete(url, config),
    put: (url, data, config) => apiClient.put(url, data, config),
    request: (config) => apiClient.request(config),
};

export { apiClient, retryPendingRequests, setStore };
export default apiClient;
