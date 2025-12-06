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
import { AuthGuard } from '@nestjs/passport';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { Request } from 'express';
import { PostsService } from '../services/posts.service';
import { Post as PostEntity } from '../entities/post.entity';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreatePostDto } from '../dto/create-post.dto';
import { CloudinaryService } from '../../common/services/cloudinary.service';

@Controller('posts')
export class PostsController {
  constructor(
    private readonly postsService: PostsService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  // ✅ CREAR POST - Requiere autenticación (todos los roles)
  @Post()
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(
    FileInterceptor('image', {
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
  async create(
    @Body() createPostDto: CreatePostDto,
    @Req() req: Request,
    @UploadedFile() file?: Express. Multer.File,
  ) {
    console.log('🔍 ========== CREATE POST DEBUG ==========');
    console.log('📦 Body (DTO):', createPostDto);
    console.log('📎 File received:', file ?  {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      buffer: file.buffer ?  `${file.buffer.length} bytes` : 'NO BUFFER'
    } : 'NO FILE');
    console.log('🔍 =====================================');

    const user = req.user as any;
    const userId = user.id;

    let imageUrl: string | undefined;
    if (file) {
      console.log('🚀 Uploading to Cloudinary...');
      try {
        imageUrl = await this.cloudinaryService.uploadImage(file, 'senaconnect/posts');
        console.log('✅ Upload successful:', imageUrl);
      } catch (error) {
        console.error('❌ Cloudinary upload error:', error);
        throw error;
      }
    } else if (createPostDto.imageUrl) {
      imageUrl = createPostDto.imageUrl;
    } else {
      console.log('⚠️ No file and no imageUrl in DTO');
    }

    return this.postsService.create(createPostDto, userId, imageUrl);
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

  @Put(':id')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(
    FileInterceptor('image', {
      fileFilter: (req, file, cb) => {
        if (!file. mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
          cb(new BadRequestException('Solo imágenes permitidas'), false);
        } else cb(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async update(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @Body() updatePostDto: any,
    @Req() req: Request,
  ) {
    const user = req.user as any;
    const userId = user?.id;
    const userRole = user?.role;

    if (typeof updatePostDto.categoryIds === 'string') {
      try {
        updatePostDto.categoryIds = JSON.parse(updatePostDto.categoryIds);
      } catch {
        updatePostDto.categoryIds = [];
      }
    }

    let imageUrl: string | null | undefined = updatePostDto.imageUrl ??  undefined;

    if (file) {
      imageUrl = await this.cloudinaryService.uploadImage(file, 'senaconnect/posts');
    } else if (updatePostDto.removeImage === 'true' || updatePostDto.removeImage === true) {
      imageUrl = null;
    }

    const updated = await this.postsService.update(id, updatePostDto, userId, userRole, imageUrl);
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
