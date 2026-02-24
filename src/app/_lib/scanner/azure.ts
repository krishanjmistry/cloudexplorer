import { ResourceGraphClient } from "@azure/arm-resourcegraph";
import type { AzureResourceRow, RoleDefinitionAssignedRow } from "./types";

export async function fetchAzureResources(
  client: ResourceGraphClient,
): Promise<{ containers: AzureResourceRow[]; resources: AzureResourceRow[] }> {
  console.log("🚀 starting Resource Graph query");

  let resources: AzureResourceRow[] = [];
  let containers: AzureResourceRow[] = [];

  try {
    const [resR, resC] = await Promise.all([
      client.resources({
        query: "resources",
        options: { resultFormat: "objectArray" },
      }),
      client.resources({
        query: "resourcecontainers",
        options: { resultFormat: "objectArray" },
      }),
    ]);
    resources = (resR.data as AzureResourceRow[]) || [];
    containers = (resC.data as AzureResourceRow[]) || [];
  } catch (err) {
    console.error("⚠️ live Resource Graph query failed:", err);
    resources = [];
    containers = [];
  }

  resources = resources.map((r) => ({ ...r, id: String(r.id).toLowerCase() }));
  containers = containers.map((c) => ({
    ...c,
    id: String(c.id).toLowerCase(),
  }));

  console.log(
    `📦 found ${containers.length + resources.length} total items (resources+containers)`,
  );

  return { containers, resources };
}

export async function fetchAuthorizationResources(
  client: ResourceGraphClient,
): Promise<RoleDefinitionAssignedRow[]> {
  const roleAssignmentsWithDefinitionsKql = `
    authorizationresources
    | where type == 'microsoft.authorization/roleassignments'
    | extend
        roleDefinitionId = tostring(properties.roleDefinitionId),
        principalId = tostring(properties.principalId),
        principalType = tostring(properties.principalType),
        scope = tostring(properties.scope),
        createdOn = tostring(properties.createdOn)
    | join kind=leftouter (
        authorizationresources
        | where type == 'microsoft.authorization/roledefinitions'
        | extend
            rdId = tostring(id),
            roleName = tostring(properties.roleName),
            description = tostring(properties.description)
    ) on $left.roleDefinitionId == $right.rdId
    | project
        id,
        roleDefinitionId = roleDefinitionId,
        roleDefinitionName = roleName,
        roleDefinitionDescription = description,
        principalId,
        principalType,
        scope,
        createdOn
    `;

  const res = await client.resources({
    query: roleAssignmentsWithDefinitionsKql,
    options: { resultFormat: "objectArray" },
  });

  return (res.data as RoleDefinitionAssignedRow[]) || [];
}
