"use client";
import { useState, useEffect } from "react";

import CloudIcon from "../components/cloud_icon";
import { useAuth } from "../context/auth_context";
import SignInOverlay from "../components/sign_in_overlay";
import UserMenu from "../components/user_menu";

import { runAzureScanDuck } from "./_lib/duckIngestion/scannerDuck";
import { useDuckDB } from "../context/db_context";
import DuckQueryConsole from "../components/duck_query_console";
import AzureSecurityGraph from "../components/azure_security_graph";
import { useStats } from "../hooks/useStats";
import RiskDashboard, {
  CardScenarioClickEvent,
} from "../components/risk_dashboard";
import InstancesPanel from "../components/instances_panel";
import { useActiveGraph, useGraphData } from "../hooks/useGraph";

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
  const { stats, statsLoading, statsError, mutateStats } = useStats();

  const {
    activeQuery,
  } = useActiveGraph();

  const { graphData, graphLoading, graphError} = useGraphData(activeQuery);

  useEffect(() => {
    const handler = (e: Event) => {
      const evt = e as CardScenarioClickEvent;
      setSelectedScenarioId(evt.scenarioId);
    };
    window.addEventListener(CardScenarioClickEvent.eventName, handler);
    return () =>
      window.removeEventListener(CardScenarioClickEvent.eventName, handler);
  }, []);

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
                  await mutateStats();
                  setGlobalRefreshKey((k) => k + 1);
                } catch (err) {
                  console.error("Scan failed", err);
                }
              }}
              disabled={!db}
              title={
                signedIn && db
                  ? "Run a full Azure scan and persist into DuckDB"
                  : "Sign in and wait for DuckDB to load"
              }
            >
              Run Azure scan (duckdb)
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
        {/* stats / risk dashboard */}
        <section className="w-full">
          {statsLoading && <div>Loading statistics…</div>}
          {statsError && (
            <div className="text-red-500">
              Error loading stats: {statsError.message}
            </div>
          )}
          {!statsLoading && !statsError && <RiskDashboard stats={stats} />}
        </section>

        {/* instances panel + visualization grid */}
        <div className="mt-8 w-full max-w-full grid grid-cols-1 lg:grid-cols-3 gap-y-6 lg:gap-6 items-stretch">
          {selectedScenarioId && (
            <div className="w-full overflow-y-scroll h-full max-h-[600px]">
              <InstancesPanel
                key={selectedScenarioId}
                scenarioId={selectedScenarioId}
                refreshKey={globalRefreshKey}
                properties={(() => {
                  const current = stats.find(
                    (s) => s.id === selectedScenarioId,
                  );
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
            </div>
          )}

          <div className="w-full h-full col-span-2">
            {graphError && (
              <div className="text-red-500">
                Error loading graph: {graphError.message}
              </div>
            )}
            {graphLoading && <div>Loading graph…</div>}
            <AzureSecurityGraph height={600} data={graphData} />
          </div>
        </div>
        <div className="mt-8">
          <DuckQueryConsole />
        </div>
      </main>
    </div>
  );
}
