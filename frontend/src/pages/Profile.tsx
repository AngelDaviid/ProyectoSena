import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useLocation, useNavigate } from 'react-router-dom';
import { getProfile } from '../services/auth';
import { updateUser, uploadAvatar } from '../services/users';
import type { User } from '../types/type';
import { Save, X, Image as ImageIcon } from 'lucide-react';

const API_BASE = import.meta.env.SENA_API_URL || 'http://localhost:3001';

const Profile: React.FC = () => {
    const { user: contextUser, setUser: setContextUser, token } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    const [user, setLocalUser] = useState<User | null>(location.state?.user || contextUser || null);
    const [loading, setLoading] = useState(false);
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({ name: '', lastName: '' });
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [objectUrl, setObjectUrl] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;

        if (!user && token) {
            (async () => {
                try {
                    const p = await getProfile();
                    if (!mounted) return;
                    setContextUser(p);
                    setLocalUser(p);
                    setForm({ name: p.profile?.name ?? '', lastName: p.profile?.lastName ?? '' });
                    setPreview(p.profile?.avatar ?? null);
                } catch (err) {
                    console.warn('Error cargando perfil:', err);
                    if (mounted) navigate('/');
                }
            })();
            return () => {
                mounted = false;
            };
        }

        if (user) {
            setForm({ name: user.profile?.name ?? '', lastName: user.profile?.lastName ?? '' });
            setPreview(user.profile?.avatar ?? null);
        }

        return () => {
            mounted = false;
        };
    }, [user, token, setContextUser, navigate]);

    const resolvePreviewUrl = (p: string | null | undefined) => {
        if (!p) return null;
        if (p.startsWith('/')) return `${API_BASE}${p}`;
        return p;
    };

    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0] ?? null;
        setAvatarFile(f);

        if (objectUrl) {
            URL.revokeObjectURL(objectUrl);
            setObjectUrl(null);
        }

        if (f) {
            const url = URL.createObjectURL(f);
            setPreview(url);
            setObjectUrl(url);
        } else {
            setPreview(null);
        }
    };

    // Cleanup object URL on unmount
    useEffect(() => {
        return () => {
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [objectUrl]);

    const removeAvatarSelection = () => {
        if (objectUrl) {
            URL.revokeObjectURL(objectUrl);
            setObjectUrl(null);
        }
        setAvatarFile(null);
        setPreview(null);
    };

    const handleSave = async () => {
        if (!user) return;
        setError(null);
        setLoading(true);
        try {
            let updatedUser: User | null = null;

            if (avatarFile) {
                updatedUser = await uploadAvatar(user.id, avatarFile);
            }

            const payload: any = { profile: {} as any };
            if (form.name !== (user.profile?.name ?? '')) payload.profile.name = form.name;
            if (form.lastName !== (user.profile?.lastName ?? '')) payload.profile.lastName = form.lastName;

            const currentAvatarExists = !!user.profile?.avatar;
            const hasUploadedNewAvatar = !!avatarFile;
            const previewIsNull = preview == null;
            if (previewIsNull && !hasUploadedNewAvatar && currentAvatarExists) {
                payload.profile.avatar = null;
            }

            if (Object.keys(payload.profile).length > 0) {
                updatedUser = await updateUser(user.id, payload);
            }

            if (updatedUser) {
                setContextUser(updatedUser);
                setLocalUser(updatedUser);
                setPreview(updatedUser.profile?.avatar ?? null);
            } else {
                setContextUser((prev: any) => {
                    if (!prev) return prev;
                    return {
                        ...prev,
                        profile: {
                            ...prev.profile,
                            name: payload.profile.name ?? prev.profile?.name,
                            lastName: payload.profile.lastName ?? prev.profile?.lastName,
                            avatar: payload.profile.avatar !== undefined ? payload.profile.avatar : prev.profile?.avatar,
                        },
                    };
                });
                setLocalUser((prev) => {
                    if (!prev) return prev;
                    return {
                        ...prev,
                        profile: {
                            ...prev.profile,
                            name: payload.profile.name ?? prev.profile?.name,
                            lastName: payload.profile.lastName ?? prev.profile?.lastName,
                            avatar: payload.profile.avatar !== undefined ? payload.profile.avatar : prev.profile?.avatar,
                        },
                    } as User;
                });
            }

            setEditing(false);
            setAvatarFile(null);
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
                setObjectUrl(null);
            }
        } catch (err: any) {
            setError(err?.response?.data?.message || err?.message || 'Error al guardar');
        } finally {
            setLoading(false);
        }
    };

    if (!user) return <div className="p-6 text-center text-gray-600">Inicia sesión para ver tu perfil</div>;

    const displayName = `${user.profile?.name ?? ''} ${user.profile?.lastName ?? ''}`.trim() || user.email;

    const imageSrc = preview ? (preview.startsWith('blob:') ? preview : resolvePreviewUrl(preview) ?? undefined) : undefined;

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6 flex gap-8">
                <div className="w-48 flex flex-col items-center">
                    <div className="relative">
                        <div className="w-40 h-40 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center text-3xl font-bold text-white">
                            {imageSrc ? (
                                <img src={imageSrc} alt={displayName} className="w-full h-full object-cover" />
                            ) : (
                                (user.profile?.name?.charAt(0) || user.email?.charAt(0) || 'U').toUpperCase()
                            )}
                        </div>

                        {editing && (
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="absolute -bottom-2 right-0 bg-white border rounded-full p-2 shadow hover:bg-gray-50"
                                aria-label="Cambiar avatar"
                            >
                                <ImageIcon className="w-4 h-4 text-gray-700" />
                            </button>
                        )}
                    </div>

                    <input ref={fileInputRef} type="file" accept="image/*" onChange={onFileChange} className="hidden" />

                    {editing && (
                        <div className="mt-3 flex gap-2">
                            <button type="button" onClick={removeAvatarSelection} className="text-sm text-red-600">
                                Quitar avatar
                            </button>
                            <button type="button" onClick={() => fileInputRef.current?.click()} className="text-sm text-blue-600">
                                Seleccionar...
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex-1">
                    <div className="flex items-start justify-between">
                        <div>
                            {!editing ? (
                                <>
                                    <h2 className="text-2xl font-semibold text-gray-900">{displayName}</h2>
                                    <div className="text-sm text-gray-500">{user.email}</div>
                                </>
                            ) : (
                                <div className="grid grid-cols-2 gap-3">
                                    <input value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} placeholder="Nombre" className="border border-gray-200 rounded-md px-3 py-2" />
                                    <input value={form.lastName} onChange={(e) => setForm((s) => ({ ...s, lastName: e.target.value }))} placeholder="Apellidos" className="border border-gray-200 rounded-md px-3 py-2" />
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            {!editing ? (
                                <button onClick={() => setEditing(true)} className="px-4 py-2 rounded-full bg-blue-600 text-white">
                                    Editar perfil
                                </button>
                            ) : (
                                <>
                                    <button
                                        onClick={() => {
                                            setEditing(false);
                                            setForm({ name: user.profile?.name ?? '', lastName: user.profile?.lastName ?? '' });
                                            setAvatarFile(null);
                                            setPreview(user.profile?.avatar ?? null);
                                            if (objectUrl) {
                                                URL.revokeObjectURL(objectUrl);
                                                setObjectUrl(null);
                                            }
                                        }}
                                        className="px-4 py-2 rounded-full border border-gray-300 text-gray-700 bg-white"
                                    >
                                        <X className="inline-block w-4 h-4 mr-1" /> Cancelar
                                    </button>
                                    <button onClick={handleSave} disabled={loading} className={`px-4 py-2 rounded-full text-white ${loading ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}>
                                        <Save className="inline-block w-4 h-4 mr-1" /> {loading ? 'Guardando...' : 'Guardar'}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="mt-6 text-sm text-gray-700">
                        <p>
                            <strong>Rol:</strong> {user.role}
                        </p>
                        <p className="mt-2">
                            <strong>Miembro desde:</strong> {new Date(user.createdAt || Date.now()).toLocaleDateString()}
                        </p>
                    </div>

                    {error && <div className="mt-4 text-red-600">{error}</div>}
                </div>
            </div>
        </div>
    );
};

export default Profile;