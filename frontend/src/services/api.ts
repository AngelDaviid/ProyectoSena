import axios from 'axios';

const baseURL = import.meta.env.SENA_API_URL || 'http://localhost:3001';

const api = axios.create({
    baseURL,
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token');
    if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    // Debug: traza rápida para ver quién lanza la petición (temporal)
    try {
        // Solo traza en dev
        if (import.meta.env.DEV) {
            const stack = new Error().stack || '';
            // No abuses de logging en producción
            // console.debug(`[api] ${config.method?.toUpperCase()} ${config.url}`, stack);
            // Mejor: imprime solo las primeras líneas de la traza
            const short = stack.split('\n').slice(0, 6).join('\n');
            console.debug(`[api] -> ${config.method?.toUpperCase()} ${config.url}\n${short}`);
        }
    } catch (e) {
        // ignore
    }

    return config;
});

export default api;