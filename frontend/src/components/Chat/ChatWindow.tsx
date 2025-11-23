import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Conversation, Message as ChatMessage, SimpleUser } from '../../types/chat';
import ChatBubble from './chat-bubble.tsx';
import { on as socketOn, off as socketOff } from '../../services/socket';
import { postMessage } from '../../services/chat';

const API_BASE = import.meta.env.VITE_SENA_API_URL || 'http://localhost:3001';
const RECENT_SENT_KEY = 'chat_recent_sent_v2';
const MATCH_WINDOW_MS = 20000; // 20s para emparejar por texto+timestamp (más robusto)

// Mostrar menos mensajes cuando esté colapsado (solicitaste "esconde más mensajes")
const COLLAPSED_VISIBLE = 8;

type RecentRecord = { tempId: string; text: string; createdAt: number; conversationId?: number | string };

type Props = {
    activeConversation: Conversation | null;
    currentUserId?: number | null;
};

/**
 * ChatWindow:
 * - oculta más mensajes cuando está colapsado (COLLAPSED_VISIBLE)
 * - persiste registros de envíos en localStorage para que, tras refresh,
 *   podamos inferir que un mensaje es "propio" incluso si el servidor no devuelve senderId
 * - amplia ventana de emparejado para hacerlo más tolerante (MATCH_WINDOW_MS)
 * - previsualización de imagen antes de enviar
 * - reconciliación por tempId si el servidor lo devuelve
 */
