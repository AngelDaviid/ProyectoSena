import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FriendRequest } from './entities/firend-request.entity';
import { User } from '../users/entities/user.entity';
import { FriendsService } from './services/friend.service';
import { FriendsController } from './controllers/friend.controller';
import { FriendsGateway } from './friends.gateway';
import { Conversation } from '../chat/entities/conversations.entity';



@Module({
  imports: [TypeOrmModule.forFeature([FriendRequest,User, Conversation])],
  providers: [FriendsController, FriendsGateway, FriendsService ],
  controllers: [FriendsController],
  exports: [FriendsController, FriendsGateway],
})


export class FriendModule {}
