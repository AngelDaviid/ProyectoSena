import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto, UpdateUserDto } from "../dtos/user.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { User } from "../entities/user.entity";
import { Repository } from "typeorm";

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>
  ) {
  }

  async findAll() {
    const allUsers = await this.usersRepository.find({
      relations: ['profile'],
    });
    return allUsers;
  }

  async getUserById(id: number) {
    const user = await this.findOne(id)
    if (user.id === 1) {
      throw new ForbiddenException('You are not allowed to access this user')
    }
    return user
  }

  async getProfileUser(id: number) {
    const userProfile = await this.findOne(id)
    return userProfile.profile
  }

  async getPostUser(id: number) {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['posts']
    })
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    return user.posts;
  }

  async findByIdForAuth(id: number) {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['profile'],
    });
    return user;
  }

  async create(create: CreateUserDto) {
    try {
      const existingUser = await this. getUserbyEmail(create.email);
      if (existingUser) {
        throw new BadRequestException('El email ya está registrado');
      }

      const data = {
        ...create,
        role: create.role ??  'aprendiz'
      };

      console.log('[UsersService] Creating user with data:', {
        email: data.email,
        role: data.role,
        profileName: data. profile?.name,
        profileLastName: data.profile?.lastName
      });

      const newUser = this.usersRepository. create(data as Partial<User>);
      const savedUser = await this.usersRepository.save(newUser);

      console.log('[UsersService] User created successfully:', savedUser.id);

      return this. findOne(savedUser.id);
    } catch (error) {
      console.error('[UsersService] Error creating user:', error);

      if (error instanceof BadRequestException) {
        throw error;
      }

      const errorMessage = error?.message || 'Error al crear usuario';
      throw new BadRequestException(errorMessage);
    }
  }

  async update(id: number, changes: UpdateUserDto) {
    try {
      const user = await this.findOne(id);
      // CAST a any para evitar error de tipado con avatar: null en el DTO
      const updatedUser = this.usersRepository.merge(user, changes as any);
      const savedUser = await this.usersRepository.save(updatedUser);
      return savedUser;
    } catch {
      throw new BadRequestException('Error updating user');
    }
  }

  /**
   * Nuevo helper: Actualiza solo el avatar del profile.
   * - avatarUrl puede ser string o null (para quitar avatar).
   * - requesterId opcional para validar permisos (p. ej. req.user.id)
   */
  async updateProfileAvatar(id: number, avatarUrl: string | null, requesterId?: number) {
    if (requesterId !== undefined && requesterId !== id) {
      throw new ForbiddenException('No tienes permisos para actualizar el avatar de este usuario');
    }
    const changes: any = { profile: { avatar: avatarUrl } };
    return this.update(id, changes);
  }

  async delete(id: number) {
    try {
      await this.usersRepository.delete(id);
      return { message: 'User deleted successfully.' };
    } catch {
      throw new BadRequestException('Error deleting user');
    }
  }

  async getUserbyEmail(email: string) {
    const user = await this.usersRepository.findOne({
      where: { email }
    });
    return user;
  }

  private async findOne(id: number) {
    const user = await this.usersRepository.findOne(
      {
        where: { id },
        relations: ['profile']
      }
    );
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    return user;
  }
}
