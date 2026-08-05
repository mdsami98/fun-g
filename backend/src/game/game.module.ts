import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameRound } from './entities/game-round.entity';
import { GameBet } from './entities/game-bet.entity';
import { GameEngineService } from './game-engine.service';
import { GameService } from './game.service';
import { GameGateway } from './game.gateway';
import { GameController } from './game.controller';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [TypeOrmModule.forFeature([GameRound, GameBet]), AuthModule, UsersModule],
  providers: [GameEngineService, GameService, GameGateway],
  controllers: [GameController],
})
export class GameModule {}
