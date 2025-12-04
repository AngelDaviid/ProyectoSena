import axios from 'axios';

const baseURL = import.meta.env.VITE_SENA_API_URL || 'http://localhost:3001';

const api = axios.create({
    baseURL,
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token');
    if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;