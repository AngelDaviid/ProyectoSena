import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useLocation, useNavigate } from 'react-router-dom';
import { getProfile } from '../services/auth';
import { updateUser, uploadAvatar } from '../services/users';
import type { User } from '../types/type';
import { Save, X, Image as ImageIcon } from 'lucide-react';
import PostItem from '../components/Posts/PostItem';
import type { Post } from '../types/post';

const API_BASE = import.meta.env.SENA_API_URL || 'http://localhost:3001';

const Profile: React.FC = () => {
    const { user: contextUser, setUser: setContextUser, token } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    const [user, setLocalUser] = useState<User | null>(location.state?.user || contextUser || null);
    const [loading, setLoading] = useState(false);
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({
        name: '',
        lastName: '',
        email: '',
        url: '',
        password: '',
        bio: '',
    });
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [objectUrl, setObjectUrl] = useState<string | null>(null);

    // pestañas: actividad (posts) y ajustes
    const [activeTab, setActiveTab] = useState<'actividad' | 'ajustes'>('actividad');

    // posts (actividad) - usando el tipo Post del repo
    const [posts, setPosts] = useState<Post[]>([]);
    const [postsLoading, setPostsLoading] = useState(false);
    const [postsError, setPostsError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;

        if (!user && token) {
            (async () => {
                try {
                    const p = await getProfile();
                    if (!mounted) return;
                    setContextUser(p);
                    setLocalUser(p);
                    setFormFromUser(p);
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
            setFormFromUser(user);
            setPreview(user.profile?.avatar ?? null);
        }

        return () => {
            mounted = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, token]);

    // Cargar posts del usuario
    useEffect(() => {
        let mounted = true;
        const loadPosts = async () => {
            if (!user) return;
            setPostsError(null);
            setPostsLoading(true);
            try {
                // intenta endpoint general filtrando por userId
                const tryUrl1 = `${API_BASE}/posts?userId=${user.id}`;
                const res = await fetch(tryUrl1);
                if (!mounted) return;
                if (res.ok) {
                    const data = await res.json();
                    const arr = Array.isArray(data) ? data : [];
                    // filtro adicional por seguridad: compara strings (evita mismatch number/string)
                    const userIdStr = String(user.id ?? user.id ?? user.email ?? '');
                    const filtered = arr.filter((p: any) => {
                        const candidates = [
                            p.userId,
                            p.authorId,
                            p.user?.id,
                            p.author?.id,
                            p.user?._id,
                            p.author?._id,
                            p.user?.email,
                            p.author?.email,
                        ];
                        return candidates.some((c) => (c !== undefined && c !== null) && (String(c) === userIdStr || c === user.email));
                    });
                    setPosts(filtered as Post[]);
                } else {
                    // intenta ruta alternativa específica de usuario
                    const altUrl = `${API_BASE}/users/${user.id}/posts`;
                    const alt = await fetch(altUrl);
                    if (!mounted) return;
                    if (!alt.ok) throw new Error('No se pudo cargar las publicaciones');
                    const altData = await alt.json();
                    setPosts(Array.isArray(altData) ? (altData as Post[]) : []);
                }
            } catch (err: any) {
                console.warn('Error cargando posts:', err);
                setPostsError(err?.message || 'Error al cargar publicaciones');
                setPosts([]);
            } finally {
                if (mounted) setPostsLoading(false);
            }
        };

        if (activeTab === 'actividad') loadPosts();

        return () => {
            mounted = false;
        };
    }, [activeTab, user]);

    const setFormFromUser = (u: User | null) => {
        if (!u) return;
        setForm({
            name: u.profile?.name ?? '',
            lastName: u.profile?.lastName ?? '',
            email: u.email ?? '',
            url: (u.profile as any)?.url ?? '',
            password: '',
            bio: (u.profile as any)?.bio ?? '',
        });
    };

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

            // upload avatar if new file selected
            if (avatarFile) {
                updatedUser = await uploadAvatar(user.id, avatarFile);
            }

            // build payload for updateUser
            const payload: any = { profile: {} as any, email: undefined as string | undefined };
            if (form.name !== (user.profile?.name ?? '')) payload.profile.name = form.name;
            if (form.lastName !== (user.profile?.lastName ?? '')) payload.profile.lastName = form.lastName;
            if ((form as any).url !== (user.profile as any)?.url) payload.profile.url = (form as any).url;
            if (form.bio !== (user.profile as any)?.bio) payload.profile.bio = form.bio;
            if (form.email !== user.email) payload.email = form.email;
            // password - only send if user typed something
            if (form.password && form.password.trim() !== '') {
                payload.password = form.password;
            }

            const currentAvatarExists = !!user.profile?.avatar;
            const hasUploadedNewAvatar = !!avatarFile;
            const previewIsNull = preview == null;
            // if user removed preview and didn't upload a new one, set avatar to null
            if (previewIsNull && !hasUploadedNewAvatar && currentAvatarExists) {
                payload.profile.avatar = null;
            }

            // if there are changes to send
            const hasProfileChanges = Object.keys(payload.profile).length > 0;
            const hasOtherChanges = payload.email !== undefined || payload.password !== undefined;

            if (hasProfileChanges || hasOtherChanges) {
                updatedUser = await updateUser(user.id, payload);
            }

            if (updatedUser) {
                setContextUser(updatedUser);
                setLocalUser(updatedUser);
                setPreview(updatedUser.profile?.avatar ?? null);
            } else {
                // No server returned updated user, but update local state with optimistic changes
                setContextUser((prev: any) => {
                    if (!prev) return prev;
                    return {
                        ...prev,
                        email: payload.email ?? prev.email,
                        profile: {
                            ...prev.profile,
                            name: payload.profile.name ?? prev.profile?.name,
                            lastName: payload.profile.lastName ?? prev.profile?.lastName,
                            avatar: payload.profile.avatar !== undefined ? payload.profile.avatar : prev.profile?.avatar,
                            url: payload.profile.url ?? (prev.profile as any)?.url,
                            bio: payload.profile.bio ?? (prev.profile as any)?.bio,
                        },
                    };
                });
                setLocalUser((prev) => {
                    if (!prev) return prev;
                    return {
                        ...prev,
                        email: payload.email ?? prev.email,
                        profile: {
                            ...prev.profile,
                            name: payload.profile.name ?? prev.profile?.name,
                            lastName: payload.profile.lastName ?? prev.profile?.lastName,
                            avatar: payload.profile.avatar !== undefined ? payload.profile.avatar : prev.profile?.avatar,
                            url: payload.profile.url ?? (prev.profile as any)?.url,
                            bio: payload.profile.bio ?? (prev.profile as any)?.bio,
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

    // Handlers para que PostItem comunique cambios al listado del perfil
    const handlePostUpdated = (updated: Post) => {
        setPosts((prev) => prev.map((p) => (String(p.id) === String(updated.id) ? updated : p)));
    };

    const handlePostDeleted = (id: number | string) => {
        setPosts((prev) => prev.filter((p) => String(p.id) !== String(id)));
    };

    if (!user) return <div className="p-6 text-center text-gray-600">Inicia sesión para ver tu perfil</div>;

    const displayName = `${user.profile?.name ?? ''} ${user.profile?.lastName ?? ''}`.trim() || user.email;

    const imageSrc = preview ? (preview.startsWith('blob:') ? preview : resolvePreviewUrl(preview) ?? undefined) : undefined;

    const formatDate = (d?: string) => {
        if (!d) return '';
        try {
            return new Date(d).toLocaleDateString();
        } catch {
            return d ?? '';
        }
    };

    // navigate home helper
    const goHome = () => navigate('/');

    return (
        <div className="max-w-5xl mx-auto p-6">
            {/* Back to home button */}
            <div className="mb-4 flex justify-start">
                <button
                    onClick={goHome}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-gray-100 hover:bg-gray-200 text-sm text-gray-700"
                    aria-label="Volver al inicio"
                >
                    {/* simple left arrow SVG */}
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
                    </svg>
                    Volver al inicio
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6 flex flex-col lg:flex-row gap-6">
                {/* Left column - profile card */}
                <aside className="w-full lg:w-80 flex-shrink-0">
                    <div className="bg-white rounded-xl border border-gray-100 p-6 flex flex-col items-center">
                        <div className="relative">
                            <div className="w-40 h-40 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center text-4xl font-bold text-white">
                                {imageSrc ? (
                                    <img src={imageSrc} alt={displayName} className="w-full h-full object-cover" />
                                ) : (
                                    (user.profile?.name?.charAt(0) || user.email?.charAt(0) || 'U').toUpperCase()
                                )}
                            </div>

                            {editing && (
                                <button type="button" onClick={() => fileInputRef.current?.click()} className="absolute -bottom-2 right-0 bg-white border rounded-full p-2 shadow hover:bg-gray-50" aria-label="Cambiar avatar">
                                    <ImageIcon className="w-4 h-4 text-gray-700" />
                                </button>
                            )}
                        </div>

                        <input ref={fileInputRef} type="file" accept="image/*" onChange={onFileChange} className="hidden" />

                        <div className="mt-4 text-center">
                            <div className="text-lg font-semibold text-gray-900">{displayName}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                            <div className="text-xs text-gray-400 mt-1">{user.role}</div>
                            <div className="text-xs text-gray-400 mt-1">Miembro desde: {formatDate(user.createdAt ?? undefined)}</div>
                        </div>

                        {editing ? (
                            <div className="mt-4 w-full flex justify-center gap-3">
                                <button type="button" onClick={removeAvatarSelection} className="text-sm text-red-600">Quitar avatar</button>
                                <button type="button" onClick={() => fileInputRef.current?.click()} className="text-sm text-blue-600">Seleccionar...</button>
                            </div>
                        ) : (
                            <div className="mt-5 w-full flex justify-center">
                                <button onClick={() => setEditing(true)} className="px-4 py-2 rounded-full bg-blue-600 text-white">Editar perfil</button>
                            </div>
                        )}
                    </div>
                </aside>

                {/* Right column - tabs and content */}
                <section className="flex-1">
                    <div className="border-b border-gray-100">
                        <nav className="-mb-px flex space-x-6" aria-label="Pestañas">
                            <button onClick={() => setActiveTab('actividad')} className={`pb-3 px-1 text-sm font-medium ${activeTab === 'actividad' ? 'border-b-2 border-blue-500 text-gray-900' : 'text-gray-500'}`}>ACTIVIDAD</button>
                            <button onClick={() => setActiveTab('ajustes')} className={`pb-3 px-1 text-sm font-medium ${activeTab === 'ajustes' ? 'border-b-2 border-blue-500 text-gray-900' : 'text-gray-500'}`}>AJUSTES</button>
                        </nav>
                    </div>

                    <div className="mt-6">
                        {activeTab === 'actividad' && (
                            <div className="text-gray-700">
                                <p className="mb-3 font-medium">Publicaciones</p>

                                {postsLoading && <div className="text-sm text-gray-500">Cargando publicaciones...</div>}
                                {postsError && <div className="text-sm text-red-600">{postsError}</div>}

                                {!postsLoading && posts.length === 0 && !postsError && <div className="text-sm text-gray-500">No hay publicaciones.</div>}

                                <div className="space-y-4 mt-4">
                                    {posts.map((p) => (
                                        <PostItem key={String(p.id ?? (p as any)._id ?? Math.random())} post={p} onUpdated={handlePostUpdated} onDeleted={handlePostDeleted} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === 'ajustes' && (
                            <div className="text-gray-700">
                                <div className="grid grid-cols-1 gap-4">
                                    <div>
                                        <label className="text-sm text-gray-600 mb-1 block">Nombre completo</label>
                                        <input value={`${form.name} ${form.lastName}`.trim()} onChange={(e) => {
                                            const parts = e.target.value.split(' ');
                                            const first = parts.shift() ?? '';
                                            const last = parts.join(' ');
                                            setForm((s) => ({ ...s, name: first, lastName: last }));
                                        }} className="w-full border-b border-gray-200 py-3 outline-none" placeholder="Nombre completo" />
                                    </div>

                                    <div>
                                        <label className="text-sm text-gray-600 mb-1 block">Email</label>
                                        <input value={form.email} onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} className="w-full border-b border-gray-200 py-3 outline-none" placeholder="Email" type="email" />
                                    </div>

                                    <div>
                                        <label className="text-sm text-gray-600 mb-1 block">URL</label>
                                        <input value={(form as any).url} onChange={(e) => setForm((s) => ({ ...s, url: e.target.value }))} className="w-full border-b border-gray-200 py-3 outline-none" placeholder="https://" />
                                    </div>

                                    <div>
                                        <label className="text-sm text-gray-600 mb-1 block">Contraseña</label>
                                        <input value={form.password} onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))} className="w-full border-b border-gray-200 py-3 outline-none" placeholder="Nueva contraseña (dejar en blanco para no cambiar)" type="password" />
                                    </div>

                                    <div>
                                        <label className="text-sm text-gray-600 mb-1 block">Descripción</label>
                                        <textarea value={form.bio} onChange={(e) => setForm((s) => ({ ...s, bio: e.target.value }))} className="w-full border border-gray-200 rounded-md p-3 resize-none" rows={4} placeholder="Una breve descripción..." />
                                    </div>

                                    {error && <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-md p-2">{error}</div>}

                                    <div className="flex items-center gap-3 pt-3">
                                        <button onClick={handleSave} disabled={loading} className={`px-4 py-2 rounded bg-blue-500 text-white ${loading ? 'opacity-70' : 'hover:bg-blue-600'}`}><Save className="inline-block w-4 h-4 mr-2" />{loading ? 'Guardando...' : 'Actualizar perfil'}</button>

                                        <button onClick={() => { setEditing(false); setFormFromUser(user); setAvatarFile(null); setPreview(user.profile?.avatar ?? null); if (objectUrl) { URL.revokeObjectURL(objectUrl); setObjectUrl(null); } }} className="px-4 py-2 rounded bg-gray-100 text-gray-700 hover:bg-gray-200"><X className="inline-block w-4 h-4 mr-2" />Cancelar</button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default Profile;