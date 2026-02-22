import { DEFAULT_NODE_RADIUS } from "../graph_icons";

export const RoleAssignmentIcon: React.FC<{
  color?: string;
  background?: string;
}> = ({ color = "white", background = "none" }) => (
  <g role="img" aria-label="Role Assignment">
    <defs>
      <g id="box-structure">
        <rect
          x="0"
          y="0"
          width="2.6"
          height="2.6"
          rx="0.5"
          fill={background}
          stroke={color}
          strokeWidth="0.45"
        />
        <rect
          x="3.3"
          y="0.2"
          width="5.8"
          height="1.2"
          rx="0.6"
          fill={color}
          opacity="0.95"
        />
      </g>
      <g id="cross-box">
        <use href="#box-structure" />
        <path
          d="M0.75 0.75 L1.85 1.85 M0.75 1.85 L1.85 0.75"
          stroke={color}
          strokeWidth="0.45"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </g>
      <g id="tick-box">
        <use href="#box-structure" />
        <path
          d="M0.75 1.35 L1.2 1.8 L2.0 0.8"
          stroke={color}
          strokeWidth="0.45"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </g>
    </defs>
    <circle r={DEFAULT_NODE_RADIUS} fill={background} />

    <g transform="scale(0.9)">
      <use href="#tick-box" x={-6.2} y={-5.2} />
      <use href="#cross-box" x={-6.2} y={-0.8} />
      <use href="#tick-box" x={-6.2} y={3.6} />

      <g transform="translate(5 5)">
        <circle cx="0" cy="-2" r="1.6" fill={color} />
        <path
          d="M-2 2 C -1 0 1 0 2 2"
          stroke={color}
          strokeWidth="0.45"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </g>
    </g>
  </g>
);
