import api from './api';
import type { User } from '../types/user.type.ts'

export async function searchUsers(q: string) {
    const res = await api.get<User[]>('/friends/search', { params: { q } });
    return res.data;
}

export async function sendFriendRequest(receiverId: number) {
    const res = await api.post('/friends/requests', { receiverId });
    return res.data;
}

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