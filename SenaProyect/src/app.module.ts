import {Module} from '@nestjs/common';
import {ConfigModule, ConfigService} from "@nestjs/config";
import {TypeOrmModule} from '@nestjs/typeorm';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import {UsersModule} from './users/users.module';
import {Env} from "./env.model";
import { PostsModule } from './posts/posts.module';
import { AuthModule } from './auth/auth.module';
import { EventsModule } from './events/events.module';
import { ChatModule } from './chat/chat.module';
import { MessagesController } from './chat/controllers/message.controller';
import { UploadsController } from './uploads/uploads/uploads.controller';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      useFactory: (configService: ConfigService<Env>) => ({
        type: 'postgres',
        host: configService.get('POSTGRES_HOST', {infer: true}),
        port: configService.get('POSTGRES_PORT', {infer: true}),
        database: configService.get('POSTGRES_DB', {infer: true}),
        username: configService.get('POSTGRES_USER', {infer: true}),
        password: configService.get('POSTGRES_PASSWORD', {infer: true}),
        synchronize: false, // Set to false in production
        autoLoadEntities: true,
      }),
      inject: [ConfigService]
    }),
    UsersModule,
    PostsModule,
    AuthModule,
    EventsModule,
    ChatModule,
  ],
  providers: [],
  controllers: [MessagesController, UploadsController],
})
export class AppModule {
}
