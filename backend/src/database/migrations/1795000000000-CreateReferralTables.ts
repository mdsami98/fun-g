import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateReferralTables1795000000000 implements MigrationInterface {
  name = 'CreateReferralTables1795000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add referral_bonus value to wallet_request_type_enum
    await queryRunner.query(
      `ALTER TYPE "public"."wallet_request_type_enum" ADD VALUE IF NOT EXISTS 'referral_bonus'`,
    );

    // 2. Create user_referral_configs_mode_enum
    await queryRunner.query(
      `DO $$ BEGIN
        CREATE TYPE "public"."user_referral_configs_mode_enum" AS ENUM('lifetime', 'window');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;`,
    );

    // 3. Create user_referral_configs table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_referral_configs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "agency_id" uuid NOT NULL,
        "referral_code" character varying(16) NOT NULL,
        "mode" "public"."user_referral_configs_mode_enum" NOT NULL DEFAULT 'lifetime',
        "max_referrals" integer NOT NULL DEFAULT 5,
        "reset_window_hours" integer NOT NULL DEFAULT 0,
        "bonus_amount" numeric(10,2) NOT NULL DEFAULT 10.00,
        "current_window_start" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "current_window_count" integer NOT NULL DEFAULT 0,
        "total_lifetime_count" integer NOT NULL DEFAULT 0,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_referral_configs_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_user_referral_configs_user_id" UNIQUE ("user_id"),
        CONSTRAINT "UQ_user_referral_configs_referral_code" UNIQUE ("referral_code"),
        CONSTRAINT "FK_user_referral_configs_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_user_referral_configs_agency" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE CASCADE
      )
    `);

    // 4. Create referral_history table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "referral_history" (
        "id" BIGSERIAL NOT NULL,
        "referrer_id" uuid NOT NULL,
        "referred_user_id" uuid NOT NULL,
        "agency_id" uuid NOT NULL,
        "referral_code" character varying(16) NOT NULL,
        "bonus_amount" numeric(10,2) NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_referral_history_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_referral_history_referrer" FOREIGN KEY ("referrer_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_referral_history_referred_user" FOREIGN KEY ("referred_user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_referral_history_agency" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "referral_history"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_referral_configs"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."user_referral_configs_mode_enum"`);
  }
}
