import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import { GameRound } from './entities/game-round.entity';
import { GameBet } from './entities/game-bet.entity';
import { GameRoundStatus } from './enums/game-round-status.enum';
import { GameBetStatus } from './enums/game-bet-status.enum';
import { GameConfig, getGameConfig } from './config/game.config';

export interface CurrentRoundState {
  id: string;
  phase: GameRoundStatus;
  crashPoint: number;
  bettingClosesAt: number;
  startedAt: number | null;
}

export interface RoundHistoryEntry {
  roundId: string;
  crashPoint: string;
  crashedAt: string;
}

@Injectable()
export class GameEngineService extends EventEmitter implements OnApplicationBootstrap {
  private readonly logger = new Logger(GameEngineService.name);
  private readonly config: GameConfig;

  private tickHandle: NodeJS.Timeout | null = null;
  private phaseTimer: NodeJS.Timeout | null = null;
  private history: RoundHistoryEntry[] = [];
  private _currentRound: CurrentRoundState | null = null;

  constructor(
    configService: ConfigService,
    @InjectRepository(GameRound) private readonly roundRepo: Repository<GameRound>,
    @InjectRepository(GameBet) private readonly betRepo: Repository<GameBet>,
  ) {
    super();
    this.config = getGameConfig(configService);
  }

  async onApplicationBootstrap() {
    await this.startBettingPhase();
  }

  getCurrentRoundState(): CurrentRoundState | null {
    return this._currentRound;
  }

  getConfig(): GameConfig {
    return this.config;
  }

  getHistory(): RoundHistoryEntry[] {
    return this.history;
  }

  /** Live multiplier right now, clamped to the crash point, server-authoritative. */
  getLiveMultiplier(): number {
    const round = this._currentRound;
    if (!round || round.phase !== GameRoundStatus.RUNNING || round.startedAt === null) {
      return 1.0;
    }
    const elapsed = Date.now() - round.startedAt;
    return Math.min(this.multiplierAt(elapsed), round.crashPoint);
  }

  private multiplierAt(elapsedMs: number): number {
    return Math.pow(this.config.growthBase, elapsedMs);
  }

  private generateCrashPoint(): { crashPoint: number; randomSeed: string } {
    const r = crypto.randomInt(0, 1_000_000) / 1_000_000;
    let crashPoint: number;
    if (r < this.config.houseEdge) {
      crashPoint = 1.0;
    } else {
      crashPoint = Math.floor((100 * (1 - this.config.houseEdge)) / (1 - r)) / 100;
    }
    crashPoint = Math.min(Math.max(crashPoint, 1.0), this.config.maxMultiplier);
    return { crashPoint, randomSeed: r.toFixed(6) };
  }

  private async startBettingPhase() {
    const { crashPoint, randomSeed } = this.generateCrashPoint();
    const now = new Date();

    const saved = await this.roundRepo.save(
      this.roundRepo.create({
        status: GameRoundStatus.BETTING,
        crashPoint: crashPoint.toFixed(2),
        randomSeed,
        bettingStartedAt: now,
        bettingDurationMs: this.config.bettingDurationMs,
        startedAt: null,
        crashedAt: null,
      }),
    );

    const bettingClosesAt = now.getTime() + this.config.bettingDurationMs;
    this._currentRound = {
      id: saved.id,
      phase: GameRoundStatus.BETTING,
      crashPoint,
      bettingClosesAt,
      startedAt: null,
    };

    this.emit('betting_opened', {
      roundId: saved.id,
      bettingClosesAt: new Date(bettingClosesAt).toISOString(),
    });

    this.phaseTimer = setTimeout(() => {
      void this.startRunningPhase();
    }, this.config.bettingDurationMs);
  }

  private async startRunningPhase() {
    const round = this._currentRound;
    if (!round) return;

    const startedAt = Date.now();
    round.phase = GameRoundStatus.RUNNING;
    round.startedAt = startedAt;

    await this.roundRepo.update(round.id, {
      status: GameRoundStatus.RUNNING,
      startedAt: new Date(startedAt),
    });

    this.emit('round_started', { roundId: round.id, startedAt: new Date(startedAt).toISOString() });

    this.tickHandle = setInterval(() => {
      const current = this._currentRound;
      if (!current || current.phase !== GameRoundStatus.RUNNING || current.startedAt === null) {
        return;
      }
      const elapsed = Date.now() - current.startedAt;
      const multiplier = this.multiplierAt(elapsed);
      if (multiplier >= current.crashPoint) {
        this.crashRound();
        return;
      }
      this.emit('tick', { roundId: current.id, multiplier: multiplier.toFixed(2) });
    }, this.config.tickIntervalMs);
  }

  private crashRound() {
    const round = this._currentRound;
    if (!round) return;

    if (this.tickHandle) {
      clearInterval(this.tickHandle);
      this.tickHandle = null;
    }

    round.phase = GameRoundStatus.CRASHED;
    const crashedAt = new Date();
    const crashPointStr = round.crashPoint.toFixed(2);

    this.emit('round_crashed', {
      roundId: round.id,
      crashPoint: crashPointStr,
      crashedAt: crashedAt.toISOString(),
    });

    this.history.unshift({ roundId: round.id, crashPoint: crashPointStr, crashedAt: crashedAt.toISOString() });
    if (this.history.length > 20) this.history.length = 20;

    void this.settleCrash(round.id, crashedAt).catch((err) =>
      this.logger.error(`settleCrash failed for round ${round.id}`, err),
    );

    this.phaseTimer = setTimeout(() => {
      void this.startBettingPhase();
    }, this.config.crashPauseMs);
  }

  private async settleCrash(roundId: string, crashedAt: Date) {
    await this.roundRepo.update(roundId, { status: GameRoundStatus.CRASHED, crashedAt });
    await this.betRepo
      .createQueryBuilder()
      .update(GameBet)
      .set({ status: GameBetStatus.LOST, resolvedAt: crashedAt })
      .where('roundId = :roundId AND status = :status', {
        roundId,
        status: GameBetStatus.PENDING,
      })
      .execute();
  }
}
