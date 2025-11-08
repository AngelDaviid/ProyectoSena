import { Controller, Get, Post, Body, Param, ParseIntPipe, UseGuards, Req, Query, Put } from '@nestjs/common';
import { FriendsService } from '../services/friend.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('friends')
export class FriendsController {
  constructor(private friendsService: FriendsService) {}

  // Buscar usuarios (GET /friends/search?q=...)
  @UseGuards(AuthGuard('jwt'))
  @Get('search')
  async search(@Query('q') q: string, @Req() req: any) {
    return this.friendsService.searchUsers(q || '', req.user.id);
  }

  // Enviar solicitud (POST /friends/requests) { receiverId }
  @UseGuards(AuthGuard('jwt'))
  @Post('requests')
  async sendRequest(@Body('receiverId', ParseIntPipe) receiverId: number, @Req() req: any) {
    return this.friendsService.sendRequest(req.user.id, receiverId);
  }

  // Listar entrantes
  @UseGuards(AuthGuard('jwt'))
  @Get('requests/incoming')
  async incoming(@Req() req: any) {
    return this.friendsService.getIncoming(req.user.id);
  }

  // Listar salientes
  @UseGuards(AuthGuard('jwt'))
  @Get('requests/outgoing')
  async outgoing(@Req() req: any) {
    return this.friendsService.getOutgoing(req.user.id);
  }

  // Responder solicitud (PUT /friends/requests/:id/respond) { accept: boolean }
  @UseGuards(AuthGuard('jwt'))
  @Put('requests/:id/respond')
  async respond(@Param('id', ParseIntPipe) id: number, @Body('accept') accept: boolean, @Req() req: any) {
    return this.friendsService.respondRequest(id, req.user.id, accept);
  }

  // Obtener lista de amigos
  @UseGuards(AuthGuard('jwt'))
  @Get()
  async getFriends(@Req() req: any) {
    return this.friendsService.getFriends(req.user.id);
  }
}
