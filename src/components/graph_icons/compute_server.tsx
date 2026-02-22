import { DEFAULT_NODE_RADIUS } from "../graph_icons";

export const ComputeServerIcon: React.FC<{
  color?: string;
  background?: string;
}> = ({ color = "white", background = "none" }) => (
  <g role="img" aria-label="Compute">
    <circle r={DEFAULT_NODE_RADIUS} fill={background} />
    <g transform="translate(-2 -2)">
      <rect
        x="-4"
        y="-4"
        width="8"
        height="8"
        rx="2"
        fill="none"
        stroke={color}
        strokeWidth="0.9"
      />
    </g>

    <g transform="translate(2 2)">
      <rect
        x="-4"
        y="-4"
        width="8"
        height="8"
        rx="2"
        fill="none"
        stroke={color}
        strokeWidth="0.9"
      />
    </g>
  </g>
);
