import { canonicalLabelsForType, sanitizeCanonicalLabel } from "./helpers";
import {
  AzureResourceType,
  CHUNK_SIZE,
  isType,
  type AzureResourceRow,
  type Neo4jSession,
} from "./types";

export async function handleNetworkComponents(
  rows: AzureResourceRow[],
  session: Neo4jSession,
) {
  const subnetRes = await extractAndUpsertSubnets(rows, session);
  const nicRes = await linkNetworkInterfaces(rows, session);
  const pipRes = await connectPublicIpToInternet(rows, session);

  return {
    subnetNodesInserted: subnetRes.subnetNodesInserted,
    nicSubnetLinks: nicRes.nicSubnetLinksCreated,
    nicPipLinks: nicRes.nicPipLinksCreated,
    pipInternetLinks: pipRes.pipInternetLinksCreated,
  };
}

async function extractAndUpsertSubnets(
  rows: AzureResourceRow[],
  session: Neo4jSession,
) {
  const vnets = rows.filter((r) =>
    isType(r.type, AzureResourceType.VirtualNetwork),
  );

  const subnetRows: Array<{
    id: string;
    props: Record<string, unknown>;
    vnetId: string;
  }> = [];

  for (const v of vnets) {
    const vnetId = v.id;
    const subnets =
      v.properties && Array.isArray(v.properties.subnets)
        ? (v.properties.subnets as Array<Record<string, unknown>>)
        : [];

    for (const subnet of subnets) {
      const name =
        subnet && "name" in subnet && typeof subnet.name === "string"
          ? String(subnet.name)
          : undefined;

      const id =
        subnet && "id" in subnet && typeof subnet.id === "string"
          ? String(subnet.id)
          : undefined;

      if (id) {
        const subnetProps: Record<string, unknown> = {
          name: name ?? null,
          type: AzureResourceType.VirtualNetwork_Subnet,
          subscriptionId: v.subscriptionId,
          resourceGroup: v.resourceGroup,
          propertiesJson: JSON.stringify(subnet.properties),
          raw: JSON.stringify({ parent: v.id, subnet }),
        };
        subnetRows.push({ id: id.toLowerCase(), props: subnetProps, vnetId });
      }
    }
  }

  let subnetNodesInserted = 0;
  for (let i = 0; i < subnetRows.length; i += CHUNK_SIZE) {
    const rows = subnetRows.slice(i, i + CHUNK_SIZE);

    const canonical = canonicalLabelsForType(
      AzureResourceType.VirtualNetwork_Subnet,
    )
      .map(sanitizeCanonicalLabel)
      .join(":");
    const canonicalClause = canonical ? `:${canonical}` : "";

    const q = `
      UNWIND $rows AS r
      MERGE (s:AzureResource { id: r.id })
      SET s += r.props
      SET s${canonicalClause}
      WITH s, r
      MATCH (v:AzureResource { id: r.vnetId })
      MERGE (v)-[:CONTAINS]->(s)
      RETURN count(s) AS c
    `;
    const out = await session.run(q, { rows });
    subnetNodesInserted += Number(
      out.records?.[0]?.get("c")?.toNumber?.() ?? 0,
    );
  }

  return { subnetNodesInserted };
}

async function linkNetworkInterfaces(
  rows: AzureResourceRow[],
  session: Neo4jSession,
) {
  const nicSubnetPairs: Array<{ nicId: string; subnetId: string }> = [];
  const nicPipPairs: Array<{ nicId: string; pipId: string }> = [];

  const nics = rows.filter((r) =>
    isType(r.type, AzureResourceType.NetworkInterface),
  );
  for (const nic of nics) {
    const nicId = nic.id;
    const ipConfigs =
      (nic.properties.ipConfigurations as Array<Record<string, unknown>>) ?? [];
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
        nicSubnetPairs.push({ nicId, subnetId });
      }

      const pipObj =
        ic && typeof ic === "object" && "publicIPAddress" in ic
          ? (ic as Record<string, unknown>)["publicIPAddress"]
          : ic &&
              typeof ic === "object" &&
              "properties" in ic &&
              typeof (ic as Record<string, unknown>)["properties"] === "object"
            ? (
                (ic as Record<string, unknown>)["properties"] as Record<
                  string,
                  unknown
                >
              )["publicIPAddress"]
            : undefined;
      const pipId =
        pipObj &&
        typeof pipObj === "object" &&
        typeof (pipObj as Record<string, unknown>)["id"] === "string"
          ? String((pipObj as Record<string, unknown>)["id"]).toLowerCase()
          : undefined;
      if (pipId) {
        nicPipPairs.push({ nicId, pipId });
      }
    }
  }

  const results = {
    nicSubnetLinksCreated: 0,
    nicPipLinksCreated: 0,
  };

  for (let i = 0; i < nicSubnetPairs.length; i += CHUNK_SIZE) {
    const part = nicSubnetPairs.slice(i, i + CHUNK_SIZE);
    const q = /* cypher */ `
      UNWIND $rows AS r
      MATCH (nic:AzureResource { id: r.nicId })
      MATCH (sub:AzureResource { id: r.subnetId })
      MERGE (nic)-[:IN_SUBNET]->(sub)
      RETURN count(*) AS c
    `;
    const out = await session.run(q, { rows: part });
    results.nicSubnetLinksCreated += Number(
      out.records?.[0]?.get("c")?.toNumber?.() ?? 0,
    );
  }

  for (let i = 0; i < nicPipPairs.length; i += CHUNK_SIZE) {
    const part = nicPipPairs.slice(i, i + CHUNK_SIZE);
    const q = /* cypher */ `
      UNWIND $rows AS r
      MATCH (nic:AzureResource { id: r.nicId })
      MATCH (pip:AzureResource { id: r.pipId })
      MERGE (nic)-[:ASSOCIATED_PUBLIC_IP]->(pip)
      RETURN count(*) AS c
    `;
    const out = await session.run(q, { rows: part });
    results.nicPipLinksCreated += Number(
      out.records?.[0]?.get("c")?.toNumber?.() ?? 0,
    );
  }

  return results;
}

async function connectPublicIpToInternet(
  rows: AzureResourceRow[],
  session: Neo4jSession,
) {
  const publicIps = rows.filter((r) =>
    isType(r.type, AzureResourceType.PublicIpAddress),
  );
  const pipIds = publicIps.map((p) => ({ pipId: p.id }));

  await session.run(/* cypher */ `
    MERGE (i:Internet { id: 'internet' })
    SET i.displayName = 'Public Internet', i.updatedAt = datetime()
    SET i:Resource:Network
  `);

  let pipInternetLinksCreated = 0;
  for (let i = 0; i < pipIds.length; i += CHUNK_SIZE) {
    const part = pipIds.slice(i, i + CHUNK_SIZE);
    const q = /* cypher */ `
        UNWIND $rows AS r
        MATCH (pip:AzureResource { id: r.pipId })
        MATCH (i:Internet { id: 'internet' })
        MERGE (pip)-[:EXPOSES_TO]->(i)
        RETURN count(*) AS c
      `;
    const out = await session.run(q, { rows: part });
    pipInternetLinksCreated += Number(
      out.records?.[0]?.get("c")?.toNumber?.() ?? 0,
    );
  }
  return { pipInternetLinksCreated };
}
