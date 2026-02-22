import { DefaultAzureCredential } from "@azure/identity";
import { Client } from "@microsoft/microsoft-graph-client";
import {
  CHUNK_SIZE,
  Neo4jSession,
  type RoleDefinitionAssignedRow,
} from "./types";

export async function handleSecurityPrincipalsAndRoles(
  session: Neo4jSession,
  creds: DefaultAzureCredential,
  roleAssignmentsWithDefinitions: RoleDefinitionAssignedRow[],
) {
  const authzRes = await mergeRoleAssignments(
    session,
    roleAssignmentsWithDefinitions,
  );
  const orphanedRoleAssignments = await detectOrphanedRoleAssignments(session);

  const handleUaiRes = await handleRolesOnUserAssignedIdentities(session);
  const handleSysRes = await handleRolesOnSystemAssignedIdentities(session);

  const unresolvedPrincipalIds = authzRes.principalIds
    .difference(handleUaiRes.seenPrincipalIds)
    .difference(handleSysRes.seenPrincipalIds);

  const graphEnrich = await enrichPrincipalsWithGraph(
    session,
    creds,
    unresolvedPrincipalIds,
  );

  return {
    roleAssignmentsProcessed: authzRes.roleAssignmentsInserted,
    uniquePrincipals: authzRes.principalIds.size,
    orphanedRoleAssignments: orphanedRoleAssignments.orphanedRoleAssignments,
    userAssignedIdentitiesLinked: handleUaiRes.assigned,
    systemAssignedIdentitiesPropagated: handleSysRes.propagated,
    principalsEnrichedWithGraph: graphEnrich.enriched,
    principalsNotEnriched: graphEnrich.missing.length,
  };
}

export async function handleRolesOnUserAssignedIdentities(
  session: Neo4jSession,
) {
  const userAssignedIdentitiesMergedWithResources =
    await session.run(/* cypher */ `
      MATCH (mi:Identity_UserAssigned)
      MATCH (res:AzureResource) WHERE res.userAssignedIdentityIds IS NOT NULL AND mi.id IN res.userAssignedIdentityIds
      MERGE (res)-[:HAS_IDENTITY]->(mi)
      WITH res, mi
      OPTIONAL MATCH (ra:RoleAssignment { principalId: mi.principalId })
      FOREACH (_ IN CASE WHEN ra IS NOT NULL THEN [1] ELSE [] END |
        MERGE (mi)-[:ASSIGNED]->(ra)
      )
      RETURN count(DISTINCT res) AS c,
        collect(DISTINCT coalesce(mi.principalId, mi.id)) AS seenPrincipalIds
      `);

  return {
    assigned: Number(
      userAssignedIdentitiesMergedWithResources.records?.[0]
        ?.get("c")
        ?.toNumber?.() ?? 0,
    ),
    seenPrincipalIds:
      new Set<string>(
        userAssignedIdentitiesMergedWithResources.records?.[0]?.get(
          "seenPrincipalIds",
        ),
      ) ?? [],
  };
}

export async function handleRolesOnSystemAssignedIdentities(
  session: Neo4jSession,
) {
  const q = /* cypher */ `
    MATCH (res:AzureResource) WHERE res.systemAssignedPrincipalId IS NOT NULL
    WITH res, toLower(res.systemAssignedPrincipalId) AS pid
    MERGE (id:Identity:Identity_Machine { id: pid })
      ON CREATE SET id.placeholder = true, id.createdAt = datetime()
    SET id.name = coalesce(id.name, toLower(res.name) + ' (system)'), id.lastSeen = datetime()
    MERGE (res)-[:HAS_IDENTITY]->(id)
    MERGE (res)-[:HAS_SYSTEM_ASSIGNED_IDENTITY]->(id)
    WITH res, id, pid
    OPTIONAL MATCH (ra:RoleAssignment { principalId: pid })
    WITH res, id, ra, pid
      MERGE (id)-[:ASSIGNED]->(ra)
    RETURN count(DISTINCT res) AS c, collect(DISTINCT pid) AS pids
  `;

  const out = await session.run(q);
  const propagated = Number(out.records?.[0]?.get("c")?.toNumber?.() ?? 0);
  const pids: string[] = (out.records?.[0]?.get("pids") ?? []) as string[];
  return { propagated, seenPrincipalIds: new Set(pids) };
}

