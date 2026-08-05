import { ConfigService } from '@nestjs/config';

export interface GameConfig {
  bettingDurationMs: number;
  crashPauseMs: number;
  tickIntervalMs: number;
  houseEdge: number;
  growthBase: number;
  maxMultiplier: number;
  minBet: number;
  maxBet: number;
}

function getNumber(config: ConfigService, key: string, fallback: number): number {
  const raw = config.get<string | number>(key);
  if (raw === undefined || raw === null || raw === '') return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function getGameConfig(config: ConfigService): GameConfig {
  return {
    bettingDurationMs: getNumber(config, 'GAME_BETTING_DURATION_MS', 7000),
    crashPauseMs: getNumber(config, 'GAME_CRASH_PAUSE_MS', 4000),
    tickIntervalMs: getNumber(config, 'GAME_TICK_INTERVAL_MS', 100),
    houseEdge: getNumber(config, 'GAME_HOUSE_EDGE', 0.03),
    growthBase: getNumber(config, 'GAME_GROWTH_BASE', 1.000063),
    maxMultiplier: getNumber(config, 'GAME_MAX_MULTIPLIER', 1000),
    minBet: getNumber(config, 'GAME_MIN_BET', 10),
    maxBet: getNumber(config, 'GAME_MAX_BET', 10000),
  };
}
