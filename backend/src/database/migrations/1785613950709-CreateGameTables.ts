import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateGameTables1785613950709 implements MigrationInterface {
    name = 'CreateGameTables1785613950709'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."game_rounds_status_enum" AS ENUM('betting', 'running', 'crashed')`);
        await queryRunner.query(`CREATE TABLE "game_rounds" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "status" "public"."game_rounds_status_enum" NOT NULL DEFAULT 'betting', "crashPoint" numeric(10,2) NOT NULL, "randomSeed" character varying, "bettingStartedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "bettingDurationMs" integer NOT NULL, "startedAt" TIMESTAMP WITH TIME ZONE, "crashedAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_9f9de91990bb512595f1058b98c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."game_bets_status_enum" AS ENUM('pending', 'cashed_out', 'lost')`);
        await queryRunner.query(`CREATE TABLE "game_bets" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "roundId" uuid NOT NULL, "userId" uuid NOT NULL, "amount" numeric(12,2) NOT NULL, "status" "public"."game_bets_status_enum" NOT NULL DEFAULT 'pending', "cashOutMultiplier" numeric(10,2), "payout" numeric(12,2), "placedAt" TIMESTAMP NOT NULL DEFAULT now(), "resolvedAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_bd4ac25722cbb5df9089fc0dfc0" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_a11d3e71623e31542c28d66bb4" ON "game_bets"  ("roundId", "userId") `);
        await queryRunner.query(`ALTER TABLE "game_bets" ADD CONSTRAINT "FK_dab4903d72774d535e3b6974ef0" FOREIGN KEY ("roundId") REFERENCES "game_rounds"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "game_bets" ADD CONSTRAINT "FK_555df88e21e263fddcdc4b7ce0f" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "game_bets" DROP CONSTRAINT "FK_555df88e21e263fddcdc4b7ce0f"`);
        await queryRunner.query(`ALTER TABLE "game_bets" DROP CONSTRAINT "FK_dab4903d72774d535e3b6974ef0"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a11d3e71623e31542c28d66bb4"`);
        await queryRunner.query(`DROP TABLE "game_bets"`);
        await queryRunner.query(`DROP TYPE "public"."game_bets_status_enum"`);
        await queryRunner.query(`DROP TABLE "game_rounds"`);
        await queryRunner.query(`DROP TYPE "public"."game_rounds_status_enum"`);
    }

}
