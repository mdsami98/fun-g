import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateWalletTransactionsAndRequests1794900000000 implements MigrationInterface {
    name = 'CreateWalletTransactionsAndRequests1794900000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."wallet_request_type_enum" AS ENUM('deposit', 'withdraw')`);
        await queryRunner.query(`ALTER TABLE "deposit_requests" ADD COLUMN "type" "public"."wallet_request_type_enum" NOT NULL DEFAULT 'deposit'`);
        await queryRunner.query(`ALTER TABLE "deposit_requests" ADD COLUMN "reviewed_by" uuid`);
        await queryRunner.query(`ALTER TABLE "deposit_requests" ADD COLUMN "reviewed_at" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "deposit_requests" ADD CONSTRAINT "FK_deposit_requests_reviewed_by" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);

        await queryRunner.query(`CREATE TABLE "wallet_transactions" (
            "id" BIGSERIAL NOT NULL,
            "user_id" uuid NOT NULL,
            "agency_id" uuid NOT NULL,
            "type" "public"."wallet_request_type_enum" NOT NULL,
            "amount" numeric(12,2) NOT NULL,
            "balance_before" numeric(12,2) NOT NULL,
            "balance_after" numeric(12,2) NOT NULL,
            "provider" character varying(32),
            "transaction_id" character varying(64),
            "request_id" bigint,
            "created_at" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_wallet_transactions_id" PRIMARY KEY ("id")
        )`);

        await queryRunner.query(`CREATE INDEX "IDX_wallet_transactions_user_id" ON "wallet_transactions" ("user_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_wallet_transactions_agency_id" ON "wallet_transactions" ("agency_id")`);
        await queryRunner.query(`ALTER TABLE "wallet_transactions" ADD CONSTRAINT "FK_wallet_transactions_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "wallet_transactions" ADD CONSTRAINT "FK_wallet_transactions_agency" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "wallet_transactions" DROP CONSTRAINT "FK_wallet_transactions_agency"`);
        await queryRunner.query(`ALTER TABLE "wallet_transactions" DROP CONSTRAINT "FK_wallet_transactions_user"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_wallet_transactions_agency_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_wallet_transactions_user_id"`);
        await queryRunner.query(`DROP TABLE "wallet_transactions"`);

        await queryRunner.query(`ALTER TABLE "deposit_requests" DROP CONSTRAINT "FK_deposit_requests_reviewed_by"`);
        await queryRunner.query(`ALTER TABLE "deposit_requests" DROP COLUMN "reviewed_at"`);
        await queryRunner.query(`ALTER TABLE "deposit_requests" DROP COLUMN "reviewed_by"`);
        await queryRunner.query(`ALTER TABLE "deposit_requests" DROP COLUMN "type"`);
        await queryRunner.query(`DROP TYPE "public"."wallet_request_type_enum"`);
    }
}
