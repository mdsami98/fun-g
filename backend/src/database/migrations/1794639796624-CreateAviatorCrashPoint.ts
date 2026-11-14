import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateAviatorCrashPoint1794639796624 implements MigrationInterface {
    name = 'CreateAviatorCrashPoint1794639796624'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "aviator_crash_point" ("id" SERIAL NOT NULL, "crashScore" numeric(10,2) NOT NULL, "nextPick" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "CHK_aviator_crash_point_score_min" CHECK ("crashScore" >= 1), CONSTRAINT "PK_7b6a733326d9dfdf41c547ddbd9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_aviator_crash_point_single_next_pick" ON "aviator_crash_point"  ("nextPick") WHERE "nextPick" = true`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_aviator_crash_point_single_next_pick"`);
        await queryRunner.query(`DROP TABLE "aviator_crash_point"`);
    }

}
