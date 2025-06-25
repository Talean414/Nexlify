// File: migrations/20250617120000_add_timestamps_to_user_devices.ts

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('user_devices', (table) => {
    // Adds created_at and updated_at with defaults
    table.timestamps(true, true); 
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('user_devices', (table) => {
    table.dropColumns('created_at', 'updated_at');
  });
}