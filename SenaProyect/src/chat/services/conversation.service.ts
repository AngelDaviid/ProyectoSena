import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Conversation } from '../entities/conversations.entity';
import { User } from '../../users/entities/user.entity';
import { CreateConversationDto } from '../dtos/create-conversation.dto';
import { UpdateConversationDto } from '../dtos/update-conversation.dto';

@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);

  constructor(
    @InjectRepository(Conversation)
    private conversationsRepo: Repository<Conversation>,
    @InjectRepository(User)
    private usersRepo: Repository<User>,
  ) {}

  async create(dto: CreateConversationDto) {
    try {
      const { participantIds } = dto;

      this.logger.log(`Creating conversation with participants: ${participantIds}`);

      // Verificar que los usuarios existan
      const users = await this.usersRepo.findBy({
        id: In(participantIds),
      });

      if (users.length !== participantIds.length) {
        throw new HttpException(
          'Uno o más usuarios no existen',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Verificar si ya existe una conversación con los mismos participantes
      const existingConversations = await this.conversationsRepo. find({
        relations: ['participants'],
      });

      for (const conv of existingConversations) {
        const convParticipantIds = conv.participants
          .map((p) => p.id)
          .sort()
          .join(',');
        const newParticipantIds = participantIds.sort().join(',');

        if (convParticipantIds === newParticipantIds) {
          this.logger.log(
            `Conversation already exists with ID: ${conv.id}`,
          );
          return conv;
        }
      }

      // Crear nueva conversación
      const conversation = this.conversationsRepo.create({
        participants: users,
      });

      const saved = await this.conversationsRepo. save(conversation);

      this. logger.log(`Conversation created with ID: ${saved.id}`);

      return saved;
    } catch (error) {
      this.logger.error('Error creating conversation:', error);
      throw error;
    }
  }

  async findAll(userId?: number) {
    try {
      this.logger.log(`Finding conversations${userId ? ` for user: ${userId}` : ' (all)'}`);

      const allConversations = await this.conversationsRepo.find({
        relations: ['participants', 'participants.profile', 'messages', 'messages.sender'],
        order: {
          id: 'DESC',
          messages: {
            createdAt: 'ASC'
          }
        },
      });

      if (!userId) {
        this.logger.warn('Returning all conversations without user filter');
        return allConversations;
      }

      const userConversations = allConversations.filter(conv =>
        conv.participants?. some(p => p.id === userId)
      );

      this.logger.log(`Found ${userConversations.length} conversations for user ${userId} out of ${allConversations.length} total`);

      return userConversations;
    } catch (error) {
      this.logger.error('Error finding conversations:', error);
      throw error;
    }
  }

  async findOne(id: number) {
    try {
      const conversation = await this.conversationsRepo.findOne({
        where: { id },
        relations: ['participants', 'participants.profile', 'messages'],
      });

      if (!conversation) {
        throw new HttpException(
          'Conversación no encontrada',
          HttpStatus.NOT_FOUND,
        );
      }

      return conversation;
    } catch (error) {
      this.logger.error(`Error finding conversation ${id}:`, error);
      throw error;
    }
  }

  async update(
    id: number,
    dto: UpdateConversationDto,
  ): Promise<Conversation> {
    try {
      const conversation = await this.conversationsRepo.findOne({
        where: { id },
        relations: ['participants'],
      });

      if (!conversation) {
        throw new HttpException(
          'Conversación no encontrada',
          HttpStatus. NOT_FOUND,
        );
      }

      if (dto.participantIds && dto.participantIds.length > 0) {
        const users = await this.usersRepo. findBy({
          id: In(dto.participantIds),
        });
        conversation.participants = users;
      }

      return await this.conversationsRepo.save(conversation);
    } catch (error) {
      this.logger.error(`Error updating conversation ${id}:`, error);
      throw error;
    }
  }

  async delete(id: number) {
    try {
      const conversation = await this.conversationsRepo.findOneBy({ id });

      if (! conversation) {
        throw new HttpException(
          'Conversación no encontrada',
          HttpStatus.NOT_FOUND,
        );
      }

      return await this.conversationsRepo.remove(conversation);
    } catch (error) {
      this.logger. error(`Error deleting conversation ${id}:`, error);
      throw error;
    }
  }
}
