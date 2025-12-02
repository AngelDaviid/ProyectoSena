import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  ParseIntPipe,
  UseGuards,
  Req,
  UseInterceptors,
  BadRequestException,
  UploadedFile,
} from '@nestjs/common';
import { join } from 'path';
import * as fs from 'fs';
import { AuthGuard } from '@nestjs/passport';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { Request } from 'express';
import { PostsService } from '../services/posts.service';
import { Post as PostEntity } from '../entities/post.entity';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { CreatePostDto } from '../dto/create-post.dto';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  // ✅ CREAR POST - Requiere autenticación (todos los roles)
  @Post()
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(
    FileInterceptor('image', {
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
        },
      }),
      fileFilter: (req, file, cb) => {
        if (! file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
          cb(
            new BadRequestException('Solo imágenes permitidas (jpg, jpeg, png, gif, webp)'),
            false,
          );
        } else cb(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  create(
    @Body() createPostDto: CreatePostDto,
    @Req() req: Request,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const user = req.user as any;
    const userId = user.id;
    const imageUrl = file ? `/uploads/${file.filename}` : createPostDto.imageUrl;

    console.log('🖼️ Archivo:', file);
    console.log('📦 DTO:', createPostDto);

    return this.postsService. create(createPostDto, userId, imageUrl);
  }

  // ✅ VER TODOS LOS POSTS - Público (no requiere autenticación)
  @ApiResponse({ status: 200, description: 'Posts retrieved successfully.' })
  @ApiOperation({ summary: 'Get all posts' })
  @Get()
  findAll(@Req() req: Request) {
    const user = (req as any).user;
    const userId = user?. id;
    return this.postsService. findAll(userId);
  }

  // ✅ VER UN POST - Público
  @ApiResponse({
    status: 200,
    description: 'Post found successfully.',
    type: PostEntity,
  })
  @ApiOperation({ summary: 'Get a post by ID' })
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.postsService.findOne(id);
  }

  // ✅ ACTUALIZAR POST - Solo el autor o desarrollador
  @ApiOperation({ summary: 'Update a post by ID' })
  @Put(':id')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadPath = join(process.cwd(), 'uploads');
          fs.mkdirSync(uploadPath, { recursive: true });
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          const filename = `${uuidv4()}${extname(file.originalname)}`;
          cb(null, filename);
        },
      }),
    }),
  )
  async update(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @Body() updatePostDto: any,
    @Req() req: Request,
  ) {
    const user = req.user as any;
    const userId = user?. id;
    const userRole = user?.role; // ✅ AGREGAR ESTO

    if (typeof updatePostDto. categoryIds === 'string') {
      try {
        updatePostDto.categoryIds = JSON.parse(updatePostDto.categoryIds);
      } catch {
        updatePostDto.categoryIds = [];
      }
    }

    let imageUrl: string | null | undefined = updatePostDto.imageUrl ??  undefined;
    if (file) {
      imageUrl = `/uploads/${file.filename}`;
    } else if (updatePostDto.removeImage === 'true' || updatePostDto.removeImage === true) {
      imageUrl = null;
    }

    // ✅ PASAR userRole como parámetro
    const updated = await this.postsService. update(id, updatePostDto, userId, userRole, imageUrl);
    return updated;
  }

  // ✅ ELIMINAR POST - Solo el autor o desarrollador
  @ApiOperation({ summary: 'Delete a post by ID' })
  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const user = req.user as any;
    const userId = user?. id;
    const userRole = user?.role; // ✅ Obtener el rol del usuario
    return this.postsService.remove(id, userId, userRole);
  }

  // ✅ CREAR COMENTARIO - Requiere autenticación
  @UseGuards(AuthGuard('jwt'))
  @Post(':id/comments')
  async createComment(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { content: string },
    @Req() req: any,
  ) {
    const user = req.user;
    const userId = user?. id;
    return this.postsService.CreateCommet(id, userId, body.content);
  }

  // ✅ VER COMENTARIOS - Requiere autenticación
  @UseGuards(AuthGuard('jwt'))
  @Get(':id/comments')
  async getComments(@Param('id', ParseIntPipe) id: number) {
    return this.postsService.getCommet(id);
  }

  // ✅ TOGGLE LIKE - Requiere autenticación
  @UseGuards(AuthGuard('jwt'))
  @Post(':id/like')
  async toggleLike(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const user = req.user;
    return this.postsService.toggleLike(id, user);
  }

  // ✅ ACTUALIZAR COMENTARIO - Solo el autor o desarrollador
  @UseGuards(AuthGuard('jwt'))
  @Put(':postId/comments/:id')
  async updateComment(
    @Param('postId', ParseIntPipe) postId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { content: string },
    @Req() req: any,
  ) {
    const user = req.user;
    // ✅ PASAR userRole
    return this.postsService.updateComment(postId, id, user?. id, user?.role, body.content);
  }

  // ✅ ELIMINAR COMENTARIO - Solo el autor o desarrollador
  @UseGuards(AuthGuard('jwt'))
  @Delete(':postId/comments/:id')
  async deleteComment(
    @Param('postId', ParseIntPipe) postId: number,
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ) {
    const user = req.user;
    const userRole = user?.role; // ✅ Obtener el rol del usuario
    return this.postsService.removeComment(postId, id, user?. id, userRole);
  }
}
