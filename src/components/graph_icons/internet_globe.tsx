import { DEFAULT_NODE_RADIUS } from "../graph_icons";

export const InternetGlobeIcon: React.FC<{
  fill?: string;
  land?: string;
}> = ({ fill = "#0b63a3", land = "#16a34a" }) => (
  <g role="img" aria-label="Internet">
    <circle r={DEFAULT_NODE_RADIUS} fill={fill} />

    <g fill={land}>
      {/* Americas (North + South) */}
      <path d="M-7 0 C-6 -4 -3 -5 -1 -3 C0 -1 0.5 1 -1 4 C-2.5 5 -5 4 -6 2 C-6.5 1 -7 0 -7 0 Z" />

      {/* Greenland / small islands */}
      <path d="M-1 -6 C0 -6.5 1 -6 2 -5 C1 -4 0 -4.2 -1 -5 C-1.2 -5.4 -1 -5.8 -1 -6 Z" />

      {/* Europe / Africa */}
      <path d="M0 -3 C1 -5 3 -5 4 -4 C5 -2.5 4 0 3 1.5 C2 2.5 1 3 0 2 C-1 1 -0.5 -1 0 -3 Z" />

      {/* Asia */}
      <path d="M3 -2 C5 -2 7 -1 7 1 C6.5 3 5 4 3.5 3.5 C2.5 3 2 2 2.5 0.5 C2.8 -0.5 3 -1 3 -2 Z" />

      {/* Australia / Oceania */}
      <path d="M5 3 C6 3 6.8 3.5 6 4.2 C5.2 4.8 4 4.5 4 3.5 C4.2 3 4.6 3 5 3 Z" />
    </g>
  </g>
);
