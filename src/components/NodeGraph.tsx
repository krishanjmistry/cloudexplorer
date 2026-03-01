"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import * as d3 from "d3";

import { SimulationLink, SimulationNode } from "../types";
import { LinkComponent } from "./node-graph/LinkComponent";
import { NodeComponent } from "./node-graph/NodeComponent";
import Tooltip, { computeTooltipPosition } from "./node-graph/Tooltip";
import useForceSimulation from "../hooks/useForceSimulation";

export interface GraphData {
  nodes: SimulationNode[];
  links: SimulationLink[];
}

interface NodeGraphProps {
  /**
   * Initial width to render at.  Once mounted the component measures its
   * container and adjusts automatically, so this can be omitted or set to
   * `0` when consumers simply want a responsive graph that fills its parent.
   */
  width?: number;
  height: number;
  data: GraphData;
}
interface TooltipState {
  visible: boolean;
  data: SimulationNode | SimulationLink | null;
  position: { x: number; y: number };
}

const NodeGraph: React.FC<NodeGraphProps> = ({
  width = 0,
  height,
  data,
}) => {
  // start with the provided width (often zero) but quickly update once the
  // container is measured.  a zero starting width ensures the svg doesn't
  // flash unexpectedly large on first render when we don't know the parent
  // size yet.
  const [measuredWidth, setMeasuredWidth] = useState<number>(width);
  const effectiveHeight = Math.min(measuredWidth, height);

  const {
    animatedNodes,
    animatedLinks,
    setAnimatedNodes,
    simulationRef,
    svgRef,
    innerGroupRef,
    zoomToFit,
  } = useForceSimulation({
    data,
    width: measuredWidth,
    height: effectiveHeight,
  });

  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    data: null,
    position: { x: 0, y: 0 },
  });
  const [pinnedNodeId, setPinnedNodeId] = useState<string | null>(null);
  const colorScale = useMemo(() => d3.scaleOrdinal(d3.schemeCategory10), []);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = containerRef.current ?? svgRef.current?.parentElement ?? null;
    if (!el) {
      return;
    }

    const measure = () => {
      const r = el.getBoundingClientRect();
      if (!r.width) {
        return;
      }
      const w = Math.round(r.width);
      setMeasuredWidth((prev) => (prev !== w ? w : prev));
      requestAnimationFrame(() => {
        if (zoomToFit) {
          zoomToFit();
        }
      });
      zoomToFit();
    };

    measure();
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [height, zoomToFit, svgRef]);

  // 1. Create a stable drag handler instance (empty initially)
  const dragHandler = useMemo(() => {
    return d3.drag<SVGGElement, SimulationNode>();
  }, []);

  // 2. Attach the logic inside useEffect, where accessing refs is allowed
  useEffect(() => {
    if (!dragHandler) {
      return;
    }

    dragHandler
      .on("start", (event, d) => {
        const sim = simulationRef.current;
        if (!event.active) {
          // attach tick listener only while simulation is active for interaction
          sim.on("tick", () => {
            setAnimatedNodes([...(sim.nodes() as SimulationNode[])]);
          });
          sim.alphaTarget(0.3).restart();
        }

        // Disable the major forces so they don't influence the graph while dragging
        sim
          .force("charge", null)
          .force("collide", null)
          .force("link", null)
          .force("x", null)
          .force("y", null);

        // fix the dragged node to the pointer
        d.fx = d.x ?? 0;
        d.fy = d.y ?? 0;
      })
      .on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
        setAnimatedNodes((prev) =>
          prev.map((n) =>
            n.elementId === d.elementId ? { ...n, x: event.x, y: event.y } : n,
          ),
        );
      })
      .on("end", (event) => {
        const sim = simulationRef.current;
        if (!event.active) {
          // allow one tick to apply final positions then stop
          setTimeout(() => {
            sim.on("tick", null);
            sim.stop();
          }, 0);
        }
      });
  }, [dragHandler, setAnimatedNodes, simulationRef]);

  const handleMouseOver = (event: React.MouseEvent, node: SimulationNode) => {
    if (!pinnedNodeId) {
      const rect = containerRef.current?.getBoundingClientRect();
      const pos = computeTooltipPosition(
        rect,
        event.clientX,
        event.clientY,
        event.pageX,
        event.pageY,
      );
      setTooltip({ visible: true, data: node, position: pos });
    }
  };

  const handleMouseOut = () => {
    if (!pinnedNodeId) {
      setTooltip((t) => ({ ...t, visible: false }));
    }
  };

  const handleClickNode = (event: React.MouseEvent, node: SimulationNode) => {
    event.stopPropagation();

    const rect = containerRef.current?.getBoundingClientRect();
    const pos = computeTooltipPosition(
      rect,
      event.clientX,
      event.clientY,
      event.pageX,
      event.pageY,
    );

    if (pinnedNodeId === node.elementId) {
      setPinnedNodeId(null);
      setTooltip({ visible: false, data: null, position: { x: 0, y: 0 } });
    } else {
      setPinnedNodeId(node.elementId);
      setTooltip({ visible: true, data: node, position: pos });
    }
  };

  const handleBackgroundClick = () => {
    if (pinnedNodeId) {
      setPinnedNodeId(null);
      setTooltip({ visible: false, data: null, position: { x: 0, y: 0 } });
    }
  };

  // Build ordered and unordered counts so we can:
  // - separate parallel edges in the same direction (orderedCounts)
  // - detect opposite-direction siblings and shift groups apart (unorderedCounts)
  const orderedCounts = useMemo(() => {
    const ordered = new Map<string, number>();
    for (const link of animatedLinks) {
      const srcId =
        typeof link.source === "object"
          ? link.source.elementId
          : String(link.source);
      const tgtId =
        typeof link.target === "object"
          ? link.target.elementId
          : String(link.target);
      const oKey = `${srcId}__${tgtId}`;
      ordered.set(oKey, (ordered.get(oKey) || 0) + 1);
    }
    return ordered;
  }, [animatedLinks]);

  return (
    <div style={{ position: "relative" }} ref={containerRef}>
      <svg
        ref={svgRef}
        width={measuredWidth}
        height={effectiveHeight}
        style={{
          width: "100%",
          height: effectiveHeight,
          border: "1px solid #ccc",
          backgroundColor: "#fff",
        }}
        onClick={handleBackgroundClick}
      >
        <defs>
          <pattern
            id="smallGrid"
            width="20"
            height="20"
            patternUnits="userSpaceOnUse"
          >
            <rect
              width="20"
              height="20"
              fill="none"
              stroke="#eee"
              strokeWidth="1"
            />
          </pattern>

          {/* arrow marker for directed edges */}
          <marker
            id="arrow"
            viewBox="0 0 10 10"
            refX="10"
            refY="5"
            markerUnits="strokeWidth"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#9ca3af" />
          </marker>
        </defs>
        <rect width="100%" height="100%" fill="url(#smallGrid)" />

        {/* innerGroupRef is the transform target for pan/zoom */}
        <g ref={innerGroupRef} className="inner-group">
          <g className="links">
            {(() => {
              const offsetsSeen = new Map<string, number>();
              return animatedLinks.map((link, i) => {
                const srcId =
                  typeof link.source === "object"
                    ? link.source.elementId
                    : String(link.source);
                const tgtId =
                  typeof link.target === "object"
                    ? link.target.elementId
                    : String(link.target);

                // ordered key groups links in the same direction together
                const orderedKey = `${srcId}__${tgtId}`;
                const index = offsetsSeen.get(orderedKey) ?? 0;
                offsetsSeen.set(orderedKey, index + 1);

                const total = orderedCounts.get(orderedKey) ?? 1;
                const reverseCount =
                  orderedCounts.get(`${tgtId}__${srcId}`) ?? 0;
                const reverseExists = reverseCount > 0;

                const id = `${srcId}__${tgtId}__${i}`;
                return (
                  <LinkComponent
                    key={id}
                    id={id}
                    link={link}
                    parallelIndex={index}
                    parallelTotal={total}
                    reverseExists={reverseExists}
                    onHover={(ev, l) => {
                      const rect =
                        containerRef.current?.getBoundingClientRect();
                      const pos = computeTooltipPosition(
                        rect,
                        ev.clientX,
                        ev.clientY,
                        ev.pageX,
                        ev.pageY,
                      );
                      setTooltip({ visible: true, data: l, position: pos });
                    }}
                    onOut={() => {
                      if (!pinnedNodeId) {
                        setTooltip((t) => ({ ...t, visible: false }));
                      }
                    }}
                  />
                );
              });
            })()}
          </g>
          <g className="nodes">
            {animatedNodes.map((node) => (
              <NodeComponent
                key={node.elementId}
                node={node}
                dragHandler={dragHandler}
                onMouseOver={handleMouseOver}
                onMouseOut={handleMouseOut}
                onClick={handleClickNode}
                colorScale={colorScale}
              />
            ))}
          </g>
        </g>
      </svg>

      <Tooltip
        visible={tooltip.visible}
        data={tooltip.data}
        position={tooltip.position}
      />

      {/* Fit button - always visible */}
      <div style={{ position: "absolute", right: 12, top: 12, zIndex: 50 }}>
        <button
          onClick={() => {
            zoomToFit();
          }}
          title="Center & zoom to focused resources"
          style={{
            background: "#111827",
            color: "white",
            border: "1px solid #374151",
            padding: "6px 12px",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          Fit
        </button>
      </div>
    </div>
  );
};

export default NodeGraph;
