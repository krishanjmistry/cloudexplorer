"use client";

import useSWR, { mutate } from "swr";
import { GraphQueryType, type GraphQuery, type SimulationLink, type SimulationNode } from "@/src/types";
import { GraphData } from "../components/azure_security_graph";
import { AsyncDuckDB } from "@duckdb/duckdb-wasm";
import { canonicalLabelsForType } from "../app/_lib/scanner/helpers";
import { useDuckDB } from "../context/db_context";
import { SCENARIOS } from "../app/_lib/queries";

const ACTIVE_GRAPH_KEY = "active-graph-query";

const emptyGraphData: GraphData = {
  nodes: [],
  links: [],
};

async function fetchGraph(
  query: GraphQuery | null,
  db: AsyncDuckDB,
): Promise<GraphData> {
  if (!query) {
    return emptyGraphData;
  }

  const conn = await db.connect();
  try {
    // the DuckDB query result type is not exported, so we resort to `any` here
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let nodesRes: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let linksRes: any;

    // helper to combine node + link SQL into one query returning a type flag
    const combine = (nodesSql: string, linksSql: string) => {
      return `
        SELECT 'node' AS __type, * FROM (${nodesSql})
        UNION ALL
        SELECT 'link' AS __type, * FROM (${linksSql})
      `;
    };

    if (query.type === GraphQueryType.Full) {
      nodesRes = await conn.query(
        "SELECT uid, id, name, type, location, subscriptionId, resourceGroup, raw FROM resources",
      );
      linksRes = await conn.query(
        "SELECT from_uid, to_uid, reltype FROM resource_rel",
      );
    } else if (query.type === GraphQueryType.Scenario) {
      const scenario = SCENARIOS[query.scenarioId];
      if (!scenario) {
        throw new Error(`Scenario with id ${query.scenarioId} not found`);
      }

      if (query.focusElementId) {
        // if we have specialized SQL for the focused element, run a single
        // combined query and split the results afterwards; otherwise fall back
        // to the generic neighbour-based template.
        if (scenario.focusedQuerySql && scenario.focusedQuerySqlLinks) {
          const combined = combine(
            scenario.focusedQuerySql.replace(/\$elementId/g, '?'),
            scenario.focusedQuerySqlLinks.replace(/\$elementId/g, '?'),
          );
          // use a prepared statement with positional parameters
          const prep = await conn.prepare(combined);
          const res = await prep.query([query.focusElementId, query.focusElementId]);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const allRows = res.toArray().map((r: any) => r.toJSON());
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          nodesRes = { toArray: () => allRows.filter((r) => r.__type === 'node') } as any;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          linksRes = { toArray: () => allRows.filter((r) => r.__type === 'link') } as any;
        } else {
          // generic fallback with positional placeholder
          const genNodes = `WITH focus AS (SELECT uid FROM resources WHERE uid = ?),
                  neighbors AS (
                    SELECT from_uid AS uid FROM resource_rel WHERE to_uid = ?
                    UNION
                    SELECT to_uid AS uid FROM resource_rel WHERE from_uid = ?
                  ),
                  base_nodes AS (
                    SELECT uid FROM focus UNION SELECT uid FROM neighbors
                  )
             SELECT * FROM resources WHERE uid IN (SELECT uid FROM base_nodes)`;
          const genLinks = `WITH focus AS (SELECT uid FROM resources WHERE uid = ?),
                  neighbors AS (
                    SELECT from_uid AS uid FROM resource_rel WHERE to_uid = ?
                    UNION
                    SELECT to_uid AS uid FROM resource_rel WHERE from_uid = ?
                  ),
                  base_nodes AS (
                    SELECT uid FROM focus UNION SELECT uid FROM neighbors
                  )
             SELECT * FROM resource_rel
             WHERE from_uid IN (SELECT uid FROM base_nodes)
               AND to_uid IN (SELECT uid FROM base_nodes)`;
          const combined = combine(genNodes, genLinks);
          const prep = await conn.prepare(combined);
          // six placeholders: elementId repeated three times per subquery
          const res = await prep.query([
            query.focusElementId,
            query.focusElementId,
            query.focusElementId,
            query.focusElementId,
            query.focusElementId,
            query.focusElementId,
          ]);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const allRows = res.toArray().map((r: any) => r.toJSON());
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          nodesRes = { toArray: () => allRows.filter((r) => r.__type === 'node') } as any;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          linksRes = { toArray: () => allRows.filter((r) => r.__type === 'link') } as any;
        }
      } else {
        if (scenario.graphQuerySql && scenario.graphQuerySqlLinks) {
          const combined = combine(scenario.graphQuerySql, scenario.graphQuerySqlLinks);
          const prep = await conn.prepare(combined);
          // no parameters for full-scenario
          const res = await prep.query();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const allRows = res.toArray().map((r: any) => r.toJSON());
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          nodesRes = { toArray: () => allRows.filter((r) => r.__type === 'node') } as any;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          linksRes = { toArray: () => allRows.filter((r) => r.__type === 'link') } as any;
        } else {
          // last‑resort full graph
          nodesRes = await conn.query(
            "SELECT uid, id, name, type, location, subscriptionId, resourceGroup, raw FROM resources",
          );
          linksRes = await conn.query(
            "SELECT from_uid, to_uid, reltype FROM resource_rel",
          );
        }
      }
    } else {
      throw new Error("Unsupported graph query type");
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nodeRows = nodesRes.toArray().map((r: any) => r.toJSON());
    const nodes: SimulationNode[] = nodeRows.map((r: Record<string, unknown>) => {
      const row = r as Record<string, unknown>;
      let labels: string[] = [];
      const typeStr = String(row.type || "").toLowerCase();
      if (typeStr === "identity") {
        labels = ["Identity"];
      } else if (typeStr === "internet") {
        labels = ["Internet"];
      } else if (typeStr === "roleassignment") {
        labels = ["RoleAssignment"];
      } else if (typeof row.type === "string") {
        labels = canonicalLabelsForType(row.type as string);
      }
      return {
        elementId: String(row.uid),
        labels,
        name: String(row.name || row.id || row.uid),
        details: row,
      };
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const linkRows = linksRes.toArray().map((r: any) => r.toJSON());
    const links: SimulationLink[] = linkRows.map((r: Record<string, unknown>) => {
      const row = r as Record<string, unknown>;
      return {
        source: String(row.from_uid),
        target: String(row.to_uid),
        label: row.reltype as string,
        details: row,
      };
    });

    return { nodes, links };
  } catch (err) {
    console.error("Error fetching graph data:", err);
    throw err;
  } finally {
    await conn.close();
  }
}

function useActiveGraph() {
  const { data: activeQuery = null, mutate: setActiveQuery } =
    useSWR<GraphQuery | null>(ACTIVE_GRAPH_KEY, () => null, {
      revalidateOnFocus: false,
    });

  const { db } = useDuckDB();
  return {
    activeQuery,
    setActiveQuery: async (q: GraphQuery | null) => {
      await setActiveQuery(q, false);
      if (q && db) {
        const data = await fetchGraph(q, db);
        await mutate(q, data, false);
      }
    },
  } as const;
}

function useGraphData(query: GraphQuery | null) {
  const { db } = useDuckDB();
  const { data, error, isLoading } = useSWR<GraphData | null>(
    (query && db) ? [query, db] : null,
    ([q, db]: [GraphQuery, AsyncDuckDB]) => fetchGraph(q, db),

    { revalidateOnFocus: false },
  );

  return {
    graphData: data || emptyGraphData,
    graphLoading: isLoading,
    graphError: error,
  } as const;
}

export { useActiveGraph, useGraphData };
