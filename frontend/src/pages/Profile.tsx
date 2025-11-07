import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useLocation, useNavigate } from 'react-router-dom';
import { getProfile } from '../services/auth';
import { updateUser, uploadAvatar } from '../services/users';
import type { User } from '../types/type';
import { Save, X, Image as ImageIcon } from 'lucide-react';

const API_BASE = import.meta.env.SENA_API_URL || 'http://localhost:3001';

// Tipos mínimos para posts y comentarios — ajusta según tu API real
type Attachment = { url?: string; path?: string; attributes?: any } | string;
type PostLike = {
    id?: string | number;
    title?: string;
    body?: string;
    content?: string;
    images?: Array<string>;
    attachments?: Array<Attachment>;
    image?: string;
    comments?: CommentLike[] | any[];
    user?: {
        id?: string | number;
        email?: string;
        profile?: { name?: string; avatar?: string };
    };
    author?: { id?: string | number; name?: string; email?: string };
    userId?: string | number;
    authorId?: string | number;
    createdAt?: string;
    created_at?: string;
    publishedAt?: string;
};

type CommentLike = {
    id?: string | number;
    body?: string;
    createdAt?: string;
    created_at?: string;
    user?: {
        id?: string | number;
        email?: string;
        profile?: { name?: string; avatar?: string };
    };
    author?: { id?: string | number; name?: string; email?: string };
};

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

    // posts (actividad)
    const [posts, setPosts] = useState<PostLike[]>([]);
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

    // Helper: resuelve rutas relativas y varios formatos a URL completa
    const resolveUrl = (val?: any): string | null => {
        if (!val && val !== 0) return null;
        if (typeof val === 'string') {
            const s = val.trim();
            if (!s) return null;
            if (s.startsWith('http://') || s.startsWith('https://') || s.startsWith('data:')) return s;
            if (s.startsWith('/')) return `${API_BASE}${s}`;
            return s;
        }
        return null;
    };

    // Extrae URL desde attachments u objetos complejos (Strapi, otros)
    const getUrlFromAttachment = (att: Attachment): string | null => {
        if (!att) return null;
        if (typeof att === 'string') return resolveUrl(att);
        // objeto: { url } or { path } or Strapi-like { attributes: { url } } or nested structures
        if (typeof (att as any).url === 'string') return resolveUrl((att as any).url);
        if (typeof (att as any).path === 'string') return resolveUrl((att as any).path);
        // Strapi v4: att.data[0].attributes.url or att.attributes.url
        if ((att as any).attributes) {
            const attr = (att as any).attributes;
            if (typeof attr.url === 'string') return resolveUrl(attr.url);
            // formats
            const formats = attr.formats;
            if (formats && typeof formats.small?.url === 'string') return resolveUrl(formats.small.url);
            if (formats && typeof formats.medium?.url === 'string') return resolveUrl(formats.medium.url);
            if (attr.data && Array.isArray(attr.data) && attr.data[0]?.attributes?.url) return resolveUrl(attr.data[0].attributes.url);
        }
        if ((att as any).data && (att as any).data.attributes && (att as any).data.attributes.url) {
            return resolveUrl((att as any).data.attributes.url);
        }
        return null;
    };

    useEffect(() => {
        // cargar posts del usuario cuando se abre "actividad"
        let mounted = true;
        const loadPosts = async () => {
            if (!user) return;
            setPostsError(null);
            setPostsLoading(true);
            try {
                // Intenta rutas comunes; ajusta si tu API es diferente
                const tryUrl1 = `${API_BASE}/posts?userId=${user.id}`;
                const res = await fetch(tryUrl1);
                if (!mounted) return;
                if (res.ok) {
                    const data = await res.json();
                    const arr = Array.isArray(data) ? data : [];
                    // filtrar por author / user comparando como strings (evita mismatch number/string)
                    const userIdStr = String(user.id ?? user.id ?? user.email ?? '');
                    const filtered = arr.filter((p: any) => {
                        // posibles campos que identifiquen al autor
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
                    setPosts(filtered);
                } else {
                    // intenta ruta alternativa específica del usuario
                    const altUrl = `${API_BASE}/users/${user.id}/posts`;
                    const alt = await fetch(altUrl);
                    if (!mounted) return;
                    if (!alt.ok) throw new Error('No se pudo cargar las publicaciones');
                    const altData = await alt.json();
                    const arr = Array.isArray(altData) ? altData : [];
                    setPosts(arr);
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
        return resolveUrl(p ?? undefined);
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

    // cleanup object URL on unmount
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

    if (!user) return <div className="p-6 text-center text-gray-600">Inicia sesión para ver tu perfil</div>;

    const displayName =
        `${user.profile?.name ?? ''} ${user.profile?.lastName ?? ''}`.trim() || user.email;

    const imageSrc = preview
        ? preview.startsWith('blob:')
            ? preview
            : resolvePreviewUrl(preview) ?? undefined
        : undefined;

    const formatDate = (d?: string) => {
        if (!d) return '';
        try {
            return new Date(d).toLocaleString();
        } catch {
            return d ?? '';
        }
    };

    //
    // Componente interno: PostItem (con imágenes y comentarios)
    //
    const PostItem: React.FC<{ post: PostLike }> = ({ post }) => {
        const [comments, setComments] = useState<CommentLike[]>(Array.isArray(post.comments) ? (post.comments as CommentLike[]) : []);
        const [commentsLoading, setCommentsLoading] = useState(false);
        const [newComment, setNewComment] = useState('');
        const [sending, setSending] = useState(false);

        const fetchComments = async () => {
            setCommentsLoading(true);
            try {
                const res = await fetch(`${API_BASE}/posts/${post.id}/comments`);
                if (res.ok) {
                    const data = await res.json();
                    setComments(Array.isArray(data) ? data : []);
                    setCommentsLoading(false);
                    return;
                }
                // fallback
                const r2 = await fetch(`${API_BASE}/comments?postId=${post.id}`);
                if (r2.ok) {
                    const d2 = await r2.json();
                    setComments(Array.isArray(d2) ? d2 : []);
                }
            } catch (err) {
                console.warn('Error cargando comentarios:', err);
            } finally {
                setCommentsLoading(false);
            }
        };

        useEffect(() => {
            // cargar solo si no vienen embebidos
            if (!post.comments) fetchComments();
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, []);

        // calcula urls de imagen robustas (usa helpers definidos arriba)
        const postImages: string[] = (() => {
            if (!post) return [];

            // images array (strings)
            if (Array.isArray(post.images) && post.images.length > 0) {
                return post.images.map((i) => resolveUrl(i)).filter((s): s is string => !!s);
            }

            // attachments array (strings u objetos)
            if (Array.isArray(post.attachments) && post.attachments.length > 0) {
                return post.attachments.map((att) => getUrlFromAttachment(att)).filter((s): s is string => !!s);
            }

            // single image field
            if (post.image && typeof post.image === 'string') {
                const r = resolveUrl(post.image);
                return r ? [r] : [];
            }

            // algunos backends devuelven media en post.media[0].url o post.attributes...
            if ((post as any).media && Array.isArray((post as any).media) && (post as any).media.length > 0) {
                const m = (post as any).media.map((mi: any) => getUrlFromAttachment(mi)).filter((s: any) => !!s);
                return m;
            }
            if ((post as any).attributes?.image) {
                const candidate = getUrlFromAttachment((post as any).attributes.image);
                return candidate ? [candidate] : [];
            }

            return [];
        })();

        const handleAddComment = async () => {
            if (!newComment.trim() || !post.id) return;
            setSending(true);
            try {
                const res = await fetch(`${API_BASE}/posts/${post.id}/comments`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        body: newComment,
                        userId: user?.id,
                        authorId: user?.id,
                    }),
                });
                if (res.ok) {
                    const created = await res.json();
                    setComments((c) => [created, ...c]);
                    setNewComment('');
                } else {
                    // fallback: add optimistically
                    const fake: CommentLike = {
                        id: `local-${Date.now()}`,
                        body: newComment,
                        user: { id: user?.id, email: user?.email, profile: user?.profile },
                        createdAt: new Date().toISOString(),
                    };
                    setComments((c) => [fake, ...c]);
                    setNewComment('');
                }
            } catch (err) {
                console.warn('Error creando comentario:', err);
            } finally {
                setSending(false);
            }
        };

        return (
            <article className="border border-gray-100 rounded-md p-4 bg-white">
                <header className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center text-sm font-semibold text-white">
                        {post.user?.profile?.avatar ? (
                            <img
                                src={resolveUrl(post.user.profile.avatar) ?? undefined}
                                alt={post.user.profile.name ?? post.user.email}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            (post.user?.profile?.name?.charAt(0) || post.user?.email?.charAt(0) || 'U').toUpperCase()
                        )}
                    </div>
                    <div>
                        <div className="text-sm font-semibold text-gray-800">
                            {post.user?.profile?.name ?? post.user?.email ?? post.author?.name ?? 'Usuario'}
                        </div>
                        <div className="text-xs text-gray-400">{formatDate(post.createdAt ?? post.created_at ?? post.publishedAt)}</div>
                    </div>
                </header>

                <div className="mb-3">
                    <h3 className="font-semibold text-gray-800">{post.title ?? ''}</h3>
                    <p className="text-sm text-gray-700 mt-1">{post.body ?? post.content ?? ''}</p>
                </div>

                {postImages.length > 0 && (
                    <div className="mb-3 grid grid-cols-1 md:grid-cols-3 gap-2">
                        {postImages.map((src, i) => (
                            <div key={i} className="w-full h-48 rounded-md overflow-hidden bg-gray-100">
                                {src ? <img src={src} alt={`imagen-${i}`} className="w-full h-full object-cover" /> : null}
                            </div>
                        ))}
                    </div>
                )}

                <div className="mt-3">
                    <div className="text-sm font-medium text-gray-700 mb-2">Comentarios</div>

                    {commentsLoading && <div className="text-sm text-gray-500">Cargando comentarios...</div>}
                    {!commentsLoading && comments.length === 0 && <div className="text-sm text-gray-500">Sin comentarios.</div>}

                    <div className="space-y-2">
                        {comments.map((c) => (
                            <div key={String(c.id ?? Math.random())} className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center text-xs font-semibold text-white">
                                    {c.user?.profile?.name?.charAt(0) ?? c.author?.name?.charAt(0) ?? (c.user?.email?.charAt(0) ?? 'U')}
                                </div>
                                <div>
                                    <div className="text-sm font-medium">{c.user?.profile?.name ?? c.author?.name ?? c.user?.email ?? 'Usuario'}</div>
                                    <div className="text-sm text-gray-600">{c.body}</div>
                                    <div className="text-xs text-gray-400 mt-1">{formatDate(c.createdAt ?? c.created_at)}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-3 flex gap-2">
                        <input
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            className="flex-1 border border-gray-200 rounded-md px-3 py-2 text-sm outline-none"
                            placeholder="Escribe un comentario..."
                        />
                        <button onClick={handleAddComment} disabled={sending} className="px-3 py-2 rounded-md bg-blue-500 text-white">
                            {sending ? 'Enviando...' : 'Comentar'}
                        </button>
                    </div>
                </div>
            </article>
        );
    };

    return (
        <div className="max-w-5xl mx-auto p-6">
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
                            <div className="text-xs text-gray-400 mt-1">Miembro desde: {new Date(user.createdAt || Date.now()).toLocaleDateString()}</div>
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
                                    {posts.map((p) => <PostItem key={String(p.id ?? p.id ?? Math.random())} post={p} />)}
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