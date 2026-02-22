import { useEffect, useRef, useState, useCallback } from "react";
import * as d3 from "d3";
import { SimulationLink, SimulationNode } from "../types";
import { getCollisionRadius } from "../components/graph_icons";

type BoundingBox = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

export default function useForceSimulation({
  data,
  width,
  height,
}: {
  data: { nodes: SimulationNode[]; links: SimulationLink[] };
  width: number;
  height: number;
}) {
  const simulationRef = useRef<d3.Simulation<SimulationNode, SimulationLink>>(
    d3.forceSimulation<SimulationNode, SimulationLink>(),
  );

  const [animatedNodes, setAnimatedNodes] = useState<SimulationNode[]>([]);
  const [animatedLinks, setAnimatedLinks] = useState<SimulationLink[]>([]);

  const animatedNodesRef = useRef<SimulationNode[]>([]);
  useEffect(() => {
    animatedNodesRef.current = animatedNodes;
  }, [animatedNodes]);

  const [needsFit, setNeedsFit] = useState(false);

  const svgElementRef = useRef<SVGSVGElement | null>(null);
  const innerGroupRef = useRef<SVGGElement | null>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<
    SVGSVGElement,
    unknown
  > | null>(null);
  const latestHeightRef = useRef(height);

  // keep latestHeightRef updated so simulation can read the most recent viewport height
  // without re-running the simulation when `height` changes.
  useEffect(() => {
    latestHeightRef.current = height;
  }, [height]);

  // setup zoom behaviour once (hook owns svg/inner refs)
  useEffect(() => {
    const svg = svgElementRef.current;
    const inner = innerGroupRef.current;
    if (!svg || !inner || zoomBehaviorRef.current) {
      return;
    }

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on("zoom", (event) => {
        d3.select(inner).attr("transform", event.transform.toString());
      });

    d3.select(svg).call(zoom);
    zoomBehaviorRef.current = zoom;
  }, [width, height]);

  const zoomToFit = useCallback(() => {
    const MAX_ATTEMPTS = 8;
    const attemptFit = (attempt = 0) => {
      const svg = svgElementRef.current;
      const inner = innerGroupRef.current;
      const zoom = zoomBehaviorRef.current;

      if (!svg || !inner || !zoom) {
        if (attempt < MAX_ATTEMPTS) {
          requestAnimationFrame(() => attemptFit(attempt + 1));
        }
        return;
      }

      const src = animatedNodesRef.current;

      const list = src.filter(
        (n) => Number.isFinite(n.x) && Number.isFinite(n.y),
      );

      if (!list || list.length === 0) {
        if (attempt < MAX_ATTEMPTS) {
          requestAnimationFrame(() => attemptFit(attempt + 1));
        }
        return;
      }

      const rawBoundingBox = computeBoundingBox(list);
      const boundingBox = clampBoundingBox(rawBoundingBox);
      const svgRect = svg.getBoundingClientRect();

      const transform = calculateZoomToFitTransform(
        boundingBox,
        svgRect.width,
        svgRect.height,
        {
          pad: 100,
          minViewport: 80,
          fallbackBox: 120,
          edgeMargin: 12,
          scaleExtent: zoom && zoom.scaleExtent ? zoom.scaleExtent() : [0.2, 4],
        },
      );

      d3.select(svg).call(zoom.transform, transform);
    };

    attemptFit(0);
  }, []);

  useEffect(() => {
    if (animatedNodesRef.current.length === 0) {
      return;
    }
    requestAnimationFrame(() => {
      zoomToFit();
    });
  }, [zoomToFit, width, height]);

  useEffect(() => {
    if (!data) {
      return;
    }

    const nodesForSimulation = data.nodes.map((n) => ({
      ...n,
      level: 0,
    })) as (SimulationNode & { level: number })[];
    const linksForSimulation = data.links.map((l) => ({ ...l }));

    // compute node levels (pure helper)
    const levelMap = computeNodeLevels(nodesForSimulation, linksForSimulation);

    nodesForSimulation.forEach((n) => {
      (n as SimulationNode & { level?: number }).level =
        levelMap.get(n.elementId) || 0;
    });

    const simulation = simulationRef.current;

    // apply forces (reconfigure for this dataset)
    simulation.nodes(nodesForSimulation);

    const COLUMN_SPACING = 200;

    simulation
      .force(
        "x",
        d3
          .forceX(
            (d: SimulationNode & { level?: number }) =>
              (d.level ?? 0) * COLUMN_SPACING + 100,
          )
          .strength(1),
      )
      .force("y", d3.forceY(latestHeightRef.current / 2).strength(0.02))
      .force("charge", d3.forceManyBody().strength(-800))
      .force(
        "link",
        d3
          .forceLink<SimulationNode, SimulationLink>(linksForSimulation)
          .id((d) => d.elementId)
          .distance(100)
          .strength(1),
      )
      .force(
        "collide",
        d3
          .forceCollide<SimulationNode>()
          .radius((d: SimulationNode) =>
            getCollisionRadius(d, Boolean(d.details?.focus)),
          )
          .iterations(3),
      );

    // stabilise synchronously
    simulation.alpha(1);
    const ticks = Math.min(1000, Math.max(300, nodesForSimulation.length * 25));
    for (let i = 0; i < ticks; i += 1) {
      simulation.tick();
      if (simulation.alpha() <= simulation.alphaMin()) {
        break;
      }
    }
    simulation.stop();

    requestAnimationFrame(() => {
      setAnimatedNodes([...nodesForSimulation]);
      setAnimatedLinks([...linksForSimulation]);
      setNeedsFit(true);
    });

    return () => {
      simulation.on("end", null);
    };
  }, [data]);

  useEffect(() => {
    if (!needsFit) {
      return;
    }
    requestAnimationFrame(() => {
      zoomToFit();
      setNeedsFit(false);
    });
  }, [zoomToFit, needsFit]);

  return {
    animatedNodes,
    animatedLinks,
    setAnimatedNodes,
    simulationRef,
    // exposed DOM refs so the component can attach them to the SVG/group
    svgRef: svgElementRef,
    innerGroupRef,
    // expose fit for manual use (Fit button / external triggers)
    zoomToFit,
  } as const;
}

