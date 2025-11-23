import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MessagesService } from "./services/message.service";

@WebSocketGateway({
  namespace: '/ws',
  cors: {
    origin: 'http://localhost:5173',
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
  @WebSocketServer()
  server: Server;

  // Simple rate limit por IP (memoria). Para producción usar Redis o store compartida.
  private connectionCounts = new Map<string, number>();
  private readonly MAX_CONN_PER_IP = 20;

  // Evitar joins en ráfaga: socketId -> (room -> lastTimestamp)
  private lastJoinAt = new Map<string, Map<string, number>>();
  private readonly JOIN_COOLDOWN_MS = 300; // configurable (ms)

  constructor(private messagesService: MessagesService) {}

  // OnGatewayInit hook
  afterInit(server: Server) {
    console.log('[WS] gateway initialized (namespace /ws)');
  }

  handleConnection(client: Socket) {
    const ip =
      (client.handshake && (client.handshake.address as string)) ||
      (client.conn && (client.conn.remoteAddress as string)) ||
      'unknown';
    const count = (this.connectionCounts.get(ip) || 0) + 1;
    this.connectionCounts.set(ip, count);

    // Guarda ip en socket para limpiar en disconnect
    (client as any).__remoteIp = ip;

    if (count > this.MAX_CONN_PER_IP) {
      console.warn(`[WS] Too many connections from ${ip} (${count}), disconnecting ${client.id}`);
      client.emit('error', 'too_many_connections');
      client.disconnect(true);
      return;
    }

    console.log(`[WS] client connected: ${client.id} (ip=${ip})`);

    if (client.handshake?.auth?.token) {
      console.log(`[WS] client ${client.id} provided token (length=${String(client.handshake.auth.token).length})`);
    }
  }

  handleDisconnect(client: Socket) {
    const ip = (client as any).__remoteIp;
    if (ip) {
      const c = (this.connectionCounts.get(ip) || 1) - 1;
      if (c <= 0) this.connectionCounts.delete(ip);
      else this.connectionCounts.set(ip, c);
    }

    // limpiar lastJoinAt para este socket
    this.lastJoinAt.delete(client.id);

    console.log(`[WS] client disconnected: ${client.id}`);
  }

  /**
   * joinConversation protegido contra joins redundantes y ráfagas
   */
  @SubscribeMessage('joinConversation')
  async handleJoin(
    @MessageBody('conversationId') conversationId: string,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const room = String(conversationId);
      // 1) Evitar joins si ya está en la sala
      if (client.rooms && client.rooms.has(room)) {
        client.emit('joinedConversation', { conversationId: room, ok: true, note: 'already_joined' });
        return;
      }

      // 2) Rate-limit simple por socket+room (protege de bursts)
      const socketId = client.id;
      const perSocket = this.lastJoinAt.get(socketId) ?? new Map<string, number>();
      const now = Date.now();
      const last = perSocket.get(room) ?? 0;
      if (now - last < this.JOIN_COOLDOWN_MS) {
        client.emit('error', { event: 'joinConversation', message: 'too_many_joins' });
        return;
      }
      perSocket.set(room, now);
      this.lastJoinAt.set(socketId, perSocket);

      // 3) Realizar el join
      client.join(room);
      client.to(room).emit('userJoined', { userSocketId: client.id });
      client.emit('joinedConversation', { conversationId: room, ok: true });
      console.log(`[WS] client ${client.id} joined conversation ${room}`);
    } catch (err) {
      console.error('[WS] joinConversation error', err);
      client.emit('error', { event: 'joinConversation', message: 'No se pudo unir a la conversación' });
    }
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @MessageBody() data: { conversationId: string; senderId: string; text: string; imageUrl?: string; tempId?: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      console.log(`[WS] sendMessage -> conv ${data.conversationId} sender ${data.senderId} tempId=${data.tempId ?? 'none'}`);
      const message = await this.messagesService.create(
        +data.conversationId,
        +data.senderId,
        data.text,
        data.imageUrl,
      );

      // Normalizar payload para envío por websocket (evitar relaciones circulares)
      const payload = {
        id: message.id,
        text: message.text,
        imageUrl: message.imageUrl ?? null,
        createdAt: (message.createdAt as Date)?.toISOString ? (message.createdAt as Date).toISOString() : message.createdAt,
        senderId: (message as any).sender?.id ?? +data.senderId,
        conversationId: (message as any).conversation?.id ?? +data.conversationId,
        tempId: data.tempId ?? undefined,
      };

      console.log('[WS] emitting newMessage', payload);
      this.server.to(data.conversationId).emit('newMessage', payload);

      return { status: 'ok', message: payload };
    } catch (err) {
      console.error('[WS] sendMessage error', err);
      client.emit('messageError', { message: 'Error al enviar el mensaje' });
      return { status: 'error', error: String(err) };
    }
  }

  /**
   * messageSeen: client notifica que uno o varios mensajes fueron vistos por userId
   * data: { conversationId, messageIds: number[], userId }
   */
  @SubscribeMessage('messageSeen')
  handleMessageSeen(
    @MessageBody() data: { conversationId: string; messageIds: number[]; userId: number },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      console.log('[WS] messageSeen', data);
      // Reenviar la información a la room, para que otros clientes la actualicen en UI
      this.server.to(String(data.conversationId)).emit('messageSeen', {
        conversationId: data.conversationId,
        messageIds: data.messageIds,
        userId: data.userId,
        timestamp: new Date().toISOString(),
      });
      // Opcional: aquí podrías persistir el "seen" en BD si añades campos a Message
    } catch (err) {
      console.error('[WS] messageSeen error', err);
      client.emit('error', { event: 'messageSeen', message: 'No se pudo procesar seen' });
    }
  }

  /**
   * Evento "typing": reenviar a la room sin spamear (cliente debe debounciar)
   */
  @SubscribeMessage('typing')
  handleTyping(
    @MessageBody() data: { conversationId: string; senderId: string; typing: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const { conversationId, senderId, typing } = data;
      client.to(conversationId).emit('userTyping', {
        conversationId,
        userId: senderId,
        typing,
        timestamp: new Date().toISOString(),
      });
      client.emit('typingAck', { conversationId, ok: true });
    } catch (err) {
      console.error('[WS] typing error', err);
      client.emit('error', { event: 'typing', message: 'No se pudo notificar typing' });
    }
  }
}
