import {Injectable} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {Repository, In} from 'typeorm';
import {Conversation} from '../entities/conversations.entity';
import {User} from '../../users/entities/user.entity';
import {CreateConversationDto} from "../dtos/create-conversation.dto";
import {UpdateConversationDto} from "../dtos/update-conversation.dto";

@Injectable()
export class ConversationsService {
    constructor(
        @InjectRepository(Conversation)
        private conversationsRepo: Repository<Conversation>,
        @InjectRepository(User)
        private usersRepo: Repository<User>,
    ) {
    }

    async create(dto: CreateConversationDto) {
        const {participantIds} = dto;

        const users = await this.usersRepo.findBy({
            id: In(participantIds),
        });

        const conversation = this.conversationsRepo.create({
            participants: users,
        });

        return this.conversationsRepo.save(conversation);
    }


    async findAll() {
        return this.conversationsRepo.find({
            relations: ['participants', 'messages'],
        });
    }

    async findOne(id: number) {
        return this.conversationsRepo.findOne({
            where: {id},
            relations: ['participants', 'messages'],
        });
    }

    async update(id: number, dto: UpdateConversationDto): Promise<Conversation> {
        const conversation = await this.conversationsRepo.findOne({
            where: {id},
            relations: ['participants'],
        });

        if (!conversation) {
            throw new Error('Conversation not found');
        }

        if (dto.participantIds && dto.participantIds.length > 0) {
            const users = await this.usersRepo.findBy({
                id: In(dto.participantIds),
            });
            conversation.participants = users;
        }

        return this.conversationsRepo.save(conversation);
    }


    async delete(id: number) {
        const conversation = await this.conversationsRepo.findOneBy({id});
        if (!conversation) throw new Error('Conversación no encontrada');

        return this.conversationsRepo.remove(conversation);
    }
}
