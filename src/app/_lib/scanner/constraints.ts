import { Neo4jSession } from "./types";

export async function ensureUniqueIdConstraint(session: Neo4jSession) {
  await session.run(
    `CREATE CONSTRAINT IF NOT EXISTS FOR (n:AzureResource) REQUIRE n.id IS UNIQUE`,
  );
  await session.run(
    `CREATE CONSTRAINT IF NOT EXISTS FOR (ra:RoleAssignment) REQUIRE ra.id IS UNIQUE`,
  );
  await session.run(
    `CREATE INDEX IF NOT EXISTS FOR (ra:RoleAssignment) ON (ra.principalId)`,
  );
  await session.run(
    `CREATE INDEX IF NOT EXISTS FOR (ra:RoleAssignment) ON (ra.roleDefinitionId)`,
  );
}
