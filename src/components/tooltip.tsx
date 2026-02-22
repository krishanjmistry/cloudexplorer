import React, { FC } from "react";
import { SimulationLink, SimulationNode } from "../types";

export interface TooltipProps {
  visible: boolean;
  data: SimulationNode | SimulationLink | null;
  position: { x: number; y: number };
}

export function computeTooltipPosition(
  rect: DOMRect | null | undefined,
  clientX: number,
  clientY: number,
  pageX?: number,
  pageY?: number,
) {
  let x = rect ? clientX - rect.left + 12 : (pageX ?? clientX) + 15;
  let y = rect ? clientY - rect.top - 28 : (pageY ?? clientY) - 28;

  if (rect) {
    const pad = 12;
    x = Math.min(Math.max(pad, x), Math.max(pad, rect.width - 160));
    y = Math.min(Math.max(pad, y), Math.max(pad, rect.height - 40));
  }

  return { x, y };
}

const Tooltip: FC<TooltipProps> = ({ visible, data, position }) => {
  if (!visible || !data) {
    return null;
  }

  return (
    <div className="tooltip" style={{ left: position.x, top: position.y }}>
      {"label" in data ? (
        <div>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>{data.label}</div>
          {data.details && typeof data.details === "object" ? (
            <ul>
              {Object.entries(data.details).map(([key, value]) => (
                <li key={key}>
                  <strong>{key}:</strong> {String(value)}
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-gray-600">No additional details</div>
          )}
        </div>
      ) : (
        <div>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>
            {data.name || data.elementId}
          </div>
          {data.details && typeof data.details === "object" ? (
            <ul>
              {Object.entries(data.details)
                .filter(([k]) => k !== "_labels" && k !== "_canonical")
                .slice(0, 8)
                .map(([key, value]) => (
                  <li key={key}>
                    <strong>{key}:</strong> {String(value)}
                  </li>
                ))}
            </ul>
          ) : (
            <div className="text-sm text-gray-600">No additional details</div>
          )}
        </div>
      )}
    </div>
  );
};

export default Tooltip;
