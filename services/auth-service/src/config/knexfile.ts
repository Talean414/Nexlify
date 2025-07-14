import type { Knex } from 'knex';

const config: { [key: string]: Knex.Config } = {
  development: {
    client: 'pg',
    connection: {
      host: '100.69.254.106',
      user: 'mybudget_user',
      password: 'talean',
      database: 'nexlify_authentication',
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
