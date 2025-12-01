import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Injectable()
export class WsJwtGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtGuard.name);

  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const client: Socket = context.switchToWs().getClient();
      const token = client.handshake?. auth?.token;

      if (! token) {
        this.logger.warn(`[WS] No token provided by client ${client.id}`);
        throw new WsException('No token provided');
      }

      const payload = await this.jwtService. verifyAsync(token, {
        secret: process.env.JWT_SECRET || 'your-secret-key',
      });

      // Adjuntar el usuario al socket para uso posterior
      (client as any).user = payload;
      this.logger.debug(`[WS] Client ${client.id} authenticated as user ${payload.sub || payload.id}`);

      return true;
    } catch (err) {
      this.logger. error(`[WS] Authentication failed: ${err.message}`);
      throw new WsException('Invalid token');
    }
  }
}
