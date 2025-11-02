import { Controller, Post, UseGuards, Req, Body } from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from '../service/auth.service';
import { User } from '../../users/entities/user.entity';
import{ CreateUserDto } from '../../users/dtos/user.dto';
import { UsersService } from '../../users/services/users.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService
  ) {}

  @UseGuards(AuthGuard('local'))
  @Post('login')
  login(@Req() req: Request) {
    const user = req.user as User;

    const { password, ...safeUser } = user as any;

    const access_token = this.authService.generateToken(user);

    return {
      user: safeUser,
      access_token,
    };
  }

  @Post('register')
  async register(@Body() dto: CreateUserDto) {
    const user = await this.usersService.create(dto);

    const access_token = this.authService.generateToken(user);

    const { password, ...safeUser } = user as any;

    return {
      user: safeUser,
      access_token,
    };
  }
}
