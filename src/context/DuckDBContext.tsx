"use client";

import { createContext, useContext, useEffect, useState, useRef } from "react";
import * as duckdb from "@duckdb/duckdb-wasm";
import { runAzureScanDuck } from "../app/_lib/duckIngestion/scannerDuck";
import { ensureSchema } from "../app/_lib/duckIngestion/constraints";

interface DuckDBState {
  db: duckdb.AsyncDuckDB | null;
  loading: boolean;
  error: Error | null;
  useLocal: boolean;
  toggleLocalData: () => Promise<void>;
}

const DuckDBContext = createContext<DuckDBState | undefined>(undefined);

export const DuckDBProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [db, setDb] = useState<duckdb.AsyncDuckDB | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const [useLocal, setUseLocal] = useState(false);
  const liveDumpRef = useRef<duckdb.WebFile[] | null>(null);
  const mockDumpRef = useRef<duckdb.WebFile[] | null>(null);

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

        const conn = await database.connect();
        try {
          await ensureSchema(conn).catch((err) => {
            console.error("Failed to ensure DuckDB schema", err);
          });
        } finally {
          await conn.close();
        }

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
      (async () => {
        if (database) {
          await database.terminate();
        }
        if (worker) {
          await worker.terminate();
        }
      })();
    };
  }, []);

  const toggleLocalData = async () => {
    if (!db) {
      return;
    }

    setLoading(true);

    const conn = await db.connect();
    try {
      if (useLocal) {
        await conn.query(
          `EXPORT DATABASE 'exported_db_local' (FORMAT PARQUET);`,
        );
        const globFiles = await db.globFiles(`exported_db_local/*`);
        mockDumpRef.current = globFiles;
      } else {
        await conn.query(
          `EXPORT DATABASE 'exported_db_live' (FORMAT PARQUET);`,
        );
        const globFiles = await db.globFiles(`exported_db_live/*`);
        liveDumpRef.current = globFiles;
      }

      // clear database tables
      await conn.query(`DROP SEQUENCE resource_uid_seq CASCADE;`);
      await conn.query(`DROP TABLE IF EXISTS resource_rel;`);

      if (!useLocal) {
        if (mockDumpRef.current) {
          await conn.query(`IMPORT DATABASE 'exported_db_local';`);
          const fileNames = mockDumpRef.current.map((f) => f.fileName);
          await conn.bindings.dropFiles(fileNames);
        } else {
          await ensureSchema(conn);
          await runAzureScanDuck(db, null, true);
        }
      } else {
        if (liveDumpRef.current) {
          await conn.query(`IMPORT DATABASE 'exported_db_live';`);
          const fileNames = liveDumpRef.current.map((f) => f.fileName);
          await conn.bindings.dropFiles(fileNames);
        } else {
          await ensureSchema(conn);
        }
      }

      setUseLocal((prev) => !prev);
    } finally {
      await conn.close();
      setLoading(false);
    }
  };

  return (
    <DuckDBContext.Provider
      value={{
        db,
        loading,
        error,
        useLocal,
        toggleLocalData,
      }}
    >
      {children}
    </DuckDBContext.Provider>
  );
};

export const useDuckDB = () => {
  const ctx = useContext(DuckDBContext);
  if (!ctx) {
    throw new Error("useDuckDB must be used within a DuckDBProvider");
  }
  return ctx;
};
