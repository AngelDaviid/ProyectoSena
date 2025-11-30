import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from '../entities/events.entity';
import { CreateEventDto } from '../dto/events.dto';
import { UpdateEventDto } from '../dto/update-event.dto';
import { FilterEventsDto } from '../dto/filter-events.dto';
import { EventsGateway } from '../events.gateway';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private eventsRepository: Repository<Event>,
    private readonly eventsGateway: EventsGateway,
  ) {}

  /**
   * Crear un nuevo evento
   */
  async create(createEventDto: CreateEventDto, userId: number, imageUrl?: string): Promise<Event> {
    // ✅ LOGS DE DEBUG
    console.log('========== 🔍 DEBUG CREATE EVENT ==========');
    console.log('📥 createEventDto:', JSON.stringify(createEventDto, null, 2));
    console. log('📥 createEventDto.isDraft:', createEventDto.isDraft);
    console.log('📥 typeof createEventDto.isDraft:', typeof createEventDto.isDraft);
    console.log('==========================================');

    // Validar fechas
    const startDate = new Date(createEventDto.startDate);
    const endDate = new Date(createEventDto.endDate);
    const now = new Date();

    if (startDate < now) {
      throw new BadRequestException('La fecha de inicio no puede ser en el pasado');
    }

    if (endDate <= startDate) {
      throw new BadRequestException('La fecha de fin debe ser posterior a la fecha de inicio');
    }

    const isDraft = createEventDto.isDraft ?? false;

    // ✅ LOG DESPUÉS DE CALCULAR
    console.log('🎯 isDraft calculado:', isDraft);
    console.log('🎯 Lógica: createEventDto.isDraft !== false');
    console.log('🎯 Resultado:', createEventDto.isDraft, '! ==', false, '=', isDraft);

    const event = this.eventsRepository.create({
      ... createEventDto,
      startDate,
      endDate,
      user: { id: userId } as any,
      categories: createEventDto.categoryIds?. map(id => ({ id })) as any,
      imageUrl: imageUrl,
      isDraft,
    });

    const savedEvent = await this.eventsRepository.save(event);

    const fullEvent = await this.eventsRepository.findOne({
      where: { id: savedEvent.id },
      relations: ['user', 'user.profile', 'categories', 'attendees', 'attendees.profile'],
    });

    if (!fullEvent) {
      throw new NotFoundException('Error al crear el evento');
    }

    // ✅ LOGS ANTES DE NOTIFICAR
    console.log('📊 fullEvent.isDraft:', fullEvent.isDraft);
    console.log('📊 ! isDraft (should publish?):', !isDraft);
    console.log('📊 fullEvent.title:', fullEvent.title);

    // Notificar según el estado
    if (! isDraft) {
      console.log('🚀 ✅ PUBLISHING EVENT:', fullEvent.title);
      this.eventsGateway.notifyEventPublished(fullEvent);
    } else {
      console.log('📝 ⚠️ CREATING DRAFT:', fullEvent.title);
      this.eventsGateway.notifyEventCreated(fullEvent);
    }

    return this.enrichEventWithUserData(fullEvent, userId) as Event;
  }
  /**
   * Listar eventos (solo públicos, no borradores)
   */
  async findAll(filters: FilterEventsDto, userId?: number): Promise<{ events: Event[]; total: number }> {
    const { eventType, categoryId, startDateFrom, startDateTo, search, page = 1, limit = 20 } = filters;

    const qb = this.eventsRepository
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.user', 'user')
      .leftJoinAndSelect('user.profile', 'userProfile')
      .leftJoinAndSelect('event.categories', 'category')
      .leftJoinAndSelect('event.attendees', 'attendees')
      .where(userId
          ? '(event.isDraft = :isDraft OR event. userId = :userId)'
          : 'event.isDraft = :isDraft',
        { isDraft: false, userId }
      );

    if (eventType) {
      qb.andWhere('event. eventType = :eventType', { eventType });
    }

    if (categoryId) {
      qb.andWhere('category.id = :categoryId', { categoryId });
    }

    if (startDateFrom) {
      qb.andWhere('event.startDate >= :startDateFrom', { startDateFrom: new Date(startDateFrom) });
    }

    if (startDateTo) {
      qb. andWhere('event.startDate <= :startDateTo', { startDateTo: new Date(startDateTo) });
    }

    if (search) {
      qb.andWhere('(event.title ILIKE :search OR event.description ILIKE :search OR event.location ILIKE :search)', {
        search: `%${search}%`,
      });
    }

    qb.orderBy('event.startDate', 'ASC');
    qb.skip((page - 1) * limit). take(limit);

    const [events, total] = await qb.getManyAndCount();

    // Enriquecer con información del usuario actual
    const enrichedEvents = events.map(event => this.enrichEventWithUserData(event, userId)) as Event[];

    return { events: enrichedEvents, total };
  }
  /**
   * Obtener un evento por ID
   */
  async findOne(id: number, userId?: number): Promise<Event> {
    const event = await this.eventsRepository.findOne({
      where: { id },
      relations: ['user', 'user.profile', 'categories', 'attendees', 'attendees.profile'],
    });

    if (!event) {
      throw new NotFoundException(`Evento con ID ${id} no encontrado`);
    }

    return this.enrichEventWithUserData(event, userId) as Event;
  }

  /**
   * Actualizar un evento
   */
  async update(id: number, updateEventDto: UpdateEventDto, userId: number, imageUrl?: string | null): Promise<Event> {
    const event = await this.eventsRepository.findOne({
      where: { id },
      relations: ['user', 'attendees', 'categories'],
    });

    if (!event) {
      throw new NotFoundException(`Evento con ID ${id} no encontrado`);
    }

    // Solo el creador puede actualizar
    if (event.user.id !== userId) {
      throw new ForbiddenException('No tienes permisos para actualizar este evento');
    }

    // Validar fechas si se actualizan
    if (updateEventDto.startDate || updateEventDto.endDate) {
      const startDate = updateEventDto.startDate ?  new Date(updateEventDto.startDate) : event.startDate;
      const endDate = updateEventDto.endDate ? new Date(updateEventDto.endDate) : event.endDate;

      if (endDate <= startDate) {
        throw new BadRequestException('La fecha de fin debe ser posterior a la fecha de inicio');
      }

      updateEventDto.startDate = startDate. toISOString();
      updateEventDto.endDate = endDate.toISOString();
    }

    // Detectar si se está publicando
    const wasPublished = event.isDraft && updateEventDto.isDraft === false;

    // Actualizar categorías si se proporcionan
    if ((updateEventDto as any).categoryIds !== undefined) {
      event.categories = (updateEventDto as any).categoryIds. map((id: number) => ({ id })) as any;
      delete (updateEventDto as any).categoryIds;
    }

    // Actualizar imagen
    if (imageUrl !== undefined) {
      event.imageUrl = imageUrl as any;
    }

    // Merge y guardar
    Object.assign(event, updateEventDto);
    await this.eventsRepository. save(event);

    // ✅ CORRECCIÓN: Obtener evento actualizado completo
    const updatedEvent = await this.eventsRepository.findOne({
      where: { id },
      relations: ['user', 'user.profile', 'categories', 'attendees', 'attendees.profile'],
    });

    if (!updatedEvent) {
      throw new NotFoundException('Error al actualizar el evento');
    }

    // Notificar actualización
    this.eventsGateway.notifyEventUpdated(updatedEvent, wasPublished);

    return this.enrichEventWithUserData(updatedEvent, userId) as Event;
  }

  /**
   * Eliminar un evento
   */
  async remove(id: number, userId: number): Promise<{ message: string }> {
    const event = await this.eventsRepository.findOne({
      where: { id },
      relations: ['user', 'attendees'],
    });

    if (!event) {
      throw new NotFoundException(`Evento con ID ${id} no encontrado`);
    }

    if (event.user.id !== userId) {
      throw new ForbiddenException('No tienes permisos para eliminar este evento');
    }

    const attendeeIds = event.attendees?. map(a => a.id) || [];

    await this.eventsRepository.remove(event);

    // Notificar eliminación
    this.eventsGateway.notifyEventDeleted(id, attendeeIds);

    return { message: 'Evento eliminado correctamente' };
  }

  /**
   * Publicar un evento (cambiar isDraft a false)
   */
  async publish(id: number, userId: number): Promise<Event> {
    return this.update(id, { isDraft: false }, userId);
  }

  /**
   * Registrarse a un evento
   */
  async register(eventId: number, userId: number): Promise<{ message: string }> {
    const event = await this.eventsRepository.findOne({
      where: { id: eventId, isDraft: false },
      relations: ['user', 'user.profile', 'attendees', 'attendees.profile'],
    });

    if (! event) {
      throw new NotFoundException('Evento no encontrado o no está publicado');
    }

    // Verificar si ya está registrado
    const alreadyRegistered = event.attendees?.some(a => a. id === userId);
    if (alreadyRegistered) {
      throw new BadRequestException('Ya estás registrado en este evento');
    }

    // Verificar cupos
    if (event.maxAttendees && event.attendees && event.attendees.length >= event.maxAttendees) {
      throw new BadRequestException('El evento ha alcanzado el máximo de asistentes');
    }

    // Agregar asistente
    await this.eventsRepository
      .createQueryBuilder()
      .relation(Event, 'attendees')
      .of(eventId)
      .add(userId);

    // ✅ CORRECCIÓN: Obtener evento actualizado
    const updatedEvent = await this.eventsRepository.findOne({
      where: { id: eventId },
      relations: ['user', 'user.profile', 'attendees', 'attendees.profile'],
    });

    if (! updatedEvent) {
      throw new NotFoundException('Error al obtener el evento actualizado');
    }

    const newAttendee = updatedEvent.attendees?.find(a => a.id === userId);

    // Notificar al creador
    if (newAttendee) {
      this.eventsGateway.notifyEventRegistration(updatedEvent, {
        id: newAttendee.id,
        name: newAttendee.profile?. name,
        email: newAttendee.email,
      });
    }

    return { message: 'Te has registrado exitosamente al evento' };
  }

  /**
   * Desregistrarse de un evento
   */
  async unregister(eventId: number, userId: number): Promise<{ message: string }> {
    const event = await this.eventsRepository.findOne({
      where: { id: eventId },
      relations: ['attendees'],
    });

    if (!event) {
      throw new NotFoundException('Evento no encontrado');
    }

    const isRegistered = event.attendees?. some(a => a.id === userId);
    if (!isRegistered) {
      throw new BadRequestException('No estás registrado en este evento');
    }

    await this.eventsRepository
      .createQueryBuilder()
      .relation(Event, 'attendees')
      .of(eventId)
      .remove(userId);

    this.eventsGateway.notifyEventUnregistration(eventId, userId);

    return { message: 'Te has desregistrado del evento' };
  }

  /**
   * Obtener eventos creados por el usuario
   */
  async getMyEvents(userId: number): Promise<Event[]> {
    const events = await this.eventsRepository. find({
      where: { user: { id: userId } },
      relations: ['user', 'user.profile', 'categories', 'attendees', 'attendees.profile'],
      order: { createdAt: 'DESC' },
    });

    return events. map(event => this.enrichEventWithUserData(event, userId)) as Event[];
  }

  /**
   * Obtener eventos a los que el usuario está inscrito
   */
  async getRegisteredEvents(userId: number): Promise<Event[]> {
    const events = await this.eventsRepository
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.user', 'user')
      . leftJoinAndSelect('user. profile', 'profile')
      .leftJoinAndSelect('event.categories', 'category')
      .leftJoinAndSelect('event.attendees', 'attendee')
      .leftJoinAndSelect('attendee. profile', 'attendeeProfile')
      .where('attendee.id = :userId', { userId })
      .andWhere('event.isDraft = :isDraft', { isDraft: false })
      .orderBy('event. startDate', 'ASC')
      .getMany();

    return events.map(event => this.enrichEventWithUserData(event, userId)) as Event[];
  }


  private enrichEventWithUserData(event: Event, userId?: number): Event & { attendeesCount: number; isRegistered: boolean } {
    const attendeesCount = event.attendees?. length || 0;
    const isRegistered = userId ? event.attendees?.some(a => a.id === userId) || false : false;

    return {
      ...event,
      attendeesCount,
      isRegistered,
    };
  }
}
