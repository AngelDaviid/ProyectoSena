import { useContext } from 'react';
import { SocketContext, type SocketContextType } from '../context/socket-provider';

export function useSocketContext(): SocketContextType {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('useSocketContext must be used within SocketProvider');
    }
    return context;
}