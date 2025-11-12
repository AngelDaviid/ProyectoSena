import { useEffect, useState, useCallback, useRef } from 'react';
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
} from '../services/friends';
import { createConversation } from '../services/chat';
import { useAuth } from '../hooks/useAuth';
import Toast from '../components/Toast';

type UserResult = any; // mantengo any para compatibilidad con tu backend

export default function FriendsPage() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [q, setQ] = useState('');
    const [results, setResults] = useState<UserResult[]>([]);
    const [incoming, setIncoming] = useState<any[]>([]);
    const [outgoing, setOutgoing] = useState<any[]>([]);
    const [friends, setFriends] = useState<any[]>([]);

    const [loadingSearch, setLoadingSearch] = useState(false);
    const [loadingIncoming, setLoadingIncoming] = useState(false);
    const [loadingOutgoing, setLoadingOutgoing] = useState(false);
    const [loadingFriends, setLoadingFriends] = useState(false);

    const [processing, setProcessing] = useState<Record<string|number, boolean>>({});
    const [toast, setToast] = useState<{type?:'info'|'error'|'success', message:string}|null>(null);
    const searchTimer = useRef<number | null>(null);

    const setBusy = (key: string|number, value: boolean) =>
        setProcessing(prev => ({ ...prev, [key]: value }));

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

    useEffect(() => {
        loadIncoming();
        loadOutgoing();
        loadFriends();
    }, [loadIncoming, loadOutgoing, loadFriends]);

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
                const filtered = (r || []).filter((u: any) => u.id !== user?.id);
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
    }, [q, user?.id]);

    // Send request: optimistic UI + rollback on error
    const handleSendRequest = async (receiverId: number) => {
        if (!user) return setToast({ type: 'error', message: 'Debes iniciar sesión' });
        const busyKey = `send:${receiverId}`;
        setBusy(busyKey, true);

        // Optimistic UI: marcar en resultados y añadir temporal a outgoing
        setResults(prev => prev.map(u => (u.id === receiverId ? { ...u, friendStatus: 'request_sent' } : u)));
        setOutgoing(prev => [{ id: `optim-${Date.now()}`, receiver: { id: receiverId }, __optimistic: true }, ...prev]);

        try {
            // Guardamos la respuesta real para usar sus datos (id real de la solicitud)
            const saved = await sendFriendRequest(receiverId);

            // Reemplazar la entrada optimista por la real (si existe)
            setOutgoing(prev => prev.map(o => {
                if (o.__optimistic && o.receiver?.id === receiverId) {
                    // saved puede venir con estructura { id, sender, receiver, status, createdAt }
                    return saved;
                }
                return o;
            }));

            // Aseguramos sincronía con el backend
            await loadOutgoing();
            setToast({ type: 'success', message: 'Solicitud enviada' });
        } catch (err: any) {
            console.error('sendFriendRequest', err);
            // rollback optimistic: quitar la entrada optimista y resetear estado en results
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
            // Update lists locally
            setIncoming(prev => prev.filter(r => r.id !== requestId));
            setOutgoing(prev => prev.filter(r => r.id !== requestId));

            if (accept && senderId) {
                // Optimistic: añadir a friends localmente
                setFriends(prev => [{ id: senderId, profile: { name: 'Amigo' } }, ...prev]);

                // Crear o abrir conversación (no bloqueamos la UI por esto)
                try {
                    const conv = await createConversation([user!.id, senderId]);
                    if (conv?.id) navigate(`/chat/${conv.id}`);
                } catch (e) {
                    console.warn('createConversation', e);
                }
            }

            setToast({ type: 'success', message: accept ? 'Solicitud aceptada' : 'Solicitud rechazada' });

            // Sincronizar lista de amigos con backend
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
            await Promise.all([loadIncoming(), loadOutgoing(), loadFriends()]);
        } catch (err) {
            console.error('blockUser', err);
            setToast({ type: 'error', message: 'No se pudo bloquear' });
        } finally {
            setBusy(busyKey, false);
        }
    };

    const handleUnblock = async (targetId: number) => {
        const busyKey = `unblock:${targetId}`;
        setBusy(busyKey, true);
        try {
            await unblockUser(targetId);
            setToast({ type: 'success', message: 'Usuario desbloqueado' });
            await Promise.all([loadIncoming(), loadOutgoing(), loadFriends()]);
        } catch (err) {
            console.error('unblockUser', err);
            setToast({ type: 'error', message: 'No se pudo desbloquear' });
        } finally {
            setBusy(busyKey, false);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-2xl font-semibold mb-4">Amigos</h1>

            <section className="mb-6">
                <h2 className="text-lg font-medium mb-2">Buscar usuarios</h2>
                <div className="flex gap-2">
                    <input
                        className="flex-1 border rounded px-3 py-2"
                        placeholder="Nombre, apellido o email..."
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        aria-label="Buscar usuarios"
                    />
                    <button
                        onClick={() => setQ(q => q.trim())}
                        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                        disabled={loadingSearch}
                    >
                        {loadingSearch ? 'Buscando...' : 'Buscar'}
                    </button>
                </div>

                <div className="mt-3 bg-white rounded shadow">
                    {results.length === 0 ? (
                        <div className="p-4 text-sm text-gray-500">{q.trim() ? 'No se encontraron usuarios.' : 'Escribe para buscar usuarios.'}</div>
                    ) : (
                        results.map(u => {
                            const status: string = u.friendStatus ?? 'none';
                            const isSelf = u.id === user?.id;
                            return (
                                <div key={u.id} className="flex items-center justify-between py-3 px-4 border-b">
                                    <div className="flex items-center gap-3">
                                        <img src={u.profile?.avatar || '/default.png'} alt={u.profile?.name || u.email} className="w-12 h-12 rounded-full object-cover"/>
                                        <div>
                                            <div className="font-medium">{u.profile?.name || u.email}</div>
                                            <div className="text-xs text-gray-500">{u.profile?.lastName || ''}</div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 items-center">
                                        {isSelf ? (
                                            <span className="text-sm px-3 py-1 rounded bg-gray-100">Tú</span>
                                        ) : status === 'friend' ? (
                                            <span className="text-sm px-3 py-1 rounded bg-gray-100">Amigos</span>
                                        ) : status === 'request_sent' ? (
                                            <span className="text-sm px-3 py-1 rounded bg-gray-100">Enviada</span>
                                        ) : status === 'request_received' ? (
                                            <>
                                                <button onClick={() => handleRespond(u.requestId ?? u.id, true, u.id)} className="text-sm bg-green-600 text-white px-3 py-1 rounded">Aceptar</button>
                                                <button onClick={() => handleRespond(u.requestId ?? u.id, false)} className="text-sm bg-yellow-500 text-white px-3 py-1 rounded">Rechazar</button>
                                            </>
                                        ) : (
                                            <>
                                                <button onClick={() => handleSendRequest(u.id)} disabled={!!processing[`send:${u.id}`]} className="text-sm bg-blue-600 text-white px-3 py-1 rounded">
                                                    {processing[`send:${u.id}`] ? 'Enviando...' : 'Enviar'}
                                                </button>
                                                <button onClick={() => handleBlock(u.id)} disabled={!!processing[`block:${u.id}`]} className="text-sm bg-red-400 text-white px-3 py-1 rounded">Bloquear</button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </section>

            <section className="mb-6 bg-white p-4 rounded shadow">
                <h2 className="text-lg font-medium mb-2">Solicitudes entrantes ({incoming.length})</h2>
                {loadingIncoming ? (
                    <div className="text-sm text-gray-500">Cargando...</div>
                ) : incoming.length === 0 ? (
                    <div className="text-sm text-gray-500">No hay solicitudes</div>
                ) : (
                    incoming.map(req => (
                        <div key={req.id} className="flex items-center justify-between py-2 border-b">
                            <div className="flex items-center gap-3">
                                <img src={req.sender?.profile?.avatar || '/default.png'} className="w-12 h-12 rounded-full object-cover" alt="avatar" />
                                <div>
                                    <div className="font-medium">{req.sender?.profile?.name || req.sender?.email}</div>
                                    <div className="text-xs text-gray-500">{req.sender?.profile?.lastName || ''}</div>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button disabled={!!processing[`respond:${req.id}`]} onClick={() => handleRespond(req.id, true, req.sender?.id)} className="px-3 py-1 bg-green-600 text-white rounded">
                                    {processing[`respond:${req.id}`] ? 'Procesando...' : 'Aceptar'}
                                </button>
                                <button disabled={!!processing[`respond:${req.id}`]} onClick={() => handleRespond(req.id, false)} className="px-3 py-1 bg-yellow-500 text-white rounded">
                                    Rechazar
                                </button>
                                <button disabled={!!processing[`delete:${req.id}`]} onClick={() => { if (confirm('Eliminar solicitud?')) handleRespond(req.id, false); }} className="px-3 py-1 bg-gray-200 text-black rounded">Eliminar</button>
                            </div>
                        </div>
                    ))
                )}
            </section>

            <section className="mb-6 bg-white p-4 rounded shadow">
                <h2 className="text-lg font-medium mb-2">Solicitudes enviadas ({outgoing.length})</h2>
                {loadingOutgoing ? <div className="text-sm text-gray-500">Cargando...</div> : outgoing.length === 0 ? (
                    <div className="text-sm text-gray-500">No tienes solicitudes pendientes enviadas.</div>
                ) : (
                    outgoing.map(req => (
                        <div key={req.id} className="flex items-center justify-between py-2 border-b">
                            <div className="flex items-center gap-3">
                                <img src={req.receiver?.profile?.avatar || '/default.png'} className="w-12 h-12 rounded-full object-cover" alt="avatar" />
                                <div>
                                    <div className="font-medium">{req.receiver?.profile?.name || req.receiver?.email}</div>
                                    <div className="text-xs text-gray-500">{req.receiver?.profile?.lastName || ''}</div>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button disabled={!!processing[`cancel:${req.id}`]} onClick={() => handleCancelOutgoing(req.id)} className="px-3 py-1 bg-gray-200 text-black rounded">
                                    {processing[`cancel:${req.id}`] ? 'Cancelando...' : 'Cancelar'}
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </section>

            <section className="bg-white p-4 rounded shadow">
                <h2 className="text-lg font-medium mb-2">Tus amigos ({friends.length})</h2>
                {loadingFriends ? <div className="text-sm text-gray-500">Cargando...</div> : friends.length === 0 ? (
                    <div className="text-sm text-gray-500">No tienes amigos aún</div>
                ) : (
                    friends.map(f => (
                        <div key={f.id} className="flex items-center justify-between py-2 border-b">
                            <div className="flex items-center gap-3">
                                <img src={f.profile?.avatar || '/default.png'} alt={f.profile?.name || f.email} className="w-12 h-12 rounded-full object-cover" />
                                <div>
                                    <div className="font-medium">{f.profile?.name || f.email}</div>
                                    <div className="text-xs text-gray-500">{f.profile?.lastName || ''}</div>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={async () => {
                                    try {
                                        const conv = await createConversation([user!.id, f.id]);
                                        if (conv?.id) navigate(`/chat/${conv.id}`);
                                        else navigate('/chat');
                                    } catch (e) {
                                        console.warn('createConversation', e);
                                        navigate('/chat');
                                    }
                                }} className="px-3 py-1 bg-blue-600 text-white rounded">Chatear</button>

                                <button disabled={!!processing[`block:${f.id}`]} onClick={() => handleBlock(f.id)} className="px-3 py-1 bg-red-400 text-white rounded">Bloquear</button>
                                <button disabled={!!processing[`unblock:${f.id}`]} onClick={() => handleUnblock(f.id)} className="px-3 py-1 bg-gray-200 text-black rounded">Desbloquear</button>
                            </div>
                        </div>
                    ))
                )}
            </section>

            {toast && <Toast type={toast.type ?? 'info'} message={toast.message} onClose={() => setToast(null)} />}
        </div>
    );
}