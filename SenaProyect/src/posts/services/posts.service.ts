import {Injectable, NotFoundException, BadRequestException} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {Repository} from 'typeorm';
import {Post} from '../entities/post.entity';
import {CreatePostDto} from '../dto/create-post.dto';
import {UpdatePostDto} from '../dto/update-post.dto';

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post)
    private postsRepository: Repository<Post>
  ) {
  }

  async create(createPostDto: CreatePostDto, userId: number, imageUrl?: string) {
    try {
      const newPost = await this.postsRepository.save({
        ...createPostDto,
        user: {id: userId},
        categories: createPostDto.categoryIds?.map((id) => ({id})),
        imageUrl: createPostDto.imageUrl,
      });
      return this.findOne(newPost.id);
    } catch (error) {
      throw new BadRequestException('Error al crear el post. Verifica los datos proporcionados.');
    }
  }

  async findAll() {
    const posts = await this.postsRepository.find({
      relations: ['user.profile', 'categories']
    });
    return posts
  }

  async findOne(id: number) {
    const post = await this.postsRepository.findOne({where: {id}, relations: ['user.profile', 'categories']});
    if (!post) {
      throw new NotFoundException(`Post con id ${id} no encontrado`);
    }
    return post;
  }

  async update(id: number, updatePostDto: UpdatePostDto) {
    try {
      const post = await this.findOne(id);
      const updatedPost = this.postsRepository.merge(post, updatePostDto);
      return await this.postsRepository.save(updatedPost);
    } catch {
      throw new BadRequestException('Error al actualizar el post');
    }
  }

  async remove(id: number) {
    try {
      await this.postsRepository.delete(id);
      return {message: 'Post eliminado correctamente.'};
    } catch {
      throw new BadRequestException('Error al eliminar el post');
    }
  }

  async getPostsByCategory(id: number) {
    const posts = await this.postsRepository.find({
      where: { categories: { id } },
      relations: ['user.profile'],
    })
    return posts
  }
}
