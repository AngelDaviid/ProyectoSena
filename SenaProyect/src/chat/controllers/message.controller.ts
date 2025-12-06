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
  UseGuards,
  Req,
  Logger,
} from '@nestjs/common';
import { MessagesService } from '../services/message.service';
import { CreateMessageDto } from '../dtos/create-message.dto';
import { UpdateMessageDto } from '../dtos/update-message.dto';
import { Message } from '../entities/message.entity';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { ApiOperation } from '@nestjs/swagger';
import { Payload } from '../../auth/models/payload.model';
import { ChatGateway } from '../chat.gateway';
import { CloudinaryService } from '../../common/services/cloudinary.service';

interface RequestWithUser extends Request {
  user: Payload;
}

@Controller('chat/messages')
export class MessagesController {
  private readonly logger = new Logger(MessagesController. name);

  constructor(
    private readonly messagesService: MessagesService,
    private readonly chatGateway: ChatGateway,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @ApiOperation({ summary: 'Enviar un nuevo mensaje' })
  @UseGuards(AuthGuard('jwt'))
  @Post()
  @UseInterceptors(
    FileInterceptor('image', {
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
          cb(
            new BadRequestException(
              'Solo se permiten imágenes (jpg, jpeg, png, gif, webp)',
            ),
            false,
          );
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
    const { conversationId, text, tempId } = createMessageDto;

    let imageUrl: string | null = null;

    if (file) {
      this.logger.log('Uploading image to Cloudinary...');
      imageUrl = await this.cloudinaryService.uploadImage(file, 'senaconnect/chat');
      this.logger.log(`Image uploaded: ${imageUrl}`);
    } else if (createMessageDto.imageUrl) {
      imageUrl = createMessageDto.imageUrl;
    }

    this.logger.log(
      `Creating message from user ${senderId} to conversation ${conversationId}, tempId=${tempId || 'none'}`,
    );

    const message = await this.messagesService.create(
      conversationId,
      senderId,
      text || '',
      imageUrl || undefined,
    );

    this.logger.log(`Message ${message.id} created successfully`);

    const fullMessage = await this.messagesService.findOne(message.id);

    const payload = {
      id: fullMessage.id,
      text: fullMessage.text,
      imageUrl: fullMessage.imageUrl || null,
      createdAt:
        fullMessage.createdAt instanceof Date
          ? fullMessage.createdAt. toISOString()
          : fullMessage.createdAt,
      senderId: fullMessage.sender?. id || senderId,
      conversationId: conversationId,
      tempId: tempId || null,
      seenBy: [],
    };

    this.chatGateway.server
      .to(String(conversationId))
      .emit('newMessage', payload);

    this.logger.log(
      `Message ${fullMessage.id} broadcasted to conversation ${conversationId}`,
    );

    return fullMessage;
  }

  @Get('conversation/:conversationId')
  async findByConversation(
    @Param('conversationId', ParseIntPipe) conversationId: number,
  ): Promise<Message[]> {
    return this.messagesService.findByConversation(conversationId);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMessageDto,
  ): Promise<Message> {
    return this.messagesService.update(id, dto. text);
  }

  @Delete(':id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ deleted: boolean }> {
    return this.messagesService.delete(id);
  }
}
