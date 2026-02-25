import type * as duckdb from "@duckdb/duckdb-wasm";
import { DatabaseRelationship, UpsertResult } from "./scannerDuck";
import { AzureResourceRow } from "../scanner/types";

export async function upsertRelationshipsBatch(
  conn: duckdb.AsyncDuckDBConnection,
  rels: DatabaseRelationship[],
): Promise<number> {
  if (!rels.length) {
    return 0;
  }

  const insertSql = `
    INSERT INTO resource_rel (from_uid, to_uid, reltype)
    VALUES (?, ?, ?)
    ON CONFLICT (from_uid,to_uid,reltype) DO NOTHING;
  `;

  const prepared = await conn.prepare(insertSql);
  let cnt = 0;
  try {
    for (const r of rels) {
      await prepared.query(r.fromUid, r.toUid, r.relationshipType);
      cnt += 1;
    }
  } finally {
    await prepared.close();
  }
  return cnt;
}

export async function upsertResourcesBatch(
  conn: duckdb.AsyncDuckDBConnection,
  resources: AzureResourceRow[],
): Promise<UpsertResult> {
  if (!resources.length) {
    return { inserted: 0, idToUid: new Map() };
  }

  const insertSql = `
    INSERT INTO resources (
      id, name, type, location, subscriptionId, resourceGroup,
      properties, raw
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT (id) DO UPDATE SET
      name = excluded.name,
      type = excluded.type,
      location = excluded.location,
      subscriptionId = excluded.subscriptionId,
      resourceGroup = excluded.resourceGroup,
      properties = excluded.properties,
      raw = excluded.raw
    RETURNING uid, id
  `;

  let count = 0;
  const idToUid = new Map<string, number>();

  const prepared = await conn.prepare(insertSql);
  try {
    for (const r of resources) {
      const id = String(r.id).toLowerCase();
      const props = {
        name: r.name ?? null,
        type: String(r.type).toLowerCase(),
        location: r.location ?? null,
        subscriptionId: r.subscriptionId ?? null,
        resourceGroup: r.resourceGroup ?? null,
        properties: r.properties ? JSON.stringify(r.properties) : null,
        raw: JSON.stringify(r),
      } as Record<string, unknown>;

      const res = await prepared.query(
        id,
        props.name,
        props.type,
        props.location,
        props.subscriptionId,
        props.resourceGroup,
        props.properties,
        props.raw,
      );

      const rows = res.toArray().map((r) => r.toJSON());
      if (rows.length && rows[0].uid != null) {
        idToUid.set(id, Number(rows[0].uid));
      }
      count += 1;
    }
  } finally {
    await prepared.close();
  }
  return { inserted: count, idToUid };
}
