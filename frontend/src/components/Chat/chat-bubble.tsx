import React from 'react';

type Props = {
    text?: string | null;
    imageUrl?: string | null;
    // ahora senderDisplay es opcional y solo muestra el nombre arriba de la burbuja
    senderDisplay?: string | null;
    own?: boolean;
};

const ChatBubble: React.FC<Props> = ({ text, imageUrl = null, senderDisplay = null, own = false }) => {
    const metaStyle: React.CSSProperties = {
        fontSize: 12,
        color: '#555',
        marginBottom: 4,
        textAlign: own ? 'right' : 'left',
        userSelect: 'none',
    };

    const bubbleStyle: React.CSSProperties = {
        display: 'inline-block',
        minWidth: 120,
        maxWidth: '72%',
        background: own ? '#DCF8C6' : '#ffffff',
        color: '#000',
        padding: '8px 12px',
        borderRadius: own ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
        boxShadow: '0 1px 0 rgba(0,0,0,0.06)',
        wordBreak: 'break-word',
        overflowWrap: 'break-word',
        whiteSpace: 'pre-wrap',
        lineHeight: 1.3,
    };

    const imgStyle: React.CSSProperties = {
        maxWidth: '100%',
        display: 'block',
        marginTop: 6,
        borderRadius: 8,
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: own ? 'flex-end' : 'flex-start' }}>
            {senderDisplay ? <div style={metaStyle}>{senderDisplay}</div> : null}
            <div style={bubbleStyle}>
                {text ? <div>{text}</div> : null}
                {imageUrl ? (
                    <div>
                        <img src={imageUrl} alt="img" style={imgStyle} />
                    </div>
                ) : null}
            </div>
        </div>
    );
};

export default ChatBubble;