import { AzureResourceRow, isType } from "../types";
import { InternalRelationship } from "./scannerDuck";

export function collectResourceGroupResourceRelationships(
  resources: AzureResourceRow[],
): InternalRelationship[] {
  const relations: InternalRelationship[] = [];
  for (const resource of resources) {
    if (resource.resourceGroup) {
      const resourceGroupId =
        `/subscriptions/${resource.subscriptionId}/resourceGroups/${resource.resourceGroup}`.toLowerCase();
      relations.push({
        fromId: resourceGroupId,
        toId: resource.id.toLowerCase(),
        relationshipType: "CONTAINS",
      });
    }
  }
  return relations;
}

export function collectSubscriptionResourceGroupRelations(
  containers: AzureResourceRow[],
): InternalRelationship[] {
  const relations: InternalRelationship[] = [];

  for (const container of containers) {
    if (
      isType(container.type, "microsoft.resources/subscriptions/resourcegroups")
    ) {
      const subscriptionId = `/subscriptions/${String(container.subscriptionId).toLowerCase()}`;
      relations.push({
        fromId: subscriptionId,
        toId: container.id.toLowerCase(),
        relationshipType: "CONTAINS",
      });
    }
  }
  return relations;
}
