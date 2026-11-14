import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateUserWithdrawalAccounts1794910000000 implements MigrationInterface {
    name = 'CreateUserWithdrawalAccounts1794910000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "withdrawal_password" character varying(255)`);

        await queryRunner.query(`CREATE TABLE "user_withdrawal_accounts" (
            "id" BIGSERIAL NOT NULL,
            "user_id" uuid NOT NULL,
            "provider" "public"."agency_wallet_numbers_provider_enum" NOT NULL,
            "account_number" character varying(20) NOT NULL,
            "account_group" character varying(64) NOT NULL DEFAULT 'E-Wallet',
            "created_at" TIMESTAMP NOT NULL DEFAULT now(),
            "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_user_withdrawal_accounts_id" PRIMARY KEY ("id"),
            CONSTRAINT "UQ_user_withdrawal_provider" UNIQUE ("user_id", "provider")
        )`);

        await queryRunner.query(`CREATE INDEX "IDX_user_withdrawal_accounts_user_id" ON "user_withdrawal_accounts" ("user_id")`);
        await queryRunner.query(`ALTER TABLE "user_withdrawal_accounts" ADD CONSTRAINT "FK_user_withdrawal_accounts_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_withdrawal_accounts" DROP CONSTRAINT "FK_user_withdrawal_accounts_user"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_user_withdrawal_accounts_user_id"`);
        await queryRunner.query(`DROP TABLE "user_withdrawal_accounts"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "withdrawal_password"`);
    }
}
