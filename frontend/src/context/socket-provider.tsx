import { createContext, useContext, type ReactNode } from 'react';
import { useSocket } from '../hooks/useSocket';
import type { Socket } from 'socket.io-client';

export interface SocketContextType {
    socket: Socket | null;
    isConnected: boolean;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

// Exportar contexto para que pueda ser usado en el hook
export { SocketContext };

// Componente Provider
function SocketProviderComponent({ children }: { children: ReactNode }) {
    const { socket, isConnected } = useSocket();

    return (
        <SocketContext.Provider value={{ socket, isConnected }}>
            {children}
        </SocketContext.Provider>
    );
}

// Exportar con el nombre correcto
export { SocketProviderComponent as SocketProvider };

// Hook para usar el contexto
// eslint-disable-next-line react-refresh/only-export-components
export function useSocketContext(): SocketContextType {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('useSocketContext must be used within SocketProvider');
    }
    return context;
}