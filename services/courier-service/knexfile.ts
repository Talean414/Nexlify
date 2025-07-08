import type { Knex } from 'knex';

const config: { [key: string]: Knex.Config } = {
  development: {
    client: 'pg',
    connection: {
      host: '127.0.0.1',
      user: 'mybudget_user',
      password: 'talean',
      database: 'nexlify_couriers',
    },
    migrations: {
      directory: './database/migrations',
    },
    seeds: {
      directory: './seeds',
    },
  },
};

export default config;