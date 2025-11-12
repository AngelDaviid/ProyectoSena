import React, { useState } from 'react';
import type { Conversation, Message } from '../../types/chat';

type Props = {
    activeConversation: Conversation | null;
    messages: Array<Message & { sending?: boolean; tempId?: string }>;
    onSend: (text: string, imageUrl?: string | File) => void;
};

const ChatWindow: React.FC<Props> = ({ activeConversation, messages, onSend }) => {
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        const trimmed = text.trim();
        if (!trimmed) return;
        setSending(true);
        try {
            await Promise.resolve(onSend(trimmed)); // onSend puede ser sync o async
        } catch (err) {
            console.error('Send error', err);
        } finally {
            setSending(false);
            setText('');
        }
    };

    return (
        <section style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <header style={{ padding: 12, borderBottom: '1px solid #eee' }}>
                <strong>{activeConversation ? `Conversación #${activeConversation.id}` : 'Sin conversación'}</strong>
            </header>

            <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
                {messages.length === 0 ? (
                    <div style={{ color: '#666' }}>No hay mensajes</div>
                ) : (
                    messages.map((m) => (
                        <div key={(m as any).tempId ?? m.id} style={{ marginBottom: 8 }}>
                            <div style={{ fontSize: 12, color: '#999' }}>{m.senderId}</div>
                            <div style={{ background: m.sending ? '#e6ffe6' : '#f4f4f4', padding: 8, borderRadius: 6 }}>
                                {m.text}
                                {m.imageUrl ? (
                                    <div>
                                        <img src={String(m.imageUrl)} alt="img" style={{ maxWidth: 200, display: 'block', marginTop: 6 }} />
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    ))
                )}
            </div>

            <form onSubmit={handleSubmit} style={{ padding: 12, borderTop: '1px solid #eee', display: 'flex', gap: 8 }}>
                <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={activeConversation ? 'Escribe un mensaje...' : 'Selecciona una conversación'}
                    disabled={!activeConversation}
                    style={{ flex: 1, padding: 8 }}
                />
                <button type="submit" disabled={!activeConversation || sending} style={{ padding: '8px 12px' }}>
                    {sending ? 'Enviando...' : 'Enviar'}
                </button>
            </form>
        </section>
    );
};

export default ChatWindow;