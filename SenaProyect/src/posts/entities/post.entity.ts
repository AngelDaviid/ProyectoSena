import {Column, CreateDateColumn, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn} from "typeorm";
import {User} from "../../users/entities/user.entity";
import { Category } from "../entities/category.entity";
import {ApiProperty} from "@nestjs/swagger";

@Entity({
  name: 'posts'
})
export class Post {
  @ApiProperty({ description: 'Unique identifier for the post' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'Title of the post' })
  @Column({type: 'varchar', length: 255})
  title: string;

  @ApiProperty({ description: 'Content of the post', required: false })
  @Column({type: 'text', nullable: true})
  content: string;

  @Column({ nullable: true })
  imageUrl?: string;

  @ApiProperty({ description: 'Summary of the post', required: false })
  @Column({type: 'varchar', length: 255, name: 'summary', nullable: true})
  summary: string;

  @ApiProperty({ description: 'Indicates if the post is a draft', default: true })
  @Column({type: 'boolean', default: true, name: 'is_draft'})
  isDraft: boolean;

  @ApiProperty({ description: 'Creation timestamp of the post' })
  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  @ApiProperty({ description: 'Last updated timestamp of the post' })
  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;

  @ApiProperty({ description: 'User who created the post', type: () => User, nullable: true })
  @ManyToOne(() => User, (user) => user.posts, {nullable: true})
  @JoinColumn({name: 'user_id'})
  user: User;

  @ApiProperty({ description: 'Categories associated with the post', type: () => [Category], nullable: true })
  @ManyToMany(() => Category)
  @JoinTable({
    name: 'posts_categories',
    joinColumn: { name: 'post_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'category_id', referencedColumnName: 'id' },
  })
  categories: Category[];
}
