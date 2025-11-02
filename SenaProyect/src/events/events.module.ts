import {Module} from '@nestjs/common';
import {TypeOrmModule} from "@nestjs/typeorm";
import {Event} from './entities/events.entity';
import {EventsController} from './controllers/events.controller';
import {EventsService} from './services/events.service';

@Module({
  imports: [TypeOrmModule.forFeature([Event])],
  controllers: [EventsController],
  providers: [EventsService]
})
export class EventsModule {}
