import { AzureResourceTypeKey, AzureResourceTypeValue, typeKey } from "./types";

function sanitizeLabel(type: string | undefined): string {
  const base = (type || "Unknown")
    .replace(/\//g, "_")
    .replace(/[^A-Za-z0-9_]/g, "_");
  const prefixed = `AZ_${base}`;
  return /^[0-9]/.test(prefixed) ? `L_${prefixed}` : prefixed;
}

function sanitizeCanonicalLabel(name: string): string {
  const s = name.replace(/[^A-Za-z0-9_]/g, "_");
  return /^[0-9]/.test(s) ? `L_${s}` : s || "Unknown";
}

const CANONICAL_LABELS: Record<AzureResourceTypeKey, string[]> = {
  VirtualNetwork: ["Resource", "Network", "Network_VNet"],
  VirtualNetwork_Subnet: ["Resource", "Network", "Network_Subnet"],
  NetworkInterface: ["Resource", "Network", "Network_NIC"],
  PublicIpAddress: ["Resource", "Network", "Network_PublicIP"],
  NetworkWatcher: ["Resource", "Network", "Network_Watcher"],

  Internet: ["Internet"],

  VirtualMachine: ["Resource", "Compute", "Compute_VirtualMachine"],
  Compute_Disk: ["Resource", "Compute", "Storage", "Storage_Disk"],

  KeyVault: ["Resource", "Security", "KeyVault"],
  StorageAccount: ["Resource", "Storage", "Storage_Account"],

  ManagedIdentityUserAssigned: [
    "Resource",
    "Identity",
    "Identity_UserAssigned",
    "Identity_Machine",
  ],

  Subscription: ["Resource", "Subscription"],
  ResourceGroup: ["Resource", "ResourceGroup"],
};

export function canonicalLabelsForType(
  type: AzureResourceTypeValue | string,
): string[] {
  const key = typeKey(type);
  if (!key) {
    return ["Resource", "Unknown"];
  }
  return CANONICAL_LABELS[key];
}