export async function enrichPrincipalsWithGraph(
  session: Neo4jSession,
  creds: DefaultAzureCredential,
  principalIds: Set<string>,
) {
  if (!principalIds || !principalIds.size) {
    return { enriched: 0, missing: [] };
  }

  const client = Client.init({
    authProvider: async (done) => {
      try {
        const at = await creds.getToken("https://graph.microsoft.com/.default");
        done(null, at?.token ?? null);
      } catch (err) {
        done(err as Error, null);
      }
    },
  });

  let principalsSuccessfullyEnriched = 0;
  const principalIdsThatNeedEnrichment = Array.from(principalIds);
  const found = new Set<string>();

  for (let i = 0; i < principalIdsThatNeedEnrichment.length; i += CHUNK_SIZE) {
    const batch = principalIdsThatNeedEnrichment.slice(i, i + CHUNK_SIZE);
    try {
      const body = await client.api("/directoryObjects/getByIds").post({
        ids: batch,
        types: ["User", "ServicePrincipal", "Group", "Application"],
      });

      const objects: Array<Record<string, unknown>> = Array.isArray(body?.value)
        ? body.value
        : [];
      if (!objects.length) {
        continue;
      }

      const rows = objects.map((o) => {
        const id = String(o.id || "").toLowerCase();
        return {
          id,
          displayName:
            (o.displayName as string) ??
            (o["userPrincipalName"] as string) ??
            null,
          principalType:
            (o["@odata.type"] as string) ?? (o["odata.type"] as string) ?? null,
          userPrincipalName: (o["userPrincipalName"] as string) ?? null,
          appId:
            (o["appId"] as string) ??
            (o["servicePrincipalNames"] &&
            Array.isArray(o["servicePrincipalNames"])
              ? String((o["servicePrincipalNames"] as string[])[0])
              : null),
          raw: JSON.stringify(o || {}),
        };
      });

      const query = /* cypher */ `
        UNWIND $rows AS o
        MERGE (id:Identity { id: o.id })
        SET id.displayName = coalesce(o.displayName, id.displayName),
            id.name = coalesce(o.displayName, o.userPrincipalName, o.appId, id.name),
            id.principalType = coalesce(o.principalType, id.principalType),
            id.userPrincipalName = coalesce(o.userPrincipalName, id.userPrincipalName),
            id.appId = coalesce(o.appId, id.appId),
            id.raw = coalesce(o.raw, id.raw),
            id.resolved = true,
            id.updatedAt = datetime()
        WITH id, o
        FOREACH (_ IN CASE WHEN toLower(coalesce(o.principalType, '')) CONTAINS 'user' THEN [1] ELSE [] END |
          SET id:Identity_Human
        )
        FOREACH (_ IN CASE WHEN toLower(coalesce(o.principalType, '')) CONTAINS 'serviceprincipal' OR toLower(coalesce(o.appId, '')) <> '' THEN [1] ELSE [] END |
          SET id:Identity_Machine
        )
        WITH id, o
        OPTIONAL MATCH (ra:RoleAssignment { principalId: id.id })
        MERGE (id)-[:ASSIGNED]->(ra)
        RETURN count(DISTINCT id) AS c
      `;

      const out = await session.run(query, { rows });
      principalsSuccessfullyEnriched += Number(
        out.records?.[0]?.get("c")?.toNumber?.() ?? 0,
      );
      for (const o of rows) {
        found.add(o.id);
      }
    } catch (err) {
      console.warn("⚠️ Graph enrichment error for batch:", err);
    }
  }

  const missing = Array.from(principalIds.difference(found));
  if (missing.length) {
    const markQ = /* cypher */ `
      UNWIND $rows AS pid
      MERGE (id:Identity { id: pid })
      SET id.resolved = false, id.lastSeen = datetime(), id.raw = coalesce(id.raw, null)
      RETURN count(id) AS c
    `;
    try {
      await session.run(markQ, { rows: missing });
    } catch (err) {
      console.warn("⚠️ Failed to mark missing principal placeholders:", err);
    }
  }

  return { enriched: principalsSuccessfullyEnriched, missing };
}
export async function mergeRoleAssignments(
  session: Neo4jSession,
  roleDefinitionAssigned: RoleDefinitionAssignedRow[],
) {
  let raInserted = 0;
  const principalIdSet = new Set<string>();

  for (let i = 0; i < roleDefinitionAssigned.length; i += CHUNK_SIZE) {
    const chunk = roleDefinitionAssigned.slice(i, i + CHUNK_SIZE);
    const q = /* cypher */ `
      UNWIND $rows AS r
      MERGE (ra:RoleAssignment { id: r.id })
      SET ra += { 
        name: r.roleDefinitionName,
        principalId: r.principalId, 
        principalType: r.principalType, 
        roleDefinitionId: r.roleDefinitionId, 
        scope: r.scope, 
        createdOn: r.createdOn, 
        roleDefinitionName: r.roleDefinitionName,
        roleDefinitionDescription: r.roleDefinitionDescription
      }
      WITH ra, r

      OPTIONAL MATCH (resById:AzureResource { id: toLower(r.scope) })
        WITH ra, r, resById
        WHERE resById IS NOT NULL
        MERGE (ra)-[:ON_RESOURCE]->(resById)
      WITH ra, r, resById

      RETURN count(ra) AS c
    `;
    const out = await session.run(q, { rows: chunk });
    raInserted += Number(out.records?.[0]?.get("c")?.toNumber?.() ?? 0);
    for (const r of chunk) {
      principalIdSet.add(r.principalId);
    }
  }

  return { roleAssignmentsInserted: raInserted, principalIds: principalIdSet };
}

export async function detectOrphanedRoleAssignments(session: Neo4jSession) {
  const unmatched = await session.run(/* cypher */ `
      MATCH (ra:RoleAssignment)
      WHERE NOT (ra)-[:ON_RESOURCE]->()
      RETURN count(ra) AS c, collect({id: ra.id, scope: ra.scope, role: ra.roleDefinitionName})[0..10] AS samples
    `);
  const unmatchedCount = Number(
    unmatched.records?.[0]?.get("c")?.toNumber?.() ?? 0,
  );
  if (unmatchedCount) {
    const unmatchedSamples = unmatched.records?.[0]?.get("samples") ?? [];
    console.warn(
      `⚠️ ${unmatchedCount} RoleAssignments were not attached to a resource (sample):`,
      JSON.stringify(unmatchedSamples, null, 2),
    );
  }
  return { orphanedRoleAssignments: unmatchedCount };
}
