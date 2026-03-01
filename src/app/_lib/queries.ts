interface instanceTableMapping {
  /** Should refer to a valid field in the mainQuery result */
  reference: string;
  /** Should not include any spaces. camelCase is recommended */
  displayName: string;
}

interface Scenario {
  id: string;
  title: string;
  description: string;
  mainQuery: string;
  /** Identifier to extract the elementId from the result returned by calling mainQuery */
  elementId: string;
  /** Mapping of references from the mainQuery result to display names used for the instances table */
  instanceMapping: instanceTableMapping[];
  /** Risk metadata used by the UI */
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
    mainQuery: /* sql */ `
      SELECT
        vm, vmNic, nicPip, pipInternet, vmVuln, vmIdentity, vuln, idn
      FROM resources vm
      JOIN resource_rel vmNic ON vmNic.from_uid = vm.uid AND vmNic.reltype = 'HAS_INTERFACE'
      JOIN resource_rel nicPip ON nicPip.from_uid = vmNic.to_uid AND nicPip.reltype = 'ASSOCIATED_PUBLIC_IP'
      JOIN resource_rel pipInternet ON pipInternet.from_uid = nicPip.to_uid AND pipInternet.reltype = 'EXPOSES_TO'
      JOIN resource_rel vmVuln ON vmVuln.from_uid = vm.uid AND vmVuln.reltype = 'HAS_VULNERABILITY'
      JOIN resources vuln ON vuln.uid = vmVuln.to_uid AND vuln.properties LIKE '%"severity":"critical"%'
      JOIN resource_rel vmIdentity ON vmIdentity.from_uid = vm.uid AND vmIdentity.reltype = 'HAS_IDENTITY'
      JOIN resources idn ON idn.uid = vmIdentity.to_uid
    `,
    elementId: "vm.uid",
    instanceMapping: [
      { reference: "vm.name", displayName: "virtualMachine" },
      { reference: "vuln.properties", displayName: "vulnerability" },
      { reference: "idn.name", displayName: "identity" },
    ],
  },
  DATA_EXFIL: {
    id: "DATA_EXFIL",
    title: "Potential Data Exfiltration",
    description:
      "Compute resources that can read Key Vaults and are connected to the Internet.",
    severity: "High",
    remediation: "Restrict Key Vault access, lock down network paths.",
    mainQuery: /* sql */ `
      SELECT
        vm, r1, r2, r3, r4, r5, r6, kv, ra, idn, pip, nic, internet
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
      JOIN resources pip ON pip.uid = r2.to_uid
      JOIN resources nic ON nic.uid = r1.to_uid
      JOIN resources internet ON internet.uid = r3.to_uid
    `,
    elementId: "vm.uid",
    instanceMapping: [
      { reference: "vm.name", displayName: "virtualMachine" },
      { reference: "kv.name", displayName: "keyVault" },
      { reference: "ra.properties.roleDefinitionName", displayName: "role" },
      { reference: "idn.name", displayName: "identity" },
    ],
  },
  IDENTITY_RISK: {
    id: "IDENTITY_RISK",
    title: "Identity Risks",
    description:
      'Identities with privileged "Contributor" or "Owner" access on Subscriptions.',
    severity: "High",
    remediation:
      "Review and remove roles; apply least-privilege role assignments.",
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
      { reference: "ra.properties.roleDefinitionName", displayName: "role" },
    ],
  },

  UNPATCHED_HIGH_RISK: {
    id: "UNPATCHED_HIGH_RISK",
    title: "Unpatched Critical Vulnerabilities on Internet-facing VMs",
    description:
      "Internet-facing VMs with Critical/High vulnerabilities that are unpatched and >90 days old.",
    severity: "Critical",
    remediation:
      "Patch or isolate these VMs immediately; consider compensating network controls until remediated.",
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
  },
  LATERAL_MOVEMENT_PATHS: {
    id: "LATERAL_MOVEMENT_PATHS",
    title: "Potential Lateral Movement to Sensitive Targets",
    description:
      "Short paths from internet-exposed Compute resources to sensitive targets",
    severity: "Critical",
    remediation:
      "Break lateral paths via segmentation and least-privilege; remove over-permissive roles, restrict network access.",
    mainQuery: /* sql */ `
      SELECT
        src, r1, r2, r3, r4, r5, r6, tgt, ra, idn, nic, pip, internet
      FROM resources src
      JOIN resource_rel r1 ON r1.from_uid = src.uid AND r1.reltype = 'HAS_INTERFACE'
      JOIN resource_rel r2 ON r2.from_uid = r1.to_uid AND r2.reltype = 'ASSOCIATED_PUBLIC_IP'
      JOIN resource_rel r3 ON r3.from_uid = r2.to_uid AND r3.reltype = 'EXPOSES_TO'
      JOIN resource_rel r4 ON r4.from_uid = src.uid AND r4.reltype = 'HAS_IDENTITY'
      JOIN resource_rel r5 ON r5.from_uid = r4.to_uid AND r5.reltype = 'ASSIGNED'
      JOIN resource_rel r6 ON r6.from_uid = r5.to_uid AND r6.reltype = 'ON_RESOURCE'
      JOIN resources nic ON nic.uid = r1.to_uid
      JOIN resources pip ON pip.uid = r2.to_uid
      JOIN resources internet ON internet.uid = r3.to_uid
      JOIN resources idn ON idn.uid = r4.to_uid
      JOIN resources ra ON ra.uid = r5.to_uid
      JOIN resources tgt ON tgt.uid = r6.to_uid
      WHERE tgt.type LIKE '%subscription%' OR tgt.type LIKE '%resourcegroups%' OR tgt.type LIKE '%keyvault%' OR tgt.type LIKE '%database%' OR tgt.type LIKE '%storageaccounts%'
    `,
    elementId: "src.uid",
    instanceMapping: [
      { reference: "src.name", displayName: "virtualMachine" },
      { reference: "tgt.name", displayName: "target" },
      { reference: "idn.name", displayName: "identity" },
      { reference: "ra.properties.roleDefinitionName", displayName: "role" },
    ],
  },
};
