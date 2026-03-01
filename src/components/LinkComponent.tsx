import React, { FC } from "react";
import { SimulationLink, SimulationNode } from "../types";
import { DEFAULT_NODE_RADIUS, getNodeIconRadius } from "./graph_icons";

interface LinkProps {
  link: SimulationLink;
  onHover: (event: React.MouseEvent, link: SimulationLink) => void;
  onOut: () => void;
  id: string;
  // index among parallel edges for the same ordered node pair (0-based)
  parallelIndex?: number;
  // total number of parallel edges for this ordered node pair
  parallelTotal?: number;
  // whether there are one or more links in the opposite direction between the same nodes
  reverseExists?: boolean;
}

type Coordinates = {
  x: number;
  y: number;
};

export const LinkComponent: FC<LinkProps> = ({
  link,
  onHover,
  onOut,
  id,
  parallelIndex = 0,
  parallelTotal = 1,
  reverseExists = false,
}) => {
  const source = typeof link.source === "object" ? link.source : undefined;
  const target = typeof link.target === "object" ? link.target : undefined;

  const sourceNodeLevel =
    (source as SimulationNode & { level?: number })?.level ?? 0;
  const targetNodeLevel =
    (target as SimulationNode & { level?: number })?.level ?? 0;
  const levelDiff = Math.abs(targetNodeLevel - sourceNodeLevel);

  const sourceNodeCoords: Coordinates = {
    x: source?.x ?? 0,
    y: source?.y ?? 0,
  };
  const targetNodeCoords: Coordinates = {
    x: target?.x ?? 0,
    y: target?.y ?? 0,
  };

  const nodeVisualRadius = (n?: SimulationNode) => {
    if (!n) {
      return DEFAULT_NODE_RADIUS;
    }
    return getNodeIconRadius(n, Boolean(n.details?.focus));
  };

  const deltaX = targetNodeCoords.x - sourceNodeCoords.x;
  const deltaY = targetNodeCoords.y - sourceNodeCoords.y;
  const euclideanDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY) || 1;
  const sourceNodeRadius = nodeVisualRadius(source);
  const targetNodeRadius = nodeVisualRadius(target);
  const unitDeltaX = deltaX / euclideanDistance;
  const unitDeltaY = deltaY / euclideanDistance;

  // reposition link endpoints to be outside the node icons
  const adjustedSourceCoords: Coordinates = {
    x:
      sourceNodeCoords.x +
      unitDeltaX * Math.min(sourceNodeRadius, euclideanDistance / 2 - 2),
    y:
      sourceNodeCoords.y +
      unitDeltaY * Math.min(sourceNodeRadius, euclideanDistance / 2 - 2),
  };
  const adjustedTargetCoords: Coordinates = {
    x:
      targetNodeCoords.x -
      unitDeltaX * Math.min(targetNodeRadius, euclideanDistance / 2 - 2),
    y:
      targetNodeCoords.y -
      unitDeltaY * Math.min(targetNodeRadius, euclideanDistance / 2 - 2),
  };

  const detailSummary =
    link.details && typeof link.details === "object"
      ? Object.entries(link.details)
          .filter(([, v]) => v)
          .slice(0, 3)
          .map(([k, v]) => `${k}: ${String(v)}`)
          .join(" • ")
      : "";

  let linkPath: string;

  const adjustedMidpointPosition: Coordinates = {
    x: (adjustedSourceCoords.x + adjustedTargetCoords.x) / 2,
    y: (adjustedSourceCoords.y + adjustedTargetCoords.y) / 2,
  };

  let labelPosition: Coordinates;

  const isCurved = parallelTotal > 1 || reverseExists || levelDiff > 1;

  if (isCurved) {
    // Calculate normal vector for the line connecting source and target
    const nx = -(adjustedTargetCoords.y - adjustedSourceCoords.y);
    const ny = adjustedTargetCoords.x - adjustedSourceCoords.x;
    const nlen = Math.sqrt(nx * nx + ny * ny) || 1;
    const normX = nx / nlen;
    const normY = ny / nlen;

    // Calculate curve offset for parallel edges
    const parallelEdgeIndex =
      parallelTotal > 1 ? parallelIndex - (parallelTotal - 1) / 2 : 0;
    const parallelOffset = parallelEdgeIndex * 64;

    // If we've skipped more than one level, push the curve out
    const skippedMoreThanOneLevel = levelDiff > 1;
    const skipOffset = skippedMoreThanOneLevel
      ? sourceNodeLevel < targetNodeLevel
        ? -40
        : 40
      : 0;

    const reverseOffset = reverseExists ? 64 : 0;

    const finalOffset = parallelOffset + reverseOffset + skipOffset;

    const curveVia: Coordinates = {
      x: adjustedMidpointPosition.x + normX * finalOffset,
      y: adjustedMidpointPosition.y + normY * finalOffset,
    };

    linkPath = `M ${adjustedSourceCoords.x} ${adjustedSourceCoords.y} Q ${curveVia.x} ${curveVia.y} ${adjustedTargetCoords.x} ${adjustedTargetCoords.y}`;
    labelPosition = {
      x:
        0.25 * adjustedSourceCoords.x +
        0.5 * curveVia.x +
        0.25 * adjustedTargetCoords.x,
      y:
        0.25 * adjustedSourceCoords.y +
        0.5 * curveVia.y +
        0.25 * adjustedTargetCoords.y,
    };
  } else {
    linkPath = `M ${adjustedSourceCoords.x} ${adjustedSourceCoords.y} L ${adjustedTargetCoords.x} ${adjustedTargetCoords.y}`;
    labelPosition = adjustedMidpointPosition;
  }

  const angleRad = Math.atan2(
    adjustedTargetCoords.y - adjustedSourceCoords.y,
    adjustedTargetCoords.x - adjustedSourceCoords.x,
  );
  const angleDeg = (angleRad * 180) / Math.PI;
  const shouldFlip = Math.abs(angleDeg) > 90 && !reverseExists;
  const textTransform = shouldFlip
    ? `rotate(180 ${labelPosition.x} ${labelPosition.y})`
    : undefined;
  const labelText = `${link.label || ""}${detailSummary ? ` — ${detailSummary}` : ""}`;

  return (
    <g className="link-group">
      <path
        id={`edge-${id}`}
        className="link"
        d={linkPath}
        strokeWidth={2}
        fill="none"
        markerEnd="url(#arrow)"
        onMouseEnter={(ev) => onHover(ev, link)}
        onMouseLeave={onOut}
      />
      {labelText && (
        <text
          className="link-label text-[10px]"
          pointerEvents="none"
          transform={textTransform}
          dy={"-4"}
        >
          <textPath href={`#edge-${id}`} startOffset="50%" textAnchor="middle">
            {labelText}
          </textPath>
        </text>
      )}
    </g>
  );
};
