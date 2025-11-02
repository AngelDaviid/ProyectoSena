import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from '../entities/message.entity';
import { Conversation } from '../entities/conversations.entity';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private readonly messagesRepo: Repository<Message>,

    @InjectRepository(Conversation)
    private readonly conversationsRepo: Repository<Conversation>,

    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}


  async create(conversationId: number, senderId: number, text: string, imageUrl?: string): Promise<Message> {
    const conversation = await this.conversationsRepo.findOneBy({ id: conversationId });
    if (!conversation) {
      throw new NotFoundException(`Conversation with ID ${conversationId} not found`);
    }

    const sender = await this.usersRepo.findOneBy({ id: senderId });
    if (!sender) {
      throw new NotFoundException(`User (sender) with ID ${senderId} not found`);
    }

    const message = this.messagesRepo.create({
      text,
      conversation,
      sender,
      imageUrl,
    });

    return this.messagesRepo.save(message);
  }

  async findByConversation(conversationId: number): Promise<Message[]> {
    return this.messagesRepo.find({
      where: { conversation: { id: conversationId } },
      relations: ['sender'],
      order: { createdAt: 'ASC' },
    });
  }

  async update(messageId: number, text: string): Promise<Message> {
    const message = await this.messagesRepo.findOneBy({ id: messageId });
    if (!message) {
      throw new NotFoundException(`Message with ID ${messageId} not found`);
    }

    message.text = text;
    return this.messagesRepo.save(message);
  }

  async delete(messageId: number): Promise<{ deleted: boolean }> {
    const message = await this.messagesRepo.findOneBy({ id: messageId });
    if (!message) {
      throw new NotFoundException(`Message with ID ${messageId} not found`);
    }

    await this.messagesRepo.remove(message);
    return { deleted: true };
  }
}
