import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Post } from '../entities/post.entity';
import { CreatePostDto } from '../dto/create-post.dto';
import { UpdatePostDto } from '../dto/update-post.dto';
import { Comment } from '../entities/comment.entity';
import { Like } from '../entities/like.entity';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post)
    private postsRepository: Repository<Post>,
    @InjectRepository(Comment)
    private commentRepository: Repository<Comment>,
    @InjectRepository(Like)
    private likeRepository: Repository<Like>,
  ) {}


  async CreateCommet(postId: number, userId: number, content: string) {
    const post = await this.findOne(postId)
    const comment = this.commentRepository.create({content, post: {id: post.id} as any, user: {id: userId} as any})
    await this.commentRepository.save(comment);
    return this.commentRepository.findOne({where: {id: comment.id}, relations: ['user']})
  }


  async getCommet(postId: number){
    const post = await this.findOne(postId)
    return this.commentRepository.find({where: {post: {id: post.id}}, relations: ['user'], order: { createdAt: 'ASC'}})
  }

  async updateComment(postId: number, commentId: number, userId: number | undefined, content: string) {
    const post = await this.findOne(postId);
    const comment = await this.commentRepository.findOne({
      where: { id: commentId },
      relations: ['user', 'post'],
    });
    if (!comment) {
      throw new NotFoundException(`Comentario con id ${commentId} no encontrado`);
    }
    if (comment.post && comment.post.id !== post.id) {
      throw new BadRequestException('El comentario no pertenece a este post');
    }
    if (userId && comment.user && comment.user.id !== userId) {
      throw new ForbiddenException('No tienes permisos para editar este comentario');
    }
    comment.content = content;
    return await this.commentRepository.save(comment);
  }

  async removeComment(postId: number, commentId: number, userId?: number) {
    const post = await this.findOne(postId);
    const comment = await this.commentRepository.findOne({
      where: { id: commentId },
      relations: ['user', 'post'],
    });
    if (!comment) {
      throw new NotFoundException(`Comentario con id ${commentId} no encontrado`);
    }
    if (comment.post && comment.post.id !== post.id) {
      throw new BadRequestException('El comentario no pertenece a este post');
    }
    if (userId && comment.user && comment.user.id !== userId) {
      throw new ForbiddenException('No tienes permisos para eliminar este comentario');
    }
    await this.commentRepository.delete(commentId);
    return { message: 'Comentario eliminado correctamente' };
  }

  async toggleLike(postId: number, userOrId: User | number) {
    const userId = typeof userOrId === 'number' ? userOrId : (userOrId as any)?.id;
    if (!userId) throw new UnauthorizedException('Usuario no autenticado');

    const post = await this.findOne(postId);
    const existingLike = await this.likeRepository.findOne({
      where: { post: { id: post.id }, user: { id: userId } },
    });

    let liked: boolean;
    if (existingLike) {
      await this.likeRepository.delete(existingLike.id);
      liked = false;
    } else {
      const like = this.likeRepository.create({ post: { id: post.id } as any, user: { id: userId } as any });
      await this.likeRepository.save(like);
      liked = true;
    }

    const likesCount = await this.likeRepository.count({ where: { post: { id: post.id } } });
    return { liked, likesCount };
  }

  async getLikeCount(postId: number){
    const post = await this.findOne(postId)
    return this.likeRepository.count({where: {post: {id: post.id}}})
  }

  async create(createPostDto: CreatePostDto, userId: number, imageUrl?: string) {
    try {
      const newPost = await this.postsRepository.save({
        ...createPostDto,
        user: { id: userId },
        categories: createPostDto.categoryIds?.map((id) => ({ id })),
        imageUrl: imageUrl,
      });
      return this.findOne(newPost.id);
    } catch (error) {
      throw new BadRequestException('Error al crear el post. Verifica los datos proporcionados.');
    }
  }

  async findAll(userId?: number) {
    const posts = await this.postsRepository.find({
      relations: ['user.profile', 'categories'],
      order: { createdAt: 'DESC' },
    });

    const postIds = posts.map((p) => p.id);
    if (postIds.length === 0) return posts;

    const countsRaw = await this.likeRepository
      .createQueryBuilder('like')
      .select('like.postId', 'postId')
      .addSelect('COUNT(like.id)', 'count')
      .where('like.postId IN (:...ids)', { ids: postIds })
      .groupBy('like.postId')
      .getRawMany();

    const likesCountMap: Record<number, number> = {};
    countsRaw.forEach((r) => {
      likesCountMap[Number(r.postId)] = Number(r.count);
    });

    const likedMap: Record<number, boolean> = {};
    if (userId) {
      const userLikes = await this.likeRepository.find({
        where: { user: { id: userId }, post: { id: In(postIds) } },
        relations: ['post'],
      });
      userLikes.forEach((l) => {
        if (l.post?.id) likedMap[l.post.id] = true;
      });
    }

    return posts.map((p) => {
      return {
        ...p,
        likesCount: likesCountMap[p.id] ?? 0,
        likedByUser: !!likedMap[p.id],
      };
    });
  }


  /**
   * findOne admite userId opcional para devolver likedByUser y likesCount
   */
  async findOne(id: number, userId?: number) {
    const post = await this.postsRepository.findOne({ where: { id }, relations: ['user.profile', 'categories'] });
    if (!post) {
      throw new NotFoundException(`Post con id ${id} no encontrado`);
    }

    const likesCount = await this.likeRepository.count({ where: { post: { id: post.id } } });
    let likedByUser = false;
    if (userId) {
      const existing = await this.likeRepository.findOne({
        where: { post: { id: post.id }, user: { id: userId } },
      });
      likedByUser = !!existing;
    }

    return {
      ...post,
      likesCount,
      likedByUser,
    };
  }

  async update(id: number, updatePostDto: UpdatePostDto, userId?: number, imageUrl?: string | null) {
    try {
      const post = await this.findOne(id);

      if (userId && post.user && post.user.id !== userId) {
        throw new ForbiddenException('No tienes permisos para actualizar este post');
      }

      if ((updatePostDto as any).categoryIds !== undefined) {
        const newCategories = (updatePostDto as any).categoryIds.map((id: number) => ({ id }));
        post.categories = newCategories;
        delete (updatePostDto as any).categoryIds;
      }

      if (imageUrl !== undefined) {
        post.imageUrl = imageUrl as any;
      }

      this.postsRepository.merge(post, updatePostDto);
      return await this.postsRepository.save(post);
    } catch (err) {
      if (err instanceof ForbiddenException) throw err;
      throw new BadRequestException('Error al actualizar el post');
    }
  }



  async remove(id: number, userId?: number) {
    try {
      const post = await this.findOne(id);
      if (userId && post.user && post.user.id !== userId) {
        throw new ForbiddenException('No tienes permisos para eliminar este post');
      }
      await this.postsRepository.delete(id);
      return { message: 'Post eliminado correctamente.' };
    } catch (err) {
      if (err instanceof ForbiddenException) throw err;
      throw new BadRequestException('Error al eliminar el post');
    }
  }

  async getPostsByCategory(id: number) {
    const posts = await this.postsRepository.find({
      where: { categories: { id } },
      relations: ['user.profile'],
    });
    return posts;
  }
}
