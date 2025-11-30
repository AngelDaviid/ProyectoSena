import React from 'react';
import type { Message } from '../../types/chat';

type Props = {
    message: Message & { sending?: boolean; tempId?: string };
    senderName: string;
};

const MessageItem: React.FC<Props> = ({ message, senderName }) => {
    return (
        <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 12, color: '#999' }}>{senderName}</div>

            <div
                style={{
                    background: message.sending ? '#e6ffe6' : '#f4f4f4',
                    padding: 8,
                    borderRadius: 6
                }}
            >
                <div style={{ whiteSpace: 'pre-wrap' }}>{message.text}</div>

                {message.imageUrl && (
                    <div>
                        <img
                            src={String(message.imageUrl)}
                            alt="img"
                            style={{ maxWidth: 200, display: 'block', marginTop: 6 }}
                        />
                    </div>
                )}

                <div style={{ fontSize: 11, color: '#777', marginTop: 6 }}>
                    {message.createdAt ? new Date(message.createdAt).toLocaleString() : ''}
                    {message.sending && (
                        <span style={{ color: '#2d7a2d', marginLeft: 8 }}> · Enviando...</span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MessageItem;
