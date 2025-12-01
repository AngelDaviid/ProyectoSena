import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Category } from '../../posts/entities/category.entity';
import { ApiProperty } from '@nestjs/swagger';

export enum EventType {
  CONFERENCE = 'conference',
  WORKSHOP = 'workshop',
  SEMINAR = 'seminar',
  SOCIAL = 'social',
  SPORTS = 'sports',
  CULTURAL = 'cultural',
  OTHER = 'other',
}

@Entity({ name: 'events' })
export class Event {
  @ApiProperty({ description: 'ID único del evento' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'Título del evento' })
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @ApiProperty({ description: 'Descripción del evento' })
  @Column({ type: 'text' })
  description: string;

  @ApiProperty({ description: 'URL de la imagen del evento', required: false })
  @Column({ nullable: true })
  imageUrl?: string;

  @ApiProperty({ description: 'Ubicación del evento' })
  @Column({ type: 'varchar', length: 255})
  location: string;


  @ApiProperty({ description: 'Fecha de inicio del evento' })
  @Column({ type: 'timestamptz', name: 'start_date' })
  startDate: Date;

  @ApiProperty({ description: 'Fecha de fin del evento' })
  @Column({ type: 'timestamptz', name: 'end_date' })
  endDate: Date;

  @ApiProperty({ description: 'Máximo de asistentes', required: false })
  @Column({ type: 'int', nullable: true, name: 'max_attendees' })
  maxAttendees?: number;

  @ApiProperty({ description: 'Indica si el evento es borrador', default: true })
  @Column({ type: 'boolean', default: true, name: 'is_draft' })
  isDraft: boolean;

  @ApiProperty({ description: 'Tipo de evento', enum: EventType })
  @Column({
    type: 'enum',
    enum: EventType,
    default: EventType.OTHER,
    name: 'event_type',
  })
  eventType: EventType;

  @ApiProperty({ description: 'Fecha de creación del evento' })
  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  @ApiProperty({ description: 'Fecha de última actualización' })
  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;

  @ApiProperty({ description: 'Usuario creador del evento', type: () => User })
  @ManyToOne(() => User, (user) => user.events, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ApiProperty({ description: 'Asistentes registrados', type: () => [User] })
  @ManyToMany(() => User)
  @JoinTable({
    name: 'event_attendees',
    joinColumn: { name: 'event_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'user_id', referencedColumnName: 'id' },
  })
  attendees: User[];

  @ApiProperty({ description: 'Categorías del evento', type: () => [Category] })
  @ManyToMany(() => Category)
  @JoinTable({
    name: 'event_categories',
    joinColumn: { name: 'event_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'category_id', referencedColumnName: 'id' },
  })
  categories: Category[];
}
