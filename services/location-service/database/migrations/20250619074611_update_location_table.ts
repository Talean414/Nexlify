// services/location-service/database/migrations/20250619104317_update_locations_table.ts
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('locations', async (table) => {
    // Step 1: Handle null values in order_id
    const hasNullOrderId = await knex('locations').whereNull('order_id').count('* as count').first();
    if (Number(hasNullOrderId?.count) > 0) {
      // Update null order_id values to a default (e.g., empty string or generate a unique ID)
      await knex('locations').whereNull('order_id').update({ order_id: '' });
      // Alternative: Throw an error if nulls exist and manual intervention is needed
      // throw new Error('Null values found in order_id. Please populate them before proceeding.');
    }

    // Step 2: Make order_id not null
    table.string('order_id').notNullable().alter();

    // Step 3: Change latitude type to decimal(10,7)
    table.decimal('latitude', 10, 7).notNullable().alter();

    // Step 4: Change longitude type to decimal(10,7)
    table.decimal('longitude', 10, 7).notNullable().alter();

    // Step 5: Handle null values in timestamp
    const hasNullTimestamp = await knex('locations').whereNull('timestamp').count('* as count').first();
    if (Number(hasNullTimestamp?.count) > 0) {
      // Update null timestamp values to current timestamp
      await knex('locations').whereNull('timestamp').update({ timestamp: knex.fn.now() });
    }

    // Step 6: Make timestamp not null
    table.timestamp('timestamp').notNullable().defaultTo(knex.fn.now()).alter();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('locations', async (table) => {
    // Revert timestamp to nullable and keep default
    table.timestamp('timestamp').nullable().defaultTo(knex.fn.now()).alter();

    // Revert longitude to real
    table.float('longitude').notNullable().alter();

    // Revert latitude to real
    table.float('latitude').notNullable().alter();

    // Revert order_id to nullable
    table.string('order_id').nullable().alter();
  });
}