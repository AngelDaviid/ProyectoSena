import { Module } from '@nestjs/common';
import { PostsService } from './services/posts.service';
import { PostsController } from './controllers/posts.controller';
import {TypeOrmModule} from "@nestjs/typeorm";
import {Post} from "./entities/post.entity";
import {Category} from "./entities/category.entity";
import {CategoriesController} from "./controllers/categories.controller";
import {CategoriesService} from "./services/categories.service";
import { Comment } from './entities/comment.entity';
import { Like } from './entities/like.entity';
import { CloudinaryService } from '../common/services/cloudinary.services';

@Module({
  imports: [TypeOrmModule.forFeature([Post, Category, Comment, Like])],
  controllers: [PostsController, CategoriesController],
  providers: [PostsService, CategoriesService, CloudinaryService],
  exports: [PostsService, CategoriesService, CloudinaryService],
})
export class PostsModule {}
