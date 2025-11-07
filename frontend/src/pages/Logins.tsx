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
    const [showPassword, setShowPassword] = useState(false);
    const [remember, setRemember] = useState(false);

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
            if (remember) localStorage.setItem('remember', '1');
            navigate('/dashboard');
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Error al iniciar sesión');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-start justify-center py-12 px-4 bg-gray-100">
            {/* Contenedor ancho (coincide con Register) */}
            <div className="w-full max-w-xl p-8 rounded-xl bg-white shadow-sm">
                <h1 className="text-2xl font-semibold text-gray-800 mb-6">Iniciar sesión</h1>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* E-mail con @ como icono */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">E-mail</label>
                        <div className="flex items-center border border-gray-200 rounded-md overflow-hidden">
                            <div className="flex items-center justify-center w-12 h-12 bg-gray-50 border-r border-gray-200 text-gray-500 text-lg font-medium">
                                <span aria-hidden>@</span>
                            </div>
                            <input
                                className="w-full h-12 px-4 bg-white outline-none text-gray-700 placeholder-gray-400"
                                placeholder="example@mail.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                type="email"
                                autoComplete="username"
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                        <div className="flex items-center border border-gray-200 rounded-md overflow-hidden">
                            <div className="flex items-center justify-center w-12 h-12 bg-gray-50 border-r border-gray-200 text-gray-500">
                                {/* lock SVG */}
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" strokeWidth={1.5}></rect>
                                    <path strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" d="M7 11V7a5 5 0 0110 0v4" />
                                </svg>
                            </div>

                            <input
                                className="w-full h-12 px-4 bg-white outline-none text-gray-700 placeholder-gray-400"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="current-password"
                            />

                            {/* Botón con ancho fijo para que el layout no se mueva */}
                            <button
                                type="button"
                                onClick={() => setShowPassword((s) => !s)}
                                className="w-12 h-12 flex items-center justify-center bg-gray-50 border-l border-gray-200 text-gray-600"
                                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                            >
                                {showPassword ? (
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
                                        <path strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-5 0-9.27-3.11-11-7 1.05-2.18 2.85-3.99 5-5.15" />
                                        <path strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" d="M2 2l20 20" />
                                    </svg>
                                ) : (
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
                                        <path strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" d="M2.05 12.55A10 10 0 0112 4c5 0 9.27 3.11 11 7-1.05 2.18-2.85 3.99-5 5.15" />
                                        <circle cx="12" cy="12" r="3" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                )}
                            </button>
                        </div>

                        <div className="flex items-center justify-between mt-2">
                            <label className="inline-flex items-center text-sm text-gray-600">
                                <input type="checkbox" checked={remember} onChange={() => setRemember(!remember)} className="form-checkbox h-4 w-4 text-blue-500" />
                                <span className="ml-2">Remember me</span>
                            </label>
                            <a href="/forgot" className="text-sm text-blue-500 hover:underline">Forgot a password?</a>
                        </div>
                    </div>

                    {error && (
                        <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-md p-2">
                            {error}
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button
                            type="submit"
                            disabled={loading}
                            className={`flex-1 py-3 rounded-md font-semibold text-white transition duration-200 ${loading ? 'bg-gray-400' : 'bg-gradient-to-b from-blue-400 to-blue-500 hover:from-blue-500 hover:to-blue-600'}`}
                        >
                            {loading ? 'Cargando...' : 'Sign In'}
                        </button>

                        <a
                            href="/register"
                            className="flex-1 py-3 rounded-md text-center border border-blue-500 text-blue-500 hover:bg-blue-50"
                        >
                            Create Account
                        </a>
                    </div>

                    <div className="text-center text-sm text-gray-600 mt-3">
                        ¿No tienes cuenta? <a href="/register" className="text-blue-500 hover:underline">Regístrate</a>
                    </div>
                </form>
            </div>
        </div>
    );
}