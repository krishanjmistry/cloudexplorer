"use client";

import * as duckdb from "@duckdb/duckdb-wasm";
import { useState, useEffect } from "react";

export function useDuckDB() {
  const [db, setDb] = useState<duckdb.AsyncDuckDB | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isCancelled = false;
    let database: duckdb.AsyncDuckDB | null = null;
    let worker: Worker | null = null;

    async function initDuckDB() {
      try {
        const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();
        const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);

        if (!bundle.mainWorker) {
          throw new Error("DuckDB worker not found in the bundle");
        }

        const worker_url = URL.createObjectURL(
          new Blob([`importScripts("${bundle.mainWorker}");`], {
            type: "text/javascript",
          }),
        );

        worker = new Worker(worker_url);

        const logger = new duckdb.ConsoleLogger();
        database = new duckdb.AsyncDuckDB(logger, worker);
        await database.instantiate(bundle.mainModule, bundle.pthreadWorker);

        URL.revokeObjectURL(worker_url);

        if (!isCancelled) {
          setDb(database);
          setLoading(false);
        }
      } catch (err) {
        if (!isCancelled) {
          setError(
            err instanceof Error ? err : new Error("Failed to load DuckDB"),
          );
          setLoading(false);
        }
      }
    }

    initDuckDB();

    return () => {
      isCancelled = true;
      if (database) {
        database.terminate();
      }
      if (worker) {
        worker.terminate();
      }
    };
  }, []);

  return { db, loading, error };
}
