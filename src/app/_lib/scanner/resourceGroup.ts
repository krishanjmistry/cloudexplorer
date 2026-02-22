import { CHUNK_SIZE, type AzureResourceRow, type Neo4jSession } from "./types";

export async function createResourceGroupResourceRelationships(
  rows: AzureResourceRow[],
  session: Neo4jSession,
) {
  const relRows: Array<{ id: string; rgId: string }> = [];

  for (const r of rows) {
    const rgName = r.resourceGroup;
    if (rgName) {
      const rgId =
        `/subscriptions/${r.subscriptionId}/resourceGroups/${rgName}`.toLowerCase();
      relRows.push({ id: r.id, rgId });
    }
  }

  let total = 0;
  for (let i = 0; i < relRows.length; i += CHUNK_SIZE) {
    const part = relRows.slice(i, i + CHUNK_SIZE);
    const q = /* cypher */ `
      UNWIND $rows AS r
      MATCH (res:AzureResource { id: r.id })
      MATCH (rg:ResourceGroup { id: r.rgId })
      MERGE (rg)-[:CONTAINS]->(res)
      RETURN count(*) AS c
    `;
    const out = await session.run(q, { rows: part });
    const c =
      out.records?.[0]?.get("c")?.toNumber?.() ??
      Number(out.records?.[0]?.get("c") ?? 0);
    total += Number(c);
  }
  return { created: total };
}
