import React, {useState} from 'react';
import type {Conversation, Message} from '../../types/chat';
import MessageItem from './message-item';

type Props = {
    activeConversation: Conversation | null;
    messages: Array<Message & { sending?: boolean; tempId?: string }>;
    onSend: (text: string, imageUrl?: string | File) => void;
    currentUserId?: number | null;
    onLoadMore?: () => Promise<number>;
};

const ChatWindow: React.FC<Props> = ({
                                         activeConversation,
                                         messages,
                                         onSend,
                                         currentUserId,
                                         onLoadMore
                                     }) => {
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);

    const getSenderDisplayName = (senderId?: number | string) => {
        const sid = Number(senderId);

        if (activeConversation?.participants && !Number.isNaN(sid)) {
            const p = activeConversation.participants.find((pp) => pp.id === sid);
            if (p) {
                const name = `${p.profile?.name ?? ''} ${p.profile?.lastName ?? ''}`.trim();
                if (name) return name;
                return p.email ?? `#${p.id}`;
            }
        }

        if (!Number.isNaN(sid) && currentUserId === sid) return 'Tú';
        return 'Usuario';
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        const trimmed = text.trim();
        if (!trimmed) return;

        setSending(true);
        try {
            await Promise.resolve(onSend(trimmed));
        } catch (err) {
            console.error('Send error', err);
        } finally {
            setSending(false);
            setText('');
        }
    };

    const handleLoadMoreClick = async () => {
        if (!onLoadMore) return;
        try {
            await onLoadMore();
        } catch (err) {
            console.error('Error cargando más mensajes', err);
        }
    };

    return (
        <section style={{flex: 1, display: 'flex', flexDirection: 'column'}}>
            <header style={{padding: 12, borderBottom: '1px solid #eee'}}>
                <strong>
                    {activeConversation
                        ? `Conversación #${activeConversation.id}`
                        : 'Sin conversación'}
                </strong>
            </header>

            {onLoadMore && (
                <div style={{padding: 8, borderBottom: '1px solid #eee'}}>
                    <button onClick={handleLoadMoreClick} style={{padding: '6px 10px', fontSize: 13}}>
                        Cargar más mensajes
                    </button>
                </div>
            )}

            <div style={{flex: 1, overflowY: 'auto', padding: 12}}>
                {messages.length === 0 ? (
                    <div style={{color: '#666'}}>No hay mensajes</div>
                ) : (
                    messages.map((m) => (
                        <MessageItem
                            key={String(m.tempId ?? m.id)}
                            message={m}
                            senderName={getSenderDisplayName((m as any).senderId)}
                        />
                    ))
                )}
            </div>

            <form
                onSubmit={handleSubmit}
                style={{padding: 12, borderTop: '1px solid #eee', display: 'flex', gap: 8}}
            >
                <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={
                        activeConversation
                            ? 'Escribe un mensaje...'
                            : 'Selecciona una conversación'
                    }
                    disabled={!activeConversation}
                    style={{flex: 1, padding: 8}}
                />
                <button type="submit" disabled={!activeConversation || sending} style={{padding: '8px 12px'}}>
                    {sending ? 'Enviando...' : 'Enviar'}
                </button>
            </form>
        </section>
    );
};

export default ChatWindow;
