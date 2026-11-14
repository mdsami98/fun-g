import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateAgencyWalletNumbers1794700000000 implements MigrationInterface {
    name = 'CreateAgencyWalletNumbers1794700000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."agency_wallet_numbers_provider_enum" AS ENUM('bkash', 'nagad', 'rocket')`);
        await queryRunner.query(`CREATE TYPE "public"."agency_wallet_numbers_account_type_enum" AS ENUM('personal', 'agent', 'merchant')`);
        await queryRunner.query(`CREATE TABLE "agency_wallet_numbers" ("id" BIGSERIAL NOT NULL, "agency_id" uuid NOT NULL, "provider" "public"."agency_wallet_numbers_provider_enum" NOT NULL, "number" character varying(20) NOT NULL, "account_type" "public"."agency_wallet_numbers_account_type_enum" NOT NULL DEFAULT 'personal', "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_agency_wallet_numbers_id" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_agency_wallet_numbers_agency_id" ON "agency_wallet_numbers" ("agency_id")`);
        await queryRunner.query(`ALTER TABLE "agency_wallet_numbers" ADD CONSTRAINT "FK_agency_wallet_numbers_agency" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "agency_wallet_numbers" DROP CONSTRAINT "FK_agency_wallet_numbers_agency"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_agency_wallet_numbers_agency_id"`);
        await queryRunner.query(`DROP TABLE "agency_wallet_numbers"`);
        await queryRunner.query(`DROP TYPE "public"."agency_wallet_numbers_account_type_enum"`);
        await queryRunner.query(`DROP TYPE "public"."agency_wallet_numbers_provider_enum"`);
    }
}
