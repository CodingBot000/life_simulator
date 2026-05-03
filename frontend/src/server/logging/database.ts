import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __lifeSimulatorPgPool__: Pool | null | undefined;
}

export function hasDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export function getPgPool(): Pool | null {
  if (!hasDatabaseConfigured()) {
    return null;
  }

  if (typeof globalThis.__lifeSimulatorPgPool__ !== "undefined") {
    return globalThis.__lifeSimulatorPgPool__;
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  globalThis.__lifeSimulatorPgPool__ = pool;
  return pool;
}
