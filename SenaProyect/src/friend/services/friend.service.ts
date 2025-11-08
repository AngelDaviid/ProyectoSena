import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
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
    const qb = this.usersRepo.createQueryBuilder('u')
      .leftJoinAndSelect('u.profile', 'p')
      .where('(u.email ILIKE :q OR p.name ILIKE :q OR p.lastName ILIKE :q)', { q: `%${query}%` });

    if (excludeUserId) qb.andWhere('u.id != :id', { id: excludeUserId });

    const users = await qb.take(20).getMany();
    return users;
  }

  async sendRequest(senderId: number, receiverId: number) {
    if (senderId === receiverId) throw new BadRequestException('No puedes enviarte solicitud a ti mismo');

    const [sender, receiver] = await Promise.all([
      this.usersRepo.findOneBy({ id: senderId }),
      this.usersRepo.findOneBy({ id: receiverId }),
    ]);
    if (!sender || !receiver) throw new NotFoundException('Usuario no encontrado');

    // Verificar si ya son amigos
    const areFriends = await this.usersRepo.createQueryBuilder('u')
      .relation(User, 'friends')
      .of(sender)
      .loadMany<User>()
      .then(f => f.some(fr => fr.id === receiver.id));
    if (areFriends) throw new BadRequestException('Ya son amigos');

    // Evitar duplicados de solicitudes pendientes
    const existing = await this.frRepo.findOne({
      where: [
        { sender: { id: senderId }, receiver: { id: receiverId }, status: FriendRequestStatus.PENDING },
        { sender: { id: receiverId }, receiver: { id: senderId }, status: FriendRequestStatus.PENDING },
      ],
    });
    if (existing) throw new BadRequestException('Solicitud ya existe');

    const fr = this.frRepo.create({ sender, receiver });
    const saved = await this.frRepo.save(fr);

    // TODO: emitir evento socket 'friendRequestSent' a receiver (implementar en gateway)
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

    // Traer sender y receiver con las relaciones que usaremos
    const sender = await this.usersRepo.findOne({
      where: { id: fr.sender.id },
      relations: ['friends', 'blockedUsers'],
    });
    const receiver = await this.usersRepo.findOne({
      where: { id: fr.receiver.id },
      relations: ['friends', 'blockedUsers'],
    });

    if (!sender || !receiver) throw new NotFoundException('Sender o receiver no encontrados');

    // No agregar si alguno bloqueó al otro
    const senderBlockedReceiver = sender.blockedUsers?.some(b => b.id === receiver.id) ?? false;
    const receiverBlockedSender = receiver.blockedUsers?.some(b => b.id === sender.id) ?? false;

    if (!senderBlockedReceiver && !receiverBlockedSender) {
      // Normalizar arrays (evita asignar undefined / null)
      sender.friends = sender.friends ?? [];
      receiver.friends = receiver.friends ?? [];

      // Evitar duplicados
      if (!sender.friends.some(f => f.id === receiver.id)) sender.friends.push(receiver);
      if (!receiver.friends.some(f => f.id === sender.id)) receiver.friends.push(sender);

      await this.usersRepo.save([sender, receiver]);
    }

    // Crear conversación solo si lo deseas; aquí lo hacemos asegurando tipos
    const conv = this.convRepo.create({ participants: [sender, receiver] as User[] });
    const savedConv = await this.convRepo.save(conv);

    // Notificar por socket (solo accepted y sent, según lo pediste)
    this.gateway.notifyRequestAccepted(fr, savedConv);

    return fr;
  }
  // Obtener lista de amigos
  async getFriends(userId: number) {
    const user = await this.usersRepo.findOne({ where: { id: userId }, relations: ['friends'] });
    return user?.friends || [];
  }
}
