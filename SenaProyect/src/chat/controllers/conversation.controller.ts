import { Controller, Get, Post, Body, Param, Delete, Put, UseGuards } from '@nestjs/common';
import { ConversationsService } from '../services/conversation.service';
import { CreateConversationDto } from '../dtos/create-conversation.dto';
import { UpdateConversationDto } from '../dtos/update-conversation.dto';

@Controller('chat/conversations')
export class ConversationController {
  constructor(private readonly conversationsService: ConversationsService) {}

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
  async findAll() {
    try {
      return await this.conversationsService.findAll();
    } catch (error) {
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
