import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAgencyDefaultReferralColumns1795100000000 implements MigrationInterface {
    name = 'AddAgencyDefaultReferralColumns1795100000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "agencies" ADD COLUMN IF NOT EXISTS "default_referral_mode" character varying NOT NULL DEFAULT 'lifetime'`);
        await queryRunner.query(`ALTER TABLE "agencies" ADD COLUMN IF NOT EXISTS "default_max_referrals" integer NOT NULL DEFAULT 5`);
        await queryRunner.query(`ALTER TABLE "agencies" ADD COLUMN IF NOT EXISTS "default_reset_window_hours" integer NOT NULL DEFAULT 24`);
        await queryRunner.query(`ALTER TABLE "agencies" ADD COLUMN IF NOT EXISTS "default_referral_bonus" numeric(10,2) NOT NULL DEFAULT 10.00`);
        await queryRunner.query(`ALTER TABLE "agencies" ADD COLUMN IF NOT EXISTS "is_referral_enabled" boolean NOT NULL DEFAULT true`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "agencies" DROP COLUMN IF EXISTS "is_referral_enabled"`);
        await queryRunner.query(`ALTER TABLE "agencies" DROP COLUMN IF EXISTS "default_referral_bonus"`);
        await queryRunner.query(`ALTER TABLE "agencies" DROP COLUMN IF EXISTS "default_reset_window_hours"`);
        await queryRunner.query(`ALTER TABLE "agencies" DROP COLUMN IF EXISTS "default_max_referrals"`);
        await queryRunner.query(`ALTER TABLE "agencies" DROP COLUMN IF EXISTS "default_referral_mode"`);
    }
}
