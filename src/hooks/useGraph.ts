"use client";

import useSWR, { mutate } from "swr";
import {
  GraphQueryType,
  type GraphQuery,
  type SimulationLink,
  type SimulationNode,
} from "@/src/types";
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

type JsonRow = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRow {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isLinkRow(
  row: JsonRow,
): row is JsonRow & { from_uid: unknown; to_uid: unknown } {
  return row.from_uid !== undefined && row.to_uid !== undefined;
}

function isNodeRow(row: JsonRow): row is JsonRow & { uid: unknown } {
  return row.uid !== undefined;
}

function classifyScenarioRows(rows: JsonRow[]): {
  nodeRows: JsonRow[];
  linkRows: JsonRow[];
} {
  const nodeRows: JsonRow[] = [];
  const linkRows: JsonRow[] = [];
  const seenNodes = new Set<string>();
  const seenLinks = new Set<string>();

  const addCandidate = (candidate: unknown) => {
    if (!isRecord(candidate)) {
      return;
    }

    if (isLinkRow(candidate)) {
      const key = String(
        candidate.id ??
          candidate.rel_uid ??
          `${candidate.from_uid}:${candidate.to_uid}:${candidate.reltype ?? ""}`,
      );
      if (!seenLinks.has(key)) {
        seenLinks.add(key);
        linkRows.push(candidate);
      }
      return;
    }

    if (isNodeRow(candidate)) {
      const key = String(candidate.uid);
      if (!seenNodes.has(key)) {
        seenNodes.add(key);
        nodeRows.push(candidate);
      }
    }
  };

  for (const row of rows) {
    addCandidate(row);

    for (const value of Object.values(row)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          addCandidate(item);
        }
      } else {
        addCandidate(value);
      }
    }
  }

  return { nodeRows, linkRows };
}

async function fetchGraph(
  query: GraphQuery | null,
  db: AsyncDuckDB,
): Promise<GraphData> {
  if (!query) {
    return emptyGraphData;
  }

  const conn = await db.connect();
  try {
    let nodeRows: JsonRow[] = [];
    let linkRows: JsonRow[] = [];

    if (query.type === GraphQueryType.Full) {
      const nodesRes = await conn.query("SELECT * FROM resources");
      const linksRes = await conn.query("SELECT * FROM resource_rel");

      nodeRows = nodesRes.toArray().map((r) => r.toJSON() as JsonRow);
      linkRows = linksRes.toArray().map((r) => r.toJSON() as JsonRow);
    } else if (query.type === GraphQueryType.Scenario) {
      const scenario = SCENARIOS[query.scenarioId];
      if (!scenario) {
        throw new Error(`Scenario with id ${query.scenarioId} not found`);
      }

      let queryStr: string;
      if (query.focusElementId) {
        queryStr = `SELECT * FROM (${scenario.mainQuery}) WHERE ${scenario.elementId} = ${query.focusElementId}`;
      } else {
        queryStr = scenario.mainQuery;
      }
      const result = await conn.query(queryStr);
      const rows = result.toArray().map((r) => r.toJSON() as JsonRow);
      const classified = classifyScenarioRows(rows);
      nodeRows = classified.nodeRows;
      linkRows = classified.linkRows;
    } else {
      throw new Error("Unsupported graph query type");
    }

    const nodes: SimulationNode[] = nodeRows.map(
      (r: Record<string, unknown>) => {
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
      },
    );

    const links: SimulationLink[] = linkRows.map(
      (r: Record<string, unknown>) => {
        const row = r as Record<string, unknown>;
        return {
          source: String(row.from_uid),
          target: String(row.to_uid),
          label: row.reltype as string,
          details: row,
        };
      },
    );

    return { nodes, links };
  } catch (err) {
    console.error("Error executing graph query:", err);
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
    query && db ? [query, db] : null,
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
