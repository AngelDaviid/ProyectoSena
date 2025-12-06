import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventsService } from './services/events.service';
import { EventsController } from './controllers/events.controller';
import { EventsGateway } from './events.gateway';
import { Event } from './entities/events.entity';
import { Category } from '../posts/entities/category.entity';
import { CloudinaryService } from '../common/services/cloudinary.services';

@Module({
  imports: [TypeOrmModule.forFeature([Event, Category])],
  controllers: [EventsController],
  providers: [EventsService, EventsGateway, CloudinaryService],
  exports: [EventsService, EventsGateway, CloudinaryService],
})
export class EventsModule {}
