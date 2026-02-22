import neo4j from "neo4j-driver";

function initializeNeo4jConnection() {
  const DB_URI = process.env.DB_URI;
  const DB_USER = process.env.DB_USER;
  const DB_PASSWORD = process.env.DB_PASSWORD;

  if (!DB_URI || !DB_USER || !DB_PASSWORD) {
    throw new Error(
      `DB_URI, DB_USER, and DB_PASSWORD must be set in environment variables`,
    );
  }

  const driver = neo4j.driver(DB_URI, neo4j.auth.basic(DB_USER, DB_PASSWORD));
  return driver;
}

const driver = initializeNeo4jConnection();

export default driver;
