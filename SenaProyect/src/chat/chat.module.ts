import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessagesService } from './services/message.service';
import { Message } from './entities/message.entity';
import { Conversation } from './entities/conversations.entity';
import { User } from '../users/entities/user.entity';
import { MessagesController } from './controllers/message.controller';
import { ConversationsService } from './services/conversation.service';
import { ConversationController } from './controllers/conversation.controller';
import { ChatGateway } from './chat.gateway';

@Module({
  imports: [TypeOrmModule.forFeature([Message, Conversation, User])],
  controllers: [MessagesController, ConversationController],
  providers: [MessagesService, ConversationsService, ChatGateway],
  exports: [MessagesService, ConversationsService, ChatGateway],
})
export class ChatModule {}
