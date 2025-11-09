import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    searchUsers,
    sendFriendRequest,
    getIncomingRequests,
    getOutgoingRequests,
    respondRequest,
    getFriends,
    deleteRequest,
    blockUser,
    unblockUser,
} from '../services/friends';
import { createConversation } from '../services/chat';
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

const FriendsPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

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
            console.error('Error loading incoming requests', err);
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
            console.error('Error loading outgoing requests', err);
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
            console.error('Error loading friends', err);
            setFriends([]);
        } finally {
            setLoadingFriends(false);
        }
    }, []);

    useEffect(() => {
        if (!user) return;

        // Connect socket and register user (try to pass token if stored)
        try {
            connectSocket();
            const token = localStorage.getItem('token') ?? null;
            registerUser(user.id, token ?? undefined);
        } catch (e) {
            console.warn('Socket init warning', e);
        }

        // Initial loads
        loadIncoming();
        loadOutgoing();
        loadFriends();

        // Handlers
        const handleSent = () => {
            // refresh incoming/outgoing
            loadIncoming();
            loadOutgoing();
        };
        const handleAccepted = (data: any) => {
            // refresh friends and lists, navigate to conversation if provided
            loadFriends();
            loadIncoming();
            loadOutgoing();
            if (data?.conversation?.id) {
                navigate(`/chat/${data.conversation.id}`);
            }
        };

        onFriendRequestSent(handleSent);
        onFriendRequestAccepted(handleAccepted);

        return () => {
            offFriendRequestSent(handleSent);
            offFriendRequestAccepted(handleAccepted);
            // release socket reference (decrement)
            releaseSocket();
        };
    }, [user, loadIncoming, loadOutgoing, loadFriends, navigate]);

    useEffect(() => {
        // Debounced search: wait 350ms after typing stops
        if (searchDebounceRef.current) {
            window.clearTimeout(searchDebounceRef.current);
            searchDebounceRef.current = null;
        }
        if (!q || q.trim().length === 0) {
            setResults([]);
            return;
        }
        searchDebounceRef.current = window.setTimeout(async () => {
            setLoadingSearch(true);
            try {
                const r = await searchUsers(q.trim());
                // Backend may annotate friendStatus; ensure we keep it
                const filtered = (r || []).filter((u: any) => u.id !== user?.id);
                setResults(filtered);
            } catch (err) {
                console.error('Error searching users', err);
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [q, user?.id]);

    const setBusy = (key: string | number, value: boolean) =>
        setProcessing((p) => ({ ...p, [key]: value }));

    const handleSendRequest = async (receiverId: number, updateUI = true) => {
        if (!user) return alert('Debes iniciar sesión');
        setBusy(`send:${receiverId}`, true);
        try {
            await sendFriendRequest(receiverId);
            if (updateUI) {
                // mark result as sent if present
                setResults((rs) => rs.map((u) => (u.id === receiverId ? { ...u, friendStatus: 'request_sent' } : u)));
                // refresh outgoing list
                await loadOutgoing();
            }
        } catch (err: any) {
            console.error('Error sending request', err);
            alert(err?.response?.data?.message || err?.message || 'Error al enviar solicitud');
        } finally {
            setBusy(`send:${receiverId}`, false);
        }
    };

    const handleRespond = async (requestId: number, accept: boolean, senderId?: number) => {
        setBusy(`respond:${requestId}`, true);
        try {
            await respondRequest(requestId, accept);
            await loadIncoming();
            await loadOutgoing();
            await loadFriends();
            if (accept && senderId) {
                try {
                    const conv = await createConversation([user!.id, senderId]);
                    if (conv?.id) navigate(`/chat/${conv.id}`);
                } catch (e) {
                    // Backend may already have sent conversation via socket
                    console.warn('No se pudo crear conversación (puede ya existir)', e);
                }
            }
        } catch (err: any) {
            console.error('Error responding request', err);
            alert(err?.response?.data?.message || err?.message || 'Error al responder solicitud');
        } finally {
            setBusy(`respond:${requestId}`, false);
        }
    };

    const handleDeleteRequest = async (requestId: number) => {
        if (!confirm('¿Eliminar/cancelar esta solicitud?')) return;
        setBusy(`delete:${requestId}`, true);
        try {
            await deleteRequest(requestId);
            await loadIncoming();
            await loadOutgoing();
            await loadFriends();
        } catch (err) {
            console.error('Error deleting request', err);
            alert('Error al eliminar solicitud');
        } finally {
            setBusy(`delete:${requestId}`, false);
        }
    };

    const handleCancelOutgoing = async (requestId: number) => {
        if (!confirm('¿Cancelar esta solicitud enviada?')) return;
        setBusy(`cancel:${requestId}`, true);
        try {
            await deleteRequest(requestId);
            await loadOutgoing();
        } catch (err) {
            console.error('Error cancelling outgoing request', err);
            alert('Error al cancelar solicitud');
        } finally {
            setBusy(`cancel:${requestId}`, false);
        }
    };

    const handleBlock = async (targetId: number) => {
        if (!confirm('¿Estás seguro que quieres bloquear a este usuario?')) return;
        setBusy(`block:${targetId}`, true);
        try {
            await blockUser(targetId);
            await loadIncoming();
            await loadOutgoing();
            await loadFriends();
            alert('Usuario bloqueado');
        } catch (err) {
            console.error('Error blocking user', err);
            alert('Error al bloquear usuario');
        } finally {
            setBusy(`block:${targetId}`, false);
        }
    };

    const handleUnblock = async (targetId: number) => {
        setBusy(`unblock:${targetId}`, true);
        try {
            await unblockUser(targetId);
            await loadIncoming();
            await loadOutgoing();
            await loadFriends();
            alert('Usuario desbloqueado');
        } catch (err) {
            console.error('Error unblocking user', err);
            alert('Error al desbloquear usuario');
        } finally {
            setBusy(`unblock:${targetId}`, false);
        }
    };

    return (
        <div className="p-4 max-w-4xl mx-auto">
            <h1 className="text-2xl font-semibold mb-4">Amigos</h1>

            <section className="mb-6">
                <h2 className="text-lg font-medium mb-2">Buscar usuarios</h2>
                <div className="flex gap-2">
                    <input
                        className="flex-1 border rounded px-3 py-2"
                        placeholder="Nombre, apellido o email..."
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                    />
                    <button
                        onClick={() => {
                            // force immediate search
                            if (searchDebounceRef.current) {
                                window.clearTimeout(searchDebounceRef.current);
                                searchDebounceRef.current = null;
                            }
                            if (q && q.trim().length > 0) {
                                // call search immediately
                                (async () => {
                                    setLoadingSearch(true);
                                    try {
                                        const r = await searchUsers(q.trim());
                                        const filtered = (r || []).filter((u: any) => u.id !== user?.id);
                                        setResults(filtered);
                                    } catch (err) {
                                        console.error('Error searching users', err);
                                        setResults([]);
                                    } finally {
                                        setLoadingSearch(false);
                                    }
                                })();
                            } else {
                                setResults([]);
                            }
                        }}
                        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                        disabled={loadingSearch}
                    >
                        Buscar
                    </button>
                </div>

                <div className="mt-3">
                    {loadingSearch ? (
                        <div className="text-sm text-gray-500">Buscando...</div>
                    ) : results.length === 0 ? (
                        q.trim() ? <div className="text-sm text-gray-500">No se encontraron usuarios.</div> : null
                    ) : (
                        results.map((u) => {
                            const status: string = u.friendStatus ?? 'none';
                            const isSelf = u.id === user?.id;
                            return (
                                <div key={u.id} className="flex items-center justify-between py-2 border-b">
                                    <div className="flex items-center gap-3">
                                        <img
                                            src={u.profile?.avatar ? (u.profile.avatar.startsWith('/') ? `${API_BASE}${u.profile.avatar}` : u.profile.avatar) : '/default.png'}
                                            alt={u.profile?.name || u.email}
                                            className="w-10 h-10 rounded-full object-cover"
                                        />
                                        <div>
                                            <div className="font-medium">{u.profile?.name || u.email}</div>
                                            <div className="text-xs text-gray-500">{u.profile?.lastName || ''}</div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 items-center">
                                        {isSelf ? (
                                            <button disabled className="text-sm bg-gray-100 text-black px-3 py-1 rounded">Tú</button>
                                        ) : status === 'friend' ? (
                                            <button disabled className="text-sm bg-gray-100 text-black px-3 py-1 rounded">Amigos</button>
                                        ) : status === 'request_sent' ? (
                                            <button disabled className="text-sm bg-gray-100 text-black px-3 py-1 rounded">Enviada</button>
                                        ) : status === 'request_received' ? (
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleRespond(u.requestId ?? u.id, true, u.id)}
                                                    className="text-sm bg-green-600 text-white px-3 py-1 rounded"
                                                >
                                                    Aceptar
                                                </button>
                                                <button
                                                    onClick={() => handleRespond(u.requestId ?? u.id, false)}
                                                    className="text-sm bg-yellow-500 text-white px-3 py-1 rounded"
                                                >
                                                    Rechazar
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleSendRequest(u.id)}
                                                    className="text-sm bg-blue-500 text-white px-3 py-1 rounded"
                                                    disabled={!!processing[`send:${u.id}`]}
                                                >
                                                    {processing[`send:${u.id}`] ? 'Enviando...' : 'Enviar solicitud'}
                                                </button>
                                                <button
                                                    onClick={() => handleBlock(u.id)}
                                                    className="text-sm bg-red-400 text-white px-3 py-1 rounded"
                                                    disabled={!!processing[`block:${u.id}`]}
                                                >
                                                    Bloquear
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </section>

            <section className="mb-6">
                <h2 className="text-lg font-medium mb-2">Solicitudes entrantes ({incoming.length})</h2>
                {loadingIncoming ? (
                    <div className="text-sm text-gray-500">Cargando...</div>
                ) : incoming.length === 0 ? (
                    <div className="text-sm text-gray-500">No hay solicitudes</div>
                ) : (
                    incoming.map((req) => (
                        <div key={req.id} className="flex items-center justify-between py-2 border-b">
                            <div className="flex items-center gap-3">
                                <img src={req.sender?.profile?.avatar || '/default.png'} className="w-12 h-12 rounded-full object-cover" alt="avatar" />
                                <div>
                                    <div className="font-medium">{req.sender?.profile?.name || req.sender?.email}</div>
                                    <div className="text-xs text-gray-500">{req.sender?.profile?.lastName || ''}</div>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleRespond(req.id, true, req.sender?.id)}
                                    className="text-sm bg-green-600 text-white px-3 py-1 rounded"
                                    disabled={!!processing[`respond:${req.id}`]}
                                >
                                    {processing[`respond:${req.id}`] ? 'Procesando...' : 'Aceptar'}
                                </button>
                                <button
                                    onClick={() => handleRespond(req.id, false)}
                                    className="text-sm bg-yellow-500 text-white px-3 py-1 rounded"
                                    disabled={!!processing[`respond:${req.id}`]}
                                >
                                    Rechazar
                                </button>
                                <button
                                    onClick={() => handleDeleteRequest(req.id)}
                                    className="text-sm bg-gray-300 text-black px-3 py-1 rounded"
                                    disabled={!!processing[`delete:${req.id}`]}
                                >
                                    Eliminar
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </section>

            <section className="mb-6">
                <h2 className="text-lg font-medium mb-2">Solicitudes enviadas ({outgoing.length})</h2>
                {loadingOutgoing ? (
                    <div className="text-sm text-gray-500">Cargando...</div>
                ) : outgoing.length === 0 ? (
                    <div className="text-sm text-gray-500">No tienes solicitudes pendientes enviadas.</div>
                ) : (
                    outgoing.map((req) => (
                        <div key={req.id} className="flex items-center justify-between py-2 border-b">
                            <div className="flex items-center gap-3">
                                <img src={req.receiver?.profile?.avatar || '/default.png'} className="w-12 h-12 rounded-full object-cover" alt="avatar" />
                                <div>
                                    <div className="font-medium">{req.receiver?.profile?.name || req.receiver?.email}</div>
                                    <div className="text-xs text-gray-500">{req.receiver?.profile?.lastName || ''}</div>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleCancelOutgoing(req.id)}
                                    className="text-sm bg-gray-200 text-black px-3 py-1 rounded"
                                    disabled={!!processing[`cancel:${req.id}`]}
                                >
                                    {processing[`cancel:${req.id}`] ? 'Cancelando...' : 'Cancelar'}
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </section>

            <section>
                <h2 className="text-lg font-medium mb-2">Tus amigos ({friends.length})</h2>
                {loadingFriends ? (
                    <div className="text-sm text-gray-500">Cargando...</div>
                ) : friends.length === 0 ? (
                    <div className="text-sm text-gray-500">No tienes amigos aún</div>
                ) : (
                    friends.map((f) => (
                        <div key={f.id} className="flex items-center justify-between py-2 border-b">
                            <div className="flex items-center gap-3">
                                <img src={f.profile?.avatar || '/default.png'} alt={f.profile?.name || f.email} className="w-12 h-12 rounded-full object-cover" />
                                <div>
                                    <div className="font-medium">{f.profile?.name || f.email}</div>
                                    <div className="text-xs text-gray-500">{f.profile?.lastName || ''}</div>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={async () => {
                                        try {
                                            const conv = await createConversation([user!.id, f.id]);
                                            if (conv?.id) navigate(`/chat/${conv.id}`);
                                            else navigate('/chat');
                                        } catch (e) {
                                            console.warn('No se pudo crear conversación', e);
                                            navigate('/chat');
                                        }
                                    }}
                                    className="text-sm bg-blue-600 text-white px-3 py-1 rounded"
                                >
                                    Chatear
                                </button>
                                <button
                                    onClick={() => handleBlock(f.id)}
                                    className="text-sm bg-red-400 text-white px-3 py-1 rounded"
                                    disabled={!!processing[`block:${f.id}`]}
                                >
                                    Bloquear
                                </button>
                                <button
                                    onClick={() => handleUnblock(f.id)}
                                    className="text-sm bg-gray-300 text-black px-3 py-1 rounded"
                                    disabled={!!processing[`unblock:${f.id}`]}
                                >
                                    Desbloquear
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </section>
        </div>
    );
};

export default FriendsPage;