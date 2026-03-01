import { AzureResourceRow, RoleDefinitionAssignedRow } from "../types";
import { InternalRelationship } from "./scannerDuck";

export function collectPrincipalToUserAssignedIdentityMappings(resources: AzureResourceRow[]) {
  const mapping: Map<string, string> = new Map();
  const uais = resources.filter(
    (r) =>
      r.type.toLowerCase() ===
      "microsoft.managedidentity/userassignedidentities",
  );
  for (const uai of uais) {
    if (
      uai.id &&
      uai.properties &&
      typeof uai.properties === "object" &&
      "principalId" in uai.properties
    ) {
      const principalId = String(uai.properties.principalId).toLowerCase();
      mapping.set(principalId, uai.id.toLowerCase());
    }
  }
  console.log(mapping);
  return mapping;
}

export function collectIdentityMappings(resources: AzureResourceRow[]): {
  resources: AzureResourceRow[];
  systemAssignedPrincipals: Set<string>;
  relationships: InternalRelationship[];
} {
  const systemAssignedIdentities: AzureResourceRow[] = [];
  const systemAssignedPrincipals = new Set<string>();
  const relationships: InternalRelationship[] = [];

  for (const r of resources) {
    if (r.identity) {
      if (r.identity.principalId) {
        systemAssignedIdentities.push({
          id: String(r.identity.principalId).toLowerCase(),
          name: `${r.name} - System Assigned Identity`,
          type: "identity",
          tenantId: "",
          kind: "",
          location: "",
          resourceGroup: "",
          subscriptionId: "",
          managedBy: null,
          sku: null,
          properties: {},
          tags: null,
        } as unknown as AzureResourceRow);
        systemAssignedPrincipals.add(
          String(r.identity.principalId).toLowerCase(),
        );
        relationships.push({
          fromId: r.id.toLowerCase(),
          toId: String(r.identity.principalId).toLowerCase(),
          relationshipType: "HAS_IDENTITY",
        });
        relationships.push({
          fromId: r.id.toLowerCase(),
          toId: String(r.identity.principalId).toLowerCase(),
          relationshipType: "HAS_SYSTEM_ASSIGNED_IDENTITY",
        });
      }

      if (r.identity.userAssignedIdentities) {
        for (const uid in r.identity.userAssignedIdentities) {
          relationships.push({
            fromId: r.id.toLowerCase(),
            toId: uid.toLowerCase(),
            relationshipType: "HAS_IDENTITY",
          });
        }
      }
    }
  }

  return {
    resources: systemAssignedIdentities,
    systemAssignedPrincipals,
    relationships,
  };
}

export function collectAuthRelations(
  rows: RoleDefinitionAssignedRow[],
  uaiMapping: Map<string, string>,
): {
  relationships: InternalRelationship[];
  allPrincipalsWithRoles: Set<string>;
} {
  // capture list of all principal ids with role assignments
  const allPrincipalsWithRoles = new Set<string>();
  const rels: InternalRelationship[] = [];
  for (const r of rows) {
    const raId = String(r.id).toLowerCase();
    const scopeId = String(r.scope).toLowerCase();
    rels.push({ fromId: raId, toId: scopeId, relationshipType: "ON_RESOURCE" });

    let uaiId;
    if ((uaiId = uaiMapping.get(r.principalId.toLowerCase()))) {
      rels.push({
        fromId: uaiId,
        toId: raId,
        relationshipType: "ASSIGNED",
      });
    } else {
      rels.push({
        fromId: String(r.principalId).toLowerCase(),
        toId: raId,
        relationshipType: "ASSIGNED",
      });
    }
    allPrincipalsWithRoles.add(String(r.principalId).toLowerCase());
  }
  return { relationships: rels, allPrincipalsWithRoles };
}

export const mapAuthRowsToResources = (
  rows: RoleDefinitionAssignedRow[],
): AzureResourceRow[] => {
  return rows.map(
    (r) =>
      ({
        id: String(r.id).toLowerCase(),
        name: r.roleDefinitionName,
        type: "roleassignment",
        tenantId: "",
        kind: "",
        location: "",
        resourceGroup: "",
        subscriptionId: "",
        managedBy: null,
        sku: null,
        properties: r,
        tags: null,
      }) as unknown as AzureResourceRow,
  );
};
