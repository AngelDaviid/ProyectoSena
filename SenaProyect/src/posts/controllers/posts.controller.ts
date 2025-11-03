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
import { CreatePostDto } from '../dto/create-post.dto';
import { UpdatePostDto } from '../dto/update-post.dto';
import { Post as PostEntity } from '../entities/post.entity';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(FileInterceptor('image', {
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
      if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
        cb(new BadRequestException('Solo imágenes permitidas (jpg, jpeg, png, gif, webp)'), false);
      } else cb(null, true);
    },
    limits: { fileSize: 5 * 1024 * 1024 },
  }))
  create(
    @Body() createPostDto: CreatePostDto,
    @Req() req: Request,
    @UploadedFile() file?: Express.Multer.File
  ) {
    const user = req.user as any;
    const userId = user.id;
    const imageUrl = file ? `/uploads/${file.filename}` : createPostDto.imageUrl;

    console.log('🖼️ Archivo:', file);
    console.log('📦 DTO:', createPostDto);

    return this.postsService.create(createPostDto, userId, imageUrl);
  }


  @ApiResponse({ status: 201, description: 'Post created successfully.' })
  @ApiOperation({ summary: 'Get all posts' })
  @Get()
  findAll() {
    return this.postsService.findAll();
  }

  @ApiResponse({ status: 200, description: 'Post found successfully.', type: PostEntity })
  @ApiOperation({ summary: 'Get a post by ID' })
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.postsService.findOne(id);
  }

  @ApiOperation({ summary: 'Update a post by ID' })
  @Put(':id')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(FileInterceptor('image', {
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
  }))
  async update(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @Body() updatePostDto: any,
    @Req() req: Request,
  ) {
    const user = req.user as any;
    const userId = user?.id;

    if (typeof updatePostDto.categoryIds === 'string') {
      try {
        updatePostDto.categoryIds = JSON.parse(updatePostDto.categoryIds);
      } catch {
        updatePostDto.categoryIds = [];
      }
    }

    let imageUrl: string | undefined = updatePostDto.imageUrl;
    if (file) {
      imageUrl = `/uploads/${file.filename}`;
    } else if (updatePostDto.removeImage === 'true' || updatePostDto.removeImage === true) {
      imageUrl = undefined;
    }

    const updated = await this.postsService.update(id, { ...updatePostDto, imageUrl }, userId);
    return updated;
  }



  @ApiOperation({ summary: 'Delete a post by ID' })
  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const user = req.user as any;
    const userId = user?.id;
    return this.postsService.remove(id, userId);
  }
}
