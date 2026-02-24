import { DefaultAzureCredential } from "@azure/identity";
import { ResourceGraphClient } from "@azure/arm-resourcegraph";
import driver from "@/src/utils/db_connection";
import {
  fetchAzureResources,
  fetchAuthorizationResources,
} from "./scanner/azure";
import { AzureResourceRow } from "./scanner/types";
import { ensureUniqueIdConstraint } from "./scanner/constraints";
import { upsertResourcesBatch } from "./scanner/resources";
import { createResourceGroupResourceRelationships } from "./scanner/resourceGroup";
import { createSubscriptionResourceGroupRelationships } from "./scanner/subscription";
import { handleComputeRelationships } from "./scanner/compute";
import { handleSecurityPrincipalsAndRoles } from "./scanner/identities";
import { handleNetworkComponents } from "./scanner/network";

const creds = new DefaultAzureCredential();
const resourceGraphClient = new ResourceGraphClient(creds);

export async function runAzureScan() {
  const {
    containers,
    resources,
  }: { containers: AzureResourceRow[]; resources: AzureResourceRow[] } =
    await fetchAzureResources(resourceGraphClient);

  const session = driver.session({});
  try {
    await ensureUniqueIdConstraint(session);
    const { inserted } = await upsertResourcesBatch(
      [...containers, ...resources],
      session,
    );
    console.log(`✅ Upserted ${inserted} nodes.`);

    const roleAssignmentsWithDefinitions =
      await fetchAuthorizationResources(resourceGraphClient);

    const identities = await handleSecurityPrincipalsAndRoles(
      session,
      creds,
      roleAssignmentsWithDefinitions,
    );
    console.log(
      `🔐 Authorization data processed: 
      Role Assignments ${identities.roleAssignmentsProcessed},
      Orphaned Role Assignments: ${identities.orphanedRoleAssignments},
      Unique Principals: ${identities.uniquePrincipals},
      User Assigned Identities linked: ${identities.userAssignedIdentitiesLinked},
      System Assigned Identities propagated: ${identities.systemAssignedIdentitiesPropagated},
      Principals enriched with Graph: ${identities.principalsEnrichedWithGraph},
      Principals not enriched via Graph: ${identities.principalsNotEnriched}`,
    );

    const subRgRes = await createSubscriptionResourceGroupRelationships(
      containers,
      session,
    );
    console.log(
      `🔗 subscription->resource-group relationships created: ${subRgRes.created}`,
    );

    const rgRes = await createResourceGroupResourceRelationships(
      resources,
      session,
    );
    console.log(`🔗 resource-group relationships created: ${rgRes.created}`);

    const vmRes = await handleComputeRelationships(resources, session);
    console.log(
      `🔧 Compute relationships:
      NICs connected: ${vmRes.nicLinks}, 
      OS Disks connected: ${vmRes.osDiskLinks}`,
    );

    const networkRes = await handleNetworkComponents(resources, session);
    console.log(
      `🌐 Network relationships:
      Subnet nodes inserted: ${networkRes.subnetNodesInserted}, 
      NIC->Subnet: ${networkRes.nicSubnetLinks}, 
      NIC->PublicIP: ${networkRes.nicPipLinks}, 
      PublicIP->Internet: ${networkRes.pipInternetLinks}`,
    );

    console.log("✅ Import + relationship linking complete.");
  } catch (error) {
    console.error("❌ Error importing data:", error);
  } finally {
    await session.close();
  }
}
