import React from "react";

interface CloudIconProps extends React.SVGProps<SVGSVGElement> {
  bgColor?: string;
}

export default function CloudIcon({
  bgColor = "#000",
  ...props
}: CloudIconProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      width="64"
      height="64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {/* Network Graph Lines (Drawn first so they sit cleanly behind the cloud and nodes) */}
      <g
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Central Trunk */}
        <line x1="32" y1="35" x2="32" y2="43" />

        {/* Level 1 Routing */}
        <line x1="32" y1="43" x2="20" y2="51" />
        <line x1="32" y1="43" x2="44" y2="51" />

        {/* Level 2 Routing (Perfectly Symmetrical) */}
        <line x1="20" y1="51" x2="14" y2="59" />
        <line x1="20" y1="51" x2="26" y2="59" />
        <line x1="44" y1="51" x2="38" y2="59" />
        <line x1="44" y1="51" x2="50" y2="59" />
      </g>

      {/* Cloud Object (Drawn over the trunk line to absorb it seamlessly) */}
      <g fill="currentColor">
        <rect x="16" y="21" width="32" height="16" rx="8" />
        <circle cx="26" cy="19" r="8" />
        <circle cx="38" cy="18" r="10" />
      </g>

      {/* Network Nodes (Using bgColor fill to create modern hollow "rings") */}
      <g fill={bgColor || "#ffffff"} stroke="currentColor" strokeWidth="2">
        <circle cx="32" cy="43" r="3" />

        <circle cx="20" cy="51" r="3" />
        <circle cx="44" cy="51" r="3" />

        <circle cx="14" cy="59" r="3" />
        <circle cx="26" cy="59" r="3" />
        <circle cx="38" cy="59" r="3" />
        <circle cx="50" cy="59" r="3" />
      </g>
    </svg>
  );
}
