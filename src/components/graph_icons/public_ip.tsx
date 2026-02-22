import { DEFAULT_NODE_RADIUS } from "../graph_icons";

export const PublicIpIcon: React.FC<{
  color?: string;
  background?: string;
}> = ({ color = "white", background = "none" }) => (
  <g role="img" aria-label="Public IP">
    <circle r={DEFAULT_NODE_RADIUS} fill={background} />

    <g>
      <g transform="translate(0 -0.4)">
        <circle cx="0" cy="-1" r="5.0" fill={color} />
        <path d="M-3 0 L 0 8 L 3 0 Z" fill={color} />

        <text
          x="0"
          y="-1"
          textAnchor="middle"
          fontSize="6"
          fontWeight={700}
          fill={background === "none" ? "#000" : background}
          style={{
            fontFamily: "Arial, Helvetica, sans-serif",
            dominantBaseline: "middle",
          }}
        >
          IP
        </text>
      </g>
    </g>
  </g>
);
