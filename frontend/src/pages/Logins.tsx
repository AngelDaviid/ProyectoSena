import React, { useState } from 'react';
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
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-600 to-indigo-700 px-4">
            <div className="bg-white shadow-xl rounded-3xl p-10 w-full max-w-md transform transition-all duration-500 hover:scale-105">
                <h1 className="text-4xl font-extrabold text-center text-gray-800 mb-8">
                    Iniciar sesión
                </h1>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="relative">
                        <label className="block text-gray-600 text-sm mb-2">Correo electrónico</label>
                        <input
                            placeholder="ejemplo@correo.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            type="email"
                            autoComplete="username"
                            className="w-full px-5 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all duration-200"
                        />
                    </div>

                    <div className="relative">
                        <label className="block text-gray-600 text-sm mb-2">Contraseña</label>
                        <input
                            placeholder="********"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            type="password"
                            autoComplete="current-password"
                            className="w-full px-5 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all duration-200"
                        />
                    </div>

                    {error && (
                        <div className="flex items-center text-red-600 text-sm bg-red-50 border border-red-300 rounded-lg p-3 space-x-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" />
                            </svg>
                            <span>{error}</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-3 rounded-2xl font-semibold text-white transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 ${
                            loading
                                ? 'bg-blue-400 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                    >
                        {loading ? 'Cargando...' : 'Entrar'}
                    </button>

                    <div className="text-center text-sm text-gray-600 mt-4">
                        ¿No tienes cuenta?{' '}
                        <a
                            href="/register"
                            className="text-blue-600 hover:text-blue-800 font-medium underline decoration-2 decoration-blue-500"
                        >
                            Regístrate
                        </a>
                    </div>
                </form>
            </div>
        </div>
    );
}
