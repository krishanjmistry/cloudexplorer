import { Stat } from "../types";
import { useDuckDB } from "../context/DuckDBContext";
import { Scenario, SCENARIOS } from "../app/_lib/queries";
import useSWR from "swr";
import { AsyncDuckDB } from "@duckdb/duckdb-wasm";

function constructCountQuery(scenario: Scenario): string {
  return `SELECT COUNT(*) as count FROM (${scenario.mainQuery})`;
}

async function statsFetcher({ db }: { db: AsyncDuckDB }): Promise<Stat[]> {
  const conn = await db.connect();
  try {
    const stats: Stat[] = [];
    for (const key of Object.keys(SCENARIOS)) {
      const scenario = SCENARIOS[key];

      const countQuery = constructCountQuery(scenario);
      const res = await conn.query(countQuery);

      const count = Number(res.toArray()[0]?.toJSON().count ?? 0);

      stats.push({
        id: scenario.id,
        title: scenario.title,
        description: scenario.description,
        count,
        severity: count > 0 ? scenario.severity : "Safe",
        remediation: scenario.remediation,
      });
    }
    return stats;
  } finally {
    await conn.close();
  }
}

function useStats(refreshKey: number) {
  const { db } = useDuckDB();

  const { data, error, isLoading } = useSWR<Stat[]>(
    db ? { db, refreshKey } : null,
    statsFetcher,
  );

  return {
    stats: data || [],
    statsLoading: isLoading,
    statsError: error,
  };
}

export { useStats };
