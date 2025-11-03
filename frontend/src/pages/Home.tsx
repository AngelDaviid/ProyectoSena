import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import PostList from '../components/PostList';
import ChatWindow from '../components/ChatWindow';
import { connectSocket, disconnectSocket, getSocket } from '../services/socket';
import { getConversations, getMessages } from '../services/chat';
import type { Conversation, Message } from '../types/chat';

const API_BASE = import.meta.env.VITE_SENA_API_URL || 'http://localhost:3001';

const Home: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const [chatOpen, setChatOpen] = useState(false);
    const [, setConversations] = useState<Conversation[]>([]); // ignoramos variable no usada
    const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);

    const socketRef = useRef<any>(null);

    // === Datos derivados del usuario ===
    const displayName =
        user?.profile?.name || user?.profile?.lastName
            ? `${user?.profile?.name ?? ''} ${user?.profile?.lastName ?? ''}`.trim()
            : user?.email ?? 'Usuario';

    const avatarSrc =
        user?.profile?.avatar
            ? user.profile.avatar.startsWith('/')
                ? `${API_BASE}${user.profile.avatar}`
                : user.profile.avatar
            : null;

    // === Cerrar dropdown al hacer clic fuera ===
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
                setDropdownOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // === Cargar conversaciones ===
    const loadConversations = useCallback(async () => {
        try {
            const data = await getConversations();
            setConversations(data);
            if (!activeConversation && data.length > 0) setActiveConversation(data[0]);
        } catch (err) {
            console.error('No se pudieron cargar conversaciones', err);
        }
    }, [activeConversation]);

    // === Cargar mensajes ===
    const loadMessages = useCallback(async (conv: Conversation) => {
        try {
            const msgs = await getMessages(conv.id);
            setMessages(
                msgs.sort(
                    (a, b) => +new Date(a.createdAt ?? 0) - +new Date(b.createdAt ?? 0)
                )
            );
        } catch (err) {
            console.error('Error al cargar mensajes', err);
        }
    }, []);

    // === Manejo del socket al abrir/cerrar chat ===
    useEffect(() => {
        if (!chatOpen) {
            disconnectSocket();
            socketRef.current = null;
            return;
        }

        (async () => await loadConversations())();

        const socket = connectSocket();
        socketRef.current = socket;

        const handleNewMessage = (msg: Message) => {
            if (msg.conversationId === activeConversation?.id)
                setMessages((prev) => [...prev, msg]);
        };

        socket.on('newMessage', handleNewMessage);

        return () => {
            socket.off('newMessage', handleNewMessage);
            disconnectSocket();
        };
    }, [chatOpen, activeConversation, loadConversations]);

    // === Unirse a una sala y cargar mensajes ===
    useEffect(() => {
        if (!chatOpen || !activeConversation) return;
        const socket = getSocket();
        socket.emit('joinConversation', { conversationId: String(activeConversation.id) });
        loadMessages(activeConversation);
    }, [chatOpen, activeConversation, loadMessages]);

    // === Enviar mensaje ===
    const handleSend = (text: string, imageUrl?: string | File) => {
        if (!activeConversation || !user) return;
        const socket = getSocket();

        // Convertir File a URL temporal (solo para vista previa)
        const image =
            imageUrl instanceof File ? URL.createObjectURL(imageUrl) : imageUrl ?? null;

        // Crear mensaje temporal según tu tipo Message
        const tempMessage: Message = {
            id: Date.now(),
            text,
            imageUrl: image,
            createdAt: new Date().toISOString(),
            senderId: user.id, // ✅ corregido
            conversationId: activeConversation.id, // ✅ corregido
        };

        setMessages((prev) => [...prev, tempMessage]);

        socket.emit('sendMessage', {
            conversationId: String(activeConversation.id),
            senderId: String(user.id),
            text,
            imageUrl: image,
        });
    };

    // === Cargar mensajes antiguos ===
    const handleLoadMore = useCallback(async () => {
        if (!activeConversation) return 0;
        try {
            const all = await getMessages(activeConversation.id);
            all.sort(
                (a, b) => +new Date(a.createdAt ?? 0) - +new Date(b.createdAt ?? 0)
            );

            const earliest = messages[0];
            const older = all.filter(
                (m) =>
                    new Date(m.createdAt ?? 0).getTime() <
                    new Date(earliest?.createdAt ?? 0).getTime()
            );
            if (older.length === 0) return 0;

            setMessages((prev) => [...older, ...prev]);
            return older.length;
        } catch (err) {
            console.error('Error cargando mensajes antiguos', err);
            return 0;
        }
    }, [activeConversation, messages]);

    return (
        <div className="flex flex-col min-h-screen bg-gray-100">
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-3 bg-white shadow-md sticky top-0 z-50">
                <h1
                    onClick={() => navigate('/')}
                    className="text-2xl font-bold text-green-600 cursor-pointer"
                >
                    Sena Conecta
                </h1>

                <input
                    type="text"
                    placeholder="Buscar..."
                    className="flex-1 mx-6 px-4 py-2 border rounded-full focus:ring-2 focus:ring-green-500"
                />

                <div ref={dropdownRef} className="relative">
                    <button
                        onClick={() => setDropdownOpen(!dropdownOpen)}
                        className="flex items-center space-x-2"
                    >
                        {avatarSrc ? (
                            <img
                                src={avatarSrc}
                                alt={displayName}
                                className="w-10 h-10 rounded-full"
                            />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-green-200 flex items-center justify-center text-green-700 font-bold">
                                {displayName.charAt(0)}
                            </div>
                        )}
                        <span>{displayName}</span>
                    </button>

                    {dropdownOpen && (
                        <div className="absolute right-0 mt-2 w-40 bg-white rounded-md shadow-lg">
                            <button
                                onClick={() => {
                                    navigate('/profile', { state: { user } });
                                    setDropdownOpen(false);
                                }}
                                className="w-full text-left px-4 py-2 hover:bg-green-100"
                            >
                                Ver perfil
                            </button>
                            <button
                                onClick={() => logout()}
                                className="w-full text-left px-4 py-2 hover:bg-red-100 text-red-600"
                            >
                                Cerrar sesión
                            </button>
                        </div>
                    )}
                </div>
            </header>

            {/* Main */}
            <main className="flex flex-1 p-6 gap-6">
                <aside className="w-72">
                    <div className="bg-white p-4 rounded-lg shadow">
                        <div className="flex items-center mb-4 space-x-4">
                            {avatarSrc ? (
                                <img
                                    src={avatarSrc}
                                    alt={displayName}
                                    className="w-16 h-16 rounded-full"
                                />
                            ) : (
                                <div className="w-16 h-16 rounded-full bg-green-200 flex items-center justify-center text-green-700 font-bold text-xl">
                                    {displayName.charAt(0)}
                                </div>
                            )}
                            <div>
                                <strong className="block text-lg">{displayName}</strong>
                                <span className="text-sm text-gray-500">
                  {user?.role ?? ''}
                </span>
                            </div>
                        </div>

                        <nav className="flex flex-col space-y-2">
                            <button
                                onClick={() => navigate('/friends')}
                                className="hover:bg-green-100 px-3 py-2 rounded"
                            >
                                Amigos
                            </button>
                            <button
                                onClick={() => navigate('/groups')}
                                className="hover:bg-green-100 px-3 py-2 rounded"
                            >
                                Grupos
                            </button>
                        </nav>
                    </div>
                </aside>

                <section className="flex-1">
                    <PostList />
                </section>
            </main>

            {/* Footer */}
            <footer className="h-16 bg-green-600 flex items-center justify-center text-white font-medium">
                © {new Date().getFullYear()} SenaBook
            </footer>

            {/* Chat Widget */}
            <div className="fixed left-4 bottom-4 z-50">
                {!chatOpen ? (
                    <button
                        onClick={() => setChatOpen(true)}
                        className="bg-green-600 text-white px-4 py-2 rounded-full shadow-lg hover:bg-green-700 flex items-center gap-2"
                    >
                        💬 Chat
                    </button>
                ) : (
                    <div className="w-80 h-96 bg-white rounded-lg shadow-xl flex flex-col">
                        <div className="flex items-center justify-between p-3 border-b">
                            <span className="font-medium">Chat</span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => navigate('/chat')}
                                    className="text-xs text-gray-600 px-2 py-1 hover:bg-gray-100 rounded"
                                >
                                    Abrir página
                                </button>
                                <button
                                    onClick={() => setChatOpen(false)}
                                    className="text-xs text-red-600 px-2 py-1 hover:bg-red-50 rounded"
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>

                        {activeConversation ? (
                            <ChatWindow
                                conversation={activeConversation}
                                messages={messages}
                                onSend={handleSend}
                                currentUserId={user?.id}
                                onLoadMore={handleLoadMore}
                            />
                        ) : (
                            <div className="p-4 text-sm text-gray-500">
                                No hay conversaciones disponibles.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Home;
