import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateDepositRequests1794800000000 implements MigrationInterface {
    name = 'CreateDepositRequests1794800000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."deposit_requests_status_enum" AS ENUM('pending', 'approved', 'rejected')`);
        await queryRunner.query(`CREATE TABLE "deposit_requests" ("id" BIGSERIAL NOT NULL, "user_id" uuid NOT NULL, "agency_id" uuid NOT NULL, "wallet_number_id" bigint, "provider" "public"."agency_wallet_numbers_provider_enum" NOT NULL, "amount" numeric(12,2) NOT NULL, "transaction_id" character varying(64) NOT NULL, "status" "public"."deposit_requests_status_enum" NOT NULL DEFAULT 'pending', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_deposit_requests_id" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_deposit_requests_user_id" ON "deposit_requests" ("user_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_deposit_requests_agency_id" ON "deposit_requests" ("agency_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_deposit_requests_transaction_id" ON "deposit_requests" ("transaction_id")`);
        await queryRunner.query(`ALTER TABLE "deposit_requests" ADD CONSTRAINT "FK_deposit_requests_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "deposit_requests" ADD CONSTRAINT "FK_deposit_requests_agency" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "deposit_requests" ADD CONSTRAINT "FK_deposit_requests_wallet_number" FOREIGN KEY ("wallet_number_id") REFERENCES "agency_wallet_numbers"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "deposit_requests" DROP CONSTRAINT "FK_deposit_requests_wallet_number"`);
        await queryRunner.query(`ALTER TABLE "deposit_requests" DROP CONSTRAINT "FK_deposit_requests_agency"`);
        await queryRunner.query(`ALTER TABLE "deposit_requests" DROP CONSTRAINT "FK_deposit_requests_user"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_deposit_requests_transaction_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_deposit_requests_agency_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_deposit_requests_user_id"`);
        await queryRunner.query(`DROP TABLE "deposit_requests"`);
        await queryRunner.query(`DROP TYPE "public"."deposit_requests_status_enum"`);
    }
}
