import type { TokenCredential } from "@azure/identity";
import { Client as MicrosoftGraphClient } from "@microsoft/microsoft-graph-client";
import { AzureResourceRow } from "../scanner/types";

export interface GraphResponseObject {
  response: Array<Record<string, unknown>>;
}

export async function getPrincipalsFromGraph(
  creds: TokenCredential,
  principalIds: Set<string>,
): Promise<GraphResponseObject> {
  console.log(
    `Enriching ${principalIds.size} principals with Microsoft Graph...`,
  );

  if (!principalIds || !principalIds.size) {
    console.warn("No principal IDs provided for enrichment.");
    return { response: [] };
  }

  const client = MicrosoftGraphClient.init({
    authProvider: async (done) => {
      try {
        const at = await creds.getToken("https://graph.microsoft.com/.default");
        done(null, at?.token ?? null);
      } catch (err) {
        done(err as Error, null);
      }
    },
  });

  const batches: string[][] = [];
  const all = Array.from(principalIds);
  for (let i = 0; i < all.length; i += 200) {
    batches.push(all.slice(i, i + 200));
  }

  const graphResponses: GraphResponseObject = { response: [] };
  for (const batch of batches) {
    try {
      const body: unknown = await client
        .api("/directoryObjects/getByIds")
        .post({
          ids: batch,
          types: ["User", "ServicePrincipal", "Group", "Application"],
        });
      console.log("Graph enrichment batch response received. Body", body);
      const maybeBody = body as { value?: unknown };
      const objects: Array<Record<string, unknown>> = Array.isArray(
        maybeBody.value,
      )
        ? (maybeBody.value as Array<Record<string, unknown>>)
        : [];
      graphResponses.response.push(...objects);
    } catch (err) {
      console.warn("⚠️ Graph enrichment error for batch", err);
    }
  }
  return graphResponses;
}

export function convertGraphResponseToResources(
  objects: GraphResponseObject,
): AzureResourceRow[] {
  const resources: AzureResourceRow[] = [];
  for (const o of objects.response) {
    const id = String(o.id || "").toLowerCase();
    const displayName =
      (o.displayName as string) ?? (o["userPrincipalName"] as string) ?? null;
    const raw = JSON.stringify(o || {});
    resources.push({
      id,
      name: displayName ?? id,
      type: "identity",
      tenantId: "",
      kind: "",
      location: "",
      resourceGroup: "",
      subscriptionId: "",
      managedBy: null,
      sku: null,
      properties: { graph: JSON.parse(raw) },
      tags: null,
    } as unknown as AzureResourceRow);
  }
  return resources;
}
