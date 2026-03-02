"use client";
import { useState, useEffect, useRef } from "react";

import CloudIcon from "../components/CloudIcon";
import { useAuth } from "../context/AuthContext";
import SignInOverlay from "../components/SignInOverlay";
import UserMenu from "../components/UserMenu";

import { runAzureScanDuck } from "./_lib/duckIngestion/scannerDuck";
import { useDuckDB } from "../context/DuckDBContext";
import DuckQueryConsole from "../components/DuckQueryConsole";
import NodeGraph from "../components/NodeGraph";
import { useStats } from "../hooks/useStats";
import RiskDashboard, {
  CardScenarioClickEvent,
} from "../components/RiskDashboard";
import InstancesPanel from "../components/InstancesPanel";
import { useActiveGraph, useGraphData } from "../hooks/useGraph";
import { GraphQueryType } from "../types";

// TODO: verify this actually works
export function headers() {
  return [
    {
      source: "/(.*)",
      headers: [
        {
          key: "Cross-Origin-Opener-Policy",
          value: "same-origin-allow-popups",
        },
      ],
    },
  ];
}

export default function Home() {
  const { signedIn, authenticatedUser } = useAuth();
  const [showSignIn, setShowSignIn] = useState<boolean>(false);
  const { db } = useDuckDB();
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(
    null,
  );
  const [globalRefreshKey, setGlobalRefreshKey] = useState(0);
  const { stats } = useStats(globalRefreshKey);

  const { activeQuery, setActiveQuery } = useActiveGraph();

  const { graphData, graphLoading, graphError } = useGraphData(
    activeQuery,
    globalRefreshKey,
  );

  useEffect(() => {
    const handler = (ev: CardScenarioClickEvent) => {
      setSelectedScenarioId(ev.scenarioId);
    };
    window.addEventListener(CardScenarioClickEvent.eventName, handler);
    return () =>
      window.removeEventListener(CardScenarioClickEvent.eventName, handler);
  }, []);

  const prevScenarioRef = useRef<string | null>(null);
  useEffect(() => {
    if (selectedScenarioId && prevScenarioRef.current !== selectedScenarioId) {
      setActiveQuery(null);
    }
    prevScenarioRef.current = selectedScenarioId;
  }, [selectedScenarioId, setActiveQuery]);

  const isFullGraphView =
    activeQuery && activeQuery.type === GraphQueryType.Full;

  return (
    <div className="min-h-screen w-screen flex flex-col items-center">
      <SignInOverlay
        visible={showSignIn && !signedIn}
        onClose={() => setShowSignIn(false)}
      />
      <header className="w-full sticky top-0 z-30">
        <div className="bg-gray-300 shadow-sm px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <CloudIcon className="w-12 h-12" aria-hidden="true" />
              <div className="text-2xl">cloudexplorer</div>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <button
              type="button"
              className="navbar-button"
              onClick={async () => {
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
              }}
              disabled={!db}
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
              onClick={() => {
                setSelectedScenarioId(null);
                setActiveQuery({ type: GraphQueryType.Full });
              }}
              disabled={graphLoading}
              aria-busy={graphLoading}
              title={
                graphError
                  ? String(graphError)
                  : "Query the entire graph (all nodes & relationships)"
              }
            >
              {graphLoading ? "Loading..." : "View full graph"}
            </button>
            <div className="flex items-center gap-3">
              {signedIn ? (
                <UserMenu />
              ) : (
                <button
                  type="button"
                  className="navbar-button"
                  onClick={() => setShowSignIn(true)}
                >
                  Sign in
                </button>
              )}
            </div>
          </div>
        </div>
      </header>
      <main className="p-4 w-full">
        <RiskDashboard refreshKey={globalRefreshKey} />

        <div className="w-full max-w-full grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          {!isFullGraphView && (
            <InstancesPanel
              key={selectedScenarioId}
              scenarioId={selectedScenarioId}
              refreshKey={globalRefreshKey}
              properties={(() => {
                const current = stats.find((s) => s.id === selectedScenarioId);
                return current
                  ? {
                      title: current.title,
                      remediation: current.remediation,
                      description: current.description,
                    }
                  : { title: "", remediation: "", description: "" };
              })()}
              onClose={() => setSelectedScenarioId(null)}
            />
          )}

          <div
            className={`w-full h-full ${isFullGraphView ? "lg:col-span-3" : "lg:col-span-2"}`}
          >
            {graphError && (
              <div className="text-red-500">
                Error loading graph: {graphError.message}
              </div>
            )}
            {graphLoading && <div>Loading graph…</div>}
            <NodeGraph height={600} data={graphData} />
          </div>
        </div>
        <div className="mt-8">
          <DuckQueryConsole />
        </div>
      </main>
    </div>
  );
}
