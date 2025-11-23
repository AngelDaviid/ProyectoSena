import React, { useState, useRef, useEffect } from 'react';
import type { Conversation, Message } from '../../types/chat';
import ChatBubble from './chat-bubble';

export type MsgWithMeta = Omit<Message, 'id'> & {
    id?: number;
    sending?: boolean;
    tempId?: string;
    seenBy?: number[];
    _inferred?: boolean;
};

type Props = {
    activeConversation: Conversation | null;
    messages: MsgWithMeta[];
    onSend: (text: string, image?: string | File) => void;
    currentUserId?: number | null;
    onLoadMore?: () => Promise<number>;
};

const COLLAPSED_VISIBLE = 8;

const ChatWindow: React.FC<Props> = ({ activeConversation, messages, onSend, currentUserId, onLoadMore }) => {
    const [text, setText] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
    const [sending, setSending] = useState(false);
    const [expanded, setExpanded] = useState(false);

    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const bottomRef = useRef<HTMLDivElement | null>(null);

    // scroll to bottom when messages change
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, [messages.length, expanded]);

    const visibleMessages = expanded ? messages : messages.slice(-COLLAPSED_VISIBLE);
    const hiddenCount = Math.max(0, messages.length - visibleMessages.length);

    // send wrapper (calls parent onSend)
    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        const trimmed = text.trim();
        if (!trimmed && !file) return;
        if (!onSend) return;

        setSending(true);
        try {
            await Promise.resolve(onSend(trimmed, file ?? undefined));
            // optimistic UI is handled by parent (ChatPage), so we only clear inputs here
            setText('');
            setFile(null);
            if (filePreviewUrl) {
                try { URL.revokeObjectURL(filePreviewUrl); } catch {}
                setFilePreviewUrl(null);
            }
            if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (err) {
            console.error('[ChatWindow] send error', err);
        } finally {
            setSending(false);
        }
    };

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

    // helper to determine ownership
    const isOwnMessage = (m: MsgWithMeta) => {
        if (typeof currentUserId === 'undefined' || currentUserId === null) return false;
        if (m?._inferred) return true;
        const sid = Number(m?.senderId ?? (m as any).sender?.id ?? NaN);
        const me = Number(currentUserId);
        return !isNaN(sid) && sid === me;
    };

    return (
        <section style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <header style={{ padding: 12, borderBottom: '1px solid #eee' }}>
                <strong>{activeConversation ? `Conversación #${activeConversation.id}` : 'Sin conversación'}</strong>
            </header>

            <div style={{ padding: 8, borderBottom: '1px solid #eee' }}>
                {onLoadMore && (
                    <button
                        onClick={() => { onLoadMore().catch(e => console.error('[ChatWindow] load more', e)); }}
                        style={{ padding: '6px 10px', fontSize: 13 }}
                    >
                        Cargar más mensajes
                    </button>
                )}
            </div>

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
                    visibleMessages.map((m) => {
                        const own = isOwnMessage(m);
                        const senderDisplay = own ? 'Tú' : (m as any).sender?.profile ? `${(m as any).sender.profile.name ?? ''} ${(m as any).sender.profile.lastName ?? ''}`.trim() || (m as any).sender?.email : 'Usuario';
                        return (
                            <div key={(m as any).tempId ?? m.id} style={{ width: '100%', display: 'flex', justifyContent: own ? 'flex-end' : 'flex-start' }}>
                                <ChatBubble
                                    text={m.text}
                                    imageUrl={m.imageUrl ?? null}
                                    senderDisplay={senderDisplay}
                                    own={own}
                                    seenBy={m.seenBy ?? []}
                                    createdAt={m.createdAt ?? null}
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