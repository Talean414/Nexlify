import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('products', (table) => {
    table.index('vendor_id', 'idx_products_vendor_id');
    table.index('is_published', 'idx_products_is_published');
    table.index(['vendor_id', 'is_published'], 'idx_products_vendor_id_is_published');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('products', (table) => {
    table.dropIndex('vendor_id', 'idx_products_vendor_id');
    table.dropIndex('is_published', 'idx_products_is_published');
    table.dropIndex(['vendor_id', 'is_published'], 'idx_products_vendor_id_is_published');
  });
}