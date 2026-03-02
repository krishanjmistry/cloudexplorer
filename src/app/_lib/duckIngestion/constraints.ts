import type * as duckdb from "@duckdb/duckdb-wasm";

export async function ensureSchema(conn: duckdb.AsyncDuckDBConnection) {
  await conn.query(`
    CREATE SEQUENCE IF NOT EXISTS resource_uid_seq START 1;
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS resources (
      uid INTEGER PRIMARY KEY DEFAULT nextval('resource_uid_seq'),
      id VARCHAR UNIQUE,
      name VARCHAR,
      type VARCHAR NOT NULL,
      location VARCHAR,
      subscriptionId VARCHAR,
      resourceGroup VARCHAR,
      kind VARCHAR,
      tags JSON,
      properties JSON,
      raw JSON,
    );
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS resource_rel (
      from_uid INTEGER,
      to_uid INTEGER,
      reltype VARCHAR,
      PRIMARY KEY(from_uid,to_uid,reltype)
    );
  `);
}
