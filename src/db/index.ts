import 'dotenv/config';
import postgres from 'postgres';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { drizzle as liteDrizzle } from 'drizzle-orm/pglite';
import { PGlite } from '@electric-sql/pglite';
import * as schema from './schema';
import { mkdirSync } from 'node:fs';
type Connection = {
  db: PostgresJsDatabase<typeof schema>;
  raw?: ReturnType<typeof postgres>;
  lite?: PGlite;
};
const globalDb = globalThis as unknown as { ceConnection?: Connection };
function connect(): Connection {
  if (process.env.DATABASE_URL) {
    const testSchema = process.env.CE_TEST_SCHEMA;
    if (
      testSchema &&
      (process.env.NODE_ENV !== 'test' || !/^ce_verify_[a-z0-9_]{1,48}$/.test(testSchema))
    )
      throw new Error('Invalid isolated test schema');
    const raw = postgres(process.env.DATABASE_URL, {
      max: 5,
      connection: { search_path: testSchema || 'public' },
      ssl: process.env.DATABASE_URL.includes('localhost') ? false : 'require',
      connect_timeout: 10,
      prepare: false,
    });
    return { db: drizzle(raw, { schema }), raw };
  }
  if (process.env.NODE_ENV === 'production') throw new Error('DATABASE_URL required in production');
  const localDir = process.env.LOCAL_DATABASE_DIR || '.data/postgres';
  if (localDir !== 'memory://') mkdirSync(localDir, { recursive: true });
  const lite = new PGlite(localDir);
  return {
    db: liteDrizzle(lite, { schema }) as unknown as PostgresJsDatabase<typeof schema>,
    lite,
  };
}
// Lazy access keeps production builds and tooling independent of a live database.
// PGlite and PostgreSQL share Drizzle's relational query API at this boundary.
let connection = globalDb.ceConnection;
function currentConnection() {
  connection ??= globalDb.ceConnection ?? connect();
  globalDb.ceConnection = connection;
  return connection;
}
export const db = new Proxy({} as PostgresJsDatabase<typeof schema>, {
  get(_target, key) {
    const instance = currentConnection().db;
    const value = Reflect.get(instance, key, instance);
    return typeof value === 'function' ? value.bind(instance) : value;
  },
});
export async function closeDatabase() {
  if (connection?.raw) await connection.raw.end();
  if (connection?.lite) await connection.lite.close();
  connection = undefined;
  delete globalDb.ceConnection;
}
