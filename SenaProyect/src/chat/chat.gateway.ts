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
    origin: '*',
    methods: ['GET', 'POST'],
  },
  transports: ['websocket', 'polling'],
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
      console.log(`[WS] joinConversation from ${client.id} -> conversation ${conversationId}`);
      client.join(conversationId);
      client.to(conversationId).emit('userJoined', { userId: client.id });
      client.emit('joinedConversation', { conversationId, ok: true });
    } catch (err) {
      console.error('[WS] joinConversation error', err);
      client.emit('error', { event: 'joinConversation', message: 'No se pudo unir a la conversación' });
    }
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @MessageBody() data: { conversationId: string; senderId: string; text: string; imageUrl?: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      console.log(`[WS] sendMessage -> conv ${data.conversationId} sender ${data.senderId}`);
      const message = await this.messagesService.create(
        +data.conversationId,
        +data.senderId,
        data.text,
        data.imageUrl,
      );

      this.server.to(data.conversationId).emit('newMessage', message);

      return { status: 'ok', message };
    } catch (err) {
      console.error('[WS] sendMessage error', err);
      client.emit('messageError', { message: 'Error al enviar el mensaje' });
      return { status: 'error', error: String(err) };
    }
  }

  /**
   * Evento "typing":
   * - El cliente emite: socket.emit('typing', { conversationId, senderId, typing: true|false })
   * - El servidor retransmite a los demás miembros de la conversación:
   *     client.to(conversationId).emit('userTyping', { conversationId, userId: senderId, typing })
   *
   * Nota: se recomienda en cliente debouncing/throttling para no spamear.
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
