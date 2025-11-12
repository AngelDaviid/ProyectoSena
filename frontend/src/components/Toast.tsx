import { useEffect } from 'react';

export default function Toast({ type='info', message, onClose }: { type?: 'info'|'success'|'error', message: string, onClose: ()=>void }) {
    useEffect(() => {
        const t = setTimeout(() => onClose(), 3500);
        return () => clearTimeout(t);
    }, [onClose]);

    const bg = type === 'success' ? 'bg-green-600' : (type === 'error' ? 'bg-red-600' : 'bg-gray-800');
    return (
        <div className={`fixed right-6 bottom-6 z-50 ${bg} text-white px-4 py-2 rounded shadow`} role="status" aria-live="polite">
            {message}
            <button onClick={onClose} className="ml-3 opacity-80">✕</button>
        </div>
    );
}