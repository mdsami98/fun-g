import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { UsePipes, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { GameEngineService } from './game-engine.service';
import { GameService } from './game.service';
import { PlaceBetDto } from './dto/place-bet.dto';
import { AuthenticatedUser, JwtPayload } from '../auth/strategies/jwt.strategy';

@WebSocketGateway({ cors: { origin: '*' } })
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class GameGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly engine: GameEngineService,
    private readonly gameService: GameService,
  ) {
    this.engine.on('betting_opened', (payload) => {
      this.server.emit('game:betting_opened', payload);
    });
    this.engine.on('round_started', (payload) => {
      this.server.emit('game:round_started', payload);
    });
    this.engine.on('tick', (payload) => {
      this.server.emit('game:tick', payload);
    });
    this.engine.on('round_crashed', (payload) => {
      this.server.emit('game:round_crashed', payload);
    });
  }

  async handleConnection(client: Socket) {
    const token = client.handshake.auth?.token as string | undefined;
    let user: AuthenticatedUser | null = null;

    if (token) {
      try {
        const payload = this.jwtService.verify<JwtPayload>(token);
        user = { userId: payload.sub, role: payload.role, agencyId: payload.agencyId };
      } catch {
        user = null;
      }
    }

    client.data.user = user;
    if (user) {
      await client.join(`user:${user.userId}`);
    }

    const snapshot = await this.gameService.buildSnapshot(user?.userId);
    client.emit('game:snapshot', snapshot);
  }

  @SubscribeMessage('placeBet')
  async onPlaceBet(@ConnectedSocket() client: Socket, @MessageBody() dto: PlaceBetDto) {
    const user = client.data.user as AuthenticatedUser | null;
    if (!user) return { ok: false, reason: 'AUTH_REQUIRED' };

    const result = await this.gameService.placeBet(user.userId, dto);
    if (result.ok) {
      this.server.to(`user:${user.userId}`).emit('game:balance_update', {
        balance: result.balance,
        reason: 'bet_placed',
      });
    }
    return result;
  }

  @SubscribeMessage('cashOut')
  async onCashOut(@ConnectedSocket() client: Socket) {
    const user = client.data.user as AuthenticatedUser | null;
    if (!user) return { ok: false, reason: 'AUTH_REQUIRED' };

    const result = await this.gameService.cashOut(user.userId);
    if (result.ok) {
      this.server.to(`user:${user.userId}`).emit('game:balance_update', {
        balance: result.balance,
        reason: 'cash_out',
      });
    }
    return result;
  }
}
