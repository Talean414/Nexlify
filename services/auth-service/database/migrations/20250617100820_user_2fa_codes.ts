// File: migrations/20250617100820_user_2fa_codes.ts
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('user_2fa_codes', (table: Knex.CreateTableBuilder) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.string('code');
    table.timestamp('expires_at');
    table.boolean('verified').defaultTo(false);
  });

  await knex.schema.alterTable('users', (table: Knex.AlterTableBuilder) => {
    table.boolean('two_fa_enabled').defaultTo(false);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('user_2fa_codes');

  await knex.schema.alterTable('users', (table: Knex.AlterTableBuilder) => {
    table.dropColumn('two_fa_enabled');
  });
}