"use client";

import { useState, useEffect, useCallback } from "react";
import type * as duckdb from "@duckdb/duckdb-wasm";
import { GraphData } from "../components/azure_security_graph";
import { canonicalLabelsForType } from "../app/_lib/scanner/helpers";
import type { SimulationNode, SimulationLink } from "../types";

export function useDuckGraph(db: duckdb.AsyncDuckDB | null): {
  data: GraphData;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
} {
  const [data, setData] = useState<GraphData>({ nodes: [], links: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!db) {
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const conn = await db.connect();
      try {
        const nodesRes = await conn.query(
          "SELECT uid, id, name, type, location, subscriptionId, resourceGroup, raw FROM resources",
        );
        const nodeRows = nodesRes.toArray().map((r) => r.toJSON());
        const nodes: SimulationNode[] = nodeRows.map((r) => {
          const row = r as Record<string, unknown>;
          // compute labels based on Azure type or identity sentinel
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

        const linksRes = await conn.query(
          "SELECT from_uid, to_uid, reltype FROM resource_rel",
        );
        const linkRows = linksRes.toArray().map((r) => r.toJSON());
        const links: SimulationLink[] = linkRows.map((r) => {
          const row = r as Record<string, unknown>;
          return {
            source: String(row.from_uid),
            target: String(row.to_uid),
            label: row.reltype as string,
            details: row,
          };
        });

        setData({ nodes, links });
      } finally {
        await conn.close();
      }
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, [db]);

  useEffect(() => {
    if (db) {
      refresh();
    }
  }, [db, refresh]);

  return { data, loading, error, refresh };
}
