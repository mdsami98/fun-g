import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrashSeed } from './entities/crash-seed.entity';
import { CRASH_SEED_COUNT, generateCrashScores } from './crash-seed-generator';

export interface PickedCrashSeed {
  seedId: number;
  crashPoint: number;
}

@Injectable()
export class CrashSeedService {
  private readonly logger = new Logger(CrashSeedService.name);

  constructor(
    @InjectRepository(CrashSeed)
    private readonly seedRepo: Repository<CrashSeed>,
  ) {}

  /** Fills aviator_crash_point with the default pool when the table is empty. */
  async ensureSeeded(houseEdge: number, maxMultiplier: number): Promise<void> {
    if ((await this.seedRepo.count()) > 0) return;
    const scores = generateCrashScores(
      houseEdge,
      maxMultiplier,
      CRASH_SEED_COUNT,
    );
    await this.seedRepo.insert(
      scores.map((s) => ({ crashScore: s.toFixed(2) })),
    );
    this.logger.log(
      `aviator_crash_point was empty: inserted ${scores.length} default crash scores`,
    );
  }

  /**
   * Returns the crash score for the round about to start.
   * Uses the row flagged nextPick; if no row is flagged, picks a random row.
   * Then clears that flag and flags a different random row for the round after.
   */
  async pickNext(): Promise<PickedCrashSeed> {
    return this.seedRepo.manager.transaction(async (em) => {
      const seeds = em.getRepository(CrashSeed);

      let picked = await seeds.findOne({
        where: { nextPick: true },
        lock: { mode: 'pessimistic_write' },
      });
      if (!picked) {
        picked = await seeds
          .createQueryBuilder('s')
          .orderBy('RANDOM()')
          .limit(1)
          .getOne();
      }
      if (!picked) {
        throw new Error(
          'aviator_crash_point is empty: run `npm run seed:crash-seeds`',
        );
      }

      if (picked.nextPick) {
        await seeds.update(picked.id, { nextPick: false });
      }

      const next = await seeds
        .createQueryBuilder('s')
        .where('s.id <> :id', { id: picked.id })
        .orderBy('RANDOM()')
        .limit(1)
        .getOne();
      if (next) {
        await seeds.update(next.id, { nextPick: true });
      }

      return { seedId: picked.id, crashPoint: Number(picked.crashScore) };
    });
  }
}
