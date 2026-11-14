import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { ConfigService } from '@nestjs/config';
import dataSource from '../data-source';
import { CrashSeed } from '../../game/entities/crash-seed.entity';
import { getGameConfig } from '../../game/config/game.config';
import {
  CRASH_SEED_COUNT,
  bestReturnAtAnyTarget,
  generateCrashScores,
  returnAtTarget,
} from '../../game/crash-seed-generator';

dotenv.config();

/**
 * Fills aviator_crash_point with the default pool of 1000 crash scores.
 *   npm run seed:crash-seeds            fill only if the table is empty
 *   npm run seed:crash-seeds -- --reset replace every row (e.g. after changing GAME_HOUSE_EDGE)
 */
async function seedCrashSeeds() {
  const reset = process.argv.includes('--reset');
  const { houseEdge, maxMultiplier } = getGameConfig(new ConfigService());

  await dataSource.initialize();
  const repo = dataSource.getRepository(CrashSeed);

  const existing = await repo.count();
  if (existing > 0 && !reset) {
    console.log(
      `aviator_crash_point already has ${existing} rows. Skipping (pass --reset to replace them).`,
    );
    await dataSource.destroy();
    return;
  }

  const scores = generateCrashScores(
    houseEdge,
    maxMultiplier,
    CRASH_SEED_COUNT,
  );
  await dataSource.transaction(async (em) => {
    await em.createQueryBuilder().delete().from(CrashSeed).execute();
    await em
      .getRepository(CrashSeed)
      .insert(scores.map((s) => ({ crashScore: s.toFixed(2) })));
  });

  const atOne = scores.filter((s) => s === 1).length;
  const rtp = [1.5, 2, 5, 10, 100]
    .map((t) => `${t}x → ${(returnAtTarget(scores, t) * 100).toFixed(1)}%`)
    .join(', ');
  console.log(
    `Inserted ${scores.length} crash scores (house edge ${houseEdge}, max ${maxMultiplier}x). ` +
      `${atOne} rows at 1.00x, highest ${Math.max(...scores)}x.`,
  );
  console.log(`Player return when always cashing out at: ${rtp}`);
  console.log(
    `Best return any fixed cash-out target can get: ${(bestReturnAtAnyTarget(scores) * 100).toFixed(2)}%`,
  );
  await dataSource.destroy();
}

seedCrashSeeds().catch((error) => {
  console.error('Failed to seed aviator_crash_point:', error);
  process.exit(1);
});
