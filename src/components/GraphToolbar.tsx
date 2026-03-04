import { useState } from "react";
import { runAzureScanDuck } from "../app/_lib/duckIngestion/scannerDuck";
import { GraphQueryType } from "../types";
import { useActiveGraph } from "../hooks/useGraph";
import { useAuth } from "../context/AuthContext";
import { useDuckDB } from "../context/DuckDBContext";
import { RefreshIcon } from "./graph-icons/RefreshIcon";
import { FullGraphIcon } from "./graph-icons/FullGraphIcon";

interface GraphToolbarProps {
  graphLoading: boolean;
  graphError: unknown;
  setGlobalRefreshKey: React.Dispatch<React.SetStateAction<number>>;
  setSelectedScenarioId: React.Dispatch<React.SetStateAction<string | null>>;
  showSafe: boolean;
  setShowSafe: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function GraphToolbar({
  graphLoading,
  graphError,
  setGlobalRefreshKey,
  setSelectedScenarioId,
  showSafe,
  setShowSafe,
}: GraphToolbarProps) {
  const { db } = useDuckDB();
  const [useLocalData, setUseLocalData] = useState(false);
  const { signedIn, authenticatedUser } = useAuth();
  const { activeQuery, setActiveQuery } = useActiveGraph();

  const handleRefresh = async () => {
    if (!db) {
      console.warn("DuckDB not initialised yet");
      return;
    }

    try {
      const result = await runAzureScanDuck(
        db,
        authenticatedUser?.credential ?? null,
        useLocalData,
      );
      console.log("Scan finished", result);
      setGlobalRefreshKey((k) => k + 1);
    } catch (err) {
      console.error("Scan failed", err);
    }
  };

  const handleUseLocalDataChange = () => {
    setUseLocalData((prev) => !prev);
    setSelectedScenarioId(null);
    setActiveQuery(null);
  };

  const fullGraphLoading =
    graphLoading && activeQuery?.type === GraphQueryType.Full;

  const disabledCriteria = !db || (!signedIn && !useLocalData);

  const graphToolbarButtonBaseStyles =
    "text-xs font-mono py-1 bg-white text-black disabled:opacity-50 hover:bg-gray-100 rounded flex items-center gap-1 border-2 box-border justify-center";

  const renderButtons = (
    <>
      <button
        type="button"
        className={`${graphToolbarButtonBaseStyles} border-transparent pl-1 pr-1 sm:pr-3`}
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
        <RefreshIcon className="w-4 h-4" />
        <span className="hidden sm:inline">Refresh</span>
      </button>
      <button
        type="button"
        className={`${graphToolbarButtonBaseStyles} border-transparent pl-1 pr-3`}
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
        <FullGraphIcon className="w-4 h-4" />
        {fullGraphLoading ? "Loading..." : "Full graph"}
      </button>
      <button
        type="button"
        className={`${graphToolbarButtonBaseStyles} border-transparent px-3`}
        onClick={() => setShowSafe((v) => !v)}
      >
        {showSafe ? `Hide safe` : `Show safe`}
      </button>
      <button
        type="button"
        className={`${graphToolbarButtonBaseStyles} ${useLocalData ? "border-green-300!" : "border-transparent"} px-3`}
        onClick={handleUseLocalDataChange}
        disabled={!db}
      >
        Mock Data
      </button>
    </>
  );

  return (
    <div className="my-2 flex flex-col items-center justify-center">
      <div className="bg-gray-300 shadow rounded flex gap-2 p-2">
        {renderButtons}
      </div>
    </div>
  );
}
