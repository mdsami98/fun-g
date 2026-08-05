import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import Decimal from 'decimal.js';
import { GameEngineService } from './game-engine.service';
import { GameRound } from './entities/game-round.entity';
import { GameBet } from './entities/game-bet.entity';
import { GameRoundStatus } from './enums/game-round-status.enum';
import { GameBetStatus } from './enums/game-bet-status.enum';
import { User } from '../users/entities/user.entity';
import { PlaceBetDto } from './dto/place-bet.dto';
import { RoundHistoryQueryDto } from './dto/round-history-query.dto';

export interface PlaceBetResult {
  ok: true;
  bet: { id: string; amount: string; status: GameBetStatus };
  balance: string;
}

export interface CashOutResult {
  ok: true;
  cashOutMultiplier: string;
  payout: string;
  balance: string;
}

export type ActionFailure = { ok: false; reason: string };

function mapErrorReason(err: unknown): string {
  if (
    err instanceof BadRequestException ||
    err instanceof ConflictException ||
    err instanceof NotFoundException
  ) {
    return typeof err.message === 'string' ? err.message : 'ERROR';
  }
  return 'INTERNAL_ERROR';
}

@Injectable()
export class GameService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly engine: GameEngineService,
    @InjectRepository(GameBet) private readonly betRepo: Repository<GameBet>,
    @InjectRepository(GameRound) private readonly roundRepo: Repository<GameRound>,
  ) {}

  async placeBet(userId: string, dto: PlaceBetDto): Promise<PlaceBetResult | ActionFailure> {
    const round = this.engine.getCurrentRoundState();
    if (!round || round.phase !== GameRoundStatus.BETTING) {
      return { ok: false, reason: 'BETTING_CLOSED' };
    }

    const config = this.engine.getConfig();
    if (dto.amount < config.minBet || dto.amount > config.maxBet) {
      return { ok: false, reason: 'INVALID_AMOUNT' };
    }

    const roundIdAtEntry = round.id;

    try {
      const result = await this.dataSource.transaction(async (manager) => {
        const userRepo = manager.getRepository(User);
        const user = await userRepo
          .createQueryBuilder('user')
          .setLock('pessimistic_write')
          .where('user.id = :id', { id: userId })
          .getOne();
        if (!user) throw new NotFoundException('USER_NOT_FOUND');

        const currentRoundNow = this.engine.getCurrentRoundState();
        if (
          !currentRoundNow ||
          currentRoundNow.id !== roundIdAtEntry ||
          currentRoundNow.phase !== GameRoundStatus.BETTING
        ) {
          throw new ConflictException('BETTING_CLOSED');
        }

        const existing = await manager
          .getRepository(GameBet)
          .findOne({ where: { roundId: roundIdAtEntry, userId } });
        if (existing) throw new ConflictException('ALREADY_BET_THIS_ROUND');

        const balance = new Decimal(user.balance);
        const betAmount = new Decimal(dto.amount);
        if (balance.lessThan(betAmount)) throw new BadRequestException('INSUFFICIENT_BALANCE');

        user.balance = balance.minus(betAmount).toFixed(2);
        await userRepo.save(user);

        const bet = await manager.getRepository(GameBet).save(
          manager.getRepository(GameBet).create({
            roundId: roundIdAtEntry,
            userId,
            amount: betAmount.toFixed(2),
            status: GameBetStatus.PENDING,
          }),
        );

        return { bet, balance: user.balance };
      });

      return {
        ok: true,
        bet: { id: result.bet.id, amount: result.bet.amount, status: result.bet.status },
        balance: result.balance,
      };
    } catch (err) {
      return { ok: false, reason: mapErrorReason(err) };
    }
  }

  async cashOut(userId: string): Promise<CashOutResult | ActionFailure> {
    const round = this.engine.getCurrentRoundState();
    if (!round || round.phase !== GameRoundStatus.RUNNING || round.startedAt === null) {
      return { ok: false, reason: 'ROUND_NOT_RUNNING' };
    }

    const growthBase = this.engine.getConfig().growthBase;
    const elapsed = Date.now() - round.startedAt;
    const multiplier = Math.pow(growthBase, elapsed);
    if (multiplier >= round.crashPoint) {
      return { ok: false, reason: 'TOO_LATE_ALREADY_CRASHED' };
    }

    const roundIdAtEntry = round.id;

    try {
      const result = await this.dataSource.transaction(async (manager) => {
        const bet = await manager
          .getRepository(GameBet)
          .createQueryBuilder('bet')
          .setLock('pessimistic_write')
          .where('bet.roundId = :roundId AND bet.userId = :userId', {
            roundId: roundIdAtEntry,
            userId,
          })
          .getOne();
        if (!bet) throw new NotFoundException('NO_BET_THIS_ROUND');
        if (bet.status !== GameBetStatus.PENDING) throw new ConflictException('ALREADY_RESOLVED');

        const currentRoundNow = this.engine.getCurrentRoundState();
        const elapsedNow =
          currentRoundNow?.startedAt !== null && currentRoundNow?.startedAt !== undefined
            ? Date.now() - currentRoundNow.startedAt
            : Infinity;
        const multiplierNow = Math.pow(growthBase, elapsedNow);
        if (
          !currentRoundNow ||
          currentRoundNow.id !== roundIdAtEntry ||
          currentRoundNow.phase !== GameRoundStatus.RUNNING ||
          multiplierNow >= currentRoundNow.crashPoint
        ) {
          throw new ConflictException('TOO_LATE_ALREADY_CRASHED');
        }

        // Round the multiplier first, then derive payout from that same rounded
        // value — otherwise the displayed multiplier and payout don't reconcile
        // (e.g. amount × displayed multiplier != displayed payout).
        const roundedMultiplier = new Decimal(multiplierNow).toDecimalPlaces(2);
        const payout = new Decimal(bet.amount).times(roundedMultiplier).toFixed(2);
        bet.status = GameBetStatus.CASHED_OUT;
        bet.cashOutMultiplier = roundedMultiplier.toFixed(2);
        bet.payout = payout;
        bet.resolvedAt = new Date();
        await manager.getRepository(GameBet).save(bet);

        const userRepo = manager.getRepository(User);
        const user = await userRepo
          .createQueryBuilder('user')
          .setLock('pessimistic_write')
          .where('user.id = :id', { id: userId })
          .getOne();
        if (!user) throw new NotFoundException('USER_NOT_FOUND');
        user.balance = new Decimal(user.balance).plus(payout).toFixed(2);
        await userRepo.save(user);

        return {
          cashOutMultiplier: bet.cashOutMultiplier as string,
          payout,
          balance: user.balance,
        };
      });

      return { ok: true, ...result };
    } catch (err) {
      return { ok: false, reason: mapErrorReason(err) };
    }
  }

  async buildSnapshot(userId?: string) {
    const round = this.engine.getCurrentRoundState();
    const config = this.engine.getConfig();

    let myBet: {
      id: string;
      amount: string;
      status: GameBetStatus;
      cashOutMultiplier: string | null;
      payout: string | null;
    } | null = null;
    let balance: string | null = null;

    if (userId) {
      const user = await this.dataSource.getRepository(User).findOne({ where: { id: userId } });
      balance = user?.balance ?? null;

      if (round) {
        const bet = await this.betRepo.findOne({ where: { roundId: round.id, userId } });
        if (bet) {
          myBet = {
            id: bet.id,
            amount: bet.amount,
            status: bet.status,
            cashOutMultiplier: bet.cashOutMultiplier,
            payout: bet.payout,
          };
        }
      }
    }

    return {
      round: round
        ? {
            id: round.id,
            status: round.phase,
            crashPoint: round.phase === GameRoundStatus.CRASHED ? round.crashPoint.toFixed(2) : null,
          }
        : null,
      bettingClosesAt:
        round?.phase === GameRoundStatus.BETTING ? new Date(round.bettingClosesAt).toISOString() : null,
      startedAt: round?.startedAt ? new Date(round.startedAt).toISOString() : null,
      currentMultiplier: this.engine.getLiveMultiplier().toFixed(2),
      growthBase: config.growthBase,
      history: this.engine.getHistory(),
      myBet,
      balance,
    };
  }

  async getMyBetHistory(userId: string, query: RoundHistoryQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const [items, total] = await this.betRepo.findAndCount({
      where: { userId },
      order: { placedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total, page, limit };
  }

  async getRoundHistory(query: RoundHistoryQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const [items, total] = await this.roundRepo.findAndCount({
      where: { status: GameRoundStatus.CRASHED },
      order: { crashedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total, page, limit };
  }
}
