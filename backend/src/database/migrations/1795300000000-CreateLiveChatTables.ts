import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateLiveChatTables1795300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. chat_threads table
    await queryRunner.createTable(
      new Table({
        name: 'chat_threads',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'userId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'agencyId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'lastMessage',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'lastMessageAt',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'userUnreadCount',
            type: 'int',
            default: 0,
          },
          {
            name: 'agencyUnreadCount',
            type: 'int',
            default: 0,
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
      'chat_threads',
      new TableIndex({
        name: 'IDX_chat_threads_user_agency',
        columnNames: ['userId', 'agencyId'],
        isUnique: true,
      }),
    );

    await queryRunner.createForeignKey(
      'chat_threads',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'chat_threads',
      new TableForeignKey({
        columnNames: ['agencyId'],
        referencedTableName: 'agencies',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // 2. chat_messages table
    await queryRunner.createTable(
      new Table({
        name: 'chat_messages',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'threadId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'senderId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'senderRole',
            type: 'varchar',
            length: '32',
            isNullable: false,
          },
          {
            name: 'text',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'isRead',
            type: 'boolean',
            default: false,
          },
          {
            name: 'createdAt',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'chat_messages',
      new TableIndex({
        name: 'IDX_chat_messages_thread_created',
        columnNames: ['threadId', 'createdAt'],
      }),
    );

    await queryRunner.createForeignKey(
      'chat_messages',
      new TableForeignKey({
        columnNames: ['threadId'],
        referencedTableName: 'chat_threads',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('chat_messages', true);
    await queryRunner.dropTable('chat_threads', true);
  }
}
