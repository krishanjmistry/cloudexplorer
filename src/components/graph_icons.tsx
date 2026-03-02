import { SimulationNode } from "../types";
import { ComputeServerIcon } from "./graph-icons/ComputeServer";
import { IdentityMachineIcon } from "./graph-icons/IdentityMachine";
import { IdentityHumanIcon } from "./graph-icons/IdentityHuman";
import { InternetGlobeIcon } from "./graph-icons/InternetGlobe";
import { KeyVaultIcon } from "./graph-icons/KeyVault";
import { RoleAssignmentIcon } from "./graph-icons/RoleAssignment";
import { NetworkInterfaceIcon } from "./graph-icons/NetworkInterface";
import { PublicIpIcon } from "./graph-icons/PublicIp";
import { FolderIcon } from "./graph-icons/Folder";

export const DEFAULT_NODE_RADIUS = 10;

// Centralized node sizing helpers
export const getNodeBaseRadius = (n: SimulationNode) => {
  const labels = n.labels ?? [];
  if (labels.includes("Internet")) {
    return 20;
  }
  if (labels.includes("Compute")) {
    return 12.5;
  }
  return DEFAULT_NODE_RADIUS;
};

export const getNodeIconRadius = (n: SimulationNode, isFocused = false) =>
  getNodeBaseRadius(n) * (isFocused ? 1.15 : 1);

// Collision radius used by the force simulation. Scales with node base radius
// and increases when the node is focused so focused items get extra separation.
export const getCollisionRadius = (n: SimulationNode, isFocused = false) => {
  const base = getNodeBaseRadius(n);
  const paddingMultiplier = 3.5; // ~35px padding when base is 10
  const focusedExtraMultiplier = isFocused ? 1.5 : 0; // adds ~15px when base is 10
  return base + base * paddingMultiplier + base * focusedExtraMultiplier;
};

// Helper: determine stroke color from node severity
const getStrokeColor = (d: SimulationNode) => {
  switch (d.details.severity) {
    case "Low":
      return "yellow";
    case "Medium":
      return "orange";
    case "High":
      return "red";
    case "Critical":
      return "darkred";
    default:
      return "";
  }
};
// Helper: determine fill color using the provided color scale
const getFillColor = (
  d: SimulationNode,
  colorScale: d3.ScaleOrdinal<string, string>,
) => {
  const labels = d.labels;

  const displayType = labels.length
    ? labels[labels.length - 1]
    : (d.details?.type ?? "Resource");
  return colorScale(displayType);
};

// Centralized icon chooser extracted to module scope. Call from components as `getIcon(node, colorScale, isFocused)`.
export const getIcon = (
  n: SimulationNode,
  colorScale: d3.ScaleOrdinal<string, string>,
  isFocused: boolean,
): { icon: React.ReactNode; iconRadius: number } => {
  const labels = n.labels;

  const isComputeLocal = labels.includes("Compute");
  const isIdentityLocal = labels.includes("Identity");
  const isKeyVaultLocal = labels.includes("KeyVault");
  const isRoleAssignmentLocal = labels.includes("RoleAssignment");
  const isSubscriptionLocal = labels.includes("Subscription");
  const isResourceGroupLocal = labels.includes("ResourceGroup");

  const isPublicInternetLocal = labels.includes("Internet");
  const isNicLocal = labels.includes("Network_NIC");
  const isPublicIpLocal = labels.includes("Network_PublicIP");

  const isIdentityMachineLocal =
    isIdentityLocal && labels.includes("Identity_Machine");
  const isIdentityHumanLocal =
    isIdentityLocal && labels.includes("Identity_Human");

  const iconRadius = getNodeIconRadius(n, isFocused);

  const bg = getFillColor(n, colorScale);

  let chosenIcon;
  if (isPublicInternetLocal) {
    chosenIcon = <InternetGlobeIcon />;
  } else if (isKeyVaultLocal) {
    chosenIcon = <KeyVaultIcon background={bg} />;
  } else if (isSubscriptionLocal || isResourceGroupLocal) {
    chosenIcon = <FolderIcon background={bg} />;
  } else if (isPublicIpLocal) {
    chosenIcon = <PublicIpIcon background={bg} />;
  } else if (isNicLocal) {
    chosenIcon = <NetworkInterfaceIcon background={bg} />;
  } else if (isIdentityHumanLocal) {
    chosenIcon = <IdentityHumanIcon background={bg} />;
  } else if (isIdentityMachineLocal) {
    chosenIcon = <IdentityMachineIcon background={bg} />;
  } else if (isRoleAssignmentLocal) {
    chosenIcon = <RoleAssignmentIcon background={bg} />;
  } else if (isComputeLocal) {
    chosenIcon = <ComputeServerIcon background={bg} />;
  } else {
    chosenIcon = (
      <circle
        r={iconRadius}
        fill={bg}
        stroke={getStrokeColor(n)}
        strokeWidth={isFocused ? 4 : n.details.severity ? 2 : 0}
      />
    );
  }

  return {
    icon: (
      <>
        {isFocused && (
          <circle
            r={iconRadius * 1.15}
            fill="none"
            stroke="#6ee7b7"
            strokeWidth={4}
            opacity={0.18}
          />
        )}
        <g
          transform={`scale(${iconRadius / DEFAULT_NODE_RADIUS})`}
          style={{ filter: `drop-shadow(0 2px 4px rgba(0,0,0,0.18))` }}
        >
          {chosenIcon}
        </g>
      </>
    ),
    iconRadius,
  };
};
