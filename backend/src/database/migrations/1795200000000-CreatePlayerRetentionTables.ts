import { MigrationInterface, QueryRunner } from "typeorm";

export class CreatePlayerRetentionTables1795200000000 implements MigrationInterface {
    name = 'CreatePlayerRetentionTables1795200000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. user_daily_spins table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "user_daily_spins" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "user_id" uuid NOT NULL,
                "agency_id" uuid,
                "reward_type" character varying NOT NULL DEFAULT 'nothing',
                "reward_amount" numeric(10,2) NOT NULL DEFAULT 0.00,
                "reward_label" character varying NOT NULL,
                "spun_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_user_daily_spins_id" PRIMARY KEY ("id"),
                CONSTRAINT "FK_user_daily_spins_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
            )
        `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_user_daily_spins_user_id" ON "user_daily_spins" ("user_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_user_daily_spins_spun_at" ON "user_daily_spins" ("spun_at")`);

        // 2. user_notifications table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "user_notifications" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "user_id" uuid NOT NULL,
                "title" character varying NOT NULL,
                "message" text NOT NULL,
                "type" character varying NOT NULL DEFAULT 'system',
                "data" jsonb,
                "is_read" boolean NOT NULL DEFAULT false,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_user_notifications_id" PRIMARY KEY ("id"),
                CONSTRAINT "FK_user_notifications_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
            )
        `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_user_notifications_user_id" ON "user_notifications" ("user_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_user_notifications_is_read" ON "user_notifications" ("user_id", "is_read")`);

        // 3. user_vip_claims table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "user_vip_claims" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "user_id" uuid NOT NULL,
                "tier_level" integer NOT NULL,
                "tier_name" character varying NOT NULL,
                "reward_amount" numeric(10,2) NOT NULL,
                "claimed_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_user_vip_claims_id" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_user_vip_claim_tier" UNIQUE ("user_id", "tier_level"),
                CONSTRAINT "FK_user_vip_claims_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
            )
        `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_user_vip_claims_user_id" ON "user_vip_claims" ("user_id")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "user_vip_claims"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "user_notifications"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "user_daily_spins"`);
    }
}
