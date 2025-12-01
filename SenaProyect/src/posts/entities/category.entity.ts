import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm';
import { Post } from './post.entity';
import { Event } from '../../events/entities/events.entity'; // 👈 IMPORTANTE

@Entity({
  name: 'categories',
})
export class Category {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255, unique: true })
  name: string;

  @Column({ type: 'varchar', length: 800, nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 800, nullable: true, name: 'cover_image' })
  coverImage: string;

  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;

  @ManyToMany(() => Post, (post) => post.categories)
  posts: Post[];

  // 👇 ESTA ES LA RELACIÓN QUE TE FALTABA
  @ManyToMany(() => Event, (event) => event.categories)
  events: Event[];

}
