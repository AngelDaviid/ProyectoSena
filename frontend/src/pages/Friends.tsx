import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    searchUsers,
    sendFriendRequest,
    getIncomingRequests,
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

const FriendsPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [q, setQ] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [incoming, setIncoming] = useState<any[]>([]);
    const [friends, setFriends] = useState<any[]>([]);
    const [loadingSearch, setLoadingSearch] = useState(false);
    const [loadingIncoming, setLoadingIncoming] = useState(false);
    const [loadingFriends, setLoadingFriends] = useState(false);

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

        // Conectar socket y registrar usuario
        connectSocket(); // si usas token, pásalo aquí
        registerUser(user.id);

        // Cargas iniciales
        loadIncoming();
        loadFriends();

        // Handlers de socket
        const handleSent = () => {
            // solo refrescar entrantes
            loadIncoming();
        };
        const handleAccepted = (data: any) => {
            // refrescar amigos; si viene conversación, navegarla
            loadFriends();
            if (data?.conversation?.id) {
                navigate(`/chat/${data.conversation.id}`);
            }
        };

        onFriendRequestSent(handleSent);
        onFriendRequestAccepted(handleAccepted);

        return () => {
            offFriendRequestSent(handleSent);
            offFriendRequestAccepted(handleAccepted);
            releaseSocket();
        };
    }, [user, loadIncoming, loadFriends, navigate]);

    const doSearch = async () => {
        if (!q || q.trim().length === 0) {
            setResults([]);
            return;
        }
        setLoadingSearch(true);
        try {
            const r = await searchUsers(q.trim());
            // opcional: filtrar al propio usuario
            const filtered = r.filter((u: any) => u.id !== user?.id);
            setResults(filtered);
        } catch (err) {
            console.error('Error searching users', err);
            setResults([]);
        } finally {
            setLoadingSearch(false);
        }
    };

    const handleSendRequest = async (receiverId: number) => {
        try {
            await sendFriendRequest(receiverId);
            alert('Solicitud enviada');
            // actualizar salientes/entrantes si quieres
        } catch (err: any) {
            console.error('Error sending request', err);
            alert(err?.response?.data?.message || err?.message || 'Error al enviar solicitud');
        }
    };

    const handleRespond = async (requestId: number, accept: boolean, senderId?: number) => {
        try {
            await respondRequest(requestId, accept);
            await loadIncoming();
            await loadFriends();
            if (accept && senderId) {
                // crear o abrir conversation y navegar
                try {
                    const conv = await createConversation([user!.id, senderId]);
                    if (conv?.id) navigate(`/chat/${conv.id}`);
                } catch (e) {
                    // si backend ya envió conversation via socket, puede que no haga falta
                    console.warn('No se pudo crear conversación (puede que ya exista)', e);
                }
            }
        } catch (err: any) {
            console.error('Error responding request', err);
            alert(err?.response?.data?.message || err?.message || 'Error al responder solicitud');
        }
    };

    const handleDeleteRequest = async (requestId: number) => {
        if (!confirm('¿Eliminar/cancelar esta solicitud?')) return;
        try {
            await deleteRequest(requestId);
            await loadIncoming();
            await loadFriends();
        } catch (err) {
            console.error('Error deleting request', err);
            alert('Error al eliminar solicitud');
        }
    };

    const handleBlock = async (targetId: number) => {
        if (!confirm('¿Estás seguro que quieres bloquear a este usuario?')) return;
        try {
            await blockUser(targetId);
            await loadIncoming();
            await loadFriends();
            alert('Usuario bloqueado');
        } catch (err) {
            console.error('Error blocking user', err);
            alert('Error al bloquear usuario');
        }
    };

    const handleUnblock = async (targetId: number) => {
        try {
            await unblockUser(targetId);
            await loadIncoming();
            await loadFriends();
            alert('Usuario desbloqueado');
        } catch (err) {
            console.error('Error unblocking user', err);
            alert('Error al desbloquear usuario');
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
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') doSearch();
                        }}
                    />
                    <button
                        onClick={doSearch}
                        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                        disabled={loadingSearch}
                    >
                        Buscar
                    </button>
                </div>

                <div className="mt-3">
                    {loadingSearch ? (
                        <div className="text-sm text-gray-500">Buscando...</div>
                    ) : (
                        results.map((u) => (
                            <div key={u.id} className="flex items-center justify-between py-2 border-b">
                                <div>
                                    <div className="font-medium">{u.profile?.name || u.email}</div>
                                    <div className="text-xs text-gray-500">{u.profile?.lastName || ''}</div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleSendRequest(u.id)}
                                        className="text-sm bg-blue-500 text-white px-3 py-1 rounded"
                                    >
                                        Enviar solicitud
                                    </button>
                                    <button
                                        onClick={() => handleBlock(u.id)}
                                        className="text-sm bg-red-400 text-white px-3 py-1 rounded"
                                    >
                                        Bloquear
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </section>

            <section className="mb-6">
                <h2 className="text-lg font-medium mb-2">Solicitudes entrantes</h2>
                {loadingIncoming ? (
                    <div className="text-sm text-gray-500">Cargando...</div>
                ) : incoming.length === 0 ? (
                    <div className="text-sm text-gray-500">No hay solicitudes</div>
                ) : (
                    incoming.map((req) => (
                        <div key={req.id} className="flex items-center justify-between py-2 border-b">
                            <div>
                                <div className="font-medium">{req.sender?.profile?.name || req.sender?.email}</div>
                                <div className="text-xs text-gray-500">{req.sender?.profile?.lastName || ''}</div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleRespond(req.id, true, req.sender?.id)}
                                    className="text-sm bg-green-600 text-white px-3 py-1 rounded"
                                >
                                    Aceptar
                                </button>
                                <button
                                    onClick={() => handleRespond(req.id, false)}
                                    className="text-sm bg-yellow-500 text-white px-3 py-1 rounded"
                                >
                                    Rechazar
                                </button>
                                <button
                                    onClick={() => handleDeleteRequest(req.id)}
                                    className="text-sm bg-gray-300 text-black px-3 py-1 rounded"
                                >
                                    Eliminar
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </section>

            <section>
                <h2 className="text-lg font-medium mb-2">Tus amigos</h2>
                {loadingFriends ? (
                    <div className="text-sm text-gray-500">Cargando...</div>
                ) : friends.length === 0 ? (
                    <div className="text-sm text-gray-500">No tienes amigos aún</div>
                ) : (
                    friends.map((f) => (
                        <div key={f.id} className="flex items-center justify-between py-2 border-b">
                            <div>
                                <div className="font-medium">{f.profile?.name || f.email}</div>
                                <div className="text-xs text-gray-500">{f.profile?.lastName || ''}</div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={async () => {
                                        // intentar abrir o crear conversación
                                        try {
                                            const conv = await createConversation([user!.id, f.id]);
                                            if (conv?.id) navigate(`/chat/${conv.id}`);
                                        } catch (e) {
                                            console.warn('No se pudo crear conversación', e);
                                            // fallback: navegar a lista de chats
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
                                >
                                    Bloquear
                                </button>
                                <button
                                    onClick={() => handleUnblock(f.id)}
                                    className="text-sm bg-gray-300 text-black px-3 py-1 rounded"
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