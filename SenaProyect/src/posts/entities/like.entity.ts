import { Entity, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, Unique, JoinColumn } from 'typeorm';
import { Post } from './post.entity';
import { User } from '../../users/entities/user.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity({ name: 'post_likes' })
@Unique(['user', 'post'])
export class Like {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => User, (u) => u.likes, { nullable: false, eager: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Post, (post) => post.likes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'postId' })
  post: Post;
}
