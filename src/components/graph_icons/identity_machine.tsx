import { DEFAULT_NODE_RADIUS } from "../graph_icons";

export const IdentityMachineIcon: React.FC<{
  color?: string;
  background?: string;
}> = ({ color = "white", background = "none" }) => {
  return (
    <g role="img" aria-label="Service Principal/Robot">
      <circle r={DEFAULT_NODE_RADIUS} fill={background} />

      <rect x="-5" y="-3" width="10" height="6" rx="1.6" fill={color} />

      <line
        x1="0"
        y1="-3.5"
        x2="0"
        y2="-5.2"
        stroke={color}
        strokeWidth="0.7"
        strokeLinecap="round"
      />
      <circle cx="0" cy="-5.6" r="0.8" fill={color} />

      <circle cx="-1.6" cy="-1" r="0.9" fill={background} />
      <circle cx="1.6" cy="-1" r="0.9" fill={background} />

      <rect
        x="-2.4"
        y="1"
        width="4.8"
        height="0.9"
        rx="0.45"
        fill={background}
      />
    </g>
  );
};
