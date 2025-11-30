import api from './api';
import type { User } from '../types/user.type.ts'

export interface UserWithStatus extends User {
    friendStatus?: 'friend' | 'request_sent' | 'request_received' | 'none';
}

export type FriendRequestDTO = {
    id: number;
    sender?: {
        id?: number;
        email?: string;
        profile?: {
            name?: string;
            lastName?: string;
            avatar?: string | null;
        };
    } | null;
    [key: string]: any;
};

export async function searchUsers(q: string) {
    const res = await api.get<UserWithStatus[]>('/friends/search', { params: { q } });
    return res.data;
}

export async function sendFriendRequest(receiverId: number) {
    const res = await api.post('/friends/requests', { receiverId });
    return res.data;
}

// ... resto sin cambios
export async function getIncomingRequests() {
    const res = await api.get('/friends/requests/incoming');
    return res.data;
}

export async function getOutgoingRequests() {
    const res = await api.get('/friends/requests/outgoing');
    return res.data;
}

export async function respondRequest(requestId: number, accept: boolean) {
    const res = await api.put(`/friends/requests/${requestId}/respond`, { accept });
    return res.data;
}

export async function deleteRequest(requestId: number) {
    const res = await api.delete(`/friends/requests/${requestId}`);
    return res.data;
}

export async function blockUser(targetId: number) {
    const res = await api.post(`/friends/block/${targetId}`);
    return res.data;
}

export async function unblockUser(targetId: number) {
    const res = await api.post(`/friends/unblock/${targetId}`);
    return res.data;
}

export async function getFriends() {
    const res = await api.get('/friends');
    return res.data;
}

export const getBlockedUsers = async () => {
    const res = await api.get('/friends/blocked');
    return res.data;
};
