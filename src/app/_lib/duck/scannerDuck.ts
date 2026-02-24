import type * as duckdb from "@duckdb/duckdb-wasm";
import { ResourceGraphClient } from "@azure/arm-resourcegraph";
import type { TokenCredential } from "@azure/core-auth";
import type {
  AzureResourceRow,
  RoleDefinitionAssignedRow,
} from "../scanner/types";
import {
  fetchAzureResources,
  fetchAuthorizationResources,
} from "../scanner/azure";

async function ensureSchema(conn: duckdb.AsyncDuckDBConnection) {
  await conn.query(
    `
    CREATE TABLE IF NOT EXISTS azure_resources (
      id VARCHAR PRIMARY KEY,
      raw VARCHAR
    );
  `,
  );

  await conn.query(
    `
    CREATE TABLE IF NOT EXISTS azure_role_assignments (
      id VARCHAR PRIMARY KEY,
      raw VARCHAR
    );
  `,
  );
}

async function upsertResourcesBatchDuck(
  conn: duckdb.AsyncDuckDBConnection,
  resources: AzureResourceRow[],
): Promise<number> {
  if (!resources.length) {
    return 0;
  }

  let count = 0;

  for (const r of resources) {
    const id = String(r.id).toLowerCase();
    const raw = JSON.stringify(r);
    const prepared = await conn.prepare(
      `
      INSERT INTO azure_resources (id, raw)
      VALUES (?, ?)
      ON CONFLICT (id) DO UPDATE SET raw = excluded.raw;
    `,
    );
    try {
      await prepared.query(id, raw);
    } finally {
      await prepared.close();
    }

    count += 1;
  }
  return count;
}

async function upsertAuthBatchDuck(
  conn: duckdb.AsyncDuckDBConnection,
  rows: RoleDefinitionAssignedRow[],
): Promise<number> {
  if (!rows.length) {
    return 0;
  }

  let count = 0;
  for (const r of rows) {
    const id = String(r.id).toLowerCase();
    const raw = JSON.stringify(r);
    const prepared = await conn.prepare(
      `
      INSERT INTO azure_role_assignments (id, raw)
      VALUES (?, ?)
      ON CONFLICT (id) DO UPDATE SET raw = excluded.raw;
    `,
    );
    try {
      await prepared.query(id, raw);
    } finally {
      await prepared.close();
    }

    count += 1;
  }
  return count;
}

export async function runAzureScanDuck(
  db: duckdb.AsyncDuckDB,
  credential: TokenCredential,
) {
  const client = new ResourceGraphClient(credential);

  const { containers, resources } = await fetchAzureResources(client);

  const conn = await db.connect();
  try {
    await ensureSchema(conn);
    const inserted = await upsertResourcesBatchDuck(conn, [
      ...containers,
      ...resources,
    ]);
    console.log(`✅ Upserted ${inserted} resources into DuckDB.`);

    const authRows = await fetchAuthorizationResources(client);
    const authInserted = await upsertAuthBatchDuck(conn, authRows);
    console.log(`🔐 Upserted ${authInserted} authorization rows.`);

    return { resources: inserted, authorization: authInserted };
  } finally {
    await conn.close();
  }
}

export { AzureResourceRow, RoleDefinitionAssignedRow };
