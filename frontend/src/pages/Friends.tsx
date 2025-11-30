import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    searchUsers,
    sendFriendRequest,
    getIncomingRequests,
    getOutgoingRequests,
    respondRequest,
    deleteRequest,
    blockUser,
    unblockUser,
    getFriends,
    getBlockedUsers, // <- asegúrate de exportarlo desde ../services/friends
} from '../services/friends';
import { createConversation } from '../services/chat';
import { useAuth } from '../hooks/useAuth';
import Toast from '../components/Toast';

type UserResult = any;
type Friend = any;
type RequestItem = any;
type BlockedUser = any;

const FriendsPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [q, setQ] = useState('');
    const [results, setResults] = useState<UserResult[]>([]);
    const [incoming, setIncoming] = useState<RequestItem[]>([]);
    const [outgoing, setOutgoing] = useState<RequestItem[]>([]);
    const [friends, setFriends] = useState<Friend[]>([]);
    const [blocked, setBlocked] = useState<BlockedUser[]>([]);

    const [loadingSearch, setLoadingSearch] = useState(false);
    const [loadingIncoming, setLoadingIncoming] = useState(false);
    const [loadingOutgoing, setLoadingOutgoing] = useState(false);
    const [loadingFriends, setLoadingFriends] = useState(false);
    const [loadingBlocked, setLoadingBlocked] = useState(false);

    const [processing, setProcessing] = useState<Record<string | number, boolean>>({});
    const [toast, setToast] = useState<{ type?: 'info' | 'error' | 'success'; message: string } | null>(null);
    const searchTimer = useRef<number | null>(null);

    const setBusy = (key: string | number, value: boolean) => setProcessing(prev => ({ ...prev, [key]: value }));

    const loadIncoming = useCallback(async () => {
        setLoadingIncoming(true);
        try {
            const r = await getIncomingRequests();
            setIncoming(r || []);
        } catch (err) {
            console.error('loadIncoming', err);
            setToast({ type: 'error', message: 'No se pudieron cargar solicitudes entrantes' });
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
            console.error('loadOutgoing', err);
            setToast({ type: 'error', message: 'No se pudieron cargar solicitudes enviadas' });
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
            console.error('loadFriends', err);
            setToast({ type: 'error', message: 'No se pudieron cargar tus amigos' });
            setFriends([]);
        } finally {
            setLoadingFriends(false);
        }
    }, []);

    const loadBlocked = useCallback(async () => {
        setLoadingBlocked(true);
        try {
            const b = await getBlockedUsers();
            setBlocked(b || []);
        } catch (err) {
            console.error('loadBlocked', err);
            setToast({ type: 'error', message: 'No se pudieron cargar usuarios bloqueados' });
            setBlocked([]);
        } finally {
            setLoadingBlocked(false);
        }
    }, []);

    useEffect(() => {
        // Cargamos todas las listas al montar
        loadIncoming();
        loadOutgoing();
        loadFriends();
        loadBlocked();
    }, [loadIncoming, loadOutgoing, loadFriends, loadBlocked]);

    // Debounced search
    useEffect(() => {
        if (searchTimer.current) {
            window.clearTimeout(searchTimer.current);
            searchTimer.current = null;
        }

        if (!q || q.trim() === '') {
            setResults([]);
            setLoadingSearch(false);
            return;
        }

        setLoadingSearch(true);
        searchTimer.current = window.setTimeout(async () => {
            try {
                const r = await searchUsers(q.trim());
                // opcional: filtrar usuarios bloqueados y el propio user
                const blockedIds = new Set(blocked.map(b => b.id));
                const filtered = (r || []).filter((u: any) => u.id !== user?.id && !blockedIds.has(u.id));
                setResults(filtered);
            } catch (err) {
                console.error('searchUsers', err);
                setToast({ type: 'error', message: 'Error buscando usuarios' });
                setResults([]);
            } finally {
                setLoadingSearch(false);
            }
        }, 300);

        return () => {
            if (searchTimer.current) {
                window.clearTimeout(searchTimer.current);
                searchTimer.current = null;
            }
        };
    }, [q, user?.id, blocked]);

    // Send request: optimistic UI + rollback on error
    const handleSendRequest = async (receiverId: number) => {
        if (!user) return setToast({ type: 'error', message: 'Debes iniciar sesión' });
        const busyKey = `send:${receiverId}`;
        setBusy(busyKey, true);

        setResults(prev => prev.map(u => (u.id === receiverId ? { ...u, friendStatus: 'request_sent' } : u)));
        setOutgoing(prev => [{ id: `optim-${Date.now()}`, receiver: { id: receiverId }, __optimistic: true }, ...prev]);

        try {
            const saved = await sendFriendRequest(receiverId);

            setOutgoing(prev => prev.map(o => {
                if (o.__optimistic && o.receiver?.id === receiverId) return saved;
                return o;
            }));

            await loadOutgoing();
            setToast({ type: 'success', message: 'Solicitud enviada' });
        } catch (err: any) {
            console.error('sendFriendRequest', err);
            setResults(prev => prev.map(u => (u.id === receiverId ? { ...u, friendStatus: 'none' } : u)));
            setOutgoing(prev => prev.filter(o => !(o.__optimistic && o.receiver?.id === receiverId)));
            const msg = err?.response?.data?.message ?? err?.message ?? 'Error al enviar solicitud';
            setToast({ type: 'error', message: msg });
        } finally {
            setBusy(busyKey, false);
        }
    };

    // Respond incoming: accept/reject. On accept add to friends
    const handleRespond = async (requestId: number, accept: boolean, senderId?: number) => {
        const busyKey = `respond:${requestId}`;
        setBusy(busyKey, true);
        try {
            await respondRequest(requestId, accept);
            setIncoming(prev => prev.filter(r => r.id !== requestId));
            setOutgoing(prev => prev.filter(r => r.id !== requestId));

            if (accept && senderId) {
                setFriends(prev => [{ id: senderId, profile: { name: 'Amigo' } }, ...prev]);

                try {
                    const conv = await createConversation([user!.id, senderId]);
                    if (conv?.id) navigate(`/chat/${conv.id}`);
                } catch (e) {
                    console.warn('createConversation', e);
                }
            }

            setToast({ type: 'success', message: accept ? 'Solicitud aceptada' : 'Solicitud rechazada' });
            await loadFriends();
        } catch (err: any) {
            console.error('respondRequest', err);
            const msg = err?.response?.data?.message ?? err?.message ?? 'Error al responder solicitud';
            setToast({ type: 'error', message: msg });
        } finally {
            setBusy(busyKey, false);
        }
    };

    const handleCancelOutgoing = async (requestId: number) => {
        if (!confirm('¿Cancelar esta solicitud enviada?')) return;
        const busyKey = `cancel:${requestId}`;
        setBusy(busyKey, true);
        try {
            await deleteRequest(requestId);
            setToast({ type: 'success', message: 'Solicitud cancelada' });
            await loadOutgoing();
        } catch (err) {
            console.error('deleteRequest', err);
            setToast({ type: 'error', message: 'No se pudo cancelar la solicitud' });
        } finally {
            setBusy(busyKey, false);
        }
    };

    const handleBlock = async (targetId: number) => {
        if (!confirm('¿Bloquear a este usuario?')) return;
        const busyKey = `block:${targetId}`;
        setBusy(busyKey, true);
        try {
            await blockUser(targetId);
            setToast({ type: 'success', message: 'Usuario bloqueado' });
            // recargar listas relevantes
            await Promise.all([loadIncoming(), loadOutgoing(), loadFriends(), loadBlocked()]);
        } catch (err) {
            console.error('blockUser', err);
            setToast({ type: 'error', message: 'No se pudo bloquear' });
        } finally {
            setBusy(busyKey, false);
        }
    };

    // handleUnblock usado en la sección "Usuarios bloqueados"
    const handleUnblock = async (targetId: number) => {
        const busyKey = `unblock:${targetId}`;
        setBusy(busyKey, true);
        try {
            await unblockUser(targetId);
            setToast({ type: 'success', message: 'Usuario desbloqueado' });
            await Promise.all([loadIncoming(), loadOutgoing(), loadFriends(), loadBlocked()]);
        } catch (err) {
            console.error('unblockUser', err);
            setToast({ type: 'error', message: 'No se pudo desbloquear' });
        } finally {
            setBusy(busyKey, false);
        }
    };

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <h1 className="text-3xl font-bold mb-6 text-gray-800">Gestión de Amigos</h1>

            {/* BUSCADOR */}
            <section className="mb-10 bg-white shadow-lg rounded-xl p-6 border border-gray-200">
                <h2 className="text-xl font-semibold mb-4">Buscar usuarios</h2>

                <div className="flex gap-3">
                    <input
                        className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 outline-none transition"
                        placeholder="Nombre, apellido o email..."
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        aria-label="Buscar usuarios"
                    />

                    <button
                        onClick={() => setQ(q => q.trim())}
                        disabled={loadingSearch}
                        className="bg-green-600 text-white px-5 py-2 rounded-lg hover:bg-green-700 transition shadow disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loadingSearch ? 'Buscando...' : 'Buscar'}
                    </button>
                </div>

                <div className="mt-5 bg-gray-50 rounded-xl overflow-hidden border border-gray-200">
                    {results.length === 0 ? (
                        <div className="p-4 text-sm text-gray-600">
                            {q.trim() ? 'No se encontraron usuarios.' : 'Escribe para buscar usuarios.'}
                        </div>
                    ) : (
                        results.map(u => {
                            const status = u.friendStatus ?? 'none';
                            const isSelf = u.id === user?.id;

                            return (
                                <div key={u.id} className="flex items-center justify-between py-4 px-5 border-b last:border-0 hover:bg-gray-100 transition">
                                    {/* LEFT */}
                                    <div className="flex items-center gap-4">
                                        <img src={u.profile?.avatar || '/default.png'} className="w-14 h-14 rounded-full object-cover ring-2 ring-green-300" alt="avatar" />
                                        <div>
                                            <div className="font-semibold text-gray-800">{u.profile?.name || u.email}</div>
                                            <div className="text-xs text-gray-500">{u.profile?.lastName || ''}</div>
                                        </div>
                                    </div>

                                    {/* RIGHT ACTIONS */}
                                    <div className="flex gap-2">
                                        {isSelf ? (
                                            <span className="text-sm px-3 py-1 rounded bg-gray-200">Tú</span>
                                        ) : status === 'friend' ? (
                                            <span className="text-sm px-3 py-1 rounded bg-green-100 text-green-700">Amigos</span>
                                        ) : status === 'request_sent' ? (
                                            <span className="text-sm px-3 py-1 rounded bg-yellow-100 text-yellow-700">Enviada</span>
                                        ) : status === 'request_received' ? (
                                            <>
                                                <button onClick={() => handleRespond(u.requestId ?? u.id, true, u.id)} className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700">Aceptar</button>
                                                <button onClick={() => handleRespond(u.requestId ?? u.id, false)} className="text-sm bg-gray-300 text-black px-3 py-1 rounded hover:bg-gray-400">Rechazar</button>
                                            </>
                                        ) : (
                                            <>
                                                <button onClick={() => handleSendRequest(u.id)} disabled={!!processing[`send:${u.id}`]} className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:opacity-50">
                                                    {processing[`send:${u.id}`] ? 'Enviando...' : 'Enviar'}
                                                </button>

                                                <button onClick={() => handleBlock(u.id)} disabled={!!processing[`block:${u.id}`]} className="text-sm bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 disabled:opacity-50">
                                                    Bloquear
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </section>

            {/* INCOMING */}
            <section className="mb-10 bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                <h2 className="text-xl font-semibold mb-4">Solicitudes entrantes ({incoming.length})</h2>

                {loadingIncoming ? (
                    <div className="text-gray-500">Cargando...</div>
                ) : incoming.length === 0 ? (
                    <div className="text-gray-500">No hay solicitudes.</div>
                ) : (
                    incoming.map(req => (
                        <div key={req.id} className="flex items-center justify-between py-4 border-b last:border-0">
                            <div className="flex items-center gap-4">
                                <img src={req.sender?.profile?.avatar || '/default.png'} className="w-14 h-14 rounded-full ring-2 ring-green-300" alt="" />
                                <div>
                                    <div className="font-semibold">{req.sender?.profile?.name || req.sender?.email}</div>
                                    <div className="text-xs text-gray-500">{req.sender?.profile?.lastName || ''}</div>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button disabled={!!processing[`respond:${req.id}`]} onClick={() => handleRespond(req.id, true, req.sender?.id)} className="px-4 py-1 bg-green-600 text-white rounded hover:bg-green-700">
                                    {processing[`respond:${req.id}`] ? 'Procesando...' : 'Aceptar'}
                                </button>

                                <button disabled={!!processing[`respond:${req.id}`]} onClick={() => handleRespond(req.id, false)} className="px-4 py-1 bg-gray-300 text-black rounded hover:bg-gray-400">
                                    Rechazar
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </section>

            {/* OUTGOING */}
            <section className="mb-10 bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                <h2 className="text-xl font-semibold mb-4">Solicitudes enviadas ({outgoing.length})</h2>

                {loadingOutgoing ? (
                    <div className="text-gray-500">Cargando...</div>
                ) : outgoing.length === 0 ? (
                    <div className="text-gray-500">No tienes solicitudes enviadas.</div>
                ) : (
                    outgoing.map(req => (
                        <div key={req.id} className="flex items-center justify-between py-4 border-b last:border-0">
                            <div className="flex items-center gap-4">
                                <img src={req.receiver?.profile?.avatar || '/default.png'} className="w-14 h-14 rounded-full ring-2 ring-green-300" alt="" />
                                <div>
                                    <div className="font-semibold">{req.receiver?.profile?.name || req.receiver?.email}</div>
                                    <div className="text-xs text-gray-500">{req.receiver?.profile?.lastName || ''}</div>
                                </div>
                            </div>

                            <button disabled={!!processing[`cancel:${req.id}`]} onClick={() => handleCancelOutgoing(req.id)} className="px-4 py-1 bg-gray-300 text-black rounded hover:bg-gray-400">
                                {processing[`cancel:${req.id}`] ? 'Cancelando...' : 'Cancelar'}
                            </button>
                        </div>
                    ))
                )}
            </section>

            {/* BLOCKED USERS */}
            <section className="mb-10 bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                <h2 className="text-xl font-semibold mb-4">Usuarios bloqueados ({blocked.length})</h2>

                {loadingBlocked ? (
                    <div className="text-gray-500">Cargando...</div>
                ) : blocked.length === 0 ? (
                    <div className="text-gray-500">No tienes usuarios bloqueados.</div>
                ) : (
                    blocked.map(b => (
                        <div key={b.id} className="flex items-center justify-between py-4 border-b last:border-0">
                            <div className="flex items-center gap-4">
                                <img src={b.profile?.avatar || '/default.png'} className="w-14 h-14 rounded-full ring-2 ring-red-300" alt="" />
                                <div>
                                    <div className="font-semibold">{b.profile?.name || b.email}</div>
                                    <div className="text-xs text-gray-500">{b.profile?.lastName || ''}</div>
                                </div>
                            </div>

                            <button disabled={!!processing[`unblock:${b.id}`]} onClick={() => handleUnblock(b.id)} className="px-4 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600">
                                {processing[`unblock:${b.id}`] ? 'Desbloqueando...' : 'Desbloquear'}
                            </button>
                        </div>
                    ))
                )}
            </section>

            {/* FRIENDS */}
            <section className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                <h2 className="text-xl font-semibold mb-4">Tus amigos ({friends.length})</h2>

                {loadingFriends ? (
                    <div className="text-gray-500">Cargando...</div>
                ) : friends.length === 0 ? (
                    <div className="text-gray-500">No tienes amigos aún</div>
                ) : (
                    friends.map(f => (
                        <div key={f.id} className="flex items-center justify-between py-4 border-b last:border-0">
                            <div className="flex items-center gap-4">
                                <img src={f.profile?.avatar || '/default.png'} className="w-14 h-14 rounded-full ring-2 ring-green-300" alt="" />

                                <div>
                                    <div className="font-semibold">{f.profile?.name || f.email}</div>
                                    <div className="text-xs text-gray-500">{f.profile?.lastName || ''}</div>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button onClick={async () => {
                                    try {
                                        const conv = await createConversation([user!.id, f.id]);
                                        if (conv?.id) navigate(`/chat/${conv.id}`);
                                        else navigate('/chat');
                                    } catch {
                                        navigate('/chat');
                                    }
                                }} className="px-4 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">
                                    Chatear
                                </button>

                                <button disabled={!!processing[`block:${f.id}`]} onClick={() => handleBlock(f.id)} className="px-4 py-1 bg-red-500 text-white rounded hover:bg-red-600">
                                    Bloquear
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </section>

            {toast && (
                <Toast type={toast.type ?? 'info'} message={toast.message} onClose={() => setToast(null)} />
            )}
        </div>
    );
};

export default FriendsPage;
