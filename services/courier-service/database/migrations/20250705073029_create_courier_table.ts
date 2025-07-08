import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("couriers", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.string("name").notNullable();
    table.string("email").notNullable().unique();
    table.string("phone").notNullable();
    table.string("vehicle_type").notNullable(); // e.g., bike, car, van
    table.string("location").notNullable(); // e.g., Nairobi, Mombasa
    table.string("status").defaultTo("pending"); // pending, approved, rejected
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
  });

  // Create indexes for performance
  await knex.schema.alterTable("couriers", (table) => {
    table.index(["email"], "idx_couriers_email");
    table.index(["status"], "idx_couriers_status");
    table.index(["location"], "idx_couriers_location");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("couriers");
}