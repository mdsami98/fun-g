import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAdminCreditWalletType1794930000000 implements MigrationInterface {
    name = 'AddAdminCreditWalletType1794930000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "public"."wallet_request_type_enum" ADD VALUE IF NOT EXISTS 'admin_credit'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Postgres does not support removing enum values; no-op.
    }
}
