import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search,
    UserPlus,
    UserCheck,
    MessageCircle,
    Shield,
    X,
    Check,
    Clock,
    Users,
    Loader2,
} from 'lucide-react';
import {
    searchUsers,
    sendFriendRequest,
    getIncomingRequests,
    getOutgoingRequests,
    respondRequest,
    getFriends,
    deleteRequest,
    blockUser,
} from '../services/friends';
import { createConversation } from '../services/sockets/chat.socket';
import { useAuth } from '../hooks/useAuth';
import {
    connectSocket,
    registerUser,
    releaseSocket,
    onFriendRequestSent,
    offFriendRequestSent,
    onFriendRequestAccepted,
    offFriendRequestAccepted,
} from '../services/socket';

const API_BASE = import.meta.env.VITE_SENA_API_URL || 'http://localhost:3001';

// Helper para obtener URL completa del avatar
const getAvatarUrl = (avatar?: string | null): string => {
    if (!avatar) return '/default. png';
    if (avatar.startsWith('http')) return avatar;
    if (avatar.startsWith('/')) return `${API_BASE}${avatar}`;
    return `${API_BASE}/${avatar}`;
};

// Helper para obtener iniciales
const getInitials = (name?: string, lastName?: string, email?: string): string => {
    if (name) {
        const initials = lastName ? `${name[0]}${lastName[0]}` : name. slice(0, 2);
        return initials.toUpperCase();
    }
    return email ? email.slice(0, 2). toUpperCase() : '?? ';
};

const FriendsPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState<'search' | 'incoming' | 'outgoing' | 'friends'>('friends');
    const [q, setQ] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [incoming, setIncoming] = useState<any[]>([]);
    const [outgoing, setOutgoing] = useState<any[]>([]);
    const [friends, setFriends] = useState<any[]>([]);

    const [loadingSearch, setLoadingSearch] = useState(false);
    const [loadingIncoming, setLoadingIncoming] = useState(false);
    const [loadingOutgoing, setLoadingOutgoing] = useState(false);
    const [loadingFriends, setLoadingFriends] = useState(false);

    const [processing, setProcessing] = useState<Record<string | number, boolean>>({});
    const searchDebounceRef = useRef<number | null>(null);

    const loadIncoming = useCallback(async () => {
        setLoadingIncoming(true);
        try {
            const r = await getIncomingRequests();
            setIncoming(r || []);
        } catch (err) {
            console.error('[Friends] Error loading incoming requests', err);
            setIncoming([]);
        } finally {
            setLoadingIncoming(false);
        }
    }, []);

    const loadOutgoing = useCallback(async () => {
        setLoadingOutgoing(true);
        try {
            const r = await getOutgoingRequests();
            setOutgoing(r || []);
        } catch (err) {
            console.error('[Friends] Error loading outgoing requests', err);
            setOutgoing([]);
        } finally {
            setLoadingOutgoing(false);
        }
    }, []);

    const loadFriends = useCallback(async () => {
        setLoadingFriends(true);
        try {
            const f = await getFriends();
            setFriends(f || []);
        } catch (err) {
            console.error('[Friends] Error loading friends', err);
            setFriends([]);
        } finally {
            setLoadingFriends(false);
        }
    }, []);

    useEffect(() => {
        if (! user) return;

        try {
            console.log('[Friends] Connecting socket and registering user:', user.id);
            connectSocket();
            registerUser(user.id);
        } catch (e) {
            console.warn('[Friends] Socket init warning', e);
        }

        loadIncoming();
        loadOutgoing();
        loadFriends();

        const handleSent = () => {
            console.log('[Friends] Friend request sent event received');
            loadIncoming();
            loadOutgoing();
        };

        const handleAccepted = (data: any) => {
            console.log('[Friends] Friend request accepted event received', data);
            loadFriends();
            loadIncoming();
            loadOutgoing();
            if (data?. conversation?. id) {
                navigate(`/chat`);
            }
        };

        onFriendRequestSent(handleSent);
        onFriendRequestAccepted(handleAccepted);

        return () => {
            offFriendRequestSent(handleSent);
            offFriendRequestAccepted(handleAccepted);
            releaseSocket();
        };
    }, [user, loadIncoming, loadOutgoing, loadFriends, navigate]);

    useEffect(() => {
        if (searchDebounceRef.current) {
            window.clearTimeout(searchDebounceRef.current);
            searchDebounceRef.current = null;
        }
        if (! q || q.trim(). length === 0) {
            setResults([]);
            return;
        }
        searchDebounceRef.current = window.setTimeout(async () => {
            setLoadingSearch(true);
            try {
                const r = await searchUsers(q. trim());
                const filtered = (r || []).filter((u: any) => u.id !== user?.id);
                setResults(filtered);
            } catch (err) {
                console.error('[Friends] Error searching users', err);
                setResults([]);
            } finally {
                setLoadingSearch(false);
            }
        }, 350);

        return () => {
            if (searchDebounceRef.current) {
                window.clearTimeout(searchDebounceRef.current);
                searchDebounceRef.current = null;
            }
        };
    }, [q, user?. id]);

    const setBusy = (key: string | number, value: boolean) =>
        setProcessing((p) => ({ ...p, [key]: value }));

    const handleSendRequest = async (receiverId: number) => {
        if (!user) return alert('Debes iniciar sesión');
        setBusy(`send:${receiverId}`, true);
        try {
            await sendFriendRequest(receiverId);
            setResults((rs) => rs.map((u) => (u.id === receiverId ? { ...u, friendStatus: 'request_sent' } : u)));
            await loadOutgoing();
        } catch (err: any) {
            console.error('[Friends] Error sending friend request:', err);
            alert(err?. response?.data?.message || 'Error al enviar solicitud');
        } finally {
            setBusy(`send:${receiverId}`, false);
        }
    };

    const handleRespond = async (requestId: number, accept: boolean) => {
        setBusy(`respond:${requestId}`, true);
        try {
            await respondRequest(requestId, accept);
            await loadIncoming();
            await loadOutgoing();
            await loadFriends();
            if (accept) {
                navigate('/chat');
            }
        } catch (err: any) {
            console.error('[Friends] Error responding to request:', err);
            alert(err?.response?.data?. message || 'Error al responder solicitud');
        } finally {
            setBusy(`respond:${requestId}`, false);
        }
    };

    const handleDeleteRequest = async (requestId: number) => {
        if (!confirm('¿Eliminar esta solicitud?')) return;
        setBusy(`delete:${requestId}`, true);
        try {
            await deleteRequest(requestId);
            await loadIncoming();
            await loadOutgoing();
        } catch (err) {
            console.error('[Friends] Error deleting request:', err);
            alert('Error al eliminar solicitud');
        } finally {
            setBusy(`delete:${requestId}`, false);
        }
    };

    const handleBlock = async (targetId: number) => {
        if (!confirm('¿Bloquear a este usuario?')) return;
        setBusy(`block:${targetId}`, true);
        try {
            await blockUser(targetId);
            await loadFriends();
            alert('Usuario bloqueado');
        } catch (err) {
            console.error('[Friends] Error blocking user:', err);
            alert('Error al bloquear usuario');
        } finally {
            setBusy(`block:${targetId}`, false);
        }
    };

    const handleChat = async (friendId: number) => {
        setBusy(`chat:${friendId}`, true);
        try {
            console.log('[Friends] Creating conversation with user:', friendId);
            console.log('[Friends] Participants:', [user! .id, friendId]);

            const conv = await createConversation([user!.id, friendId]);

            console.log('[Friends] Conversation created successfully:', conv);

            if (conv?. id) {
                console.log('[Friends] Navigating to chat with conversation:', conv.id);
                navigate(`/chat`);
            } else {
                console.warn('[Friends] No conversation ID returned, navigating to chat home');
                navigate('/chat');
            }
        } catch (e: any) {
            console.error('[Friends] Error creating conversation:', e);
            console.error('[Friends] Error details:', {
                message: e?. message,
                response: e?.response?.data,
                status: e?.response?.status,
                url: e?.config?.url,
            });

            // Si el error es porque ya existe la conversación, igual navega al chat
            if (e?.response?.status === 409 || e?.response?.data?.message?. includes('ya existe')) {
                console.log('[Friends] Conversation already exists, navigating to chat');
                navigate('/chat');
            } else {
                alert(e?. response?.data?.message || 'No se pudo crear el chat.  Intenta de nuevo.');
            }
        } finally {
            setBusy(`chat:${friendId}`, false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            {/* Header */}
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-6xl mx-auto px-4 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                                <Users className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">Amigos</h1>
                                <p className="text-sm text-gray-500">Gestiona tus conexiones</p>
                            </div>
                        </div>
                        <button
                            onClick={() => navigate('/chat')}
                            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <MessageCircle className="w-5 h-5" />
                            <span>Ir al Chat</span>
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-4 mt-6 border-b overflow-x-auto">
                        <button
                            onClick={() => setActiveTab('friends')}
                            className={`px-4 py-3 font-medium transition-colors whitespace-nowrap ${
                                activeTab === 'friends'
                                    ? 'border-b-2 border-green-600 text-green-600'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            Mis Amigos ({friends.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('incoming')}
                            className={`px-4 py-3 font-medium transition-colors whitespace-nowrap relative ${
                                activeTab === 'incoming'
                                    ?  'border-b-2 border-green-600 text-green-600'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            Recibidas ({incoming.length})
                            {incoming.length > 0 && (
                                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                                    {incoming.length}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('outgoing')}
                            className={`px-4 py-3 font-medium transition-colors whitespace-nowrap ${
                                activeTab === 'outgoing'
                                    ? 'border-b-2 border-green-600 text-green-600'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            Enviadas ({outgoing.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('search')}
                            className={`px-4 py-3 font-medium transition-colors whitespace-nowrap ${
                                activeTab === 'search'
                                    ? 'border-b-2 border-green-600 text-green-600'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            Buscar Usuarios
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-6xl mx-auto px-4 py-8">
                {/* SEARCH TAB */}
                {activeTab === 'search' && (
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <div className="flex gap-3 mb-6">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                                    placeholder="Buscar por nombre, apellido o email..."
                                    value={q}
                                    onChange={(e) => setQ(e.target.value)}
                                />
                            </div>
                        </div>

                        {loadingSearch ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
                            </div>
                        ) : results.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                                {q. trim() ? 'No se encontraron usuarios' : 'Escribe para buscar usuarios'}
                            </div>
                        ) : (
                            <div className="grid gap-4">
                                {results.map((u) => {
                                    const status: string = u.friendStatus ??  'none';
                                    const avatarUrl = getAvatarUrl(u.profile?.avatar);
                                    const fullName = `${u.profile?.name || ''} ${u.profile?.lastName || ''}`.trim() || u.email;
                                    const initials = getInitials(u.profile?.name, u.profile?.lastName, u.email);

                                    return (
                                        <div key={u.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                            <div className="flex items-center gap-4">
                                                {avatarUrl === '/default.png' ? (
                                                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                                                        {initials}
                                                    </div>
                                                ) : (
                                                    <img
                                                        src={avatarUrl}
                                                        alt={fullName}
                                                        className="w-14 h-14 rounded-full object-cover ring-2 ring-gray-200"
                                                        onError={(e) => {
                                                            const target = e.target as HTMLImageElement;
                                                            target. style.display = 'none';
                                                            const parent = target.parentElement;
                                                            if (parent) {
                                                                parent.innerHTML = `<div class="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">${initials}</div>`;
                                                            }
                                                        }}
                                                    />
                                                )}
                                                <div>
                                                    <div className="font-semibold text-gray-900">{fullName}</div>
                                                    <div className="text-sm text-gray-500">{u.email}</div>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                {status === 'friend' ?  (
                                                    <span className="flex items-center gap-2 text-sm bg-green-100 text-green-700 px-4 py-2 rounded-lg font-medium">
                                                        <UserCheck className="w-4 h-4" />
                                                        Amigos
                                                    </span>
                                                ) : status === 'request_sent' ?  (
                                                    <span className="flex items-center gap-2 text-sm bg-gray-100 text-gray-700 px-4 py-2 rounded-lg">
                                                        <Clock className="w-4 h-4" />
                                                        Enviada
                                                    </span>
                                                ) : (
                                                    <button
                                                        onClick={() => handleSendRequest(u.id)}
                                                        disabled={!! processing[`send:${u.id}`]}
                                                        className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                                                    >
                                                        {processing[`send:${u. id}`] ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            <UserPlus className="w-4 h-4" />
                                                        )}
                                                        {processing[`send:${u. id}`] ? 'Enviando...' : 'Agregar'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* INCOMING TAB */}
                {activeTab === 'incoming' && (
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <h2 className="text-xl font-bold mb-6 text-gray-900">Solicitudes Recibidas</h2>
                        {loadingIncoming ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
                            </div>
                        ) : incoming.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                                No tienes solicitudes pendientes
                            </div>
                        ) : (
                            <div className="grid gap-4">
                                {incoming.map((req) => {
                                    const avatarUrl = getAvatarUrl(req.sender?.profile?.avatar);
                                    const fullName = `${req.sender?.profile?.name || ''} ${req.sender?.profile?. lastName || ''}`.trim() || req.sender?.email;
                                    const initials = getInitials(req.sender?.profile?. name, req.sender?.profile?. lastName, req.sender?.email);

                                    return (
                                        <div key={req. id} className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                                            <div className="flex items-center gap-4">
                                                {avatarUrl === '/default.png' ? (
                                                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-bold text-lg">
                                                        {initials}
                                                    </div>
                                                ) : (
                                                    <img
                                                        src={avatarUrl}
                                                        alt={fullName}
                                                        className="w-14 h-14 rounded-full object-cover ring-2 ring-green-300"
                                                        onError={(e) => {
                                                            const target = e.target as HTMLImageElement;
                                                            target.style.display = 'none';
                                                            const parent = target.parentElement;
                                                            if (parent) {
                                                                parent.innerHTML = `<div class="w-14 h-14 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-bold text-lg">${initials}</div>`;
                                                            }
                                                        }}
                                                    />
                                                )}
                                                <div>
                                                    <div className="font-semibold text-gray-900">{fullName}</div>
                                                    <div className="text-sm text-gray-600">Quiere ser tu amigo</div>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleRespond(req.id, true)}
                                                    disabled={!!processing[`respond:${req.id}`]}
                                                    className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                                                >
                                                    <Check className="w-4 h-4" />
                                                    Aceptar
                                                </button>
                                                <button
                                                    onClick={() => handleRespond(req.id, false)}
                                                    disabled={!! processing[`respond:${req.id}`]}
                                                    className="flex items-center gap-2 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
                                                >
                                                    <X className="w-4 h-4" />
                                                    Rechazar
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* OUTGOING TAB */}
                {activeTab === 'outgoing' && (
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <h2 className="text-xl font-bold mb-6 text-gray-900">Solicitudes Enviadas</h2>
                        {loadingOutgoing ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
                            </div>
                        ) : outgoing.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                                No has enviado solicitudes
                            </div>
                        ) : (
                            <div className="grid gap-4">
                                {outgoing.map((req) => {
                                    const avatarUrl = getAvatarUrl(req.receiver?.profile?.avatar);
                                    const fullName = `${req.receiver?.profile?.name || ''} ${req.receiver?.profile?. lastName || ''}`.trim() || req.receiver?.email;
                                    const initials = getInitials(req.receiver?.profile?. name, req.receiver?.profile?. lastName, req.receiver?.email);

                                    return (
                                        <div key={req. id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                            <div className="flex items-center gap-4">
                                                {avatarUrl === '/default.png' ? (
                                                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white font-bold text-lg">
                                                        {initials}
                                                    </div>
                                                ) : (
                                                    <img
                                                        src={avatarUrl}
                                                        alt={fullName}
                                                        className="w-14 h-14 rounded-full object-cover ring-2 ring-gray-200"
                                                        onError={(e) => {
                                                            const target = e.target as HTMLImageElement;
                                                            target.style.display = 'none';
                                                            const parent = target.parentElement;
                                                            if (parent) {
                                                                parent.innerHTML = `<div class="w-14 h-14 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white font-bold text-lg">${initials}</div>`;
                                                            }
                                                        }}
                                                    />
                                                )}
                                                <div>
                                                    <div className="font-semibold text-gray-900">{fullName}</div>
                                                    <div className="text-sm text-gray-500 flex items-center gap-2">
                                                        <Clock className="w-4 h-4" />
                                                        Esperando respuesta
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteRequest(req.id)}
                                                disabled={!!processing[`delete:${req.id}`]}
                                                className="flex items-center gap-2 bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
                                            >
                                                <X className="w-4 h-4" />
                                                Cancelar
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* FRIENDS TAB */}
                {activeTab === 'friends' && (
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <h2 className="text-xl font-bold mb-6 text-gray-900">Mis Amigos</h2>
                        {loadingFriends ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
                            </div>
                        ) : friends.length === 0 ? (
                            <div className="text-center py-12">
                                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-500 mb-4">Aún no tienes amigos</p>
                                <button
                                    onClick={() => setActiveTab('search')}
                                    className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
                                >
                                    Buscar Usuarios
                                </button>
                            </div>
                        ) : (
                            <div className="grid md:grid-cols-2 gap-4">
                                {friends.map((f) => {
                                    const avatarUrl = getAvatarUrl(f.profile?.avatar);
                                    const fullName = `${f.profile?.name || ''} ${f.profile?.lastName || ''}`.trim() || f.email;
                                    const initials = getInitials(f.profile?.name, f.profile?.lastName, f.email);

                                    return (
                                        <div key={f.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                                            <div className="flex items-center gap-4">
                                                {avatarUrl === '/default.png' ? (
                                                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                                                        {initials}
                                                    </div>
                                                ) : (
                                                    <img
                                                        src={avatarUrl}
                                                        alt={fullName}
                                                        className="w-14 h-14 rounded-full object-cover ring-2 ring-blue-300"
                                                        onError={(e) => {
                                                            const target = e.target as HTMLImageElement;
                                                            target.style.display = 'none';
                                                            const parent = target.parentElement;
                                                            if (parent) {
                                                                parent.innerHTML = `<div class="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">${initials}</div>`;
                                                            }
                                                        }}
                                                    />
                                                )}
                                                <div>
                                                    <div className="font-semibold text-gray-900">{fullName}</div>
                                                    <div className="text-sm text-gray-600">{f.email}</div>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleChat(f.id)}
                                                    disabled={!!processing[`chat:${f.id}`]}
                                                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                                                    title="Chatear"
                                                >
                                                    {processing[`chat:${f. id}`] ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <MessageCircle className="w-4 h-4" />
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() => handleBlock(f.id)}
                                                    disabled={!!processing[`block:${f.id}`]}
                                                    className="flex items-center gap-2 bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
                                                    title="Bloquear"
                                                >
                                                    <Shield className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default FriendsPage;