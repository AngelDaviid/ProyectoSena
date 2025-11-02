import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UseGuards, Req,
} from '@nestjs/common';
import { MessagesService } from '../services/message.service';
import { CreateMessageDto } from '../dtos/create-message.dto';
import { UpdateMessageDto } from '../dtos/update-message.dto';
import { Message } from '../entities/message.entity';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { AuthGuard } from '@nestjs/passport';
import { ApiOperation } from '@nestjs/swagger';
import { Payload } from '../../auth/models/payload.model';


interface RequestWithUser extends Request {
  user: Payload;
}

@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @ApiOperation({ summary: 'Enviar un nuevo mensaje' })
  @UseGuards(AuthGuard('jwt'))
  @Post()
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const filename = `${uuidv4()}${extname(file.originalname)}`;
          cb(null, filename);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
          cb(new BadRequestException('Solo se permiten imágenes (jpg, jpeg, png, gif)'), false);
        } else {
          cb(null, true);
        }
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async create(
    @Body() createMessageDto: CreateMessageDto,
    @Req() req: RequestWithUser,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<Message> {
    const user = req.user as any;
    const senderId = user.id;
    const imageUrl = file ? `/uploads/${file.filename}` : createMessageDto.imageUrl;
    const { conversationId, text } = createMessageDto;

    return this.messagesService.create(conversationId, senderId, text, imageUrl);
  }


  @Get('conversation/:conversationId')
  async findByConversation(@Param('conversationId', ParseIntPipe) conversationId: number): Promise<Message[]> {
    return this.messagesService.findByConversation(conversationId);
  }

  @Patch(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateMessageDto): Promise<Message> {
    return this.messagesService.update(id, dto.text);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number): Promise<{ deleted: boolean }> {
    return this.messagesService.delete(id);
  }
}
