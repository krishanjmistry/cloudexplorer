"use client";
import { useEffect, useState, useRef } from "react";
import AzureSecurityGraph from "../components/azure_security_graph";
import RiskDashboard, {
  CardScenarioClickEvent,
} from "../components/risk_dashboard";
import InstancesPanel from "../components/instances_panel";
import CloudIcon from "../components/cloud_icon";
import useSWRMutation from "swr/mutation";
import { GraphQueryType } from "../types";

import { useActiveGraph, useGraphData } from "@/src/hooks/useGraph";
import { useStats } from "@/src/hooks/useStats";

export default function Home() {
  const { stats, mutateStats } = useStats();

  const { activeQuery, setActiveQuery } = useActiveGraph();
  const { graphData, graphLoading, graphError } = useGraphData(activeQuery);

  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(
    null,
  );
  const [globalRefreshKey, setGlobalRefreshKey] = useState(0);

  const {
    trigger: triggerScanMutation,
    isMutating: scanMutating,
    error: scanError,
  } = useSWRMutation("/api/scan", async () => {
    const res = await fetch("/api/scan", { method: "POST" });
    if (!res.ok) {
      throw new Error(await res.text());
    }
    return res.json();
  });

  const triggerScan = async () => {
    try {
      await triggerScanMutation();
      await mutateStats();
      setGlobalRefreshKey((k) => k + 1);

      console.log("Scan completed and dashboard refreshed");
    } catch (e) {
      console.error(
        "Error triggering scan:",
        e instanceof Error ? e.message : e,
      );
    }
  };

  useEffect(() => {
    const handler = (ev: CardScenarioClickEvent) => {
      console.log(
        "Received CardScenarioClickEvent for scenario:",
        ev.scenarioId,
      );
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

  useEffect(() => {
    triggerScan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isFullGraphView =
    activeQuery && activeQuery.type === GraphQueryType.Full;

  const openIssuesCount = stats.reduce(
    (acc, s) => acc + (s.severity === "Safe" ? 0 : s.count),
    0,
  );
  return (
    <div className="min-h-screen flex flex-col items-center">
      <header className="w-full sticky top-0 z-30">
        <div className="bg-gray-300 shadow-sm px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <CloudIcon className="w-12 h-12" aria-hidden="true" />
              <div className="text-2xl">cloudexplorer</div>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="ml-3 inline-flex items-center gap-2 text-sm">
              <span>Open issues:</span>
              <span
                className={`px-2 py-0.5 text-white rounded-full text-sm ${openIssuesCount > 0 ? "bg-red-500" : "bg-green-500"}`}
              >
                {openIssuesCount}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                className="navbar-button"
                onClick={triggerScan}
                disabled={scanMutating}
                aria-busy={scanMutating}
                title={scanError ? String(scanError) : undefined}
              >
                {scanMutating ? "Scanning..." : "Scan / Refresh"}
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
            </div>
          </div>
        </div>
      </header>

      <div className="w-full p-6">
        <div className="w-full max-w-full mb-4">
          <RiskDashboard stats={stats} />
        </div>

        <div className="w-full max-w-full grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          {!isFullGraphView && (
            <div className="w-full overflow-y-scroll h-full max-h-[600px]">
              <InstancesPanel
                key={selectedScenarioId ?? "none"}
                scenarioId={selectedScenarioId}
                refreshKey={globalRefreshKey}
                properties={(() => {
                  const current_stat = stats.find(
                    (s) => s.id === selectedScenarioId,
                  );
                  return current_stat
                    ? {
                        title: current_stat.title,
                        remediation: current_stat.remediation,
                        description: current_stat.description,
                      }
                    : { title: "", remediation: "", description: "" };
                })()}
                onClose={() => {
                  setSelectedScenarioId(null);
                  setActiveQuery(null);
                }}
              />
            </div>
          )}
          <div
            className={`w-full shrink-0 bg-white overflow-hidden shadow-sm relative ${isFullGraphView ? "lg:col-span-3" : "lg:col-span-2"}`}
          >
            <AzureSecurityGraph width={1100} height={600} data={graphData} />

            {graphData.nodes.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                Select a risk card or instance on the left to visualize the
                attack path
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
