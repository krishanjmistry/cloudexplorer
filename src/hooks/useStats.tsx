import { useState, useCallback } from "react";
import { Stat } from "../app/api/stats/route";
import { useDuckDB } from "../context/db_context";
import { SCENARIOS } from "../app/_lib/queries";

function useStats() {
  const { db, loading: dbLoading } = useDuckDB();
  const [stats, setStats] = useState<Stat[]>([]);
  const [loading, setLoading] = useState<boolean>(dbLoading);
  const [error, setError] = useState<Error | null>(null);

  const computeFromDb = useCallback(async () => {
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

          function getCountQuery(): string {
            const mainQuery = scenario.mainQuery;
            const countQuery = `
              SELECT COUNT(*) as count FROM (${mainQuery})
            `;
            return countQuery;
          }

          const countQueryStr = getCountQuery();
          console.log(
            "Running count query for scenario",
            scenario.id,
            ":",
            countQueryStr,
          );

          const res = await conn.query(countQueryStr);
          const rows = res
            .toArray()
            .map((r) => r.toJSON() as Record<string, unknown>);
          const count = rows.length
            ? Number(rows[0].count as number | string | undefined) || 0
            : 0;
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
    mutateStats: computeFromDb,
  };
}

export { useStats };
