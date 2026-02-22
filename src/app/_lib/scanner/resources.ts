import { canonicalLabelsForType, sanitizeCanonicalLabel } from "./helpers";
import {
  AzureResourceType,
  CHUNK_SIZE,
  isType,
  type AzureResourceRow,
  type Neo4jSession,
} from "./types";

export async function upsertResourcesBatch(
  resources: AzureResourceRow[],
  session: Neo4jSession,
) {
  if (!resources.length) {
    return { inserted: 0 };
  }

  const rowsByType = new Map<string, Array<Record<string, unknown>>>();

  for (const r of resources) {
    const row = resourceToNodeRow(r);
    const bucket =
      rowsByType.get(row.type) ??
      (() => {
        const b: Array<Record<string, unknown>> = [];
        rowsByType.set(row.type, b);
        return b;
      })();
    bucket.push({ id: row.id, props: row.props });
  }

  let total = 0;
  for (const [type, rows] of rowsByType.entries()) {
    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE);

      const canonical = canonicalLabelsForType(type)
        .map(sanitizeCanonicalLabel)
        .filter(Boolean);
      const canonicalLabelClause = canonical.length
        ? `:${canonical.join(":")}`
        : "";

      const query = /* cypher */ `
        UNWIND $rows AS r
        MERGE (n:AzureResource { id: r.id })
        SET n += r.props
        SET n${canonicalLabelClause}
        RETURN count(n) AS c
      `;

      const res = await session.run(query, { rows: chunk });
      const c =
        res.records?.[0]?.get("c")?.toNumber?.() ??
        Number(res.records?.[0]?.get("c") ?? 0);
      total += Number(c);
    }
  }

  return { inserted: total };
}

function resourceToNodeRow(res: AzureResourceRow) {
  const id = res.id.toLowerCase();

  const identityRaw = ((res as Record<string, unknown>)["identity"] ??
    (res.properties && typeof res.properties === "object"
      ? (res.properties as Record<string, unknown>)["identity"]
      : undefined)) as Record<string, unknown> | undefined;

  const systemAssignedPrincipalId =
    identityRaw &&
    "principalId" in identityRaw &&
    typeof identityRaw["principalId"] === "string"
      ? String(identityRaw["principalId"]).toLowerCase()
      : undefined;

  let userAssignedIdentityIds: string[] | undefined;
  if (
    identityRaw &&
    "userAssignedIdentities" in identityRaw &&
    typeof identityRaw["userAssignedIdentities"] === "object"
  ) {
    try {
      userAssignedIdentityIds = Object.keys(
        identityRaw["userAssignedIdentities"] as Record<string, unknown>,
      ).map((k) => String(k).toLowerCase());
    } catch {
      userAssignedIdentityIds = undefined;
    }
  }

  const managedIdentityPrincipalId =
    isType(res.type, AzureResourceType.ManagedIdentityUserAssigned) &&
    "principalId" in (res.properties as Record<string, unknown>) &&
    typeof (res.properties as Record<string, unknown>)["principalId"] ===
      "string"
      ? String(
          (res.properties as Record<string, unknown>)["principalId"],
        ).toLowerCase()
      : undefined;

  const props: Record<string, unknown> = {
    id,
    name: res.name,
    type: res.type.toLowerCase(),
    location: res.location,
    subscriptionId: res.subscriptionId,
    resourceGroup: res.resourceGroup,
    kind: res.kind,
    tags: res.tags ? JSON.stringify(res.tags) : null,
    propertiesJson: res.properties ? JSON.stringify(res.properties) : null,
    raw: JSON.stringify(res),
    ...(managedIdentityPrincipalId
      ? { principalId: managedIdentityPrincipalId }
      : {}),
    ...(systemAssignedPrincipalId ? { systemAssignedPrincipalId } : {}),
    ...(userAssignedIdentityIds && userAssignedIdentityIds.length
      ? { userAssignedIdentityIds }
      : {}),
  };
  Object.keys(props).forEach((k) =>
    props[k] === undefined ? delete props[k] : undefined,
  );

  return {
    id,
    type: res.type.toLowerCase(),
    props,
  };
}
