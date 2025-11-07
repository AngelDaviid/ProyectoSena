import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { register as registerUser } from '../services/auth';
import { useAuth } from '../hooks/useAuth.ts';

export default function Register() {
    const navigate = useNavigate();
    const { setUser, setToken } = useAuth();
    const [name, setName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        if (!name || !lastName || !email || !password) {
            setError('Todos los campos son requeridos');
            return;
        }
        if (password !== confirm) {
            setError('Las contraseñas no coinciden');
            return;
        }
        try {
            setLoading(true);
            // Llamamos con los 4 argumentos que espera services/auth.register
            const data = await registerUser(name, lastName, email, password);
            setToken(data.access_token);
            setUser(data.user);
            navigate('/dashboard');
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Error al registrar');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-start justify-center py-12 px-4 bg-gray-100">
            {/* Contenedor más ancho (max-w-xl) */}
            <div className="w-full max-w-xl p-8 rounded-xl bg-white shadow-sm">
                <h1 className="text-2xl font-semibold text-gray-800 mb-6">Crear cuenta</h1>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Nombre */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Nombre</label>
                        <div className="flex items-center border border-gray-200 rounded-md overflow-hidden">
                            <div className="flex items-center justify-center w-12 h-12 bg-gray-50 border-r border-gray-200 text-gray-500">
                                {/* user SVG */}
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
                                    <path strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" d="M16 14a4 4 0 10-8 0v1a3 3 0 003 3h2a3 3 0 003-3v-1z" />
                                    <path strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" d="M12 7a3 3 0 100-6 3 3 0 000 6z" />
                                </svg>
                            </div>
                            {/* input con altura fija para que todas tengan la misma dimensión */}
                            <input
                                className="w-full h-12 px-4 bg-white outline-none text-gray-700 placeholder-gray-400"
                                placeholder="Name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Apellido */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Apellido</label>
                        <div className="flex items-center border border-gray-200 rounded-md overflow-hidden">
                            <div className="flex items-center justify-center w-12 h-12 bg-gray-50 border-r border-gray-200 text-gray-500">
                                {/* arrow-left SVG */}
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
                                    <path strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
                                </svg>
                            </div>
                            <input
                                className="w-full h-12 px-4 bg-white outline-none text-gray-700 placeholder-gray-400"
                                placeholder="Last name"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* E-mail - con @ como icono */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">E-mail</label>
                        <div className="flex items-center border border-gray-200 rounded-md overflow-hidden">
                            <div className="flex items-center justify-center w-12 h-12 bg-gray-50 border-r border-gray-200 text-gray-500 text-lg font-medium">
                                {/* @ como icono */}
                                <span aria-hidden>@</span>
                            </div>
                            <input
                                className="w-full h-12 px-4 bg-white outline-none text-gray-700 placeholder-gray-400"
                                placeholder="example@mail.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                type="email"
                                autoComplete="email"
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                        {/* Contenedor flex; left icon w-12, input h-12, boton con ancho fijo w-12 para que no cambie el width */}
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
                                autoComplete="new-password"
                            />

                            {/* Botón con ancho fijo para que el ancho del formulario no cambie */}
                            <button
                                type="button"
                                onClick={() => setShowPassword(s => !s)}
                                className="w-12 h-12 flex items-center justify-center bg-gray-50 border-l border-gray-200 text-gray-600"
                                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                            >
                                {/* Alterna icono ojo / ojo tachado (SVGs) */}
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
                    </div>

                    {/* Confirm Password */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
                        <input
                            className="w-full h-12 px-4 border border-gray-200 rounded-md bg-white text-gray-700 placeholder-gray-400 outline-none"
                            placeholder="Confirm password"
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                            type="password"
                            autoComplete="new-password"
                        />
                    </div>

                    {error && <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-md p-2">{error}</div>}

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-3 rounded-md font-semibold text-white transition duration-200 ${loading ? 'bg-gray-400' : 'bg-gradient-to-b from-blue-400 to-blue-500 hover:from-blue-500 hover:to-blue-600'}`}
                    >
                        {loading ? 'Creando...' : 'Sign Up'}
                    </button>

                    <div className="text-center text-sm text-gray-600 mt-3">
                        Already have an account? <a href="/login" className="text-blue-500 hover:underline">Login</a>
                    </div>
                </form>
            </div>
        </div>
    );
}