import * as d3 from "d3";
import { useRef, useEffect } from "react";
import { SimulationNode } from "../../types";
import { getIcon } from "../graph_icons";

interface NodeProps {
  node: SimulationNode;
  dragHandler: d3.DragBehavior<
    SVGGElement,
    SimulationNode,
    SimulationNode | d3.SubjectPosition
  >;
  onMouseOver: (event: React.MouseEvent, node: SimulationNode) => void;
  onMouseOut: () => void;
  onClick: (event: React.MouseEvent, node: SimulationNode) => void;
  colorScale: d3.ScaleOrdinal<string, string>;
}

export const NodeComponent: React.FC<NodeProps> = ({
  node,
  dragHandler,
  onMouseOver,
  onMouseOut,
  onClick,
  colorScale,
}) => {
  const nodeRef = useRef<SVGGElement>(null);

  useEffect(() => {
    if (nodeRef.current) {
      d3.select<SVGGElement, SimulationNode>(nodeRef.current)
        .datum(node)
        .call(dragHandler);
    }
  }, [dragHandler, node]);

  const isFocused = Boolean(node.details?.focus);
  const { icon, iconRadius } = getIcon(node, colorScale, isFocused);

  return (
    <g
      className="node"
      ref={nodeRef}
      data-element-id={node.elementId}
      data-focused={isFocused ? "true" : "false"}
      transform={`translate(${node.x || 0}, ${node.y || 0})`}
      onMouseOver={(event) => onMouseOver(event, node)}
      onMouseOut={onMouseOut}
      onClick={(event) => onClick(event, node)}
    >
      {icon}
      <text
        x={0}
        y={iconRadius + 6}
        className="node-label"
        textAnchor="middle"
        dominantBaseline="hanging"
      >
        {node.name || node.details.id}
      </text>
    </g>
  );
};
