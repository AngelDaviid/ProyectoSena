import React, { useState } from 'react';
import { register } from '../services/auth';
import { useAuth } from "../hooks/useAuth.ts";
import { useNavigate } from 'react-router-dom';

export default function Register() {
    const navigate = useNavigate();
    const { setUser, setToken } = useAuth();
    const [name, setName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState<string>('');
    const [password2, setPassword2] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        if (!name || !lastName || !email || !password) {
            setError('Todos los campos obligatorios deben ser completados');
            return;
        }

        if (password.length < 8) {
            setError('La contraseña debe tener al menos 8 caracteres');
            return;
        }

        if (password !== password2) {
            setError('Las contraseñas no coinciden');
            return;
        }

        try {
            setLoading(true);
            const data = await register(name, lastName, email, password, undefined, 'aprendiz'); // rol por defecto
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
        <div className="flex items-center justify-center min-h-screen bg-gray-100 px-4">
            <div className="bg-white shadow-md rounded-2xl p-8 w-full max-w-md">
                <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">
                    Crear cuenta
                </h1>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-gray-600 text-sm mb-1">Nombre</label>
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Nombre"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:outline-none transition duration-200"
                        />
                    </div>

                    <div>
                        <label className="block text-gray-600 text-sm mb-1">Apellido</label>
                        <input
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            placeholder="Apellido"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:outline-none transition duration-200"
                        />
                    </div>

                    <div>
                        <label className="block text-gray-600 text-sm mb-1">Correo electrónico</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="ejemplo@correo.com"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:outline-none transition duration-200"
                        />
                    </div>

                    <div>
                        <label className="block text-gray-600 text-sm mb-1">Contraseña</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Mínimo 8 caracteres"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:outline-none transition duration-200"
                        />
                    </div>

                    <div>
                        <label className="block text-gray-600 text-sm mb-1">Repetir contraseña</label>
                        <input
                            type="password"
                            value={password2}
                            onChange={(e) => setPassword2(e.target.value)}
                            placeholder="Repite la contraseña"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:outline-none transition duration-200"
                        />
                    </div>

                    {error && (
                        <div className="text-red-600 text-sm bg-red-50 border border-red-300 rounded-md p-2 text-center">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-2 rounded-lg font-semibold text-white transition duration-200 shadow-sm hover:shadow-md ${
                            loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                    >
                        {loading ? 'Cargando...' : 'Crear cuenta'}
                    </button>

                    <div className="text-center text-sm text-gray-600 mt-4">
                        ¿Ya tienes cuenta?{' '}
                        <a href="/login" className="text-blue-600 hover:text-blue-800 font-medium underline decoration-1">
                            Inicia sesión
                        </a>
                    </div>
                </form>
            </div>
        </div>
    );
}
