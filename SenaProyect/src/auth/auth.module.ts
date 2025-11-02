import {Module} from '@nestjs/common';
import {PassportModule} from "@nestjs/passport";
import {JwtModule} from "@nestjs/jwt";

import {AuthService} from './service/auth.service';
import {UsersModule} from "../users/users.module";
import {LocalStrategy} from "./strategies/loca.strategy";
import {JwtStrategy} from "./strategies/jwt.stategy";
import {AuthController} from './controller/auth.controller';
import {ConfigService} from "@nestjs/config";
import {Env} from "../env.model";

@Module({
  imports: [UsersModule, PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<Env>) => ({
        secret: configService.get('JWT_SECRET', { infer: true}),
        signOptions: { expiresIn: '6d'}
      })
    })
  ],
  providers: [AuthService, LocalStrategy, JwtStrategy],
  controllers: [AuthController],
})
export class AuthModule {
}
