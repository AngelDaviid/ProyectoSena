import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/auth';
import { useAuth } from "../hooks/useAuth.ts";

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
            // backend devuelve access_token
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
        <>
            <h1>Iniciar sesión</h1>
            <form onSubmit={handleSubmit}>
                <input
                    placeholder="Correo"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    autoComplete="username"
                />
                <input
                    placeholder="Contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type="password"
                    autoComplete="current-password"
                />
                {error && <div className="error">{error}</div>}
                <button type="submit" disabled={loading}>{loading ? 'Cargando...' : 'Entrar'}</button>
            </form>
            <div style={{ marginTop: 12 }}>
                <small>¿No tienes cuenta? <a href="/register">Regístrate</a></small>
            </div>
        </>
    );
}