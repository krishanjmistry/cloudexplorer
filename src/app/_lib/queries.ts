interface instanceTableMapping {
  reference: string;
  displayName: string;
}

interface Scenario {
  id: string;
  title: string;
  description: string;
  // the query used to populate the dashboard count (Cypher for Neo4j)
  countQuery: string;
  // the query used to populate the dashboard count (SQL for DuckDB)
  countQuerySql: string;
  // query that returns tabular instance rows for the dashboard table (Cypher for Neo4j)
  instancesQuery: string;
  // query that returns tabular instance rows for the dashboard table (SQL for DuckDB)
  instancesSql: string;
  // focused graph query that accepts $elementId and returns a compact subgraph
  focusedQuery: string;
  // the graph query used for visualization of the full graph
  graphQuery: string;
  // the main query to run for this scenario
  mainQuery: string;
  // the access method to get the elementId
  elementId: string;
  // instances
  instanceMapping: instanceTableMapping[];
  // risk metadata used by the UI
  severity: "Critical" | "High" | "Medium" | "Low";
  remediation: string;
}

export const SCENARIOS: Record<string, Scenario> = {
  TOXIC_COMBINATION: {
    id: "TOXIC_COMBINATION",
    title: "Toxic Combinations",
    description:
      "Publicly exposed VMs with Critical Vulnerabilities and High Privileges.",
    severity: "Critical",
    remediation:
      "Isolate the VM, remove high-privilege identities and patch the vulnerability.",
    countQuery: /* cypher */ `
      MATCH (vm:Resource:Compute)-[:HAS_INTERFACE]->(nic:Resource:Network_NIC)-[:ASSOCIATED_PUBLIC_IP]->(pip:Resource:Network_PublicIP)-[:EXPOSES_TO]->(internet:Internet)
      MATCH (vm)-[:HAS_VULNERABILITY]->(cve:Vulnerability {severity: 'Critical'})
      MATCH (vm)-[:HAS_IDENTITY]->(id:Identity)
      RETURN count(DISTINCT vm) as count
    `,
    countQuerySql: /* sql */ `
      SELECT COUNT(DISTINCT vm.uid) AS count
      FROM resources vm
      JOIN resource_rel r1 ON r1.from_uid = vm.uid AND r1.reltype = 'HAS_INTERFACE'
      JOIN resource_rel r2 ON r2.from_uid = r1.to_uid AND r2.reltype = 'ASSOCIATED_PUBLIC_IP'
      JOIN resource_rel r3 ON r3.from_uid = r2.to_uid AND r3.reltype = 'EXPOSES_TO'
      JOIN resource_rel r4 ON r4.from_uid = vm.uid AND r4.reltype = 'HAS_VULNERABILITY'
      JOIN resources vuln ON vuln.uid = r4.to_uid AND vuln.properties LIKE '%"severity":"critical"%'
      JOIN resource_rel r5 ON r5.from_uid = vm.uid AND r5.reltype = 'HAS_IDENTITY';
    `,
    instancesQuery: /* cypher */ `
      MATCH (vm:Resource:Compute)-[:HAS_INTERFACE]->(nic:Resource:Network_NIC)-[:ASSOCIATED_PUBLIC_IP]->(pip:Resource:Network_PublicIP)-[:EXPOSES_TO]->(internet:Internet)
      MATCH (id:Identity)<-[r5]-(vm)-[r4]->(cve:Vulnerability {severity: 'Critical'})
      RETURN
        elementId(vm) AS elementId,
        vm AS vm, 
        cve AS vulnerability, 
        id AS identity
      ORDER BY vm.name
    `,
    instancesSql: /* sql */ `
      SELECT
        vm.uid AS elementId,
        vm.name AS vm,
        vuln.properties AS vulnerability,
        id.name AS identity
      FROM resources vm
      JOIN resource_rel r1 ON r1.from_uid = vm.uid AND r1.reltype = 'HAS_INTERFACE'
      JOIN resource_rel r2 ON r2.from_uid = r1.to_uid AND r2.reltype = 'ASSOCIATED_PUBLIC_IP'
      JOIN resource_rel r3 ON r3.from_uid = r2.to_uid AND r3.reltype = 'EXPOSES_TO'
      JOIN resource_rel r4 ON r4.from_uid = vm.uid AND r4.reltype = 'HAS_VULNERABILITY'
      JOIN resources vuln ON vuln.uid = r4.to_uid AND vuln.properties LIKE '%"severity":"critical"%'
      JOIN resource_rel r5 ON r5.from_uid = vm.uid AND r5.reltype = 'HAS_IDENTITY'
      JOIN resources id ON id.uid = r5.to_uid;
    `,
    mainQuery: /* sql */ `
      SELECT
        vm, r1, r2, r3, r4, r5, vuln, idn
      FROM resources vm
      JOIN resource_rel r1 ON r1.from_uid = vm.uid AND r1.reltype = 'HAS_INTERFACE'
      JOIN resource_rel r2 ON r2.from_uid = r1.to_uid AND r2.reltype = 'ASSOCIATED_PUBLIC_IP'
      JOIN resource_rel r3 ON r3.from_uid = r2.to_uid AND r3.reltype = 'EXPOSES_TO'
      JOIN resource_rel r4 ON r4.from_uid = vm.uid AND r4.reltype = 'HAS_VULNERABILITY'
      JOIN resources vuln ON vuln.uid = r4.to_uid AND vuln.properties LIKE '%"severity":"critical"%'
      JOIN resource_rel r5 ON r5.from_uid = vm.uid AND r5.reltype = 'HAS_IDENTITY'
      JOIN resources idn ON idn.uid = r5.to_uid
    `,
    elementId: "vm.uid",
    instanceMapping: [
      { reference: "vm.name", displayName: "virtualMachine" },
      { reference: "vuln.properties", displayName: "vulnerability" },
      { reference: "idn.name", displayName: "identity" },
    ],
    focusedQuery: /* cypher */ `
      MATCH (vm:Resource:Compute) WHERE elementId(vm) = $elementId
      OPTIONAL MATCH (vm)-[r:HAS_VULNERABILITY]->(cve:Vulnerability {severity: 'Critical'})
      OPTIONAL MATCH (vm)-[:HAS_INTERFACE]->(nic:Resource:Network_NIC)-[:ASSOCIATED_PUBLIC_IP]->(pip:Resource:Network_PublicIP)-[:EXPOSES_TO]->(internet:Internet)
      OPTIONAL MATCH path_inet = shortestPath((pip)-[*..4]-(vm))
      OPTIONAL MATCH (vm)-[r2]->(id:Identity)-[r3]->(scope)
      WHERE path_inet IS NULL OR (pip IN nodes(path_inet) AND nic IN nodes(path_inet))
      
      RETURN DISTINCT
        vm                       AS vm,
        cve                      AS vulnerability,
        r                        AS vmToCve,
        pip                      AS publicIp,
        nodes(path_inet)         AS internetPathNodes,
        relationships(path_inet) AS internetPathRels,
        id                       AS identity,
        scope                    AS scope,
        r2                       AS vmToId,
        r3                       AS idToScope
    `,
    graphQuery: /* cypher */ `
      MATCH publicInternetToVM = (vm:Resource:Compute)-[:HAS_INTERFACE]->(:Resource:Network_NIC)-[:ASSOCIATED_PUBLIC_IP]->(:Resource:Network_PublicIP)-[:EXPOSES_TO]->(internet:Internet)
      MATCH vmVuln = (vm)-[:HAS_VULNERABILITY]->(cve:Vulnerability {severity: 'Critical'})
      MATCH vmScope = (vm)-[:HAS_IDENTITY]->(:Identity)-[:ASSIGNED]->(scope)
      RETURN nodes(publicInternetToVM) + nodes(vmVuln) + nodes(vmScope) AS nodes,
        relationships(publicInternetToVM) + relationships(vmVuln) + relationships(vmScope) AS rels
    `,
  },
  DATA_EXFIL: {
    id: "DATA_EXFIL",
    title: "Potential Data Exfiltration",
    description:
      "Compute resources that can read Key Vaults and are connected to the Internet.",
    severity: "High",
    remediation: "Restrict Key Vault access, lock down network paths.",
    countQuery: /* cypher */ `
      MATCH (vm:Resource:Compute)-[:HAS_INTERFACE]->(nic:Resource:Network_NIC)-[:ASSOCIATED_PUBLIC_IP]->(pip:Resource:Network_PublicIP)-[:EXPOSES_TO]->(internet:Internet)
      MATCH (vm)-[:HAS_IDENTITY]->(:Identity)-[:ASSIGNED]->(:RoleAssignment)-[:ON_RESOURCE]->(:KeyVault)
      RETURN count(DISTINCT vm) as count
    `,
    countQuerySql: /* sql */ `
      SELECT COUNT(DISTINCT vm.uid) AS count
      FROM resources vm
      JOIN resource_rel r1 ON r1.from_uid = vm.uid AND r1.reltype = 'HAS_INTERFACE'
      JOIN resource_rel r2 ON r2.from_uid = r1.to_uid AND r2.reltype = 'ASSOCIATED_PUBLIC_IP'
      JOIN resource_rel r3 ON r3.from_uid = r2.to_uid AND r3.reltype = 'EXPOSES_TO'
      JOIN resource_rel r4 ON r4.from_uid = vm.uid AND r4.reltype = 'HAS_IDENTITY'
      JOIN resource_rel r5 ON r5.from_uid = r4.to_uid AND r5.reltype = 'ASSIGNED'
      JOIN resource_rel r6 ON r6.from_uid = r5.to_uid AND r6.reltype = 'ON_RESOURCE'
      JOIN resources kv ON kv.uid = r6.to_uid AND kv.type LIKE '%keyvault%';
    `,
    instancesQuery: /* cypher */ `
      MATCH (vm:Resource:Compute)-[:HAS_INTERFACE]->(nic:Resource:Network_NIC)-[:ASSOCIATED_PUBLIC_IP]->(pip:Resource:Network_PublicIP)-[:EXPOSES_TO]->(internet:Internet)
      MATCH srcPermissionsOnKeyVault = (vm)-[:HAS_IDENTITY]->(id:Identity)-[:ASSIGNED]->(ra:RoleAssignment)-[:ON_RESOURCE]->(kv:KeyVault)
      RETURN
            elementId(vm) AS elementId,
            vm AS virtualMachine,
            ra AS role,
            kv AS keyVault,
            id AS identity
      ORDER BY virtualMachine.name
    `,
    instancesSql: /* sql */ `
      SELECT
        vm.uid AS elementId,
        vm.name AS virtualMachine,
        kv.name AS keyVault,
        ra.properties AS role,
        id.name AS identity
      FROM resources vm
      JOIN resource_rel r1 ON r1.from_uid = vm.uid AND r1.reltype = 'HAS_INTERFACE'
      JOIN resource_rel r2 ON r2.from_uid = r1.to_uid AND r2.reltype = 'ASSOCIATED_PUBLIC_IP'
      JOIN resource_rel r3 ON r3.from_uid = r2.to_uid AND r3.reltype = 'EXPOSES_TO'
      JOIN resource_rel r4 ON r4.from_uid = vm.uid AND r4.reltype = 'HAS_IDENTITY'
      JOIN resource_rel r5 ON r5.from_uid = r4.to_uid AND r5.reltype = 'ASSIGNED'
      JOIN resource_rel r6 ON r6.from_uid = r5.to_uid AND r6.reltype = 'ON_RESOURCE'
      JOIN resources kv ON kv.uid = r6.to_uid AND kv.type LIKE '%keyvault%'
      JOIN resources ra ON ra.uid = r5.to_uid AND ra.type = 'roleassignment'
      JOIN resources id ON id.uid = r4.to_uid;
    `,
    mainQuery: /* sql */ `
      SELECT
        vm, r1, r2, r3, r4, r5, r6, kv, ra, idn
      FROM resources vm
      JOIN resource_rel r1 ON r1.from_uid = vm.uid AND r1.reltype = 'HAS_INTERFACE'
      JOIN resource_rel r2 ON r2.from_uid = r1.to_uid AND r2.reltype = 'ASSOCIATED_PUBLIC_IP'
      JOIN resource_rel r3 ON r3.from_uid = r2.to_uid AND r3.reltype = 'EXPOSES_TO'
      JOIN resource_rel r4 ON r4.from_uid = vm.uid AND r4.reltype = 'HAS_IDENTITY'
      JOIN resource_rel r5 ON r5.from_uid = r4.to_uid AND r5.reltype = 'ASSIGNED'
      JOIN resource_rel r6 ON r6.from_uid = r5.to_uid AND r6.reltype = 'ON_RESOURCE'
      JOIN resources kv ON kv.uid = r6.to_uid AND kv.type LIKE '%keyvault%'
      JOIN resources ra ON ra.uid = r5.to_uid AND ra.type = 'roleassignment'
      JOIN resources idn ON idn.uid = r4.to_uid
    `,
    elementId: "vm.uid",
    instanceMapping: [
      { reference: "vm.name", displayName: "virtualMachine" },
      { reference: "kv.name", displayName: "keyVault" },
      { reference: "ra.properties", displayName: "role" },
      { reference: "idn.name", displayName: "identity" },
    ],
    focusedQuery: /* cypher */ `
      MATCH (vm:Resource:Compute) WHERE elementId(vm) = $elementId
      MATCH srcReachesInternet = (vm:Resource:Compute)-[:HAS_INTERFACE]->(nic:Resource:Network_NIC)-[:ASSOCIATED_PUBLIC_IP]->(pip:Resource:Network_PublicIP)-[:EXPOSES_TO]->(internet:Internet)
      MATCH srcPermissionsOnKeyVault = (vm)-[:HAS_IDENTITY]->(id)-[:ASSIGNED]->(ra:RoleAssignment)-[:ON_RESOURCE]->(kv:KeyVault)
      RETURN nodes(srcReachesInternet) + nodes(srcPermissionsOnKeyVault) AS nodes,
        relationships(srcReachesInternet) + relationships(srcPermissionsOnKeyVault) AS rels
    `,
    graphQuery: /* cypher */ `
      MATCH srcReachesInternet = (src:Resource:Compute)-[:HAS_INTERFACE]->(nic:Resource:Network_NIC)-[:ASSOCIATED_PUBLIC_IP]->(pip:Resource:Network_PublicIP)-[:EXPOSES_TO]->(internet:Internet)
      MATCH srcPermissionsOnKeyVault = (src)-[:HAS_IDENTITY]->(id)-[:ASSIGNED]->(ra:RoleAssignment)-[:ON_RESOURCE]->(kv:KeyVault)
      RETURN nodes(srcReachesInternet) + nodes(srcPermissionsOnKeyVault) AS nodes,
        relationships(srcReachesInternet) + relationships(srcPermissionsOnKeyVault) AS rels
    `,
  },
  IDENTITY_RISK: {
    id: "IDENTITY_RISK",
    title: "Identity Risks",
    description:
      'Identities with privileged "Contributor" or "Owner" access on Subscriptions.',
    severity: "High",
    remediation:
      "Review and remove roles; apply least-privilege role assignments.",
    countQuery: /* cypher */ `
      MATCH (id:Identity)-[:ASSIGNED]->(ra:RoleAssignment)-[:ON_RESOURCE]->(sub:AzureResource)
      WHERE (sub:Subscription)
        AND ra.roleDefinitionName IN ['Owner', 'Contributor']
      RETURN count(DISTINCT [id, sub, ra]) as count
    `,
    countQuerySql: /* sql */ `
      SELECT COUNT(DISTINCT id.uid || '-' || ra.uid || '-' || sub.uid) AS count
      FROM resources id
      JOIN resource_rel r1 ON r1.from_uid = id.uid AND r1.reltype = 'ASSIGNED'
      JOIN resources ra ON ra.uid = r1.to_uid AND ra.type = 'roleassignment'
      JOIN resource_rel r2 ON r2.from_uid = ra.uid AND r2.reltype = 'ON_RESOURCE'
      JOIN resources sub ON sub.uid = r2.to_uid AND sub.type = 'microsoft.resources/subscriptions'
      WHERE ra.properties LIKE '%"roleDefinitionName":"Owner"%' OR ra.properties LIKE '%"roleDefinitionName":"Contributor"%';
    `,
    instancesQuery: /* cypher */ `
      MATCH (id:Identity)-[:ASSIGNED]->(ra:RoleAssignment)-[:ON_RESOURCE]->(sub:AzureResource)
      WHERE sub:Subscription
        AND ra.roleDefinitionName IN ['Owner', 'Contributor']
      RETURN
        elementId(id) AS elementId,
        id AS identity,
        sub AS subscription,
        ra AS role
      ORDER BY identity.name, subscription.name, role.roleDefinitionName
    `,
    instancesSql: /* sql */ `
      SELECT
        id.uid AS elementId,
        id.name AS identity,
        sub.name AS subscription,
        ra.properties AS role
      FROM resources id
      JOIN resource_rel r1 ON r1.from_uid = id.uid AND r1.reltype = 'ASSIGNED'
      JOIN resources ra ON ra.uid = r1.to_uid AND ra.type = 'roleassignment'
      JOIN resource_rel r2 ON r2.from_uid = ra.uid AND r2.reltype = 'ON_RESOURCE'
      JOIN resources sub ON sub.uid = r2.to_uid AND sub.type = 'microsoft.resources/subscriptions'
      WHERE ra.properties LIKE '%"roleDefinitionName":"Owner"%' OR ra.properties LIKE '%"roleDefinitionName":"Contributor"%';
    `,
    mainQuery: /* sql */ `
      SELECT
        idn, 
        r1, 
        ra, 
        r2, 
        sub
      FROM resources idn
      JOIN resource_rel r1 ON r1.from_uid = idn.uid AND r1.reltype = 'ASSIGNED'
      JOIN resources ra ON ra.uid = r1.to_uid AND ra.type = 'roleassignment'
      JOIN resource_rel r2 ON r2.from_uid = ra.uid AND r2.reltype = 'ON_RESOURCE'
      JOIN resources sub ON sub.uid = r2.to_uid AND sub.type = 'microsoft.resources/subscriptions'
      WHERE ra.properties LIKE '%"roleDefinitionName":"Owner"%' OR ra.properties LIKE '%"roleDefinitionName":"Contributor"%'
    `,
    elementId: "idn.uid",
    instanceMapping: [
      { reference: "idn.name", displayName: "identity" },
      { reference: "sub.name", displayName: "subscription" },
      { reference: "ra.properties", displayName: "role" },
    ],
    focusedQuery: /* cypher */ `
      MATCH (id:Identity) WHERE elementId(id) = $elementId
      OPTIONAL MATCH permissionPath = (id)-[:ASSIGNED]->(ra:RoleAssignment)-[:ON_RESOURCE]->(sub:AzureResource)
      WHERE sub:Subscription
      OPTIONAL MATCH linkedCompute = (:Compute)-->(id)
      RETURN nodes(permissionPath), relationships(permissionPath), nodes(linkedCompute), relationships(linkedCompute)
    `,
    graphQuery: /* cypher */ `
      MATCH paths = (id:Identity)-[:ASSIGNED]->(ra:RoleAssignment)-[:ON_RESOURCE]->(sub:AzureResource)
      WHERE (sub:Subscription)
        AND ra.roleDefinitionName IN ['Owner', 'Contributor']
      OPTIONAL MATCH connectedCompute = (vm:Resource:Compute)-->(id)
      RETURN nodes(paths), relationships(paths), nodes(connectedCompute), relationships(connectedCompute)
    `,
  },

  UNPATCHED_HIGH_RISK: {
    id: "UNPATCHED_HIGH_RISK",
    title: "Unpatched Critical Vulnerabilities on Internet-facing VMs",
    description:
      "Internet-facing VMs with Critical/High vulnerabilities that are unpatched and >90 days old.",
    severity: "Critical",
    remediation:
      "Patch or isolate these VMs immediately; consider compensating network controls until remediated.",
    countQuery: /* cypher */ `
      MATCH (vm:Resource:Compute)-[:HAS_INTERFACE]->(nic:Resource:Network_NIC)-[:ASSOCIATED_PUBLIC_IP]->(pip:Resource:Network_PublicIP)-[:EXPOSES_TO]->(internet:Internet)
      MATCH (vm)-[:HAS_VULNERABILITY]->(v:Vulnerability)
      WHERE v.severity IN ['Critical','High'] AND v.status = 'Unpatched' AND v.published_date < date() - duration({days:90})
      RETURN count(DISTINCT vm) as count
    `,
    countQuerySql: /* sql */ `
      SELECT COUNT(DISTINCT vm.uid) AS count
      FROM resources vm
      JOIN resource_rel r1 ON r1.from_uid = vm.uid AND r1.reltype = 'HAS_INTERFACE'
      JOIN resource_rel r2 ON r2.from_uid = r1.to_uid AND r2.reltype = 'ASSOCIATED_PUBLIC_IP'
      JOIN resource_rel r3 ON r3.from_uid = r2.to_uid AND r3.reltype = 'EXPOSES_TO'
      JOIN resource_rel r4 ON r4.from_uid = vm.uid AND r4.reltype = 'HAS_VULNERABILITY'
      JOIN resources v ON v.uid = r4.to_uid
      WHERE (v.properties LIKE '%"severity":"critical"%' OR v.properties LIKE '%"severity":"high"%')
        AND v.properties LIKE '%"status":"Unpatched"%';
    `,
    instancesQuery: /* cypher */ `
      MATCH (vm:Resource:Compute)-[:HAS_INTERFACE]->(nic:Resource:Network_NIC)-[:ASSOCIATED_PUBLIC_IP]->(pip:Resource:Network_PublicIP)-[:EXPOSES_TO]->(internet:Internet)
      MATCH (vm)-[r4]->(v:Vulnerability)
      WHERE v.severity IN ['Critical','High'] AND v.status = 'Unpatched' AND v.published_date < date() - duration({days:90})
      RETURN vm AS virtualMachine, v AS vulnerability, r4 AS relation
      ORDER BY virtualMachine.name
    `,
    instancesSql: /* sql */ `
      SELECT
        vm.uid AS elementId,
        vm.name AS virtualMachine,
        v.properties AS vulnerability
      FROM resources vm
      JOIN resource_rel r1 ON r1.from_uid = vm.uid AND r1.reltype = 'HAS_INTERFACE'
      JOIN resource_rel r2 ON r2.from_uid = r1.to_uid AND r2.reltype = 'ASSOCIATED_PUBLIC_IP'
      JOIN resource_rel r3 ON r3.from_uid = r2.to_uid AND r3.reltype = 'EXPOSES_TO'
      JOIN resource_rel r4 ON r4.from_uid = vm.uid AND r4.reltype = 'HAS_VULNERABILITY'
      JOIN resources v ON v.uid = r4.to_uid
      WHERE (v.properties LIKE '%"severity":"critical"%' OR v.properties LIKE '%"severity":"high"%')
        AND v.properties LIKE '%"status":"Unpatched"%';
    `,
    mainQuery: /* sql */ `
      SELECT
        vm,
        r1,
        r2,
        r3,
        r4,
        v
      FROM resources vm
      JOIN resource_rel r1 ON r1.from_uid = vm.uid AND r1.reltype = 'HAS_INTERFACE'
      JOIN resource_rel r2 ON r2.from_uid = r1.to_uid AND r2.reltype = 'ASSOCIATED_PUBLIC_IP'
      JOIN resource_rel r3 ON r3.from_uid = r2.to_uid AND r3.reltype = 'EXPOSES_TO'
      JOIN resource_rel r4 ON r4.from_uid = vm.uid AND r4.reltype = 'HAS_VULNERABILITY'
      JOIN resources v ON v.uid = r4.to_uid
      WHERE (v.properties LIKE '%"severity":"critical"%' OR v.properties LIKE '%"severity":"high"%')
        AND v.properties LIKE '%"status":"Unpatched"%'
    `,
    elementId: "vm.uid",
    instanceMapping: [
      { reference: "vm.name", displayName: "virtualMachine" },
      { reference: "v.properties", displayName: "vulnerability" },
    ],
    focusedQuery: /* cypher */ `
      MATCH (vm:Resource:Compute) WHERE elementId(vm) = $elementId
      MATCH (vm)-[r4]->(v:Vulnerability)
      WHERE v.severity IN ['Critical','High'] AND v.status = 'Unpatched' AND v.published_date < date() - duration({days:90})
      OPTIONAL MATCH (vm)-[:HAS_INTERFACE]->(nic:Resource:Network_NIC)-[:ASSOCIATED_PUBLIC_IP]->(pip:Resource:Network_PublicIP)-[:EXPOSES_TO]->(internet:Internet)
      RETURN internet, pip, nic, vm, v, r4
    `,
    graphQuery: /* cypher */ `
      MATCH (vm:Resource:Compute)-[:HAS_INTERFACE]->(nic:Resource:Network_NIC)-[:ASSOCIATED_PUBLIC_IP]->(pip:Resource:Network_PublicIP)-[:EXPOSES_TO]->(internet:Internet)
      MATCH (vm)-[r4]->(v:Vulnerability)
      WHERE v.severity IN ['Critical','High'] AND v.status = 'Unpatched' AND v.published_date < date() - duration({days:90})
      RETURN internet, pip, nic, vm, v, r4
    `,
  },

  LATERAL_MOVEMENT_PATHS: {
    id: "LATERAL_MOVEMENT_PATHS",
    title: "Potential Lateral Movement to Sensitive Targets",
    description:
      "Short paths from internet-exposed Compute resources to sensitive targets",
    severity: "Critical",
    remediation:
      "Break lateral paths via segmentation and least-privilege; remove over-permissive roles, restrict network access.",
    countQuery: /* cypher */ `
      MATCH (src:Resource:Compute)-[:HAS_INTERFACE]->(nic:Resource:Network_NIC)-[:ASSOCIATED_PUBLIC_IP]->(pip:Resource:Network_PublicIP)-[:EXPOSES_TO]->(internet:Internet)
      // include identities assigned to sensitive targets; each triple of src, target, identity should be unique
      MATCH (src)-[:HAS_IDENTITY]->(id:Identity)-[:ASSIGNED]->(ra:RoleAssignment)-[:ON_RESOURCE]->(target)
      WHERE target:Subscription OR target:ResourceGroup OR target:KeyVault OR target:Database OR target:StorageAccount
      RETURN count(DISTINCT [src,target,id]) as count
    `,
    countQuerySql: /* sql */ `
      SELECT COUNT(DISTINCT src.uid || '-' || tgt.uid || '-' || id.uid) AS count
      FROM resources src
      JOIN resource_rel r1 ON r1.from_uid = src.uid AND r1.reltype = 'HAS_INTERFACE'
      JOIN resource_rel r2 ON r2.from_uid = r1.to_uid AND r2.reltype = 'ASSOCIATED_PUBLIC_IP'
      JOIN resource_rel r3 ON r3.from_uid = r2.to_uid AND r3.reltype = 'EXPOSES_TO'
      JOIN resource_rel r4 ON r4.from_uid = src.uid AND r4.reltype = 'HAS_IDENTITY'
      JOIN resource_rel r5 ON r5.from_uid = r4.to_uid AND r5.reltype = 'ASSIGNED'
      JOIN resource_rel r6 ON r6.from_uid = r5.to_uid AND r6.reltype = 'ON_RESOURCE'
      JOIN resources tgt ON tgt.uid = r6.to_uid
      JOIN resources id ON id.uid = r4.to_uid AND id.type = 'identity'
      WHERE tgt.type LIKE '%subscription%' OR tgt.type LIKE '%resourcegroups%' OR tgt.type LIKE '%keyvault%' OR tgt.type LIKE '%database%' OR tgt.type LIKE '%storageaccounts%';
    `,
    instancesQuery: /* cypher */ `
      MATCH (vm:Resource:Compute)-[:HAS_INTERFACE]->(nic:Resource:Network_NIC)-[:ASSOCIATED_PUBLIC_IP]->(pip:Resource:Network_PublicIP)-[:EXPOSES_TO]->(internet:Internet)
      // RBAC targets with identity and permission details
      MATCH (vm)-[:HAS_IDENTITY]->(id:Identity)-[:ASSIGNED]->(ra:RoleAssignment)-[:ON_RESOURCE]->(roleTarget)
      WHERE roleTarget:Subscription OR roleTarget:ResourceGroup OR roleTarget:KeyVault OR roleTarget:Database OR roleTarget:StorageAccount
      RETURN
        elementId(vm)           AS elementId,
        vm                 AS virtualMachine,
        roleTarget         AS target,
        id                 AS identity,
        ra   AS role
      ORDER BY vm.name, target;
    `,
    instancesSql: /* sql */ `
      SELECT
        src.uid AS elementId,
        src.name AS virtualMachine,
        tgt.name AS target,
        id.name AS identity,
        ra.properties AS role
      FROM resources src
      JOIN resource_rel r1 ON r1.from_uid = src.uid AND r1.reltype = 'HAS_INTERFACE'
      JOIN resource_rel r2 ON r2.from_uid = r1.to_uid AND r2.reltype = 'ASSOCIATED_PUBLIC_IP'
      JOIN resource_rel r3 ON r3.from_uid = r2.to_uid AND r3.reltype = 'EXPOSES_TO'
      JOIN resource_rel r4 ON r4.from_uid = src.uid AND r4.reltype = 'HAS_IDENTITY'
      JOIN resource_rel r5 ON r5.from_uid = r4.to_uid AND r5.reltype = 'ASSIGNED'
      JOIN resource_rel r6 ON r6.from_uid = r5.to_uid AND r6.reltype = 'ON_RESOURCE'
      JOIN resources tgt ON tgt.uid = r6.to_uid
      JOIN resources ra ON ra.uid = r5.to_uid AND ra.type = 'roleassignment'
      JOIN resources id ON id.uid = r4.to_uid
      WHERE tgt.type LIKE '%subscription%' OR tgt.type LIKE '%resourcegroups%' OR tgt.type LIKE '%keyvault%' OR tgt.type LIKE '%database%' OR tgt.type LIKE '%storageaccounts%';
    `,
    mainQuery: /* sql */ `
      SELECT
        src,
        r1,
        r2,
        r3,
        r4,
        r5,
        r6,
        tgt,
        ra,
        idn
      FROM resources src
      JOIN resource_rel r1 ON r1.from_uid = src.uid AND r1.reltype = 'HAS_INTERFACE'
      JOIN resource_rel r2 ON r2.from_uid = r1.to_uid AND r2.reltype = 'ASSOCIATED_PUBLIC_IP'
      JOIN resource_rel r3 ON r3.from_uid = r2.to_uid AND r3.reltype = 'EXPOSES_TO'
      JOIN resource_rel r4 ON r4.from_uid = src.uid AND r4.reltype = 'HAS_IDENTITY'
      JOIN resource_rel r5 ON r5.from_uid = r4.to_uid AND r5.reltype = 'ASSIGNED'
      JOIN resource_rel r6 ON r6.from_uid = r5.to_uid AND r6.reltype = 'ON_RESOURCE'
      JOIN resources tgt ON tgt.uid = r6.to_uid
      JOIN resources ra ON ra.uid = r5.to_uid AND ra.type = 'roleassignment'
      JOIN resources idn ON idn.uid = r4.to_uid
      WHERE tgt.type LIKE '%subscription%' OR tgt.type LIKE '%resourcegroups%' OR tgt.type LIKE '%keyvault%' OR tgt.type LIKE '%database%' OR tgt.type LIKE '%storageaccounts%'
    `,
    elementId: "src.uid",
    instanceMapping: [
      { reference: "src.name", displayName: "virtualMachine" },
      { reference: "tgt.name", displayName: "target" },
      { reference: "idn.name", displayName: "identity" },
      { reference: "ra.properties", displayName: "role" },
    ],
    focusedQuery: /* cypher */ `
      MATCH (src:Resource:Compute) WHERE elementId(src) = $elementId
      MATCH srcReachesInternet = (src:Resource:Compute)-[:HAS_INTERFACE]->(nic:Resource:Network_NIC)-[:ASSOCIATED_PUBLIC_IP]->(pip:Resource:Network_PublicIP)-[:EXPOSES_TO]->(internet:Internet)
      MATCH (target) WHERE target:KeyVault OR target:Database OR target:Subscription
      MATCH p = shortestPath((src)-[*..5]->(target))
      RETURN nodes(p), relationships(p), nodes(srcReachesInternet), relationships(srcReachesInternet)
    `,
    graphQuery: /* cypher */ `
      MATCH srcReachesInternet = (src:Resource:Compute)-[:HAS_INTERFACE]->(nic:Resource:Network_NIC)-[:ASSOCIATED_PUBLIC_IP]->(pip:Resource:Network_PublicIP)-[:EXPOSES_TO]->(internet:Internet)
      MATCH (target) WHERE target:KeyVault OR target:Database OR target:Subscription
      MATCH p = shortestPath((src)-[*..5]->(target))
      RETURN nodes(p), relationships(p), nodes(srcReachesInternet), relationships(srcReachesInternet)
    `,
  },
};
