import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { GameService } from './game.service';
import { RoundHistoryQueryDto } from './dto/round-history-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

@Controller('game')
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Get('snapshot')
  getSnapshot() {
    return this.gameService.buildSnapshot();
  }

  @Get('rounds')
  getRoundHistory(@Query() query: RoundHistoryQueryDto) {
    return this.gameService.getRoundHistory(query);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-bets')
  getMyBets(@CurrentUser() user: AuthenticatedUser, @Query() query: RoundHistoryQueryDto) {
    return this.gameService.getMyBetHistory(user.userId, query);
  }

  @UseGuards(JwtAuthGuard)
  @Get('prediction')
  getPrediction() {
    return this.gameService.getAdminPrediction();
  }
}

