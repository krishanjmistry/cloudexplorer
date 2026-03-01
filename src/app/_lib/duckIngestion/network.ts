import { AzureResourceRow, isType } from "../types";
import { InternalRelationship } from "./scannerDuck";

const INTERNET_RESOURCE_ID = "internet";

interface collectionResult {
  relationships: InternalRelationship[];
  newResources: AzureResourceRow[];
}

export function collectNetworkRelations(
  rows: AzureResourceRow[],
): collectionResult {
  const relationships: InternalRelationship[] = [];
  const newResources: AzureResourceRow[] = [];

  for (const vnet of rows.filter(
    (r) => isType(r.type, "microsoft.network/virtualnetworks"),
  )) {
    const vnetId = vnet.id.toLowerCase();
    const subnets =
      (vnet.properties?.subnets as Array<Record<string, unknown>>) ?? [];
    for (const subnet of subnets) {
      const subnetId =
        typeof subnet === "object" &&
        subnet !== null &&
        typeof subnet["id"] === "string"
          ? String(subnet["id"]).toLowerCase()
          : undefined;
      if (subnetId) {
        const subnetResource: AzureResourceRow = {
          ...vnet,
          id: subnetId,
          name: String(subnet["name"] ?? ""),
          type: "microsoft.network/virtualnetworks/subnets",
          properties: (subnet["properties"] as Record<string, unknown>) ?? null,
          raw: subnet,
        } as AzureResourceRow;

        newResources.push(subnetResource);
        relationships.push({
          fromId: vnetId,
          toId: subnetId,
          relationshipType: "HAS_SUBNET",
        });
      }
    }
  }

  for (const nic of rows.filter(
    (r) => isType(r.type, "microsoft.network/networkinterfaces"),
  )) {
    const nicId = nic.id.toLowerCase();
    const ipConfigs =
      (nic.properties?.ipConfigurations as Array<Record<string, unknown>>) ??
      [];
    for (const ic of ipConfigs) {
      const subnetObj =
        ic &&
        "properties" in ic &&
        typeof (ic as Record<string, unknown>)["properties"] === "object"
          ? ((
              (ic as Record<string, unknown>)["properties"] as Record<
                string,
                unknown
              >
            )["subnet"] as Record<string, unknown>)
          : undefined;
      const subnetId =
        subnetObj &&
        typeof subnetObj === "object" &&
        typeof (subnetObj as Record<string, unknown>)["id"] === "string"
          ? String((subnetObj as Record<string, unknown>)["id"]).toLowerCase()
          : undefined;
      if (subnetId) {
        relationships.push({
          fromId: nicId,
          toId: subnetId,
          relationshipType: "IN_SUBNET",
        });
      }

      const pipObj =
        ic && typeof ic === "object" && "publicIPAddress" in ic
          ? (ic as Record<string, unknown>)["publicIPAddress"]
          : ic &&
              typeof ic === "object" &&
              "properties" in ic &&
              typeof (ic as Record<string, unknown>)["properties"] === "object"
            ? ((
                (ic as Record<string, unknown>)["properties"] as Record<
                  string,
                  unknown
                >
              )["publicIPAddress"] as Record<string, unknown>)
            : undefined;
      const pipId =
        pipObj &&
        typeof pipObj === "object" &&
        typeof (pipObj as Record<string, unknown>)["id"] === "string"
          ? String((pipObj as Record<string, unknown>)["id"]).toLowerCase()
          : undefined;
      if (pipId) {
        relationships.push({
          fromId: nicId,
          toId: pipId,
          relationshipType: "ASSOCIATED_PUBLIC_IP",
        });
      }
    }
  }

  for (const pip of rows.filter(
    (r) => isType(r.type, "microsoft.network/publicipaddresses"),
  )) {
    relationships.push({
      fromId: pip.id.toLowerCase(),
      toId: INTERNET_RESOURCE_ID,
      relationshipType: "EXPOSES_TO",
    });
  }

  return { relationships, newResources };
}

export const InternetResource: AzureResourceRow = {
  id: INTERNET_RESOURCE_ID,
  name: "Public Internet",
  type: "internet",
  tenantId: "",
  kind: "",
  location: "",
  resourceGroup: "",
  subscriptionId: "",
  managedBy: null,
  sku: null,
  properties: {},
  tags: null,
};
