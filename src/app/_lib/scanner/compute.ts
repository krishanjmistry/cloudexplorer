import {
  AzureResourceType,
  CHUNK_SIZE,
  type AzureResourceRow,
  type Neo4jSession,
} from "./types";

export async function handleComputeRelationships(
  rows: AzureResourceRow[],
  session: Neo4jSession,
) {
  const vms = rows.filter(
    (r) => r.type.toLowerCase() === AzureResourceType.VirtualMachine,
  );
  if (!vms.length) {
    return { nicLinks: 0, osDiskLinks: 0 };
  }

  const nicPairs: Array<{ vmId: string; nicId: string }> = [];
  const osPairs: Array<{ vmId: string; diskId: string }> = [];

  for (const vm of vms) {
    const vmId = vm.id;
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
          nicPairs.push({ vmId, nicId: idVal.toLowerCase() });
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
      osPairs.push({ vmId, diskId: String(osDiskId).toLowerCase() });
    }
  }

  let nicLinks = 0;
  if (nicPairs.length) {
    for (let i = 0; i < nicPairs.length; i += CHUNK_SIZE) {
      const part = nicPairs.slice(i, i + CHUNK_SIZE);
      const q = /* cypher */ `
        UNWIND $rows AS r
        MATCH (vm:AzureResource { id: r.vmId })
        MATCH (nic:AzureResource { id: r.nicId })
        MERGE (vm)-[:HAS_INTERFACE]->(nic)
        RETURN count(*) AS c
      `;
      const out = await session.run(q, { rows: part });
      nicLinks += Number(out.records?.[0]?.get("c")?.toNumber?.() ?? 0);
    }
  }

  let osDiskLinks = 0;
  if (osPairs.length) {
    for (let i = 0; i < osPairs.length; i += CHUNK_SIZE) {
      const part = osPairs.slice(i, i + CHUNK_SIZE);
      const q = /* cypher */ `
        UNWIND $rows AS r
        MATCH (vm:AzureResource { id: r.vmId })
        MATCH (disk:AzureResource { id: r.diskId })
        MERGE (vm)-[:HAS_OS_DISK]->(disk)
        RETURN count(*) AS c
      `;
      const out = await session.run(q, { rows: part });
      osDiskLinks += Number(out.records?.[0]?.get("c")?.toNumber?.() ?? 0);
    }
  }

  return { nicLinks, osDiskLinks };
}
