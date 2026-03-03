"use client";
import { useState, useEffect, useRef } from "react";

import { useDuckDB } from "../context/DuckDBContext";
import DuckQueryConsole from "../components/DuckQueryConsole";
import NodeGraph from "../components/NodeGraph";
import Navbar from "../components/Navbar";
import GraphToolbar from "../components/GraphToolbar";
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
  const { db } = useDuckDB();
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(
    null,
  );
  const [globalRefreshKey, setGlobalRefreshKey] = useState(0);
  const { stats } = useStats(globalRefreshKey);

  const { activeQuery, setActiveQuery } = useActiveGraph();
  const [useLocalData, setUseLocalData] = useState(false);

  // clear any existing query when toggling into local mode
  useEffect(() => {
    setActiveQuery(null);
  }, [useLocalData]);

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
      <Navbar />
      <GraphToolbar
        db={db}
        graphLoading={graphLoading}
        graphError={graphError}
        useLocalData={useLocalData}
        setUseLocalData={setUseLocalData}
        setGlobalRefreshKey={setGlobalRefreshKey}
        setSelectedScenarioId={setSelectedScenarioId}
      />
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
