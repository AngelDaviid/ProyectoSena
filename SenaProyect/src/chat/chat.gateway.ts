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
import { Injectable, Logger } from '@nestjs/common';
import { MessagesService } from './services/message.service';

@Injectable()
@WebSocketGateway({
  namespace: '/ws',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  // Map userId -> Set<socketId> (múltiples conexiones por usuario)
  private clients = new Map<number, Set<string>>();

  // Map conversationId -> Set<socketId> (usuarios en cada conversación)
  private conversations = new Map<number, Set<string>>();

  // Map socketId -> userId
  private socketToUser = new Map<string, number>();

  constructor(private messagesService: MessagesService) {}

  afterInit(server: Server) {
    this.logger. log('✅ ChatGateway initialized (namespace /ws)');
  }

  handleConnection(client: Socket) {
    this.logger.log(`🔌 Client connected: ${client.id}`);

    // Escuchar evento 'register' para asociar userId
    client.on('register', (payload: { userId: number }) => {
      this.registerUser(client, payload.userId);
    });
  }

  handleDisconnect(client: Socket) {
    const userId = this.socketToUser.get(client.id);

    if (userId) {
      // Remover de clients
      const sockets = this.clients.get(userId);
      if (sockets) {
        sockets.delete(client. id);
        if (sockets.size === 0) {
          this.clients. delete(userId);
        }
      }

      // Remover de socketToUser
      this.socketToUser.delete(client.id);

      // Remover de todas las conversaciones y notificar
      for (const [convId, socketSet] of this.conversations. entries()) {
        if (socketSet.has(client. id)) {
          socketSet. delete(client.id);
          if (socketSet.size === 0) {
            this.conversations. delete(convId);
          }

          // Notificar a otros en la conversación
          this.server.to(String(convId)).emit('userLeft', {
            conversationId: convId,
            userId,
            timestamp: new Date().toISOString(),
          });
        }
      }

      this.logger. log(`❌ User ${userId} disconnected`);
    }

    this.logger.log(`🔌 Client disconnected: ${client.id}`);
  }

  // ==================== REGISTRO ====================

  private registerUser(client: Socket, userId: number) {
    if (!userId || typeof userId !== 'number') {
      this.logger.warn(`Invalid userId in register: ${userId}`);
      return;
    }

    this.logger.log(`📝 Registering user ${userId} with socket ${client.id}`);

    // Guardar en clients
    const socketSet = this.clients.get(userId) || new Set<string>();
    socketSet.add(client.id);
    this.clients.set(userId, socketSet);

    // Guardar en socketToUser
    this. socketToUser.set(client. id, userId);

    // Guardar userId en el socket para acceso rápido
    (client as any).__userId = userId;

    this.logger.log(`✅ User ${userId} registered, total users: ${this.clients.size}`);
  }

  // ==================== JOIN CONVERSATION ====================

  @SubscribeMessage('joinConversation')
  async handleJoinConversation(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const room = String(data.conversationId);
      const userId = (client as any).__userId;

      this.logger.log(`👥 User ${userId} joining conversation ${room}`);

      // Verificar si ya está en la sala
      if (client.rooms.has(room)) {
        this. logger.log(`⏭️ User ${userId} already in conversation ${room}`);
        client.emit('joinedConversation', {
          conversationId: room,
          ok: true,
          note: 'already_joined',
        });
        return;
      }

      // Unirse a la sala
      await client.join(room);

      // Agregar a conversations map
      const socketSet = this.conversations.get(Number(room)) || new Set<string>();
      socketSet.add(client. id);
      this.conversations. set(Number(room), socketSet);

      // Notificar a otros usuarios
      client.to(room).emit('userJoined', {
        userSocketId: client.id,
        userId,
        timestamp: new Date(). toISOString(),
      });

      // Confirmar al usuario
      client.emit('joinedConversation', { conversationId: room, ok: true });

      this.logger. log(`✅ User ${userId} joined conversation ${room}`);
    } catch (err) {
      this.logger. error('❌ Error joining conversation:', err);
      client.emit('error', {
        event: 'joinConversation',
        message: 'No se pudo unir a la conversación',
      });
    }
  }

  // ==================== SEND MESSAGE ====================

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @MessageBody()
    data: {
      conversationId: string;
      senderId: string;
      text: string;
      imageUrl?: string;
      tempId?: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const { conversationId, senderId, text, imageUrl, tempId } = data;

      this.logger. log(
        `💬 Message from user ${senderId} to conversation ${conversationId}, tempId=${tempId ??  'none'}`,
      );

      // Guardar mensaje en base de datos
      const message = await this.messagesService.create(
        +conversationId,
        +senderId,
        text,
        imageUrl,
      );

      // Preparar payload
      const payload = {
        id: message.id,
        text: message.text,
        imageUrl: message.imageUrl || null,
        createdAt:
          message.createdAt instanceof Date
            ? message.createdAt.toISOString()
            : message.createdAt,
        senderId: (message as any). sender?. id ??  +senderId,
        conversationId: (message as any).conversation?.id ?? +conversationId,
        tempId: tempId || null,
      };

      // Emitir a TODOS en la conversación (incluyendo el emisor)
      this.server. to(conversationId).emit('newMessage', payload);

      this.logger.log(`✅ Message ${message.id} broadcasted to conversation ${conversationId}`);

      // ✅ NOTIFICACIÓN GLOBAL: Emitir a TODOS los participantes aunque no estén en la página de chat
      await this.notifyNewMessage(+conversationId, payload);

      return { status: 'ok', message: payload };
    } catch (err) {
      this.logger.error('❌ Error sending message:', err);
      client.emit('messageError', {
        message: 'Error al enviar el mensaje',
        error: String(err),
      });
      return { status: 'error', error: String(err) };
    }
  }

  // ==================== MESSAGE SEEN ====================

  @SubscribeMessage('messageSeen')
  handleMessageSeen(
    @MessageBody() data: { conversationId: string; messageIds: number[]; userId: number },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const { conversationId, messageIds, userId } = data;

      this.logger.log(
        `👁️ User ${userId} saw ${messageIds.length} messages in conversation ${conversationId}`,
      );

      // Emitir a todos en la conversación
      this.server.to(String(conversationId)).emit('messageSeen', {
        conversationId,
        messageIds,
        userId,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      this.logger.error('❌ Error marking message as seen:', err);
      client.emit('error', {
        event: 'messageSeen',
        message: 'No se pudo procesar seen',
      });
    }
  }

  // ==================== TYPING INDICATOR ====================

  @SubscribeMessage('typing')
  handleTyping(
    @MessageBody() data: { conversationId: string; senderId: string; typing: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const { conversationId, senderId, typing } = data;

      // Emitir solo a OTROS usuarios (no al emisor)
      client.to(conversationId).emit('userTyping', {
        conversationId,
        userId: senderId,
        typing,
        timestamp: new Date().toISOString(),
      });

      client.emit('typingAck', { conversationId, ok: true });
    } catch (err) {
      this.logger.error('❌ Error handling typing:', err);
      client. emit('error', {
        event: 'typing',
        message: 'No se pudo notificar typing',
      });
    }
  }

  // ==================== NOTIFICACIÓN GLOBAL ====================

  /**
   * Notificar a TODOS los participantes de la conversación
   * aunque no estén en la página de chat
   */
  private async notifyNewMessage(conversationId: number, messagePayload: any) {
    try {
      // TODO: Obtener participantes de la conversación desde la BD
      // Por ahora, emitimos a todos los usuarios conectados
      // En producción, deberías filtrar solo a los participantes

      this.logger.log(
        `========== 🔔 NEW MESSAGE NOTIFICATION ==========`,
      );
      this.logger.log(`📢 Conversation: ${conversationId}`);
      this.logger.log(`📢 Sender: ${messagePayload.senderId}`);
      this.logger. log(`📢 Text: ${messagePayload.text?. substring(0, 50)}...`);
      this.logger.log(`================================================`);

      // Emitir notificación global a todos los sockets de los participantes
      // (puedes obtener los participantes de la BD y filtrar)
      this.server.emit('newMessageNotification', {
        conversationId,
        message: messagePayload,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(`✅ Message notification broadcasted`);
    } catch (err) {
      this.logger.error('❌ Error sending message notification:', err);
    }
  }

  // ==================== HELPER METHODS ====================

  /**
   * Emitir evento a un usuario específico (todos sus sockets)
   */
  emitToUser(userId: number, event: string, data: any) {
    const socketIds = this.clients.get(userId);
    if (! socketIds || socketIds.size === 0) {
      this.logger.debug(`⚠️ User ${userId} not connected`);
      return;
    }

    socketIds.forEach((socketId) => {
      this.server. to(socketId).emit(event, data);
    });

    this.logger.log(`📤 Emitted ${event} to user ${userId} (${socketIds.size} sockets)`);
  }

  /**
   * Emitir a una conversación
   */
  emitToConversation(conversationId: number, event: string, data: any) {
    this.server.to(String(conversationId)).emit(event, data);
    this.logger.log(`📤 Emitted ${event} to conversation ${conversationId}`);
  }

  /**
   * Verificar si un usuario está conectado
   */
  isUserConnected(userId: number): boolean {
    return this.clients.has(userId);
  }
}
