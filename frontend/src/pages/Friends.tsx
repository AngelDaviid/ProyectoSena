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
    ArrowLeft,
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
    onFriendRequestSent,
    offFriendRequestSent,
    onFriendRequestAccepted,
    offFriendRequestAccepted,
} from '../services/socket';
import ConfirmModal from "../components/Modal/Confirm-modal.tsx";
import {useToast} from "../components/Toast-context.tsx";

const API_BASE = import.meta.env.VITE_SENA_API_URL || 'http://localhost:3001';

const getAvatarUrl = (avatar?: string | null): string => {
    if (!avatar) return '/default. png';
    if (avatar.startsWith('http')) return avatar;
    if (avatar.startsWith('/')) return `${API_BASE}${avatar}`;
    return `${API_BASE}/${avatar}`;
};

const getInitials = (name?: string, lastName?: string, email?: string): string => {
    if (name) {
        const initials = lastName ? `${name[0]}${lastName[0]}` : name. slice(0, 2);
        return initials. toUpperCase();
    }
    return email ?  email. slice(0, 2). toUpperCase() : '?? ';
};

const FriendsPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const toast = useToast();

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

    // ✅ Estados para modales
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showBlockModal, setShowBlockModal] = useState(false);
    const [requestToDelete, setRequestToDelete] = useState<number | null>(null);
    const [userToBlock, setUserToBlock] = useState<number | null>(null);

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

    // ✅ Socket persistente - NO se desconecta al salir del componente
    useEffect(() => {
        if (! user) return;

        try {
            console.log('[Friends] Connecting socket and registering user:', user.id);
            connectSocket();
            registerUser(user. id);
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
        };

        onFriendRequestSent(handleSent);
        onFriendRequestAccepted(handleAccepted);

        // ✅ SOLO desubscribir eventos, NO cerrar el socket
        return () => {
            offFriendRequestSent(handleSent);
            offFriendRequestAccepted(handleAccepted);
            // ❌ NO llamamos releaseSocket() aquí
        };
    }, [user, loadIncoming, loadOutgoing, loadFriends]);

    useEffect(() => {
        if (searchDebounceRef.current) {
            window.clearTimeout(searchDebounceRef.current);
            searchDebounceRef.current = null;
        }
        if (! q || q.trim().length === 0) {
            setResults([]);
            return;
        }
        searchDebounceRef.current = window.setTimeout(async () => {
            setLoadingSearch(true);
            try {
                const r = await searchUsers(q.trim());
                const filtered = (r || []).filter((u: any) => u.id !== user?. id);
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
        if (!user) {
            toast.warning('Debes iniciar sesión');
            return;
        }
        setBusy(`send:${receiverId}`, true);
        try {
            await sendFriendRequest(receiverId);
            setResults((rs) => rs.map((u) => (u.id === receiverId ? { ...u, friendStatus: 'request_sent' } : u)));
            await loadOutgoing();
            toast.success('Solicitud enviada');
        } catch (err: any) {
            console.error('[Friends] Error sending friend request:', err);
            toast.error(err?. response?.data?.message || 'Error al enviar solicitud');
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
                toast. success('Solicitud aceptada');
                navigate('/chat');
            } else {
                toast.info('Solicitud rechazada');
            }
        } catch (err: any) {
            console.error('[Friends] Error responding to request:', err);
            toast. error(err?.response?.data?. message || 'Error al responder solicitud');
        } finally {
            setBusy(`respond:${requestId}`, false);
        }
    };

    const handleDeleteRequest = async (requestId: number) => {
        setBusy(`delete:${requestId}`, true);
        try {
            await deleteRequest(requestId);
            await loadIncoming();
            await loadOutgoing();
            toast.success('Solicitud cancelada');
        } catch (err) {
            console.error('[Friends] Error deleting request:', err);
            toast.error('Error al eliminar solicitud');
        } finally {
            setBusy(`delete:${requestId}`, false);
            setShowDeleteModal(false);
            setRequestToDelete(null);
        }
    };

    const handleBlock = async (targetId: number) => {
        setBusy(`block:${targetId}`, true);
        try {
            await blockUser(targetId);
            await loadFriends();
            toast.success('Usuario bloqueado');
        } catch (err) {
            console.error('[Friends] Error blocking user:', err);
            toast. error('Error al bloquear usuario');
        } finally {
            setBusy(`block:${targetId}`, false);
            setShowBlockModal(false);
            setUserToBlock(null);
        }
    };

    const handleChat = async (friendId: number) => {
        setBusy(`chat:${friendId}`, true);
        try {
            console.log('[Friends] Creating conversation with user:', friendId);
            const conv = await createConversation([user! .id, friendId]);
            console.log('[Friends] Conversation created successfully:', conv);
            navigate('/chat');
        } catch (e: any) {
            console.error('[Friends] Error creating conversation:', e);

            if (e?. response?.status === 409 || e?.response?.data?.message?. includes('ya existe')) {
                navigate('/chat');
            } else {
                toast.error(e?.response?.data?.message || 'No se pudo crear el chat');
            }
        } finally {
            setBusy(`chat:${friendId}`, false);
        }
    };

    return (
        <>
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
                {/* ✅ Header Responsive */}
                <div className="bg-white shadow-sm border-b">
                    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
                        {/* ✅ Botón volver */}
                        <button
                            onClick={() => navigate('/')}
                            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                            <span className="text-sm sm:text-base">Volver</span>
                        </button>

                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center flex-shrink-0">
                                    <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Amigos</h1>
                                    <p className="text-xs sm:text-sm text-gray-500">Gestiona tus conexiones</p>
                                </div>
                            </div>
                            <button
                                onClick={() => navigate('/chat')}
                                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base"
                            >
                                <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                                <span>Ir al Chat</span>
                            </button>
                        </div>

                        {/* ✅ Tabs Responsive */}
                        <div className="flex gap-2 sm:gap-4 mt-4 sm:mt-6 border-b overflow-x-auto scrollbar-hide">
                            <button
                                onClick={() => setActiveTab('friends')}
                                className={`px-3 sm:px-4 py-2 sm:py-3 font-medium transition-colors whitespace-nowrap text-sm sm:text-base ${
                                    activeTab === 'friends'
                                        ? 'border-b-2 border-green-600 text-green-600'
                                        : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                <span className="hidden sm:inline">Mis Amigos</span>
                                <span className="sm:hidden">Amigos</span>
                                <span className="ml-1">({friends.length})</span>
                            </button>
                            <button
                                onClick={() => setActiveTab('incoming')}
                                className={`px-3 sm:px-4 py-2 sm:py-3 font-medium transition-colors whitespace-nowrap relative text-sm sm:text-base ${
                                    activeTab === 'incoming'
                                        ? 'border-b-2 border-green-600 text-green-600'
                                        : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                Recibidas ({incoming.length})
                                {incoming.length > 0 && (
                                    <span className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                                        {incoming.length}
                                    </span>
                                )}
                            </button>
                            <button
                                onClick={() => setActiveTab('outgoing')}
                                className={`px-3 sm:px-4 py-2 sm:py-3 font-medium transition-colors whitespace-nowrap text-sm sm:text-base ${
                                    activeTab === 'outgoing'
                                        ? 'border-b-2 border-green-600 text-green-600'
                                        : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                Enviadas ({outgoing.length})
                            </button>
                            <button
                                onClick={() => setActiveTab('search')}
                                className={`px-3 sm:px-4 py-2 sm:py-3 font-medium transition-colors whitespace-nowrap text-sm sm:text-base ${
                                    activeTab === 'search'
                                        ?  'border-b-2 border-green-600 text-green-600'
                                        : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                <span className="hidden sm:inline">Buscar Usuarios</span>
                                <span className="sm:hidden">Buscar</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* ✅ Content Responsive */}
                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
                    {/* SEARCH TAB */}
                    {activeTab === 'search' && (
                        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
                            <div className="flex gap-3 mb-6">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                                    <input
                                        className="w-full pl-9 sm:pl-10 pr-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                                        placeholder="Buscar por nombre..."
                                        value={q}
                                        onChange={(e) => setQ(e.target. value)}
                                    />
                                </div>
                            </div>

                            {loadingSearch ?  (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 animate-spin" />
                                </div>
                            ) : results.length === 0 ? (
                                <div className="text-center py-12 text-gray-500 text-sm sm:text-base">
                                    {q. trim() ?  'No se encontraron usuarios' : 'Escribe para buscar usuarios'}
                                </div>
                            ) : (
                                <div className="grid gap-3 sm:gap-4">
                                    {results.map((u) => {
                                        const status: string = u.friendStatus ??  'none';
                                        const avatarUrl = getAvatarUrl(u.profile?. avatar);
                                        const fullName = `${u.profile?.name || ''} ${u.profile?.lastName || ''}`. trim() || u.email;
                                        const initials = getInitials(u.profile?.name, u.profile?.lastName, u.email);

                                        return (
                                            <div key={u.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors gap-3">
                                                <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
                                                    {avatarUrl === '/default.png' ?  (
                                                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm sm:text-lg flex-shrink-0">
                                                            {initials}
                                                        </div>
                                                    ) : (
                                                        <img
                                                            src={avatarUrl}
                                                            alt={fullName}
                                                            className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover ring-2 ring-gray-200 flex-shrink-0"
                                                            onError={(e) => {
                                                                const target = e.target as HTMLImageElement;
                                                                target. outerHTML = `<div class="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm sm:text-lg flex-shrink-0">${initials}</div>`;
                                                            }}
                                                        />
                                                    )}
                                                    <div className="min-w-0 flex-1">
                                                        <div className="font-semibold text-gray-900 text-sm sm:text-base truncate">{fullName}</div>
                                                        <div className="text-xs sm:text-sm text-gray-500 truncate">{u.email}</div>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2 w-full sm:w-auto justify-end">
                                                    {status === 'friend' ? (
                                                        <span className="flex items-center gap-2 text-xs sm:text-sm bg-green-100 text-green-700 px-3 sm:px-4 py-1. 5 sm:py-2 rounded-lg font-medium">
                                                            <UserCheck className="w-3. 5 h-3.5 sm:w-4 sm:h-4" />
                                                            Amigos
                                                        </span>
                                                    ) : status === 'request_sent' ?  (
                                                        <span className="flex items-center gap-2 text-xs sm:text-sm bg-gray-100 text-gray-700 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg">
                                                            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                                            Enviada
                                                        </span>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleSendRequest(u.id)}
                                                            disabled={!! processing[`send:${u.id}`]}
                                                            className="flex items-center gap-2 bg-green-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 text-xs sm:text-sm"
                                                        >
                                                            {processing[`send:${u. id}`] ? (
                                                                <Loader2 className="w-3. 5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                                                            ) : (
                                                                <UserPlus className="w-3. 5 h-3.5 sm:w-4 sm:h-4" />
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
                        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
                            <h2 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6 text-gray-900">Solicitudes Recibidas</h2>
                            {loadingIncoming ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 animate-spin" />
                                </div>
                            ) : incoming.length === 0 ? (
                                <div className="text-center py-12 text-gray-500 text-sm sm:text-base">
                                    No tienes solicitudes pendientes
                                </div>
                            ) : (
                                <div className="grid gap-3 sm:gap-4">
                                    {incoming.map((req) => {
                                        const avatarUrl = getAvatarUrl(req.sender?. profile?.avatar);
                                        const fullName = `${req.sender?.profile?.name || ''} ${req.sender?.profile?.lastName || ''}`.trim() || req. sender?.email;
                                        const initials = getInitials(req.sender?.profile?.name, req.sender?.profile?.lastName, req.sender?.email);

                                        return (
                                            <div key={req.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200 gap-3">
                                                <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
                                                    {avatarUrl === '/default.png' ? (
                                                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-bold text-sm sm:text-lg flex-shrink-0">
                                                            {initials}
                                                        </div>
                                                    ) : (
                                                        <img
                                                            src={avatarUrl}
                                                            alt={fullName}
                                                            className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover ring-2 ring-green-300 flex-shrink-0"
                                                            onError={(e) => {
                                                                const target = e.target as HTMLImageElement;
                                                                target. outerHTML = `<div class="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-bold text-sm sm:text-lg flex-shrink-0">${initials}</div>`;
                                                            }}
                                                        />
                                                    )}
                                                    <div className="min-w-0 flex-1">
                                                        <div className="font-semibold text-gray-900 text-sm sm:text-base truncate">{fullName}</div>
                                                        <div className="text-xs sm:text-sm text-gray-600">Quiere ser tu amigo</div>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2 w-full sm:w-auto justify-end">
                                                    <button
                                                        onClick={() => handleRespond(req.id, true)}
                                                        disabled={!!processing[`respond:${req.id}`]}
                                                        className="flex items-center gap-1 sm:gap-2 bg-green-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 text-xs sm:text-sm"
                                                    >
                                                        <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                                        Aceptar
                                                    </button>
                                                    <button
                                                        onClick={() => handleRespond(req.id, false)}
                                                        disabled={!! processing[`respond:${req. id}`]}
                                                        className="flex items-center gap-1 sm:gap-2 bg-gray-200 text-gray-700 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 text-xs sm:text-sm"
                                                    >
                                                        <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
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
                        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
                            <h2 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6 text-gray-900">Solicitudes Enviadas</h2>
                            {loadingOutgoing ?  (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 animate-spin" />
                                </div>
                            ) : outgoing.length === 0 ? (
                                <div className="text-center py-12 text-gray-500 text-sm sm:text-base">
                                    No has enviado solicitudes
                                </div>
                            ) : (
                                <div className="grid gap-3 sm:gap-4">
                                    {outgoing.map((req) => {
                                        const avatarUrl = getAvatarUrl(req.receiver?.profile?.avatar);
                                        const fullName = `${req.receiver?.profile?.name || ''} ${req.receiver?.profile?. lastName || ''}`.trim() || req.receiver?.email;
                                        const initials = getInitials(req.receiver?.profile?. name, req.receiver?.profile?. lastName, req.receiver?.email);

                                        return (
                                            <div key={req. id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg gap-3">
                                                <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
                                                    {avatarUrl === '/default.png' ? (
                                                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white font-bold text-sm sm:text-lg flex-shrink-0">
                                                            {initials}
                                                        </div>
                                                    ) : (
                                                        <img
                                                            src={avatarUrl}
                                                            alt={fullName}
                                                            className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover ring-2 ring-gray-200 flex-shrink-0"
                                                            onError={(e) => {
                                                                const target = e. target as HTMLImageElement;
                                                                target.outerHTML = `<div class="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white font-bold text-sm sm:text-lg flex-shrink-0">${initials}</div>`;
                                                            }}
                                                        />
                                                    )}
                                                    <div className="min-w-0 flex-1">
                                                        <div className="font-semibold text-gray-900 text-sm sm:text-base truncate">{fullName}</div>
                                                        <div className="text-xs sm:text-sm text-gray-500 flex items-center gap-2">
                                                            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                                            Esperando respuesta
                                                        </div>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        setRequestToDelete(req.id);
                                                        setShowDeleteModal(true);
                                                    }}
                                                    disabled={!!processing[`delete:${req.id}`]}
                                                    className="flex items-center gap-1 sm:gap-2 bg-red-100 text-red-700 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50 text-xs sm:text-sm w-full sm:w-auto justify-center"
                                                >
                                                    <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
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
                        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
                            <h2 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6 text-gray-900">Mis Amigos</h2>
                            {loadingFriends ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 animate-spin" />
                                </div>
                            ) : friends.length === 0 ? (
                                <div className="text-center py-12">
                                    <Users className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
                                    <p className="text-gray-500 mb-4 text-sm sm:text-base">Aún no tienes amigos</p>
                                    <button
                                        onClick={() => setActiveTab('search')}
                                        className="bg-green-600 text-white px-4 sm:px-6 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm sm:text-base"
                                    >
                                        Buscar Usuarios
                                    </button>
                                </div>
                            ) : (
                                <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
                                    {friends.map((f) => {
                                        const avatarUrl = getAvatarUrl(f.profile?.avatar);
                                        const fullName = `${f.profile?.name || ''} ${f.profile?.lastName || ''}`.trim() || f. email;
                                        const initials = getInitials(f.profile?.name, f.profile?.lastName, f.email);

                                        return (
                                            <div key={f.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 gap-3">
                                                <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
                                                    {avatarUrl === '/default.png' ? (
                                                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm sm:text-lg flex-shrink-0">
                                                            {initials}
                                                        </div>
                                                    ) : (
                                                        <img
                                                            src={avatarUrl}
                                                            alt={fullName}
                                                            className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover ring-2 ring-blue-300 flex-shrink-0"
                                                            onError={(e) => {
                                                                const target = e.target as HTMLImageElement;
                                                                target.outerHTML = `<div class="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm sm:text-lg flex-shrink-0">${initials}</div>`;
                                                            }}
                                                        />
                                                    )}
                                                    <div className="min-w-0 flex-1">
                                                        <div className="font-semibold text-gray-900 text-sm sm:text-base truncate">{fullName}</div>
                                                        <div className="text-xs sm:text-sm text-gray-600 truncate">{f.email}</div>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2 w-full sm:w-auto justify-end">
                                                    <button
                                                        onClick={() => handleChat(f.id)}
                                                        disabled={!!processing[`chat:${f.id}`]}
                                                        className="flex items-center gap-1 sm:gap-2 bg-blue-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-xs sm:text-sm"
                                                        title="Chatear"
                                                    >
                                                        {processing[`chat:${f. id}`] ? (
                                                            <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                                                        ) : (
                                                            <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                                        )}
                                                        <span className="hidden sm:inline">Chat</span>
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setUserToBlock(f.id);
                                                            setShowBlockModal(true);
                                                        }}
                                                        disabled={!!processing[`block:${f.id}`]}
                                                        className="flex items-center gap-1 sm:gap-2 bg-red-100 text-red-700 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50 text-xs sm:text-sm"
                                                        title="Bloquear"
                                                    >
                                                        <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
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

            {/* ✅ MODALES */}
            <ConfirmModal
                isOpen={showDeleteModal}
                onClose={() => {
                    setShowDeleteModal(false);
                    setRequestToDelete(null);
                }}
                onConfirm={() => {
                    if (requestToDelete) {
                        handleDeleteRequest(requestToDelete);
                    }
                }}
                title="Cancelar solicitud"
                message="¿Estás seguro de que deseas cancelar esta solicitud de amistad?"
                confirmText="Sí, cancelar"
                cancelText="No"
                type="warning"
            />

            <ConfirmModal
                isOpen={showBlockModal}
                onClose={() => {
                    setShowBlockModal(false);
                    setUserToBlock(null);
                }}
                onConfirm={() => {
                    if (userToBlock) {
                        handleBlock(userToBlock);
                    }
                }}
                title="Bloquear usuario"
                message="¿Estás seguro de que deseas bloquear a este usuario?  No podrá enviarte mensajes ni solicitudes."
                confirmText="Sí, bloquear"
                cancelText="Cancelar"
                type="danger"
            />
        </>
    );
};

export default FriendsPage;