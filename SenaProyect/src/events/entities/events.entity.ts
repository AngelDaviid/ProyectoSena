import {Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn} from "typeorm";
import {User} from "../../users/entities/user.entity";
import {Category} from "../../posts/entities/category.entity";


@Entity({
  name: 'events',
})
export class Event {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({type: 'varchar', length: 255})
  title: string;

  @Column({type: 'text'})
  description: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  imageUrl?: string | null;

  @Column({type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP', name: 'created_at'})
  createdAt: Date;

  @Column({type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP', name: 'updated_at'})
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.events, {nullable: true})
  @JoinColumn({name: 'user_id'})
  user: User;

  @ManyToOne(() => Category, {nullable: false})
  @JoinColumn({name: 'category_id'})
  category: Category;
}
