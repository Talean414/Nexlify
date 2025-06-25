import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("orders", (table) => {
    table.uuid("id").primary();
    table.string("customer_id").notNullable();
    table.string("vendor_id").notNullable();
    table.string("courier_id").nullable();
    table
      .enu("status", ["PENDING_VENDOR", "REJECTED", "AWAITING_COURIER", "EN_ROUTE", "DELIVERED"])
      .notNullable()
      .defaultTo("PENDING_VENDOR");
    table.decimal("total_price", 10, 2).notNullable();
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
  });

  await knex.schema.createTable("order_items", (table) => {
    table.uuid("id").primary();
    table.uuid("order_id").references("id").inTable("orders").onDelete("CASCADE");
    table.string("product_id").notNullable();
    table.integer("quantity").notNullable();
    table.decimal("price", 10, 2).notNullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("order_items");
  await knex.schema.dropTableIfExists("orders");
}