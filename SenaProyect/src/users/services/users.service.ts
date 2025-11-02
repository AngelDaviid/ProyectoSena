import {BadRequestException, ForbiddenException, Injectable, NotFoundException} from '@nestjs/common';
import {CreateUserDto, UpdateUserDto} from "../dtos/user.dto";
import {InjectRepository} from "@nestjs/typeorm";
import {User} from "../entities/user.entity";
import {Repository} from "typeorm";

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

  async getProfileUser(id: number){
    const userProfile = await this.findOne(id)
    return userProfile.profile
  }

  async getPostUser(id: number){
    const user = await this.usersRepository.findOne({
      where: {id},
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
      const data = {
        ...create,
        role: create.role ?? 'aprendiz'
      };
      const newUser = this.usersRepository.create(data as Partial<User>);
      const savedUser = await this.usersRepository.save(newUser);
      return this.findOne(savedUser.id)
    } catch (error) {
      throw new BadRequestException('Error creating user. Please check the provided data.');
    }
  }

  async update(id: number, changes: UpdateUserDto) {
    try {
      const user = await this.findOne(id);
      const updatedUser = this.usersRepository.merge(user, changes);
      const savedUser = await this.usersRepository.save(updatedUser);
      return savedUser;
    } catch {
      throw new BadRequestException('Error updating user');
    }
  }

  async delete(id: number) {
    try {
      await this.usersRepository.delete(id);
      return {message: 'User deleted successfully.'};
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
