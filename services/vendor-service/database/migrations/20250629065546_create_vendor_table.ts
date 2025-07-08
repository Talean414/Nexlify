import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('vendors', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('business_name').notNullable();
    table.string('owner_name').notNullable();
    table.string('email').notNullable().unique();
    table.string('phone').notNullable();
    table.string('location').notNullable();
    table.string('status').defaultTo('pending'); // pending, approved, rejected
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('vendors');
}