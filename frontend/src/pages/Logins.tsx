import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/auth';
import { useAuth } from '../hooks/useAuth.ts';

export default function Login() {
    const navigate = useNavigate();
    const { setUser, setToken } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [background, setBackground] = useState('/fondo1920x1080.jpeg');

    useEffect(() => {
        const width = window.innerWidth;

        if (width <= 1366) {
            setBackground('/fondo1366x768.jpeg');
        } else {
            setBackground('/fondo1920x1080.jpeg');
        }
    }, []);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        if (!email || !password) {
            setError('Email y contraseña son requeridos');
            return;
        }

        try {
            setLoading(true);
            const data = await login(email, password);
            setToken(data.access_token);
            setUser(data.user);
            navigate('/dashboard');
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Error al iniciar sesión');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div
            style={{
                backgroundImage: `url('${background}')`,
                backgroundSize: "cover",
                backgroundPosition: "top center",
                backgroundRepeat: "no-repeat",
                minHeight: "100vh",
            }}
            className="flex items-center justify-center p-6"
        >

            <div className="w-full max-w-md bg-white/90 backdrop-blur-sm rounded-3xl shadow-md p-10 text-center border border-gray-100">

                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-800 tracking-wide">
                        SENA<br />CONECTA
                    </h1>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 text-left">

                    <div>
                        <label className="text-sm text-gray-700 font-medium">Correo</label>
                        <input
                            type="email"
                            placeholder="Ingrese su correo"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="mt-1 w-full h-11 border border-gray-300 rounded-md px-4 text-gray-700 outline-none focus:border-blue-400"
                        />
                    </div>

                    <div>
                        <label className="text-sm text-gray-700 font-medium">Contraseña</label>
                        <input
                            type="password"
                            placeholder="Ingrese su contraseña"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="mt-1 w-full h-11 border border-gray-300 rounded-md px-4 text-gray-700 outline-none focus:border-blue-400"
                        />
                    </div>

                    {error && (
                        <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-md p-2">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-3 rounded-md font-semibold text-white transition duration-200 
                        ${loading ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'}`}
                    >
                        {loading ? 'Cargando...' : 'Iniciar Sesión'}
                    </button>
                </form>

                <div className="text-center text-sm text-gray-600 mt-4">
                    ¿No tienes cuenta?{' '}
                    <button
                        onClick={() => navigate('/register')}
                        className="text-blue-500 hover:underline font-medium"
                    >
                        Regístrate
                    </button>
                </div>

            </div>
        </div>
    );
}
