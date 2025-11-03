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

export interface Message {
    id: number;
    text: string;
    imageUrl?: string | null;
    createdAt?: string;
    senderId?: number;
    conversationId?: number;
}

export interface Conversation {
    id: number;
    participants?: SimpleUser[];
    messages?: Message[];
    createdAt?: string;
    updatedAt?: string;
}