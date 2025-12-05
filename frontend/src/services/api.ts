import axios from 'axios';

const isDevelopment = import.meta.env.MODE === 'development';

const baseURL = import.meta.env.VITE_SENA_API_URL ||
    (isDevelopment ?  'http://localhost:3001' : 'https://proyectosena-gkx1.onrender.com');
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