function resolveElementId(
  v: SimulationLink["source"] | SimulationNode | string | number,
): string {
  if (typeof v === "object" && v !== null) {
    return (v as SimulationNode).elementId;
  }
  return String(v);
}

function computeBoundingBox(
  nodes: Array<{ x?: number | null; y?: number | null }>,
): BoundingBox {
  const xs = nodes.map((n) => n.x ?? 0);
  const ys = nodes.map((n) => n.y ?? 0);
  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  };
}

function clampBoundingBox(bbox: BoundingBox): BoundingBox {
  const maxAbs = 1e5;
  return {
    minX:
      !Number.isFinite(bbox.minX) || Math.abs(bbox.minX) > maxAbs
        ? -100
        : bbox.minX,
    minY:
      !Number.isFinite(bbox.minY) || Math.abs(bbox.minY) > maxAbs
        ? -100
        : bbox.minY,
    maxX:
      !Number.isFinite(bbox.maxX) || Math.abs(bbox.maxX) > maxAbs
        ? 100
        : bbox.maxX,
    maxY:
      !Number.isFinite(bbox.maxY) || Math.abs(bbox.maxY) > maxAbs
        ? 100
        : bbox.maxY,
  };
}

function calculateZoomToFitTransform(
  bbox: BoundingBox,
  vw: number,
  vh: number,
  opts?: {
    pad?: number;
    minViewport?: number;
    fallbackBox?: number;
    edgeMargin?: number;
    scaleExtent?: [number, number];
  },
) {
  const {
    pad = 100,
    minViewport = 80,
    fallbackBox = 120,
    edgeMargin = 12,
    scaleExtent = [0.2, 4],
  } = opts || {};

  let dx = bbox.maxX - bbox.minX;
  let dy = bbox.maxY - bbox.minY;
  if (dx === 0 && dy === 0) {
    dx = fallbackBox;
    dy = fallbackBox;
  }

  const W = Math.max(minViewport, vw);
  const H = Math.max(minViewport, vh);

  let scale = Math.min(W / (dx + pad), H / (dy + pad));
  scale = Math.max(scaleExtent[0], Math.min(scaleExtent[1], scale));

  const cx = bbox.minX + dx / 2;
  const cy = bbox.minY + dy / 2;
  let tx = W / 2 - scale * cx;
  let ty = H / 2 - scale * cy;

  const transformedMinX = bbox.minX * scale + tx;
  const transformedMaxX = bbox.maxX * scale + tx;
  const transformedMinY = bbox.minY * scale + ty;
  const transformedMaxY = bbox.maxY * scale + ty;

  const overXLeft = Math.min(0, transformedMinX - edgeMargin);
  const overXRight = Math.max(0, transformedMaxX - (W - edgeMargin));
  const overYTop = Math.min(0, transformedMinY - edgeMargin);
  const overYBottom = Math.max(0, transformedMaxY - (H - edgeMargin));

  if (overXLeft < 0) {
    tx -= overXLeft;
  }
  if (overXRight > 0) {
    tx -= overXRight;
  }
  if (overYTop < 0) {
    ty -= overYTop;
  }
  if (overYBottom > 0) {
    ty -= overYBottom;
  }

  return d3.zoomIdentity.translate(tx, ty).scale(scale);
}

