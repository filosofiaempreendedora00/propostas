import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL não definida (.env.local)");

// Singleton entre hot-reloads do dev (evita esgotar conexões).
const globalForDb = globalThis as unknown as {
  _pg?: ReturnType<typeof postgres>;
};

// Pooler transaction-mode (pgbouncer) → prepare:false.
const client = globalForDb._pg ?? postgres(url, { prepare: false });
if (process.env.NODE_ENV !== "production") globalForDb._pg = client;

export const db = drizzle(client, { schema });
