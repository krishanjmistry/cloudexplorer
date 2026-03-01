import {
  AzureResourceRow,
  InternalRelationship,
  isAzureResourceType,
} from "../types";

export function collectComputeRelationships(
  resources: AzureResourceRow[],
): InternalRelationship[] {
  const relations: InternalRelationship[] = [];

  const vms = resources.filter((r) =>
    isAzureResourceType(r.type, "microsoft.compute/virtualmachines"),
  );

  for (const vm of vms) {
    const vmId = vm.id.toLowerCase();
    const props = vm.properties as Record<string, unknown> | undefined;

    const networkProfile =
      props && typeof props === "object" && "networkProfile" in props
        ? ((props as Record<string, unknown>)["networkProfile"] as
            | Record<string, unknown>
            | undefined)
        : undefined;

    const possibleNics =
      networkProfile &&
      typeof networkProfile === "object" &&
      "networkInterfaces" in networkProfile
        ? (networkProfile["networkInterfaces"] as unknown)
        : undefined;

    const nics = Array.isArray(possibleNics)
      ? (possibleNics as Array<unknown>)
      : [];

    for (const ni of nics) {
      if (
        ni &&
        typeof ni === "object" &&
        "id" in (ni as Record<string, unknown>)
      ) {
        const idVal = (ni as Record<string, unknown>)["id"];
        if (typeof idVal === "string" && idVal) {
          relations.push({
            fromId: vmId,
            toId: idVal.toLowerCase(),
            relationshipType: "HAS_INTERFACE",
          });
        }
      }
    }

    const storageProfile =
      props && typeof props === "object" && "storageProfile" in props
        ? ((props as Record<string, unknown>)["storageProfile"] as
            | Record<string, unknown>
            | undefined)
        : undefined;

    const osDisk =
      storageProfile &&
      typeof storageProfile === "object" &&
      "osDisk" in storageProfile
        ? (storageProfile["osDisk"] as Record<string, unknown> | undefined)
        : undefined;

    const managedDisk =
      osDisk && typeof osDisk === "object" && "managedDisk" in osDisk
        ? (osDisk["managedDisk"] as Record<string, unknown> | undefined)
        : undefined;

    const osDiskId =
      managedDisk &&
      typeof managedDisk === "object" &&
      "id" in managedDisk &&
      typeof managedDisk["id"] === "string"
        ? (managedDisk["id"] as string)
        : undefined;

    if (osDiskId) {
      relations.push({
        fromId: vmId,
        toId: osDiskId.toLowerCase(),
        relationshipType: "HAS_OS_DISK",
      });
    }
  }
  return relations;
}