function computeNodeLevels(
  nodes: (SimulationNode | (SimulationNode & { level?: number }))[],
  links: SimulationLink[],
) {
  const anchoredNodes = nodes
    .filter((n) => n.labels.includes("Internet"))
    .map((n) => n.elementId);

  const levelsMap = new Map<string, number>();

  if (anchoredNodes.length > 0) {
    const undirectedAdjacencyMatrix = new Map<string, Set<string>>();

    links.forEach((l) => {
      const sourceNode = resolveElementId(l.source);
      const targetNode = resolveElementId(l.target);
      if (sourceNode !== targetNode) {
        if (!undirectedAdjacencyMatrix.has(sourceNode)) {
          undirectedAdjacencyMatrix.set(sourceNode, new Set());
        }
        undirectedAdjacencyMatrix.get(sourceNode)!.add(targetNode);

        if (!undirectedAdjacencyMatrix.has(targetNode)) {
          undirectedAdjacencyMatrix.set(targetNode, new Set());
        }
        undirectedAdjacencyMatrix.get(targetNode)!.add(sourceNode);
      }
    });
    nodes.forEach((n) => levelsMap.set(n.elementId, Infinity));
    // When there are "anchored" nodes (e.g. Internet), we want to level nodes by their undirected distance to the nearest anchor.
    const queue = anchoredNodes;
    anchoredNodes.forEach((id) => levelsMap.set(id, 0));

    let qi = 0;
    while (qi < queue.length) {
      const cur = queue[qi++];
      const curLevel = levelsMap.get(cur) ?? 0;
      const neighbors = undirectedAdjacencyMatrix.get(cur);
      if (neighbors) {
        neighbors.forEach((nb) => {
          const neighborLevel = levelsMap.get(nb) ?? Infinity;
          if (neighborLevel > curLevel + 1) {
            levelsMap.set(nb, curLevel + 1);
            queue.push(nb);
          }
        });
      }
    }

    nodes.forEach((n) => {
      if (!Number.isFinite(levelsMap.get(n.elementId)!)) {
        levelsMap.set(n.elementId, 0);
      }
    });
  } else {
    const outgoingNodes = new Map<string, string[]>();

    links.forEach((l) => {
      const sourceNode = resolveElementId(l.source);
      const targetNode = resolveElementId(l.target);
      if (sourceNode !== targetNode) {
        if (!outgoingNodes.has(sourceNode)) {
          outgoingNodes.set(sourceNode, []);
        }
        outgoingNodes.get(sourceNode)!.push(targetNode);
      }
    });

    nodes.forEach((n) => levelsMap.set(n.elementId, 0));

    const queue = nodes.map((n) => n.elementId);
    let queueIndex = 0;
    const updateCounts = new Map<string, number>();

    while (queueIndex < queue.length) {
      const currentlyVisitingNode = queue[queueIndex++];
      const curLevel = levelsMap.get(currentlyVisitingNode) ?? 0;
      const targets = outgoingNodes.get(currentlyVisitingNode);
      if (!targets) {
        continue;
      }

      targets.forEach((tgt) => {
        const tgtLevel = levelsMap.get(tgt) ?? 0;
        if (tgtLevel <= curLevel) {
          levelsMap.set(tgt, curLevel + 1);
          const cnt = (updateCounts.get(tgt) ?? 0) + 1;
          updateCounts.set(tgt, cnt);
          if (cnt <= nodes.length) {
            queue.push(tgt);
          }
        }
      });
    }
  }
  return levelsMap;
}
