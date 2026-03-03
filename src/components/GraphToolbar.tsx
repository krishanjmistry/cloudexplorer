import { useState } from "react";
import { runAzureScanDuck } from "../app/_lib/duckIngestion/scannerDuck";
import { GraphQueryType } from "../types";
import { useActiveGraph } from "../hooks/useGraph";
import { useAuth } from "../context/AuthContext";
import { useDuckDB } from "../context/DuckDBContext";

interface GraphToolbarProps {
  graphLoading: boolean;
  graphError: any;
  setGlobalRefreshKey: React.Dispatch<React.SetStateAction<number>>;
  setSelectedScenarioId: React.Dispatch<React.SetStateAction<string | null>>;
}

export default function GraphToolbar({
  graphLoading,
  graphError,
  setGlobalRefreshKey,
  setSelectedScenarioId,
}: GraphToolbarProps) {
  const { db } = useDuckDB();
  const [useLocalData, setUseLocalData] = useState(false);
  const { signedIn, authenticatedUser } = useAuth();
  const { activeQuery, setActiveQuery } = useActiveGraph();

  const handleRefresh = async () => {
    // TODO: handle local data refresh
    if (!db) {
      console.warn("DuckDB not initialised yet");
      return;
    }

    try {
      const result = await runAzureScanDuck(
        db,
        authenticatedUser?.credential ?? null,
      );
      console.log("Scan finished", result);
      setGlobalRefreshKey((k) => k + 1);
    } catch (err) {
      console.error("Scan failed", err);
    }
  };

  const handleUseLocalDataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUseLocalData(e.target.checked);
    setSelectedScenarioId(null);
    setActiveQuery(null);
  };

  const fullGraphLoading =
    graphLoading && activeQuery?.type === GraphQueryType.Full;

  const disabledCriteria = !db || (!signedIn && !useLocalData);

  const [mobileOpen, setMobileOpen] = useState(false);

  const renderButtons = (
    <>
      <button
        type="button"
        className="navbar-button"
        onClick={handleRefresh}
        disabled={disabledCriteria}
        title={
          signedIn && db
            ? "Run a full scan against your cloud environment"
            : db
              ? "Sign in first"
              : "DuckDB not available"
        }
      >
        Refresh
      </button>
      <button
        type="button"
        className="navbar-button"
        onClick={async () => {
          setSelectedScenarioId(null);
          await setActiveQuery({ type: GraphQueryType.Full });
        }}
        disabled={disabledCriteria || fullGraphLoading}
        aria-busy={fullGraphLoading}
        title={
          graphError
            ? String(graphError)
            : "Query the entire graph (all nodes & relationships)"
        }
      >
        {fullGraphLoading ? "Loading..." : "View full graph"}
      </button>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={useLocalData}
          disabled={!db}
          onChange={handleUseLocalDataChange}
        />
        <span className="text-sm">Local mock data</span>
      </label>
    </>
  );

  return (
    <div className="w-full bg-amber-300 shadow-sm px-4 py-3 flex flex-col">
      <div className="flex items-center justify-center">
        <div className="flex items-center gap-4"></div>
        <button
          className="md:hidden p-2"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Toggle graph menu"
        >
          {mobileOpen ? "✕" : "☰"}
        </button>
        <nav className="hidden md:flex items-center gap-6">{renderButtons}</nav>
      </div>
      {mobileOpen && (
        <nav className="md:hidden mt-2 flex flex-col gap-2">
          {renderButtons}
        </nav>
      )}
    </div>
  );
}
