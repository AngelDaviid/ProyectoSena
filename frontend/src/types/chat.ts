export type Role = 'desarrollador' | 'instructor' | 'aprendiz';

export interface SimpleProfile {
    name?: string;
    lastName?: string;
    avatar?: string;
}

export interface SimpleUser {
    id: number;
    email?: string;
    profile?: SimpleProfile;
    role?: Role;
}

// Message type basado en tu entidad de backend
export interface Message {
    id?: number; // Opcional porque mensajes optimistas no tienen id aún
    text: string;
    imageUrl?: string | null;
    createdAt?: string;
    senderId?: number;
    conversationId?: number;
    // Propiedades adicionales para el frontend
    sending?: boolean;
    tempId?: string;
    seenBy?: number[];
}

export interface Conversation {
    id: number;
    participants?: SimpleUser[];
    messages?: Message[];
    createdAt?: string;
    updatedAt?: string;
}