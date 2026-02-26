import { useCallback, useState } from "react";
import useSWR from "swr";
import { ScenarioInstanceRow } from "../types/scenario-instances";
import { InstanceRow } from "./instance_row";
import { SCENARIOS } from "../app/_lib/queries";
import { useActiveGraph } from "@/src/hooks/useGraph";
import { GraphQueryType } from "@/src/types";
import { useDuckDB } from "../context/db_context";
import { AsyncDuckDB } from "@duckdb/duckdb-wasm";

function formatHeader(key: string): string {
  const withSpaces = key.replace(/_/g, " ");
  const spaced = withSpaces.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  return spaced
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
interface InstancesPanelProps {
  properties: {
    title: string;
    remediation: string;
    description: string;
  };
  // scenarioId: when provided the panel fetches + displays instances for it
  scenarioId: string | null;
  // external trigger to force a re-fetch (e.g. after a scan)
  refreshKey: number;
  onClose: () => void;
}

const postFetcher = async ({ db, id }: { db: AsyncDuckDB; id: string }) => {
  const conn = await db.connect();
  try {
    const scenario = SCENARIOS[id];
    if (!scenario) {
      throw new Error(`Scenario with id ${id} not found`);
    }
    const res = await conn.query(scenario.instancesSql);
    const rows = res
      .toArray()
      .map((r) => r.toJSON() as Record<string, unknown>);
    const inst: ScenarioInstanceRow[] = rows.map((r) => {
      const elementId = String(r.elementId ?? "");
      delete r.elementId;
      const row: Record<string, unknown> = {};
      for (const k in r) {
        const v = r[k];
        if (
          v === null ||
          typeof v === "string" ||
          typeof v === "number" ||
          typeof v === "boolean"
        ) {
          row[k] = v;
        } else {
          row[k] = JSON.stringify(v);
        }
      }
      return { elementId, ...row } as ScenarioInstanceRow;
    });
    return inst;
  } catch (e) {
    console.error("Error running instances SQL query", e);
    throw e instanceof Error ? e : new Error(String(e));
  } finally {
    await conn.close();
  }
};

function useInstances(scenarioId: string | null, refreshKey: number) {
  const { db } = useDuckDB();

  const {
    data: instances = [],
    error: instancesError,
    isLoading: instancesLoading,
  } = useSWR<ScenarioInstanceRow[]>(
    scenarioId && db ? { db, id: scenarioId, refreshKey } : null,
    postFetcher,
  );

  return {
    instances,
    instancesError,
    instancesLoading,
  };
}

const InstancesPanel: React.FC<InstancesPanelProps> = ({
  properties,
  scenarioId,
  refreshKey,
  onClose,
}) => {
  const [visualizedId, setVisualizedId] = useState<string | null>(null);

  const { instances, instancesError, instancesLoading } = useInstances(
    scenarioId,
    refreshKey,
  );

  const { setActiveQuery } = useActiveGraph();

  const onVisualize = useCallback(
    (id: string | null) => {
      if (scenarioId) {
        setActiveQuery({
          type: GraphQueryType.Scenario,
          scenarioId,
          focusElementId: id ?? undefined,
        });
      }
      setVisualizedId(id);
    },
    [setActiveQuery, scenarioId],
  );

  const onViewFullGraph = () => {
    setVisualizedId(null);
    if (scenarioId) {
      setActiveQuery({
        type: GraphQueryType.Scenario,
        scenarioId,
      });
    }
  };

  if (!scenarioId) {
    return (
      <div className="w-full bg-white rounded-lg shadow-sm p-4 h-full overflow-y-auto">
        <div className="text-sm text-gray-600">
          Select a scenario to see affected resources here.
        </div>
      </div>
    );
  }

  return (
    <div className="relative p-4 w-full bg-white rounded-lg shadow-sm h-full overflow-y-auto">
      <div className="-mx-4 -mt-4 p-4">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close panel"
          title="Close"
          className="absolute top-2 right-2 w-6 h-6 p-0 rounded-full text-gray-500 hover:text-error hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-red-500 z-10 inline-flex items-center justify-center"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
          <span className="sr-only">Close panel</span>
        </button>
        <div className="items-center justify-between pr-6">
          <h4 className="text-base grow font-semibold">{properties.title}</h4>
          <p className={`text-gray-600 text-xs my-1`}>
            {properties.description}
          </p>

          <p className="text-gray-500 text-xs my-2">
            Remediation: {properties.remediation}
          </p>

          <button
            className="text-sm px-3 py-1 bg-gray-300 hover:bg-gray-300"
            onClick={onViewFullGraph}
          >
            View full graph
          </button>
        </div>
      </div>
      <div className="">
        {instancesLoading && (
          <div className="text-sm text-gray-500">Loading instances…</div>
        )}
        {instancesError && (
          <div className="text-sm text-error">
            {instancesError instanceof Error
              ? instancesError.message
              : String(instancesError)}
          </div>
        )}

        {!instancesLoading && instances.length === 0 && (
          <>
            <div className="text-sm text-gray-600">
              No matching resources found for this scenario.
            </div>
          </>
        )}

        {!instancesLoading && instances.length > 0 && (
          <div className="overflow-x-auto">
            <table className={`w-full text-xs table-fixed`}>
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b leading-4">
                  {Object.keys(instances[0])
                    .filter((key) => key !== "elementId")
                    .map((key) => (
                      <th key={key} className="py-1">
                        {formatHeader(key)}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {instances.map((it, i) => (
                  <InstanceRow
                    key={i}
                    instance={it}
                    isCurrentlyVisualized={visualizedId === it.elementId}
                    onVisualize={onVisualize}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default InstancesPanel;
