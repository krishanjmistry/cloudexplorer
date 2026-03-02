export type AzureResourceRow = {
  id: string;
  name: string;
  type: AzureResourceTypeValue;
  tenantId: string;
  kind: string | null;
  location: string | null;
  resourceGroup: string | null;
  subscriptionId: string;
  managedBy: string | null;
  sku: Record<string, unknown> | null;
  properties: Record<string, unknown>;
  tags: Record<string, unknown> | null;
  identity?: Record<string, unknown> | null;
  principalId?: string | null;
  systemAssignedPrincipalId?: string | null;
  userAssignedIdentityIds?: string[] | null;
  [k: string]: unknown;
};

export type RoleDefinitionAssignedRow = {
  id: string;
  roleDefinitionId: string;
  roleDefinitionName: string;
  roleDefinitionDescription: string;
  principalId: string;
  principalType: string;
  scope: string;
  createdOn: string;
  [k: string]: unknown;
};

export const AzureResourceType = {
  VirtualNetwork: "microsoft.network/virtualnetworks",
  VirtualNetwork_Subnet: "microsoft.network/virtualnetworks/subnets",
  NetworkInterface: "microsoft.network/networkinterfaces",
  PublicIpAddress: "microsoft.network/publicipaddresses",
  NetworkWatcher: "microsoft.network/networkwatchers",
  Internet: "internet",

  VirtualMachine: "microsoft.compute/virtualmachines",
  Compute_Disk: "microsoft.compute/disks",

  KeyVault: "microsoft.keyvault/vaults",
  StorageAccount: "microsoft.storage/storageaccounts",

  ManagedIdentityUserAssigned:
    "microsoft.managedidentity/userassignedidentities",

  Subscription: "microsoft.resources/subscriptions",
  ResourceGroup: "microsoft.resources/subscriptions/resourcegroups",
} as const;

export type AzureResourceTypeKey = keyof typeof AzureResourceType;
export type AzureResourceTypeValue =
  (typeof AzureResourceType)[AzureResourceTypeKey];

export function normalizeType(raw?: string | null): string | undefined {
  if (!raw || typeof raw !== "string") {
    return undefined;
  }
  return raw.trim().replace(/\/+$/u, "").toLowerCase();
}

export function isAzureResourceType(
  raw: string | undefined | null,
  expected: AzureResourceTypeValue,
) {
  return normalizeType(raw) === expected;
}

/** Map provider-specific type strings to a canonical short key (optional helper). */
export function typeKey(
  raw: string | undefined | null,
): AzureResourceTypeKey | undefined {
  const n = normalizeType(raw);
  if (!n) {
    return undefined;
  }
  return (Object.keys(AzureResourceType) as AzureResourceTypeKey[]).find(
    (k) => AzureResourceType[k] === n,
  );
}

type Uid = number;
type Id = string;

export interface UpsertResult {
  inserted: number;
  idToUid: Map<Id, Uid>;
}

export interface InternalRelationship {
  fromId: Id;
  toId: Id;
  relationshipType: string;
}

export interface DatabaseRelationship {
  fromUid: Uid;
  toUid: Uid;
  relationshipType: string;
}
