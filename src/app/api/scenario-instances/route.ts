import { NextResponse } from "next/server";
import { isNode, isRelationship, isInt, isDateTime } from "neo4j-driver";
import { SCENARIOS } from "@/src/app/_lib/queries";
import driver from "@/src/utils/db_connection";
import { RowValue, ScenarioInstanceRow } from "@/src/types/scenario-instances";

function mappingFunction(item: unknown): RowValue {
  if (Array.isArray(item)) {
    return item.map(mappingFunction);
  } else if (isDateTime(item)) {
    return item.toString();
  } else if (isNode(item)) {
    return {
      kind: "node",
      elementId: item.elementId,
      labels: item.labels,
      name: item.properties?.name ?? item.elementId ?? "node",
      details: { ...item.properties },
    };
  } else if (isRelationship(item)) {
    return {
      kind: "relationship",
      type: item.type,
      details: { ...item.properties },
    };
  } else if (isInt(item)) {
    return item.toNumber();
  } else {
    if (
      typeof item === "string" ||
      typeof item === "number" ||
      typeof item === "boolean" ||
      item === null
    ) {
      return item;
    } else {
      console.warn("Unknown type for value:", item);
      return JSON.stringify(item);
    }
  }
}

// Return a list of instances for a scenario. If `instancesQuery` exists on the scenario
// we run that and return structured rows (primary resource + other columns). Otherwise
// fall back to extracting nodes from the graphQuery (legacy behavior).
export async function POST(req: Request) {
  const body = await req.json();
  const { scenarioId } = body;
  const scenario = SCENARIOS[scenarioId];
  if (!scenario) {
    return NextResponse.json({ error: "Invalid scenarioId" }, { status: 400 });
  }

  const session = driver.session();
  try {
    const result = await session.run(scenario.instancesQuery);
    const instances: ScenarioInstanceRow[] = [];

    result.records.forEach((record) => {
      const elementId = record.get("elementId");
      const row: Record<string, RowValue> = {};

      for (const [key, item] of record.entries()) {
        row[key as string] = mappingFunction(item);
      }

      const inst: ScenarioInstanceRow = { elementId, ...row };
      instances.push(inst);
    });

    return NextResponse.json({ instances });
  } finally {
    await session.close();
  }
}
