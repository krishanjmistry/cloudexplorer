"use client";

import { FormEvent, useState } from "react";
import { useDuckDB } from "../context/db_context";
import { rowsFromResult } from "../utils/table_row";

export default function DuckQueryConsole() {
  const { db, loading, error } = useDuckDB();
  const [sql, setSql] = useState("SELECT 1");
  const [result, setResult] = useState<Array<Record<string, unknown>> | null>(
    null,
  );
  const [running, setRunning] = useState(false);

  async function runSql(query: string) {
    if (!db) {
      return;
    }
    const conn = await db.connect();
    try {
      const queryResult = await conn.query(query);
      const rows = rowsFromResult(queryResult);
      setResult(rows);
    } catch (e) {
      console.error("Query failed:", e);
      setResult([{ error: e instanceof Error ? e.message : String(e) }]);
    } finally {
      await conn.close();
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setRunning(true);
    setResult(null);
    runSql(sql).finally(() => setRunning(false));
  }

  if (error) {
    return <div className="text-red-500">Error: {error.message}</div>;
  }
  if (loading) {
    return <div>Loading DuckDB engine…</div>;
  }

  return (
    <section className="p-4 border rounded shadow-sm w-[800px]">
      <h2 className="text-xl font-bold mb-4">DuckDB console</h2>

      <form onSubmit={handleSubmit} className="mb-4">
        <textarea
          className="w-full p-2 border"
          rows={4}
          value={sql}
          onChange={(e) => setSql(e.target.value)}
        />
        <button
          type="submit"
          className="mt-2 px-3 py-1 bg-blue-600 text-white rounded"
          disabled={running}
        >
          {running ? "Running…" : "Run"}
        </button>
      </form>

      {running && <div>Executing query…</div>}

      {result && (
        <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-scroll">
          {JSON.stringify(
            result,
            (_, value) => (typeof value === "bigint" ? Number(value) : value),
            2,
          )}
        </pre>
      )}
    </section>
  );
}
