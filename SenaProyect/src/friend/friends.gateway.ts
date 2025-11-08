import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable } from '@nestjs/common';
import { FriendRequest } from './entities/firend-request.entity';
import { Conversation } from '../chat/entities/conversations.entity';

@Injectable()
@WebSocketGateway({ cors: true, namespace: '/ws' })
export class FriendsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Map userId -> socketId[] (soporta múltiples conexiones por usuario)
  private clients = new Map<number, Set<string>>();

  handleConnection(client: Socket) {
    // espera que el cliente haga 'register' con userId después de conectar
    client.on('register', (payload: { userId: number }) => {
      const { userId } = payload;
      if (!userId) return;
      const set = this.clients.get(userId) ?? new Set<string>();
      set.add(client.id);
      this.clients.set(userId, set);
    });
  }

  handleDisconnect(client: Socket) {
    // eliminar client.id de todos los sets
    for (const [userId, set] of this.clients.entries()) {
      if (set.has(client.id)) {
        set.delete(client.id);
        if (set.size === 0) this.clients.delete(userId);
        else this.clients.set(userId, set);
        break;
      }
    }
  }

  // Helpers para emitir a un usuario
  private emitToUser(userId: number, event: string, payload: any) {
    const sockets = this.clients.get(userId);
    if (!sockets) return;
    sockets.forEach(socketId => {
      this.server.to(socketId).emit(event, payload);
    });
  }

  // Notificaciones
  notifyRequestSent(request: FriendRequest) {
    const receiverId = request.receiver?.id;
    if (receiverId) {
      this.emitToUser(receiverId, 'friendRequestSent', request);
    }
  }

  notifyRequestAccepted(request: FriendRequest, conversation?: Conversation) {
    const senderId = request.sender?.id;
    const receiverId = request.receiver?.id;
    const payload = { request, conversation };
    if (senderId) this.emitToUser(senderId, 'friendRequestAccepted', payload);
    if (receiverId) this.emitToUser(receiverId, 'friendRequestAccepted', payload);
  }

  notifyRequestRejected(request: FriendRequest) {
    const senderId = request.sender?.id;
    if (senderId) this.emitToUser(senderId, 'friendRequestRejected', request);
  }

  notifyRequestDeleted(request: FriendRequest) {
    // Notificar al otro participante si estaba pendiente
    const senderId = request.sender?.id;
    const receiverId = request.receiver?.id;
    if (senderId) this.emitToUser(senderId, 'friendRequestDeleted', request);
    if (receiverId) this.emitToUser(receiverId, 'friendRequestDeleted', request);
  }

  notifyUserBlocked(blockerId: number, blockedId: number) {
    // Notificar al bloqueado (si está conectado) que fue bloqueado
    this.emitToUser(blockedId, 'userBlocked', { blockerId, blockedId });
    // Notificar al que bloqueó (confirmación)
    this.emitToUser(blockerId, 'userBlockedConfirmation', { blockerId, blockedId });
  }
}
