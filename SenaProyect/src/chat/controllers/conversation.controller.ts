import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  UseGuards,
  UnauthorizedException,
  Request,
  Logger,
} from '@nestjs/common';
import { ConversationsService } from '../services/conversation.service';
import { CreateConversationDto } from '../dtos/create-conversation.dto';
import { UpdateConversationDto } from '../dtos/update-conversation.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('chat/conversations')
@UseGuards(JwtAuthGuard)
export class ConversationController {
  constructor(private readonly conversationsService: ConversationsService) {}
  private readonly logger = new Logger(ConversationController.name);

  @Post()
  async create(@Body() createConversationDto: CreateConversationDto) {
    try {
      const conversation = await this.conversationsService.create(createConversationDto);
      return conversation;
    } catch (error) {
      throw error;
    }
  }

  @Get()
  async findAll(@Request() req) {
    try {
      const userId = req.user?. id;

      if (!userId) {
        this.logger.error('User ID not found in request');
        throw new UnauthorizedException('Usuario no autenticado');
      }

      this.logger.log(`Fetching conversations for user: ${userId}`);

      // ✅ Pasar userId al servicio para filtrar
      return await this.conversationsService.findAll(userId);
    } catch (error) {
      this.logger.error('Error in findAll:', error);
      throw error;
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      return await this.conversationsService.findOne(+id);
    } catch (error) {
      throw error;
    }
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateConversationDto: UpdateConversationDto) {
    try {
      return await this.conversationsService. update(+id, updateConversationDto);
    } catch (error) {
      throw error;
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      return await this.conversationsService.delete(+id);
    } catch (error) {
      throw error;
    }
  }
}
