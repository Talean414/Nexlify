import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.table('users', (table: Knex.TableBuilder) => {
    table.string('role', 50).notNullable().defaultTo('customer');
    table.check(
      `role IN ('customer', 'vendor', 'courier', 'admin')`,
      [],
      'users_role_check'
    );
  });

  await knex('users').update({ role: 'customer' });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.table('users', (table: Knex.TableBuilder) => {
    table.dropColumn('role');
  });
}