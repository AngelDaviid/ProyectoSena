import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FriendRequest, FriendRequestStatus } from '../entities/firend-request.entity';
import { User } from '../../users/entities/user.entity';
import { Conversation } from '../../chat/entities/conversations.entity';
import { FriendsGateway } from '../friends.gateway';

@Injectable()
export class FriendsService {
  constructor(
    @InjectRepository(FriendRequest)
    private frRepo: Repository<FriendRequest>,
    @InjectRepository(User)
    private usersRepo: Repository<User>,
    @InjectRepository(Conversation)
    private convRepo: Repository<Conversation>,
    private readonly gateway: FriendsGateway,
  ) {}

  async searchUsers(query: string, excludeUserId?: number) {
    const q = (query || '').trim();

    const pendingSent = excludeUserId
      ? await this.frRepo.find({ where: { sender: { id: excludeUserId }, status: FriendRequestStatus.PENDING }, relations: ['receiver'] })
      : [];
    const pendingReceived = excludeUserId
      ? await this.frRepo.find({ where: { receiver: { id: excludeUserId }, status: FriendRequestStatus.PENDING }, relations: ['sender'] })
      : [];

    const pendingSentIds = pendingSent.map(p => p.receiver.id);
    const pendingReceivedIds = pendingReceived.map(p => p.sender.id);

    let friendIds: number[] = [];
    if (excludeUserId) {
      const me = await this.usersRepo.findOne({ where: { id: excludeUserId }, relations: ['friends'] });
      friendIds = me?.friends?.map(f => f.id) ?? [];
    }

    const qb = this.usersRepo.createQueryBuilder('u')
      .leftJoinAndSelect('u.profile', 'p')
      .where('(u.email ILIKE :q OR p.name ILIKE :q OR p.lastName ILIKE :q)', { q: `%${q}%` });

    if (excludeUserId) qb.andWhere('u.id != :id', { id: excludeUserId });

    const excludeIds = Array.from(new Set([...(friendIds || []), ...(pendingSentIds || []), ...(pendingReceivedIds || [])]));
    if (excludeIds.length > 0) {
      qb.andWhere('u.id NOT IN (:...ids)', { ids: excludeIds });
    }

    const users = await qb.take(20).getMany();

    const results = users.map(u => {
      let status: 'friend' | 'request_sent' | 'request_received' | 'none' = 'none';
      if (friendIds.includes(u.id)) status = 'friend';
      else if (pendingSentIds.includes(u.id)) status = 'request_sent';
      else if (pendingReceivedIds.includes(u.id)) status = 'request_received';
      // Retornar el usuario con una propiedad extra
      return { ...u, friendStatus: status };
    });

    return results;
  }

  async sendRequest(senderId: number, receiverId: number) {
    if (senderId === receiverId) throw new BadRequestException('No puedes enviarte solicitud a ti mismo');

    const [sender, receiver] = await Promise.all([
      this.usersRepo.findOneBy({ id: senderId }),
      this.usersRepo.findOneBy({ id: receiverId }),
    ]);
    if (!sender || !receiver) throw new NotFoundException('Usuario no encontrado');

    // Verificar si ya son amigos
    const areFriends = await this.usersRepo.createQueryBuilder()
      .relation(User, 'friends')
      .of(sender)
      .loadMany<User>()
      .then(f => f.some(fr => fr.id === receiver.id));
    if (areFriends) throw new BadRequestException('Ya son amigos');

    const existing = await this.frRepo.findOne({
      where: [
        { sender: { id: senderId }, receiver: { id: receiverId } },
        { sender: { id: receiverId }, receiver: { id: senderId } },
      ],
    });

    if (existing) {
      if (existing.status === FriendRequestStatus.PENDING) {
        throw new BadRequestException('Solicitud ya existe');
      }

      if (existing.status === FriendRequestStatus. REJECTED) {
        await this. frRepo.remove(existing);
      }

      if (existing.status === FriendRequestStatus.ACCEPTED) {
        throw new BadRequestException('Ya son amigos');
      }
    }

    const fr = this.frRepo.create({ sender, receiver });
    const saved = await this.frRepo.save(fr);

    try {
      this.gateway.notifyRequestSent(saved);
    } catch (e) {
      console.warn('Error notifying via gateway', e);
    }

    return saved;
  }

  async getIncoming(userId: number) {
    return this.frRepo.find({
      where: { receiver: { id: userId }, status: FriendRequestStatus.PENDING },
      relations: ['sender', 'receiver'],
      order: { createdAt: 'DESC' },
    });
  }

  async getOutgoing(userId: number) {
    return this.frRepo.find({
      where: { sender: { id: userId }, status: FriendRequestStatus.PENDING },
      relations: ['sender', 'receiver'],
      order: { createdAt: 'DESC' },
    });
  }

