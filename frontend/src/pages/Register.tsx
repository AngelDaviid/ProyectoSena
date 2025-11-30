import React, { useState, useEffect } from 'react';
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

    const [bgImage, setBgImage] = useState("/fondo1920x1080.jpeg");

    useEffect(() => {
        const updateBackground = () => {
            const width = window.innerWidth;
            if (width <= 1366) {
                setBgImage("/fondo1366x768.jpeg");
            } else {
                setBgImage("/fondo1920x1080.jpeg");
            }
        };

        updateBackground();
        window.addEventListener("resize", updateBackground);
        return () => window.removeEventListener("resize", updateBackground);
    }, []);

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
        <div
            className="min-h-screen w-full flex items-start justify-center py-12 px-4"
            style={{
                backgroundImage: `url(${bgImage})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat"
            }}
        >
            <div className="w-full max-w-xl p-8 rounded-xl bg-white/90 backdrop-blur shadow-sm">
                <h1 className="text-2xl font-semibold text-gray-800 mb-6">Crear cuenta</h1>

                <form onSubmit={handleSubmit} className="space-y-5">

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Nombre</label>
                        <div className="flex items-center border border-gray-200 rounded-md overflow-hidden">
                            <div className="flex items-center justify-center w-12 h-12 bg-gray-50 border-r border-gray-200 text-gray-500">
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" d="M16 14a4 4 0 10-8 0v1a3 3 0 003 3h2a3 3 0 003-3v-1z" />
                                    <path strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" d="M12 7a3 3 0 100-6 3 3 0 000 6z" />
                                </svg>
                            </div>
                            <input
                                className="w-full h-12 px-4 bg-white outline-none text-gray-700 placeholder-gray-400"
                                placeholder="Nombre"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Apellido</label>
                        <div className="flex items-center border border-gray-200 rounded-md overflow-hidden">
                            <div className="flex items-center justify-center w-12 h-12 bg-gray-50 border-r border-gray-200 text-gray-500">
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
                                </svg>
                            </div>
                            <input
                                className="w-full h-12 px-4 bg-white outline-none text-gray-700 placeholder-gray-400"
                                placeholder="Apellido"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Correo</label>
                        <div className="flex items-center border border-gray-200 rounded-md overflow-hidden">
                            <div className="flex items-center justify-center w-12 h-12 bg-gray-50 border-r border-gray-200 text-gray-500 text-lg font-medium">
                                @
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

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Contraseña</label>
                        <div className="flex items-center border border-gray-200 rounded-md overflow-hidden">
                            <div className="flex items-center justify-center w-12 h-12 bg-gray-50 border-r border-gray-200 text-gray-500">
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                    <path strokeWidth={1.5} d="M7 11V7a5 5 0 0110 0v4" />
                                </svg>
                            </div>

                            <input
                                className="w-full h-12 px-4 bg-white outline-none text-gray-700 placeholder-gray-400"
                                placeholder="Contraseña"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="new-password"
                            />

                            <button
                                type="button"
                                onClick={() => setShowPassword(s => !s)}
                                className="w-12 h-12 flex items-center justify-center bg-gray-50 border-l border-gray-200 text-gray-600"
                            >
                                {showPassword ? '🙈' : '👁️'}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Confirmar Contraseña</label>
                        <input
                            className="w-full h-12 px-4 border border-gray-200 rounded-md bg-white text-gray-700 placeholder-gray-400 outline-none"
                            placeholder="Confirmar contraseña"
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                            type="password"
                            autoComplete="new-password"
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
                        className={`w-full py-3 rounded-md font-semibold text-white transition duration-200 ${
                            loading ? 'bg-gray-400' : 'bg-gradient-to-b from-blue-400 to-blue-500 hover:from-blue-500 hover:to-blue-600'
                        }`}
                    >
                        {loading ? 'Creando...' : 'Sign Up'}
                    </button>

                    <div className="text-center text-sm text-gray-600 mt-3">
                        Ya tiene cuenta?{" "}
                        <a href="/login" className="text-blue-500 hover:underline">
                            Login
                        </a>
                    </div>
                </form>
            </div>
        </div>
    );
}