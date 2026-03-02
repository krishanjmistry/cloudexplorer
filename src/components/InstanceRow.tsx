import { memo, useMemo, useState } from "react";
import { RowValue, ScenarioInstanceRow } from "../types/scenario-instances";

const isNullish = (v: RowValue): v is null => v === null;

const isPrimitive = (v: RowValue): v is string | number | boolean =>
  typeof v === "string" || typeof v === "number" || typeof v === "boolean";

const isNodeShape = (v: RowValue): v is Extract<RowValue, { kind?: "node" }> =>
  typeof v === "object" && v !== null && "kind" in v && v.kind === "node";

const isRelationshipShape = (
  v: RowValue,
): v is Extract<RowValue, { kind?: "relationship" }> =>
  typeof v === "object" &&
  v !== null &&
  "kind" in v &&
  v.kind === "relationship";

const getElementName = (item: RowValue): string => {
  if (isNullish(item)) {
    return "—";
  }
  if (isPrimitive(item)) {
    return String(item);
  }

  if (isNodeShape(item)) {
    return String(item.name ?? item.elementId ?? "node");
  }
  if (isRelationshipShape(item)) {
    return String(item.type);
  }
  return String(item);
};

const summarizeArray = (arr: RowValue[], limit = 3) => {
  const names = arr.map(getElementName);
  const shown = names.slice(0, limit).join(", ");
  const rest = names.length - limit;
  return rest > 0 ? `${shown} (+${rest})` : shown;
};

function InstanceRowInner({
  instance,
  isCurrentlyVisualized,
  onVisualize,
}: {
  instance: ScenarioInstanceRow;
  isCurrentlyVisualized: boolean;
  onVisualize: (elementId: string | null) => void;
}) {
  const entries = useMemo(
    () => Object.entries(instance).filter(([k]) => k !== "elementId"),
    [instance],
  );

  const [isExpanded, setIsExpanded] = useState(false);

  const tableRowStyle = `cursor-pointer`;

  return (
    <>
      <tr
        className={tableRowStyle}
        onClick={() => {
          onVisualize(instance.elementId);
          setIsExpanded((prev) => !prev);
        }}
      >
        {entries.map(([, v], i) => {
          let display: string;
          if (isNodeShape(v)) {
            display = String(v.name ?? v.elementId);
          } else if (Array.isArray(v)) {
            display = v.length ? summarizeArray(v) : "[]";
          } else {
            display = String(v);
          }

          return (
            <td
              className="py-2 pr-3 text-xs min-w-0"
              key={i}
              title={
                isNodeShape(v)
                  ? `${display} — ${JSON.stringify(v.details || {})}`
                  : display
              }
            >
              {i === 0 && (
                <span
                  className={`mr-2 ${isCurrentlyVisualized ? "text-green-500" : "text-gray-400"}`}
                  aria-hidden
                >
                  {isExpanded ? "▾" : "▸"}
                </span>
              )}
              {display}
            </td>
          );
        })}
      </tr>

      {isExpanded && (
        <tr className={tableRowStyle}>
          <td
            colSpan={entries.length}
            className="py-3 px-4 text-sm text-gray-700 max-w-full"
          >
            {/* TODO: make this area a bit prettier */}
            <pre className="mt-2 max-h-48 overflow-auto bg-white border rounded p-2 text-xs text-gray-700 max-w-full">
              {JSON.stringify(instance, null, 2)}
            </pre>
          </td>
        </tr>
      )}
    </>
  );
}

export const InstanceRow = memo(InstanceRowInner, (prev, next) => {
  return (
    prev.instance === next.instance &&
    prev.isCurrentlyVisualized === next.isCurrentlyVisualized &&
    prev.onVisualize === next.onVisualize
  );
});
