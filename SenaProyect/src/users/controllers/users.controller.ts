import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, UseGuards, Req, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

import { CreateUserDto, UpdateUserDto } from "../dtos/user.dto";
import { UsersService } from "../services/users.service";
import { Profile } from "../entities/profile.entity";
import { Post as PostEntity } from "../../posts/entities/post.entity";

import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import type { Request } from 'express';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) { }

  @ApiResponse({ status: 200, description: 'Get all Users' })
  @ApiOperation({ summary: 'Get all users' })
  @Get()
  getUserName() {
    return this.usersService.findAll()
  }

  @ApiOperation({ summary: 'Get user by ID' })
  @Get(':id')
  findUser(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.getUserById(id)
  }

  @ApiResponse({ status: 200, description: 'Get user profile by ID', type: Profile })
  @ApiOperation({ summary: 'Get user profile by ID' })
  @Get(':id/profile')
  getProfileUser(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.getProfileUser(id)
  }

  @ApiResponse({ status: 200, description: 'Get user profile by ID', type: PostEntity })
  @ApiOperation({ summary: 'Get user posts by user ID' })
  @Get(':id/posts')
  getPostUser(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.getPostUser(id)
  }

  @ApiOperation({ summary: 'Create a new user' })
  @Post()
  createUser(@Body() body: CreateUserDto) {
    return this.usersService.create(body)
  }

  @ApiOperation({ summary: 'Update user by ID' })
  @Put(':id')
  updateUser(@Param('id', ParseIntPipe) id: number, @Body() changes: UpdateUserDto) {
    return this.usersService.update(id, changes);
  }

  /**
   * Nuevo endpoint: subir/actualizar avatar
   * - Protegido con JWT
   * - Recibe multipart 'avatar'
   * - Guarda el archivo en /uploads y actualiza profile.avatar = '/uploads/xxxx'
   * - Solo permite al propio usuario actualizar su avatar (authUser.id === id)
   */
  @Put(':id/avatar')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(FileInterceptor('avatar', {
    storage: diskStorage({
      destination: (req, file, cb) => {
        const uploadPath = join(process.cwd(), 'uploads');
        try {
          fs.mkdirSync(uploadPath, { recursive: true });
          cb(null, uploadPath);
        } catch (err) {
          cb(err, uploadPath);
        }
      },
      filename: (req, file, cb) => {
        const filename = `${uuidv4()}${extname(file.originalname)}`;
        cb(null, filename);
      }
    }),
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
        cb(new BadRequestException('Solo imágenes permitidas'), false);
      } else cb(null, true);
    },
    limits: { fileSize: 5 * 1024 * 1024 },
  }))
  async uploadAvatar(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    const authUser = (req as any).user as any;
    if (!authUser || authUser.id !== id) {
      throw new BadRequestException('No tienes permisos para actualizar este avatar');
    }

    const avatarUrl = file ? `/uploads/${file.filename}` : null;
    const updated = await this.usersService.updateProfileAvatar(id, avatarUrl, authUser?.id);
    return updated;
  }

  @ApiOperation({ summary: 'Delete user by ID' })
  @Delete(':id')
  deleteUser(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.delete(id)
  }
}
