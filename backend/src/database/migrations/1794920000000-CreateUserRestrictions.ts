import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateUserRestrictions1794920000000 implements MigrationInterface {
    name = 'CreateUserRestrictions1794920000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "user_restrictions" (
            "id" BIGSERIAL NOT NULL,
            "user_id" uuid NOT NULL,
            "message" text NOT NULL,
            "created_at" TIMESTAMP NOT NULL DEFAULT now(),
            "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_user_restrictions_id" PRIMARY KEY ("id")
        )`);

        await queryRunner.query(`CREATE INDEX "IDX_user_restrictions_user_id" ON "user_restrictions" ("user_id")`);
        await queryRunner.query(`ALTER TABLE "user_restrictions" ADD CONSTRAINT "FK_user_restrictions_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_restrictions" DROP CONSTRAINT "FK_user_restrictions_user"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_user_restrictions_user_id"`);
        await queryRunner.query(`DROP TABLE "user_restrictions"`);
    }
}
