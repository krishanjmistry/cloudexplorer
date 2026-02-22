interface ScenarioNodeDetails {
  [key: string]: string | number | boolean | null;
}

interface ScenarioNode {
  kind: "node";
  elementId: string | null;
  labels: string[];
  name: string | null;
  details: ScenarioNodeDetails;
}

interface ScenarioRelationship {
  kind: "relationship";
  type: string;
  details: ScenarioNodeDetails;
}

export type RowValue =
  | RowValue[]
  | ScenarioNode
  | ScenarioRelationship
  | string
  | number
  | boolean
  | null;

export interface ScenarioInstanceRow {
  elementId: string;
  [key: string]: RowValue;
}
