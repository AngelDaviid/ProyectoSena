import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  UseGuards,
  Body,
  Param,
  Query,
  Request,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuards } from '../../auth/guards/roles.guards';
import { Roles } from '../../auth/decorators/roles.decorator';
import { EventsService } from '../services/events.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CreateEventDto } from '../dto/events.dto';
import { FilterEventsDto } from '../dto/filter-events.dto';
import { UpdateEventDto } from '../dto/update-event.dto';
import { CloudinaryService } from '../../common/services/cloudinary.services';

@Controller('events')
export class EventsController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly cloudinaryService: CloudinaryService,
    ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuards)
  @Roles('instructor', 'desarrollador')
  @ApiBearerAuth()
  @UseInterceptors(
    FileInterceptor('image', {
      fileFilter: (req, file, cb) => {
        if (! file. mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
          return cb(new Error('Solo se permiten imágenes'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 },
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
        eventType: {
          type: 'string',
          enum: ['conference', 'workshop', 'seminar', 'social', 'sports', 'cultural', 'other'],
        },
        categoryIds: { type: 'array', items: { type: 'number' } },
        isDraft: { type: 'boolean' },
        image: { type: 'string', format: 'binary' },
      },
    },
  })
  async create(
    @Body() createEventDto: CreateEventDto,
    @Request() req,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    let imageUrl: string | undefined;
    if (file) {
      imageUrl = await this.cloudinaryService.uploadImage(file, 'senaconnect/events');
    }

    return this.eventsService.create(createEventDto, req.user.id, imageUrl);
  }

  // ✅ VER EVENTOS - Público/Todos
  @Get()
  @ApiOperation({ summary: 'Get all events' })
  @ApiResponse({ status: 200, description: 'Events retrieved successfully' })
  findAll(@Query() filters: FilterEventsDto, @Request() req) {
    const userId = req.user?.id;
    return this.eventsService.findAll(filters, userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get event by ID' })
  @ApiResponse({ status: 200, description: 'Event retrieved successfully' })
  findOne(@Param('id') id: string, @Request() req) {
    const userId = req.user?.id;
    return this.eventsService.findOne(+id, userId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(
    FileInterceptor('image', {
      fileFilter: (req, file, cb) => {
        if (! file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
          return cb(new Error('Solo se permiten imágenes'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  async update(
    @Param('id') id: string,
    @Body() updateEventDto: UpdateEventDto,
    @Request() req,
    @UploadedFile() file?: Express. Multer.File,
  ) {
    let imageUrl: string | undefined;
    if (file) {
      imageUrl = await this.cloudinaryService.uploadImage(file, 'senaconnect/events');
    }

    return this.eventsService.update(+id, updateEventDto, req.user.id, req.user.role, imageUrl);
  }

  // ✅ ELIMINAR EVENTO - Solo creador o desarrollador
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete event' })
  @ApiResponse({ status: 200, description: 'Event deleted successfully' })
  remove(@Param('id') id: string, @Request() req) {
    return this.eventsService.remove(+id, req.user.id, req.user.role);
  }

  // ✅ PUBLICAR EVENTO - Solo instructor y desarrollador
  @Post(':id/publish')
  @UseGuards(JwtAuthGuard, RolesGuards)
  @Roles('instructor', 'desarrollador')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Publish event' })
  publish(@Param('id') id: string, @Request() req) {
    return this.eventsService.publish(+id, req. user.id, req.user.role);
  }

  // ✅ REGISTRARSE - Todos los autenticados
  @Post(':id/register')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register to event' })
  register(@Param('id') id: string, @Request() req) {
    return this.eventsService.register(+id, req.user.id);
  }

  @Delete(':id/unregister')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unregister from event' })
  unregister(@Param('id') id: string, @Request() req) {
    return this.eventsService.unregister(+id, req.user.id);
  }

  @Get('user/my-events')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my events' })
  getMyEvents(@Request() req) {
    return this.eventsService.getMyEvents(req.user.id);
  }

  @Get('user/registered-events')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get events I am registered to' })
  getRegisteredEvents(@Request() req) {
    return this.eventsService.getRegisteredEvents(req. user.id);
  }
}
