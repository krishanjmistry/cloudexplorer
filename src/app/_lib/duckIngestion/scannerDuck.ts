import type * as duckdb from "@duckdb/duckdb-wasm";
import type { TokenCredential } from "@azure/core-auth";
import { upsertRelationshipsBatch, upsertResourcesBatch } from "./dbActions";
import {
  collectResourceGroupResourceRelationships,
  collectSubscriptionResourceGroupRelations,
} from "./containers";
import { collectComputeRelationships } from "./compute";
import { collectNetworkRelations, InternetResource } from "./network";
import {
  collectAuthRelations,
  collectIdentityMappings,
  collectPrincipalToUserAssignedIdentityMappings,
  mapAuthRowsToResources,
} from "./identity";
import {
  convertGraphResponseToResources,
  getPrincipalsFromGraph,
  GraphResponseObject,
} from "./enrichPrincipals";
import {
  AzureResourceRow,
  DatabaseRelationship,
  InternalRelationship,
  RoleDefinitionAssignedRow,
} from "../types";

import { fetchAuthorizationResources, fetchAzureResources } from "../azure";
import { ResourceGraphClient } from "@azure/arm-resourcegraph";

async function prepareAzureResources(
  credential: TokenCredential | null = null,
) {
  const local = process.env.NEXT_PUBLIC_USE_LOCAL_DATA === "true";
  let containers: AzureResourceRow[];
  let resources: AzureResourceRow[];
  let authRows: RoleDefinitionAssignedRow[];

  if (local) {
    containers = (await import("./local/containers")).containers;
    resources = (await import("./local/resources")).resources;
    authRows = (await import("./local/authRows")).authRows;
  } else {
    const client = new ResourceGraphClient(credential!);
    const { containers: liveContainers, resources: liveResources } =
      await fetchAzureResources(client);
    authRows = await fetchAuthorizationResources(client);
    containers = liveContainers;
    resources = liveResources;
  }

  const resourcesToInsert: AzureResourceRow[] = [
    ...containers,
    ...resources,
    InternetResource,
  ];
  const relationshipsToInsert: InternalRelationship[] = [];

  const subscriptionRgRels =
    collectSubscriptionResourceGroupRelations(containers);
  relationshipsToInsert.push(...subscriptionRgRels);

  const resourceGroupResourceRels =
    collectResourceGroupResourceRelationships(resources);
  relationshipsToInsert.push(...resourceGroupResourceRels);

  const computeRels = collectComputeRelationships(resources);
  relationshipsToInsert.push(...computeRels);

  const { relationships: networkRels, newResources: networkExtraResources } =
    collectNetworkRelations(resources);
  resourcesToInsert.push(...networkExtraResources);
  relationshipsToInsert.push(...networkRels);

  const {
    resources: extraIdentityResources,
    relationships: identityRels,
    systemAssignedPrincipals,
  } = collectIdentityMappings(resources);
  resourcesToInsert.push(...extraIdentityResources);
  relationshipsToInsert.push(...identityRels);

  const userAssignedPrincipalsMapping =
    collectPrincipalToUserAssignedIdentityMappings(resources);

  resourcesToInsert.push(...mapAuthRowsToResources(authRows));

  const { relationships: authRels, allPrincipalsWithRoles } =
    collectAuthRelations(authRows, userAssignedPrincipalsMapping);
  relationshipsToInsert.push(...authRels);

  const principalsNeedingEnrichment = allPrincipalsWithRoles
    .difference(systemAssignedPrincipals)
    .difference(userAssignedPrincipalsMapping);

  if (principalsNeedingEnrichment.size) {
    let graphResponse: GraphResponseObject;
    if (local) {
      graphResponse = (await import("./local/graphResponse")).graphResponse;
    } else {
      graphResponse = await getPrincipalsFromGraph(
        credential!,
        principalsNeedingEnrichment,
      );
    }
    resourcesToInsert.push(...convertGraphResponseToResources(graphResponse));
  }

  return {
    resources: resourcesToInsert,
    relationships: relationshipsToInsert,
  };
}

export async function runAzureScanDuck(
  db: duckdb.AsyncDuckDB,
  credential: TokenCredential | null = null,
) {
  const { resources, relationships } = await prepareAzureResources(credential);

  const conn = await db.connect();
  try {
    const { inserted: totalResourcesUpserted, idToUid } =
      await upsertResourcesBatch(conn, resources);
    console.log(`✅ Upserted ${totalResourcesUpserted} resources into DuckDB.`);

    const databaseRelations: DatabaseRelationship[] = [];
    for (const r of relationships) {
      const fromUid = idToUid.get(r.fromId);
      const toUid = idToUid.get(r.toId);
      if (fromUid != null && toUid != null) {
        databaseRelations.push({
          fromUid: fromUid,
          toUid: toUid,
          relationshipType: r.relationshipType,
        });
      } else {
        console.warn(
          `Skipping relationship with unknown endpoint(s): ${r.fromId} (${fromUid}), ${r.toId} (${toUid})`,
        );
      }
    }

    const totalRelationshipsUpserted = await upsertRelationshipsBatch(
      conn,
      databaseRelations,
    );
    console.log(
      `🔗 inserted/merged ${totalRelationshipsUpserted} relationships.`,
    );

    return {
      resources: totalResourcesUpserted,
      relationships: totalRelationshipsUpserted,
    };
  } finally {
    await conn.close();
  }
}
