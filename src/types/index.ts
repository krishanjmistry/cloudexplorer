interface Properties {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

interface NodeData {
  elementId: string;
  labels: string[];
  name: string;
  details: Properties;
}
export interface SimulationNode extends NodeData, d3.SimulationNodeDatum {}
export interface SimulationLink extends d3.SimulationLinkDatum<SimulationNode> {
  source: string | SimulationNode;
  target: string | SimulationNode;
  label: string;
  details: Properties;
}

export enum GraphQueryType {
  Scenario = "scenario",
  Full = "full",
}

export type GraphQuery =
  | {
      type: GraphQueryType.Scenario;
      scenarioId: string;
      focusElementId?: string;
    }
  | { type: GraphQueryType.Full };

export interface Stat {
  id: string;
  title: string;
  description: string;
  count: number;
  // severity reported to the UI (or 'Safe' when there are no matches)
  severity: "Critical" | "High" | "Medium" | "Low" | "Safe";
  remediation: string;
}