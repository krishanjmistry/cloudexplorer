import { DEFAULT_NODE_RADIUS } from "../graph_icons";

export const IdentityHumanIcon: React.FC<{
  color?: string;
  background?: string;
}> = ({ color = "white", background = "none" }) => (
  <g role="img" aria-label="User">
    <circle r={DEFAULT_NODE_RADIUS} fill={background} />
    <circle cx="0" cy="-3" r="2.5" fill={color} />
    <path
      d="M-4 4 C -2 0 2 0 4 4"
      stroke={color}
      strokeWidth="0.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </g>
);