  async respondRequest(requestId: number, userId: number, accept: boolean) {
    const fr = await this.frRepo.findOne({
      where: { id: requestId },
      relations: ['sender', 'receiver'],
    });
    if (!fr) throw new NotFoundException('Solicitud no encontrada');
    if (fr.receiver.id !== userId) throw new ForbiddenException('No autorizado');

    fr.status = accept ? FriendRequestStatus.ACCEPTED : FriendRequestStatus.REJECTED;
    await this.frRepo.save(fr);

    if (!accept) return fr; // si es rechazo, ya terminamos (no notificar según tu requerimiento)

    // Traer sender y receiver con solo lo necesario (evitar cargar todo el grafo de 'friends')
    const senderId = fr.sender.id;
    const receiverId = fr.receiver.id;

    const sender = await this.usersRepo.findOne({
      where: { id: senderId },
      relations: ['blockedUsers'], // solo lo necesario
    });
    const receiver = await this.usersRepo.findOne({
      where: { id: receiverId },
      relations: ['blockedUsers'],
    });

    if (!sender || !receiver) throw new NotFoundException('Sender o receiver no encontrados');

    // No agregar si alguno bloqueó al otro
    const senderBlockedReceiver = sender.blockedUsers?.some(b => b.id === receiver.id) ?? false;
    const receiverBlockedSender = receiver.blockedUsers?.some(b => b.id === sender.id) ?? false;

    if (!senderBlockedReceiver && !receiverBlockedSender) {
      // Usar relation query builder para evitar serializar todo el grafo y provocar recursion
      try {
        // Evitar duplicados comprobando si ya son amigos (consulta ligera)
        const alreadyFriendsCount = await this.usersRepo.createQueryBuilder('u')
          .leftJoin('u.friends', 'f')
          .where('u.id = :senderId AND f.id = :receiverId', { senderId, receiverId })
          .getCount();

        if (alreadyFriendsCount === 0) {
          // Añadir relación bidireccional usando relation query builder
          await this.usersRepo.createQueryBuilder()
            .relation(User, 'friends')
            .of(senderId)
            .add(receiverId);

          await this.usersRepo.createQueryBuilder()
            .relation(User, 'friends')
            .of(receiverId)
            .add(senderId);
        }
      } catch (e) {
        console.warn('Error adding friends relation via relation query builder', e);
        // Como fallback podrías intentar guardar con datos mínimos, pero evitamos guardar objetos con relaciones anidadas.
      }
    }

    // Crear conversación de forma segura y añadir participantes por relación
    let savedConv: Conversation | null = null;
    try {
      const conv = this.convRepo.create({} as Partial<Conversation>);
      savedConv = await this.convRepo.save(conv);
      // Añadir participantes por relation builder (si tu entidad Conversation tiene relation 'participants')
      try {
        await this.convRepo.createQueryBuilder()
          .relation(Conversation, 'participants')
          .of(savedConv.id)
          .add([senderId, receiverId]);
      } catch (e) {
        // algunos setups requieren .of(entity) en vez de id; intentar fallback
        try {
          await this.convRepo.createQueryBuilder()
            .relation(Conversation, 'participants')
            .of(savedConv)
            .add([senderId, receiverId]);
        } catch (err) {
          console.warn('Error adding participants to conversation via relation builder', err);
        }
      }
    } catch (e) {
      console.warn('Error creating conversation', e);
    }

    // Notificar por socket (solo accepted y sent, según lo pediste)
    this.gateway.notifyRequestAccepted(fr, savedConv ?? undefined);

    return fr;
  }

  // Obtener lista de amigos
  async getFriends(userId: number) {
    const user = await this.usersRepo.findOne({ where: { id: userId }, relations: ['friends'] });
    return user?.friends || [];
  }

  async getBlockedUsers(userId: number) {
    const user = await this.usersRepo.findOne({ where: { id: userId }, relations: ['blockedUsers'] });
    return user?.blockedUsers || [];
  }

  async cancelRequest(requestId: number, userId: number) {
    const fr = await this.frRepo.findOne({
      where: { id: requestId },
      relations: ['sender', 'receiver'],
    });
    if (!fr) throw new NotFoundException('Solicitud no encontrada');

    if (fr.sender.id !== userId) {
      throw new ForbiddenException('Solo puedes cancelar tus propias solicitudes');
    }

    if (fr.status !== FriendRequestStatus.PENDING) {
      throw new BadRequestException('Solo puedes cancelar solicitudes pendientes');
    }

    await this.frRepo.remove(fr);
    return { message: 'Solicitud cancelada exitosamente' };
  }


}
