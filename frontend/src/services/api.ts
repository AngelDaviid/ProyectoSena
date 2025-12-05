import axios from 'axios';

const isDevelopment = import. meta.env.MODE === 'development';

const baseURL = import.meta. env.VITE_SENA_API_URL ||
    (isDevelopment ? 'http://localhost:3001' : 'https://proyectosena-gkx1.onrender. com');

const api = axios.create({
    baseURL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
    timeout: 15000,
});

api.interceptors. request.use(
    (config) => {
        const token = localStorage.getItem('access_token');
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        console.log(`[API Request] ${config.method?. toUpperCase()} ${config. url}`);
        return config;
    },
    (error) => {
        console.error('[API Request Error]', error);
        return Promise.reject(error);
    }
);

api.interceptors.response.use(
    (response) => {
        console.log(`[API Response] ✅ ${response.config.url} - ${response.status}`);
        return response;
    },
    (error) => {
        console.error('[API Response Error]', {
            url: error.config?.url,
            status: error.response?.status,
            message: error.response?.data?.message || error.message,
        });

        // Manejar errores 401
        if (error.response?.status === 401) {
            localStorage.removeItem('access_token');
            if (! window.location.pathname.includes('/login')) {
                window.location.href = '/login';
            }
        }

        // Manejar errores de CORS/Network
        if (error.message === 'Network Error' || ! error.response) {
            console.error('[CORS/Network Error] Backend no accesible');
            error.message = 'Error de conexión.  Verifica que el servidor esté activo.';
        }

        return Promise.reject(error);
    }
);

export default api;