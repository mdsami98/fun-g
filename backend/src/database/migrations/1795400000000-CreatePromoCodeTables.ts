import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreatePromoCodeTables1795400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. promo_codes table
    await queryRunner.createTable(
      new Table({
        name: 'promo_codes',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'code',
            type: 'varchar',
            length: '64',
            isNullable: false,
          },
          {
            name: 'agencyId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'rewardType',
            type: 'varchar',
            length: '32',
            default: "'cash'",
          },
          {
            name: 'rewardAmount',
            type: 'decimal',
            precision: 12,
            scale: 2,
            default: 0,
          },
          {
            name: 'maxClaims',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'totalClaimed',
            type: 'int',
            default: 0,
          },
          {
            name: 'expiresAt',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
          {
            name: 'createdAt',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'promo_codes',
      new TableIndex({
        name: 'IDX_promo_codes_code',
        columnNames: ['code'],
        isUnique: true,
      }),
    );

    await queryRunner.createForeignKey(
      'promo_codes',
      new TableForeignKey({
        columnNames: ['agencyId'],
        referencedTableName: 'agencies',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // 2. user_promo_redemptions table
    await queryRunner.createTable(
      new Table({
        name: 'user_promo_redemptions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'promoId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'userId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'agencyId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'rewardType',
            type: 'varchar',
            length: '32',
            isNullable: false,
          },
          {
            name: 'rewardAmount',
            type: 'decimal',
            precision: 12,
            scale: 2,
            default: 0,
          },
          {
            name: 'redeemedAt',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'user_promo_redemptions',
      new TableIndex({
        name: 'IDX_user_promo_redemptions_promo_user',
        columnNames: ['promoId', 'userId'],
        isUnique: true,
      }),
    );

    await queryRunner.createForeignKey(
      'user_promo_redemptions',
      new TableForeignKey({
        columnNames: ['promoId'],
        referencedTableName: 'promo_codes',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'user_promo_redemptions',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('user_promo_redemptions', true);
    await queryRunner.dropTable('promo_codes', true);
  }
}
