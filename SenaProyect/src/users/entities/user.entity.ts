import {Column, Entity, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn, OneToMany, BeforeInsert, ManyToMany} from 'typeorm';
import {Profile} from './profile.entity'
import {Post} from "../../posts/entities/post.entity";
import * as bcrypt from 'bcrypt';
import {Exclude} from "class-transformer";
import { Event } from '../../events/entities/events.entity';
import {Conversation} from "../../chat/entities/conversations.entity";
import {Message} from "../../chat/entities/message.entity";


@Entity({
  name: 'users',
})
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({type: 'varchar', length: 255, unique: true})
  email: string;

  @Exclude()
  @Column({type: 'varchar', length: 255})
  password: string;

  @Column({ type: 'enum', enum: ['desarrollador', 'instructor', 'aprendiz'], default: 'aprendiz' })
  role: 'desarrollador' | 'instructor' | 'aprendiz';

  @CreateDateColumn({type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP', name: 'created_at'})
  createdAt: Date;

  @UpdateDateColumn({type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP', name: 'updated_at'})
  updatedAt: Date;

  @OneToOne(() => Profile, {nullable: true, cascade: true})
  @JoinColumn({name: 'profile_id'})
  profile: Profile;

  @OneToMany(() => Post, (post) => post.user)
  posts: Post[];

  @OneToMany(() => Event, (events) => events.user)
  events: Event[];

  @ManyToMany(() => Conversation, (conversation) => conversation.participants)
  conversations: Conversation[];

  @OneToMany(() => Message, (message) => message.sender)
  messages: Message[];

  @BeforeInsert()
  async hashPassword() {
    this.password = await bcrypt.hash(this.password, 10);
  }
}
