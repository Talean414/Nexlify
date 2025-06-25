import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('locations', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('user_id').notNullable();         // courier or vendor
    table.string('order_id').nullable();           // optional link to order
    table.float('latitude').notNullable();
    table.float('longitude').notNullable();
    table.timestamp('timestamp').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('locations');
}