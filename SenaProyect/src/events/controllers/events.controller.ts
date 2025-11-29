import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { EventsService } from '../services/events.service';
import { CreateEventDto } from '../dto/events.dto';
import { UpdateEventDto } from '../dto/update-event.dto';
import { FilterEventsDto } from '../dto/filter-events.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ApiBearerAuth, ApiTags, ApiConsumes, ApiBody } from '@nestjs/swagger';

@ApiTags('events')
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: './uploads/events',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `event-${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
          return cb(new Error('Solo se permiten imágenes'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        location: { type: 'string' },
        startDate: { type: 'string', format: 'date-time' },
        endDate: { type: 'string', format: 'date-time' },
        maxAttendees: { type: 'number' },
        eventType: { type: 'string', enum: ['conference', 'workshop', 'seminar', 'social', 'sports', 'cultural', 'other'] },
        categoryIds: { type: 'array', items: { type: 'number' } },
        isDraft: { type: 'boolean' },
        image: { type: 'string', format: 'binary' },
      },
    },
  })
  create(
    @Body() createEventDto: CreateEventDto,
    @Request() req,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const imageUrl = file ? `/uploads/events/${file.filename}` : undefined;
    return this.eventsService.create(createEventDto, req.user.id, imageUrl);
  }

  @Get()
  findAll(@Query() filters: FilterEventsDto, @Request() req) {
    const userId = req.user?. id;
    return this.eventsService.findAll(filters, userId);
  }

  @Get('user/my-events')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  getMyEvents(@Request() req) {
    return this.eventsService.getMyEvents(req.user.id);
  }

  @Get('user/registered')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  getRegisteredEvents(@Request() req) {
    return this.eventsService.getRegisteredEvents(req.user.id);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const userId = req. user?.id;
    return this.eventsService.findOne(id, userId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: './uploads/events',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `event-${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
          return cb(new Error('Solo se permiten imágenes'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateEventDto: UpdateEventDto,
    @Request() req,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const imageUrl = file ? `/uploads/events/${file.filename}` : undefined;
    return this.eventsService.update(id, updateEventDto, req.user.id, imageUrl);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.eventsService.remove(id, req.user.id);
  }

  @Post(':id/publish')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  publish(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.eventsService.publish(id, req.user.id);
  }

  @Post(':id/register')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  register(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.eventsService. register(id, req.user. id);
  }

  @Delete(':id/unregister')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  unregister(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.eventsService. unregister(id, req. user.id);
  }
}
