import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { connectSocket, disconnectSocket, getSocket, registerUser } from '../services/sockets/socket.ts';
import { getConversations, getMessages } from '../services/sockets/chat.socket.ts';
import type { Conversation, Message } from '../types/chat';
import ChatSidebar from '../components/Chat/ChatSidebar';

type MsgWithMeta = Message & { sending?: boolean; tempId?: string };

const MESSAGES_LIMIT = 20;

const ChatPage: React.FC = () => {
    const { user, token } = useAuth();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<MsgWithMeta[]>([]);

    // pagination state and guards
    const pagesRef = useRef<Record<number, { page: number; hasMore: boolean }>>({});
    const loadingByConv = useRef<Record<number, boolean>>({});
    const conversationsLoadedRef = useRef(false);

    const socketRef = useRef<any>(null);
    const prevConversationRef = useRef<number | null>(null);

    // Cargar conversaciones con guard para evitar múltiples fetches
    const loadConversations = useCallback(async () => {
        if (conversationsLoadedRef.current) {
            console.debug('[chat] loadConversations: cached/skip');
            return;
        }
        try {
            console.debug('[chat] loadConversations: fetching /conversations');
            const data = await getConversations();
            setConversations(data ?? []);
            conversationsLoadedRef.current = true;
        } catch (err) {
            console.error('No se pudieron cargar conversaciones', err);
        }
    }, []);

    // Solo cargar conversaciones al montar este componente
    useEffect(() => {
        void loadConversations();
    }, [loadConversations]);

    // Conectar socket y listeners globales (solo depende de user/token)
    useEffect(() => {
        if (!user) return;

        const s = connectSocket(token ?? undefined);
        socketRef.current = s;
        registerUser(user.id, token ?? undefined);

        const handleNotification = (payload: any) => {
            console.debug('[socket] notification', payload);
        };

        const handleNewMessage = (msg: Message & { tempId?: string }) => {
            if (activeConversation && msg.conversationId === activeConversation.id) {
                setMessages((prev) => {
                    if (msg.tempId) {
                        const idx = prev.findIndex((m) => m.tempId === msg.tempId);
                        if (idx !== -1) {
                            const copy = [...prev];
                            copy[idx] = msg;
                            return copy;
                        }
                    }
                    return [...prev, msg];
                });
            } else {
                console.debug('[socket] newMessage for other conversation', msg.conversationId);
            }
        };

        s.on('notification', handleNotification);
        s.on('newMessage', handleNewMessage);

        return () => {
            try {
                s.off('notification', handleNotification);
                s.off('newMessage', handleNewMessage);
            } catch {}
            disconnectSocket();
            socketRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id, token]); // solo depende de usuario/token

    // Abrir conversación: carga pagina 1 y prepara paginación
    const openConversation = (conv: Conversation) => {
        (async () => {
            const s = getSocket();
            if (prevConversationRef.current) {
                s.emit('leaveConversation', { conversationId: String(prevConversationRef.current) });
            }

            setActiveConversation(conv);
            prevConversationRef.current = conv.id;

            // inicializa estado de paginación
            pagesRef.current[conv.id] = { page: 1, hasMore: true };
            loadingByConv.current[conv.id] = false;

            try {
                const { messages: msgs } = await getMessages(conv.id, 1, MESSAGES_LIMIT);
                msgs.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
                setMessages(msgs as MsgWithMeta[]);
                pagesRef.current[conv.id].hasMore = (msgs.length === MESSAGES_LIMIT);
                pagesRef.current[conv.id].page = 1;
            } catch (err) {
                console.error('Error al cargar mensajes', err);
                setMessages([]);
                pagesRef.current[conv.id].hasMore = false;
            }

            s.emit('joinConversation', { conversationId: String(conv.id) });
        })().catch((e) => console.error('openConversation error', e));
    };

    // Cargar más mensajes
    const handleLoadMore = async (): Promise<number> => {
        if (!activeConversation) return 0;
        const convId = activeConversation.id;
        const pageState = pagesRef.current[convId] ?? { page: 1, hasMore: true };

        if (!pageState.hasMore) return 0;
        if (loadingByConv.current[convId]) return 0;

        loadingByConv.current[convId] = true;
        const nextPage = pageState.page + 1;

        try {
            const { messages: newMsgs } = await getMessages(convId, nextPage, MESSAGES_LIMIT);
            newMsgs.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
            if (newMsgs.length === 0) {
                pagesRef.current[convId].hasMore = false;
                return 0;
            }
            setMessages((prev) => [...newMsgs, ...prev]);
            pagesRef.current[convId].page = nextPage;
            pagesRef.current[convId].hasMore = (newMsgs.length === MESSAGES_LIMIT);
            return newMsgs.length;
        } catch (err) {
            console.error('Error cargando mensajes antiguos', err);
            return 0;
        } finally {
            loadingByConv.current[convId] = false;
        }
    };

    // Enviar mensaje (tempId)
    const handleSend = (text: string, imageFile?: File) => {
        if (!activeConversation || !user) return;
        const s = getSocket();
        const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

        let imageUrl: string | null = null;
        if (imageFile) imageUrl = URL.createObjectURL(imageFile);

        const payload = {
            conversationId: String(activeConversation.id),
            senderId: String(user.id),
            text,
            imageFilePresent: !!imageFile,
            tempId,
        };

        s.emit('sendMessage', payload);

        setMessages((prev) => [
            ...prev,
            {
                id: Date.now(),
                text,
                imageUrl,
                createdAt: new Date().toISOString(),
                senderId: user.id,
                conversationId: activeConversation.id,
                sending: true,
                tempId,
            },
        ]);
    };

    return (
        <div className="grid grid-cols-[300px_1fr] min-h-screen bg-gray-100">
            <ChatSidebar conversations={conversations} currentUserId={user?.id} onSelect={openConversation} />

            <div className="bg-white border-l flex flex-col">
                {activeConversation ? (
                    <div className="flex-1 flex flex-col">
                        <div className="px-4 py-3 border-b flex items-center justify-between">
                            <div className="font-semibold">
                                {activeConversation.participants?.map((p) => p.profile?.name ?? `#${p.id}`).join(', ') || 'Conversación'}
                            </div>
                            <div className="text-sm text-gray-500">Miembro(s): {activeConversation.participants?.length ?? 0}</div>
                        </div>

                        <div className="flex-1 overflow-auto p-4 flex flex-col gap-3">
                            <button className="text-sm text-blue-600 self-center" onClick={handleLoadMore}>
                                Cargar más mensajes
                            </button>

                            <div>
                                {messages.map((m) => (
                                    <div key={(m as any).tempId ?? m.id} className={`max-w-[70%] p-2 rounded ${m.senderId === user?.id ? 'ml-auto bg-blue-100 text-right' : 'mr-auto bg-gray-100'}`}>
                                        {m.imageUrl && <img src={m.imageUrl} alt="img" className="max-h-48 mb-2 rounded" />}
                                        <div className="text-sm break-words">{m.text}</div>
                                        <div className="text-xs text-gray-500 mt-1">{m.createdAt ? new Date(m.createdAt).toLocaleString() : ''}</div>
                                        {m.sending && <div className="text-xs text-gray-400">Enviando...</div>}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="border-t p-3">
                            <ChatInput onSend={handleSend} />
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-center flex-1 text-gray-500">Selecciona una conversación</div>
                )}
            </div>
        </div>
    );
};

export default ChatPage;

function ChatInput({ onSend }: { onSend: (text: string, file?: File) => void }) {
    const [text, setText] = useState('');
    const [file, setFile] = useState<File | undefined>(undefined);

    const submit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!text.trim() && !file) return;
        onSend(text.trim(), file);
        setText('');
        setFile(undefined);
    };

    return (
        <form onSubmit={submit} className="flex gap-2 items-center">
            <input type="file" onChange={(ev) => { const f = ev.target.files?.[0]; if (f) setFile(f); }} />
            <input className="flex-1 border rounded px-3 py-2" value={text} onChange={(e) => setText(e.target.value)} placeholder="Escribe un mensaje..." />
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Enviar</button>
        </form>
    );
}