const ChatWindow: React.FC<Props> = ({ activeConversation, currentUserId }) => {
    const [text, setText] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
    const [sending, setSending] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const bottomRef = useRef<HTMLDivElement | null>(null);

    const [expanded, setExpanded] = useState(false);

    // mensajes locales: server + optimistas
    const [messages, setMessages] = useState<(ChatMessage & { tempId?: string; sending?: boolean; _inferred?: boolean })[]>(
        (activeConversation?.messages ?? []).map(m => normalizeMessageInitial(m))
    );

    // ---------------- localStorage helpers ----------------
    const readRecent = (): RecentRecord[] => {
        try {
            const raw = localStorage.getItem(RECENT_SENT_KEY);
            if (!raw) return [];
            return JSON.parse(raw) as RecentRecord[];
        } catch {
            return [];
        }
    };
    const writeRecent = (arr: RecentRecord[]) => {
        try { localStorage.setItem(RECENT_SENT_KEY, JSON.stringify(arr)); } catch {}
    };
    const pushRecentRecord = (r: RecentRecord) => {
        const arr = readRecent();
        arr.push(r);
        if (arr.length > 200) arr.splice(0, arr.length - 200);
        writeRecent(arr);
    };
    const removeRecentByTempId = (tempId: string) => {
        const arr = readRecent().filter(x => x.tempId !== tempId);
        writeRecent(arr);
    };
    function consumeRecentMatch(m: any): RecentRecord | null {
        const arr = readRecent();
        // 1) try by tempId if provided
        if (m?.tempId) {
            const i = arr.findIndex(r => r.tempId === String(m.tempId));
            if (i !== -1) {
                const [found] = arr.splice(i, 1);
                writeRecent(arr);
                return found;
            }
        }
        // 2) fallback: match by text + createdAt within window and same conversation
        if (m?.text) {
            const msgTime = new Date(m.createdAt ?? Date.now()).getTime();
            const i = arr.findIndex(r =>
                r.text === m.text &&
                Math.abs(r.createdAt - msgTime) < MATCH_WINDOW_MS &&
                // si conversationId está definida en el registro, debe coincidir
                (typeof r.conversationId === 'undefined' || String(r.conversationId) === String(m.conversationId))
            );
            if (i !== -1) {
                const [found] = arr.splice(i, 1);
                writeRecent(arr);
                return found;
            }
        }
        return null;
    }

    // ---------------- normalizadores ----------------
    function normalizeMessageInitial(m: any): any {
        if (!m) return m;
        const msg = { ...m };
        if ((typeof msg.senderId === 'undefined' || msg.senderId === null) && msg.sender && typeof msg.sender.id !== 'undefined') {
            msg.senderId = msg.sender.id;
        }
        if (msg.imageUrl && typeof msg.imageUrl === 'string') {
            if (msg.imageUrl.startsWith('/')) msg.imageUrl = `${API_BASE}${msg.imageUrl}`;
            else if (!msg.imageUrl.startsWith('http') && !msg.imageUrl.startsWith('blob:')) msg.imageUrl = `${API_BASE}/${msg.imageUrl}`;
        }
        return msg;
    }

    function normalizeMessage(m: any): any {
        if (!m) return m;
        const msg = { ...m };

        // convertir sender.id -> senderId si aplica
        if ((typeof msg.senderId === 'undefined' || msg.senderId === null) && msg.sender && typeof msg.sender.id !== 'undefined') {
            msg.senderId = msg.sender.id;
        }

        // normalizar imageUrl relativo
        if (msg.imageUrl && typeof msg.imageUrl === 'string') {
            if (msg.imageUrl.startsWith('/')) msg.imageUrl = `${API_BASE}${msg.imageUrl}`;
            else if (!msg.imageUrl.startsWith('http') && !msg.imageUrl.startsWith('blob:')) msg.imageUrl = `${API_BASE}/${msg.imageUrl}`;
        }

        // intentar inferir senderId si no viene (usando recent records)
        if ((typeof msg.senderId === 'undefined' || msg.senderId === null)) {
            const rec = consumeRecentMatch(msg);
            if (rec && typeof currentUserId !== 'undefined' && currentUserId !== null) {
                msg.senderId = Number(currentUserId);
                msg.tempId = msg.tempId ?? rec.tempId;
                msg._inferred = true; // marcar que fue inferido desde localStorage
            }
        }

        return msg;
    }

    // ---------------- merge server messages (no sobrescribir optimistas) ----------------
    useEffect(() => {
        const serverMessages = (activeConversation?.messages ?? []).map(m => normalizeMessage(m));
        setMessages(prev => {
            const byId = new Map<number, any>();
            const byTemp = new Map<string, any>();
            serverMessages.forEach((s: any) => { if (s.id) byId.set(s.id, s); if (s.tempId) byTemp.set(String(s.tempId), s); });

            const newPrev = prev.map(p => {
                const pTemp = (p as any).tempId ? String((p as any).tempId) : null;

                if (pTemp && byTemp.has(pTemp)) {
                    const serverMatch = byTemp.get(pTemp);
                    if (p.imageUrl && String(p.imageUrl).startsWith('blob:')) {
                        try { URL.revokeObjectURL(p.imageUrl); } catch {}
                    }
                    // conservar senderId del optimista si server no lo envía
                    return { ...(serverMatch || {}), senderId: serverMatch?.senderId ?? (p as any).senderId ?? serverMatch?.sender?.id };
                }

                if ((p as any).id && byId.has((p as any).id)) {
                    // si server tiene la versión persistida con id, pero no trae senderId,
                    // conservar el senderId previo (optimista) si existía
                    const serverMatch = byId.get((p as any).id);
                    return { ...(serverMatch || {}), senderId: serverMatch?.senderId ?? (p as any).senderId ?? serverMatch?.sender?.id };
                }

                return p;
            });

            const existsIdOrTemp = (m: any) => {
                if (m.tempId && newPrev.some(n => (n as any).tempId === m.tempId)) return true;
                if (m.id && newPrev.some(n => n.id === m.id)) return true;
                return false;
            };
            const toAdd = serverMessages.filter((s: any) => !existsIdOrTemp(s));
            return [...newPrev, ...toAdd];
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeConversation?.messages]);

    // findSenderName (sender.profile > participants > fallback 1-a-1)
    const findSenderName = (m: any): string => {
        if (m?.sender?.profile) {
            const name = m.sender.profile.name ?? '';
            const last = m.sender.profile.lastName ?? '';
            const full = `${name} ${last}`.trim();
            if (full) return full;
        }
        const senderId = m.senderId ?? m.sender?.id;
        if (senderId && activeConversation?.participants) {
            const p = (activeConversation.participants as SimpleUser[]).find(u => Number(u.id) === Number(senderId));
            if (p) {
                const name = p.profile?.name ?? '';
                const last = p.profile?.lastName ?? '';
                const full = `${name} ${last}`.trim();
                return full || p.email || `Usuario ${p.id}`;
            }
        }
        if (activeConversation?.participants && activeConversation.participants.length === 2 && typeof currentUserId !== 'undefined' && currentUserId !== null) {
            const other = (activeConversation.participants as SimpleUser[]).find(u => Number(u.id) !== Number(currentUserId));
            if (other) {
                const name = other.profile?.name ?? '';
                const last = other.profile?.lastName ?? '';
                const full = `${name} ${last}`.trim();
                return full || other.email || `Usuario ${other.id}`;
            }
        }
        return 'Desconocido';
    };

    // Reconciliación desde socket: reemplaza optimista por server msg con mismo tempId
    const pushIncomingMessage = useCallback((msg: any) => {
        const s = normalizeMessage(msg);
        setMessages(prev => {
            if (s.tempId) {
                const hasTemp = prev.some(m => (m as any).tempId === s.tempId);
                if (hasTemp) {
                    const opt = prev.find(m => (m as any).tempId === s.tempId);
                    if (opt && opt.imageUrl && String(opt.imageUrl).startsWith('blob:')) {
                        try { URL.revokeObjectURL(opt.imageUrl); } catch {}
                    }
                    const merged = { ...(s || {}), senderId: s.senderId ?? opt?.senderId ?? s?.sender?.id };
                    if (merged.tempId) removeRecentByTempId(String(merged.tempId));
                    return prev.map(m => ((m as any).tempId === s.tempId ? merged : m));
                }
            }
            if (s.id && prev.some(m => m.id === s.id)) return prev;
            return [...prev, s];
        });
    }, []);

    useEffect(() => {
        socketOn('newMessage', pushIncomingMessage);
        return () => socketOff('newMessage', pushIncomingMessage);
    }, [pushIncomingMessage]);

    // isOwnMessage robusto: compara Number para evitar mismatch string/number.
    const isOwnMessage = (m: ChatMessage | any) => {
        if (typeof currentUserId === 'undefined' || currentUserId === null) return false;
        // si ya marcamos _inferred true, considerarlo propio
        if (m?._inferred) return true;
        const sid = Number(m?.senderId ?? m?.sender?.id ?? (m as any).senderId ?? NaN);
        const me = Number(currentUserId);
        return !isNaN(sid) && sid === me;
    };

    // scroll to bottom
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, [messages.length, expanded]);

    // Envío: crear optimista con tempId y persistir registro
    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        const trimmed = text.trim();
        if (!trimmed && !file) return;
        if (!activeConversation) return;

        const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const createdAt = Date.now();
        const optimistic: any = {
            tempId,
            id: undefined,
            text: trimmed,
            imageUrl: file ? URL.createObjectURL(file) : undefined,
            createdAt: new Date(createdAt).toISOString(),
            senderId: currentUserId,
            conversationId: activeConversation.id,
            sending: true,
        };

        // Guardar registro persistente para poder inferir tras refresh
        pushRecentRecord({ tempId, text: trimmed, createdAt, conversationId: activeConversation.id });

        setMessages(prev => [...prev, optimistic]);

        if (fileInputRef.current) fileInputRef.current.value = '';
        setFile(null);
        setFilePreviewUrl(null);
        setText('');
        setSending(true);

        try {
            const fd = new FormData();
            fd.append('conversationId', String(activeConversation.id));
            fd.append('text', trimmed);
            if (file) fd.append('image', file);
            fd.append('tempId', tempId);

            await postMessage(fd);
            // NOTA: el servidor idealmente emite 'newMessage' con tempId; si no,
            // la persistencia en localStorage permitirá inferir ownership al refrescar.
        } catch (err) {
            console.error('Send error', err);
            setMessages(prev => prev.map(m => ((m as any).tempId === tempId ? { ...(m as any), sending: false, failed: true } : m)));
        } finally {
            setSending(false);
        }
    };

    // File handling: preview before send
    const onAttachClick = () => fileInputRef.current?.click();
    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0] ?? null;
        if (f) {
            if (filePreviewUrl) {
                try { URL.revokeObjectURL(filePreviewUrl); } catch {}
            }
            const url = URL.createObjectURL(f);
            setFile(f);
            setFilePreviewUrl(url);
        } else {
            if (filePreviewUrl) {
                try { URL.revokeObjectURL(filePreviewUrl); } catch {}
            }
            setFile(null);
            setFilePreviewUrl(null);
        }
    };

    const removePreview = () => {
        if (filePreviewUrl) {
            try { URL.revokeObjectURL(filePreviewUrl); } catch {}
        }
        setFile(null);
        setFilePreviewUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // visibleMessages: si no expanded mostramos sólo los últimos COLLAPSED_VISIBLE
    const visibleMessages = expanded ? messages : messages.slice(-COLLAPSED_VISIBLE);
    const hiddenCount = Math.max(0, messages.length - visibleMessages.length);

    return (
        <section style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <header style={{ padding: 12, borderBottom: '1px solid #eee' }}>
                <strong>{activeConversation ? `Conversación #${activeConversation.id}` : 'Sin conversación'}</strong>
            </header>

            <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {hiddenCount > 0 && (
                    <div style={{ textAlign: 'center', margin: '8px 0' }}>
                        <button
                            onClick={() => setExpanded(prev => !prev)}
                            style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #ddd', background: '#fff' }}
                        >
                            {expanded ? 'Ocultar mensajes anteriores' : `Mostrar ${hiddenCount} mensajes anteriores`}
                        </button>
                    </div>
                )}

                {visibleMessages.length === 0 ? (
                    <div style={{ color: '#666' }}>No hay mensajes</div>
                ) : (
                    visibleMessages.map(m => {
                        const own = isOwnMessage(m);
                        const senderDisplay = own ? 'Tú' : findSenderName(m);
                        return (
                            <div key={(m as any).tempId ?? m.id} style={{ width: '100%', display: 'flex', justifyContent: own ? 'flex-end' : 'flex-start' }}>
                                <ChatBubble
                                    text={m.text}
                                    imageUrl={m.imageUrl ?? null}
                                    senderDisplay={senderDisplay}
                                    own={own}
                                />
                            </div>
                        );
                    })
                )}
                <div ref={bottomRef} />
            </div>

            {filePreviewUrl ? (
                <div style={{ padding: 8, borderTop: '1px solid #eee', display: 'flex', gap: 8, alignItems: 'center' }}>
                    <div style={{ width: 120, height: 80, overflow: 'hidden', borderRadius: 8 }}>
                        <img src={filePreviewUrl} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13 }}>{file?.name ?? 'Imagen seleccionada'}</div>
                        <div style={{ fontSize: 12, color: '#666' }}>Previsualización</div>
                    </div>
                    <button type="button" onClick={removePreview} style={{ padding: '6px 10px' }}>Eliminar</button>
                </div>
            ) : null}

            <form onSubmit={handleSubmit} style={{ padding: 12, borderTop: '1px solid #eee', display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={activeConversation ? 'Escribe un mensaje...' : 'Selecciona una conversación'}
                    disabled={!activeConversation}
                    style={{ flex: 1, padding: 8 }}
                />

                <input ref={fileInputRef} type="file" accept="image/*" onChange={onFileChange} style={{ display: 'none' }} />
                <button type="button" onClick={onAttachClick} style={{ padding: '8px 10px' }} aria-label="Adjuntar imagen">📎</button>

                <button type="submit" disabled={!activeConversation || sending} style={{ padding: '8px 12px' }}>
                    {sending ? 'Enviando...' : 'Enviar'}
                </button>
            </form>
        </section>
    );
};

export default ChatWindow;