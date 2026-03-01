import { useState, useCallback } from "react";
import { Stat } from "../app/api/stats/route";
import { useDuckDB } from "../context/db_context";
import { Scenario, SCENARIOS } from "../app/_lib/queries";

function constructCountQuery(scenario: Scenario): string {
  return `SELECT COUNT(*) as count FROM (${scenario.mainQuery})`;
}

function useStats() {
  const { db, loading: dbLoading } = useDuckDB();
  const [stats, setStats] = useState<Stat[]>([]);
  const [loading, setLoading] = useState<boolean>(dbLoading);
  const [error, setError] = useState<Error | null>(null);

  const calculateStatsFromDb = useCallback(async () => {
    if (!db) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
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
        setStats(stats);
      } finally {
        await conn.close();
      }
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, [db]);

  return {
    stats,
    statsLoading: loading,
    statsError: error,
    mutateStats: calculateStatsFromDb,
  };
}

export { useStats };
