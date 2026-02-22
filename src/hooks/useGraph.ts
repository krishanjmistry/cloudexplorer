"use client";

import useSWR, { mutate } from "swr";
import type { GraphQuery } from "@/src/types";
import { GraphData } from "../components/azure_security_graph";

const ACTIVE_GRAPH_KEY = "active-graph-query";

const emptyGraphData: GraphData = {
  nodes: [],
  links: [],
};

async function fetchGraph(query: GraphQuery | null): Promise<GraphData> {
  if (!query) {
    return emptyGraphData;
  }

  const res = await fetch("/api/query-graph", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(query),
  });
  if (!res.ok) {
    throw new Error(await res.text());
  }

  return (await res.json()) as GraphData;
}

function useActiveGraph() {
  const { data: activeQuery = null, mutate: setActiveQuery } =
    useSWR<GraphQuery | null>(ACTIVE_GRAPH_KEY, () => null, {
      revalidateOnFocus: false,
    });

  return {
    activeQuery,
    setActiveQuery: async (q: GraphQuery | null) => {
      await setActiveQuery(q, false);
      if (q) {
        const data = await fetchGraph(q);
        await mutate(q, data, false);
      }
    },
  } as const;
}

function useGraphData(query: GraphQuery | null) {
  const { data, error, isLoading } = useSWR<GraphData | null>(
    query,
    fetchGraph,
    { revalidateOnFocus: false },
  );

  return {
    graphData: data || emptyGraphData,
    graphLoading: isLoading,
    graphError: error,
  } as const;
}

export { useActiveGraph, useGraphData };
