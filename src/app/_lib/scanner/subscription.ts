import {
  AzureResourceType,
  CHUNK_SIZE,
  isType,
  type AzureResourceRow,
  type Neo4jSession,
} from "./types";

export async function createSubscriptionResourceGroupRelationships(
  containers: AzureResourceRow[],
  session: Neo4jSession,
) {
  const rows = containers.reduce(
    (acc, c) => {
      if (isType(c.type, AzureResourceType.ResourceGroup)) {
        acc.push({
          subId: `/subscriptions/${String(c.subscriptionId).toLowerCase()}`,
          rgId: c.id.toLowerCase(),
        });
      }
      return acc;
    },
    [] as Array<{ subId: string; rgId: string }>,
  );

  let total = 0;
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const part = rows.slice(i, i + CHUNK_SIZE);
    const q = /* cypher */ `
      UNWIND $rows AS r
      MATCH (sub:Subscription { id: r.subId })
      MATCH (rg:ResourceGroup { id: r.rgId })
      MERGE (sub)-[:CONTAINS]->(rg)
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
