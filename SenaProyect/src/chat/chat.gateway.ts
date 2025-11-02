import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MessagesService } from "./services/message.service";

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway {
  @WebSocketServer()
  server: Server;

  constructor(private messagesService: MessagesService) {}

  @SubscribeMessage('joinConversation')
  async handleJoin(
    @MessageBody('conversationId') conversationId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.join(conversationId);
    this.server.to(conversationId).emit('userJoined', { userId: client.id });
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @MessageBody() data: { conversationId: string; senderId: string; text: string, imageUrl?: string },
  ) {
    const message = await this.messagesService.create(
      +data.conversationId,
      +data.senderId,
      data.text,
      data.imageUrl
    );

    this.server.to(data.conversationId).emit('newMessage', message);
    return message;
  }
}
