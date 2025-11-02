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
    const [avatar, setAvatar] = useState<string>('');
    const [role, setRole] = useState<'desarrollador' | 'instructor' | 'aprendiz' | ''>('');
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
            const data = await register(name, lastName, email, password, avatar || undefined, role || undefined);
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
        <>
            <h1>Registro</h1>
            <form onSubmit={handleSubmit}>
                <input placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
                <input placeholder="Apellido" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                <input placeholder="Correo" value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
                <input placeholder="Contraseña (mín 8)" value={password} onChange={(e) => setPassword(e.target.value)} type="password" />
                <input placeholder="Repetir contraseña" value={password2} onChange={(e) => setPassword2(e.target.value)} type="password" />
                <input placeholder="Avatar URL (opcional)" value={avatar} onChange={(e) => setAvatar(e.target.value)} />
                <select value={role} onChange={(e) => setRole(e.target.value as any)}>
                    <option value="">Seleccionar rol (opcional)</option>
                    <option value="desarrollador">Desarrollador</option>
                    <option value="instructor">Instructor</option>
                    <option value="aprendiz">Aprendiz</option>
                </select>
                {error && <div className="error">{error}</div>}
                <button type="submit" disabled={loading}>{loading ? 'Cargando...' : 'Crear cuenta'}</button>
            </form>
            <div style={{ marginTop: 12 }}>
                <small>¿Ya tienes cuenta? <a href="/login">Inicia sesión</a></small>
            </div>
        </>
    );
}