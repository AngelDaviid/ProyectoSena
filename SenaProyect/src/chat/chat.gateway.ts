import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MessagesService } from "./services/message.service";

@WebSocketGateway({
  cors: {
    origin: 'http://localhost:5173',
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private messagesService: MessagesService) {}

  handleConnection(client: Socket) {
    console.log(`[WS] client connected: ${client.id}`);

    if (client.handshake?.auth?.token) {
      console.log(`[WS] client ${client.id} provided token (length=${String(client.handshake.auth.token).length})`);
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`[WS] client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinConversation')
  async handleJoin(
    @MessageBody('conversationId') conversationId: string,
    @ConnectedSocket() client: Socket,
  ) {
    try {
<<<<<<< Updated upstream
      console.log(`[WS] joinConversation from ${client.id} -> conversation ${conversationId}`);
      client.join(conversationId);
      client.to(conversationId).emit('userJoined', { userId: client.id });
      client.emit('joinedConversation', { conversationId, ok: true });
=======
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
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
   * Evento "typing":
   * - El cliente emite: socket.emit('typing', { conversationId, senderId, typing: true|false })
   * - El servidor retransmite a los demás miembros de la conversación:
   *     client.to(conversationId).emit('userTyping', { conversationId, userId: senderId, typing })
   *
   * Nota: se recomienda en cliente debouncing/throttling para no spamear.
=======
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
>>>>>>> Stashed changes
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
