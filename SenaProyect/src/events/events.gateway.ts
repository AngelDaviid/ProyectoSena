import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable } from '@nestjs/common';
import { Event } from './entities/events.entity';

@Injectable()
@WebSocketGateway({ cors: true, namespace: '/ws' })
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
  @WebSocketServer()
  server: Server;

  // Map userId -> socketId[] (soporta múltiples conexiones por usuario)
  private clients = new Map<number, Set<string>>();

  afterInit(server: Server) {
    console.log('[EventsGateway] WebSocket initialized');
  }

  handleConnection(client: Socket) {
    console.log(`[EventsGateway] Client connected: ${client. id}`);

    // Espera que el cliente haga 'register' con userId después de conectar
    client.on('register', (payload: { userId: number }) => {
      const { userId } = payload;
      if (!userId) return;
      const set = this.clients.get(userId) ??  new Set<string>();
      set.add(client.id);
      this. clients.set(userId, set);
      console.log(`[EventsGateway] User ${userId} registered with socket ${client.id}`);
    });
  }

  handleDisconnect(client: Socket) {
    // Eliminar client. id de todos los sets
    for (const [userId, set] of this.clients.entries()) {
      if (set.has(client.id)) {
        set. delete(client.id);
        if (set.size === 0) this.clients.delete(userId);
        else this.clients.set(userId, set);
        console.log(`[EventsGateway] User ${userId} disconnected socket ${client.id}`);
        break;
      }
    }
  }

  // Helper para emitir a un usuario específico
  private emitToUser(userId: number, event: string, payload: any) {
    const sockets = this.clients.get(userId);
    if (! sockets) return;
    sockets.forEach(socketId => {
      this.server.to(socketId).emit(event, payload);
    });
  }

  // Helper para emitir a todos los usuarios conectados
  private emitToAll(event: string, payload: any) {
    this.server.emit(event, payload);
  }

  // Helper para emitir a múltiples usuarios
  private emitToUsers(userIds: number[], event: string, payload: any) {
    userIds.forEach(userId => this.emitToUser(userId, event, payload));
  }

  // Notificaciones de eventos

  /**
   * Notificar cuando se crea un evento (borrador)
   */
  notifyEventCreated(event: Event) {
    const creatorId = event.user?. id;
    if (creatorId) {
      this.emitToUser(creatorId, 'eventCreated', event);
    }
  }

  /**
   * Notificar a TODOS cuando se publica un evento (isDraft: false)
   */
  notifyEventPublished(event: Event) {
    console.log(`[EventsGateway] Broadcasting event published: ${event.title}`);
    this.emitToAll('eventPublished', {
      event,
      message: `Nuevo evento publicado: ${event.title}`,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Notificar cuando se actualiza un evento
   */
  notifyEventUpdated(event: Event, wasPublished: boolean = false) {
    // Si se acaba de publicar, usar notifyEventPublished
    if (wasPublished) {
      this.notifyEventPublished(event);
      return;
    }

    // Si solo se actualizó, notificar a los asistentes
    const attendeeIds = event.attendees?.map(a => a.id) || [];
    if (attendeeIds.length > 0) {
      this.emitToUsers(attendeeIds, 'eventUpdated', event);
    }
  }

  /**
   * Notificar cuando se elimina un evento
   */
  notifyEventDeleted(eventId: number, attendeeIds: number[] = []) {
    if (attendeeIds.length > 0) {
      this. emitToUsers(attendeeIds, 'eventDeleted', { eventId });
    }
  }

  /**
   * Notificar al creador del evento cuando alguien se registra
   */
  notifyEventRegistration(event: Event, newAttendee: { id: number; name?: string; email?: string }) {
    const creatorId = event.user?. id;
    if (creatorId) {
      this.emitToUser(creatorId, 'eventRegistration', {
        event,
        attendee: newAttendee,
        message: `${newAttendee.name || newAttendee.email} se registró a tu evento: ${event.title}`,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Notificar a un usuario cuando se desregistra de un evento
   */
  notifyEventUnregistration(eventId: number, userId: number) {
    this. emitToUser(userId, 'eventUnregistration', { eventId });
  }
}
