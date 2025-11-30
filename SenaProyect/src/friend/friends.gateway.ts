import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { FriendRequest } from './entities/firend-request.entity';
import { Conversation } from '../chat/entities/conversations.entity';

@Injectable()
@WebSocketGateway({
  namespace: '/ws',
  cors: {
    origin: process.env. FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
})
export class FriendsGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(FriendsGateway.name);

  // Map userId -> Set<socketId> (múltiples conexiones por usuario)
  private clients = new Map<number, Set<string>>();

  // Rate limit por IP
  private connectionCounts = new Map<string, number>();
  private readonly MAX_CONN_PER_IP = 20;

  afterInit(server: Server) {
    this.logger. log('FriendsGateway initialized (namespace /ws)');
  }

  handleConnection(client: Socket) {
    const ip = this.getClientIp(client);
    const count = (this.connectionCounts. get(ip) || 0) + 1;
    this. connectionCounts.set(ip, count);

    (client as any).__remoteIp = ip;

    if (count > this.MAX_CONN_PER_IP) {
      this.logger.warn(`Too many connections from ${ip} (${count}), disconnecting ${client. id}`);
      client.emit('error', { message: 'too_many_connections' });
      client.disconnect(true);
      return;
    }

    this.logger.log(`Client connected: ${client.id} (ip=${ip})`);

    // Escuchar evento 'register' para asociar userId
    client.on('register', (payload: { userId: number }) => {
      this.handleRegister(client, payload);
    });
  }

  handleDisconnect(client: Socket) {
    const ip = (client as any).__remoteIp;
    if (ip) {
      const c = (this. connectionCounts.get(ip) || 1) - 1;
      if (c <= 0) this.connectionCounts.delete(ip);
      else this. connectionCounts.set(ip, c);
    }

    // Eliminar de la lista de clientes
    this.unregisterClient(client);

    this.logger.log(`Client disconnected: ${client.id}`);
  }

  private handleRegister(client: Socket, payload: { userId: number }) {
    const { userId } = payload;

    if (!userId || typeof userId !== 'number') {
      this.logger.warn(`Invalid userId in register: ${userId} from client ${client.id}`);
      return;
    }

    // TODO: Opcionalmente verificar que el userId existe en la base de datos

    const set = this.clients.get(userId) || new Set<string>();
    set.add(client.id);
    this.clients.set(userId, set);

    (client as any).__userId = userId;
    this.logger.debug(`Client ${client.id} registered as user ${userId}`);
  }

  private unregisterClient(client: Socket) {
    const userId = (client as any).__userId;
    if (! userId) return;

    const set = this.clients.get(userId);
    if (set) {
      set.delete(client. id);
      if (set. size === 0) {
        this.clients.delete(userId);
      }
    }
  }

  private getClientIp(client: Socket): string {
    return (
      (client. handshake?. address as string) ||
      (client.conn?.remoteAddress as string) ||
      'unknown'
    );
  }

  /**
   * Helper para emitir eventos a un usuario específico
   */
  private emitToUser(userId: number, event: string, payload: any) {
    const sockets = this.clients.get(userId);
    if (!sockets || sockets.size === 0) {
      this.logger.debug(`No active sockets for user ${userId}`);
      return;
    }

    sockets.forEach(socketId => {
      this.server.to(socketId).emit(event, payload);
    });

    this.logger.debug(`Emitted '${event}' to user ${userId} (${sockets.size} connection(s))`);
  }

  /**
   * Notificaciones de solicitudes de amistad
   */
  notifyRequestSent(request: FriendRequest) {
    const receiverId = request.receiver?.id;
    if (! receiverId) {
      this.logger.warn('notifyRequestSent: receiver ID missing');
      return;
    }
    this.emitToUser(receiverId, 'friendRequestSent', request);
  }

  notifyRequestAccepted(request: FriendRequest, conversation?: Conversation) {
    const senderId = request.sender?.id;
    const receiverId = request. receiver?.id;
    const payload = { request, conversation };

    if (senderId) this.emitToUser(senderId, 'friendRequestAccepted', payload);
    if (receiverId) this.emitToUser(receiverId, 'friendRequestAccepted', payload);
  }

  notifyRequestRejected(request: FriendRequest) {
    const senderId = request.sender?.id;
    if (senderId) {
      this.emitToUser(senderId, 'friendRequestRejected', request);
    }
  }

  notifyRequestDeleted(request: FriendRequest) {
    const senderId = request.sender?.id;
    const receiverId = request.receiver?.id;

    if (senderId) this. emitToUser(senderId, 'friendRequestDeleted', request);
    if (receiverId) this.emitToUser(receiverId, 'friendRequestDeleted', request);
  }

  notifyUserBlocked(blockerId: number, blockedId: number) {
    this.emitToUser(blockedId, 'userBlocked', { blockerId, blockedId });
    this.emitToUser(blockerId, 'userBlockedConfirmation', { blockerId, blockedId });
  }
}
