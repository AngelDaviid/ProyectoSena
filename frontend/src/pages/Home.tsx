import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import PostList from "../components/Posts/PostList.tsx";
import ChatWindow from "../components/Chat/ChatWindow.tsx";
import { connectSocket, disconnectSocket, getSocket } from "../services/socket";
import { getConversations, getMessages } from "../services/chat";
import type { Conversation, Message } from "../types/chat";
import NavbarSearch from "../components/Navbar/NavbarSearch.tsx";

const API_BASE = import.meta.env.VITE_SENA_API_URL || "http://localhost:3001";

const Home: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const [chatOpen, setChatOpen] = useState(false);
    const [, setConversations] = useState<Conversation[]>([]);
    const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const socketRef = useRef<any>(null);

    const displayName =
        user?.profile?.name || user?.profile?.lastName
            ? `${user?.profile?.name ?? ""} ${user?.profile?.lastName ?? ""}`.trim()
            : user?.email ?? "Usuario";

    const avatarSrc = user?.profile?.avatar
        ? user.profile.avatar.startsWith("/")
            ? `${API_BASE}${user.profile.avatar}`
            : user.profile.avatar
        : null;

    // === Dropdown fuera ===
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Helper: normaliza la respuesta de getMessages a un array de Message
    const normalizeMessagesResponse = (res: any): Message[] => {
        if (!res) return [];
        if (Array.isArray(res)) return res;
        if (res.messages && Array.isArray(res.messages)) return res.messages;
        if (res.data && Array.isArray(res.data)) return res.data;
        return [];
    };

    // === Cargar conversaciones ===
    const loadConversations = useCallback(async () => {
        try {
            const data = await getConversations();
            setConversations(data ?? []);
            if (!activeConversation && data?.length > 0) {
                setActiveConversation(data[0]);
            }
        } catch (err) {
            console.error("No se pudieron cargar conversaciones", err);
        }
        // intentionally not depending on activeConversation to avoid loop
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // === Cargar mensajes (carga inicial / refresco de la conversación activa) ===
    const loadMessages = useCallback(
        async (conv: Conversation) => {
            try {
                const raw = await getMessages(conv.id);
                const msgs = normalizeMessagesResponse(raw);
                // Normalizar senderId a number para consistencia en cliente
                const normalized = msgs.map((m) => ({ ...m, senderId: Number((m as any).senderId) })) as Message[];
                // orden ascendente por fecha
                const sorted = normalized.sort((a, b) => +new Date(a.createdAt ?? 0) - +new Date(b.createdAt ?? 0));
                setMessages(sorted);
            } catch (err) {
                console.error("Error al cargar mensajes", err);
            }
        },
        []
    );

    // === Socket chat: conectar/desconectar cuando se abre/cierra el panel de chat ===
    useEffect(() => {
        if (!chatOpen) {
            // cerrar socket cuando se cierra el chat
            disconnectSocket();
            socketRef.current = null;
            return;
        }

        // cargar conversaciones al abrir chat
        (async () => await loadConversations())();

        const socket = connectSocket();
        socketRef.current = socket;

        const handleNewMessage = (msg: any) => {
            // normalizar senderId a number
            const normalizedMsg: Message = { ...msg, senderId: Number((msg as any).senderId) };
            if (normalizedMsg.conversationId === activeConversation?.id) {
                setMessages((prev) => [...prev, normalizedMsg]);
            } else {
                // opcional: podrías actualizar un badge/unread counter en conversations
            }
        };

        socket.on("newMessage", handleNewMessage);

        return () => {
            socket.off("newMessage", handleNewMessage);
            disconnectSocket();
            socketRef.current = null;
        };
    }, [chatOpen, activeConversation, loadConversations]);

    // Cuando cambia la conversación activa y el chat está abierto:
    useEffect(() => {
        if (!chatOpen || !activeConversation) return;
        const socket = getSocket();
        // Unir al room de la conversación
        try {
            socket.emit("joinConversation", { conversationId: String(activeConversation.id) });
        } catch (err) {
            // ignore if socket not ready
        }
        loadMessages(activeConversation);
    }, [chatOpen, activeConversation, loadMessages]);

    // Envío de mensaje (optimistic UI + socket emit)
    const handleSend = (text: string, imageUrl?: string | File) => {
        if (!activeConversation || !user) return;
        const socket = getSocket();

        const image = imageUrl instanceof File ? URL.createObjectURL(imageUrl) : imageUrl ?? null;

        const tempMessage: Message = {
            id: Date.now(),
            text,
            imageUrl: image,
            createdAt: new Date().toISOString(),
            senderId: Number(user.id),
            conversationId: activeConversation.id,
        };

        // Mostrar mensaje optimista (verde)
        setMessages((prev) => [...prev, tempMessage]);

        // Emitir al servidor (envío consistente: senderId como number, conversationId como number)
        socket.emit("sendMessage", {
            conversationId: activeConversation.id,
            senderId: Number(user.id),
            text,
            imageUrl: image,
        });
    };

    // Cargar más mensajes antiguos: devuelve cuántos mensajes se agregaron
    const handleLoadMore = useCallback(
        async () => {
            if (!activeConversation) return 0;
            try {
                const raw = await getMessages(activeConversation.id);
                const allRaw = normalizeMessagesResponse(raw);
                const all = allRaw.map((m) => ({ ...m, senderId: Number((m as any).senderId) })) as Message[];
                all.sort((a, b) => +new Date(a.createdAt ?? 0) - +new Date(b.createdAt ?? 0));

                const earliest = messages[0];
                if (!earliest) {
                    // si no hay mensajes cargados, cargamos la página completa y la seteamos
                    setMessages(all);
                    return all.length;
                }

                const older = all.filter(
                    (m) => new Date(m.createdAt ?? 0).getTime() < new Date(earliest.createdAt ?? 0).getTime()
                );
                if (older.length === 0) return 0;

                setMessages((prev) => [...older, ...prev]);
                return older.length;
            } catch (err) {
                console.error("Error cargando mensajes antiguos", err);
                return 0;
            }
        },
        [activeConversation, messages]
    );

    return (
        <div className="min-h-screen grid grid-rows-[auto_1fr_auto] bg-gray-100">
            {/* HEADER */}
            <header className="flex items-center justify-between bg-white shadow-md px-8 py-4 sticky top-0 z-50">
                <h1 onClick={() => navigate("/")} className="text-2xl font-bold text-green-600 cursor-pointer">
                    Sena Conecta
                </h1>

                {/* NavbarSearch reemplaza la input anterior */}
                <div className="w-2/4">
                    <NavbarSearch />
                </div>

                <div ref={dropdownRef} className="relative">
                    <button onClick={() => setDropdownOpen(!dropdownOpen)} className="flex items-center gap-3">
                        {avatarSrc ? (
                            <img src={avatarSrc} alt={displayName} className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-green-200 flex items-center justify-center text-green-700 font-semibold">
                                {displayName.charAt(0).toUpperCase()}
                            </div>
                        )}
                        <span className="font-medium">{displayName}</span>
                    </button>

                    {dropdownOpen && (
                        <div className="absolute right-0 mt-2 w-44 bg-white border rounded-md shadow-lg">
                            <button
                                onClick={() => {
                                    navigate("/profile", { state: { user } });
                                    setDropdownOpen(false);
                                }}
                                className="block w-full text-left px-4 py-2 hover:bg-green-50"
                            >
                                Ver perfil
                            </button>
                            <button onClick={() => logout()} className="block w-full text-left px-4 py-2 text-red-600 hover:bg-red-50">
                                Cerrar sesión
                            </button>
                        </div>
                    )}
                </div>
            </header>

            {/* MAIN GRID */}
            <main className="grid grid-cols-[280px_1fr] gap-8 px-8 py-6">
                {/* SIDEBAR */}
                <aside className="bg-white rounded-lg shadow p-6 h-fit self-start sticky top-24">
                    <div className="flex items-center gap-4 mb-6">
                        {avatarSrc ? (
                            <img src={avatarSrc} alt={displayName} className="w-16 h-16 rounded-full object-cover" />
                        ) : (
                            <div className="w-16 h-16 rounded-full bg-green-200 flex items-center justify-center text-green-700 font-semibold text-xl">
                                {displayName.charAt(0).toUpperCase()}
                            </div>
                        )}
                        <div>
                            <strong className="text-lg block">{displayName}</strong>
                            <span className="text-gray-500 text-sm">{user?.role ?? "Aprendiz"}</span>
                        </div>
                    </div>

                    <div className="grid gap-3">
                        <button onClick={() => navigate("/friends")} className="w-full text-left cursor-pointer px-4 py-2 hover:bg-green-50 transition">
                            Amigos
                        </button>
                        <button onClick={() => navigate("/groups")} className="w-full text-left cursor-pointer px-4 py-2 hover:bg-green-50 transition">
                            Grupos
                        </button>
                    </div>
                </aside>

                {/* POSTS */}
                <section className="bg-white rounded-lg shadow p-6">
                    <PostList />
                </section>
            </main>

            {/* FOOTER */}
            <footer className="bg-green-600 text-white text-center py-4 font-medium">© {new Date().getFullYear()} Sena Conecta</footer>

            {/* CHAT FLOAT */}
            <div className="fixed left-6 bottom-6 z-50">
                {!chatOpen ? (
                    <button onClick={() => setChatOpen(true)} className="bg-green-600 w-[180px] text-white cursor-pointer px-6 py-2 rounded-full shadow-lg hover:bg-green-700 transition">
                        Chat
                    </button>
                ) : (
                    <div className="w-80 h-96 bg-white rounded-lg shadow-xl flex flex-col overflow-hidden">
                        <div className="flex items-center justify-between p-3 border-b">
                            <span className="font-medium">Chat</span>
                            <div className="flex gap-2">
                                <button onClick={() => navigate("/chat")} className="text-xs text-gray-600 px-2 py-1 hover:bg-gray-100 rounded">
                                    Abrir
                                </button>
                                <button onClick={() => setChatOpen(false)} className="text-xs text-red-600 px-2 py-1 hover:bg-red-50 rounded">
                                    Cerrar
                                </button>
                            </div>
                        </div>

                        {activeConversation ? (
                            <ChatWindow
                                conversation={activeConversation}
                                messages={messages}
                                onSend={handleSend}
                                currentUserId={user?.id ?? null}
                                onLoadMore={handleLoadMore}
                            />
                        ) : (
                            <div className="p-4 text-sm text-gray-500">No hay conversaciones disponibles.</div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Home;