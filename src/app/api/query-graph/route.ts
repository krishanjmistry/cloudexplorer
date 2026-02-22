import { NextResponse } from "next/server";
import { isRelationship, isNode, isInt, isDateTime } from "neo4j-driver";
import { SCENARIOS } from "@/src/app/_lib/queries";
import driver from "@/src/utils/db_connection";
import { GraphData } from "@/src/components/azure_security_graph";
import {
  GraphQuery,
  GraphQueryType,
  SimulationLink,
  SimulationNode,
} from "@/src/types";

export async function POST(req: Request): Promise<NextResponse<GraphData>> {
  const body: GraphQuery = await req.json();

  const session = driver.session();

  let query: string;
  let params: Record<string, unknown> = {};

  switch (body.type) {
    case GraphQueryType.Full:
      query = /* cypher */ `
        MATCH (n)
        OPTIONAL MATCH (n)-[r]-(m)
        RETURN collect(DISTINCT n) AS nodes, collect(DISTINCT r) AS rels
      `;
      break;
    case GraphQueryType.Scenario:
      const scenario = SCENARIOS[body.scenarioId];
      if (!scenario) {
        throw new Error("Invalid Scenario");
      }

      query = body.focusElementId ? scenario.focusedQuery : scenario.graphQuery;
      params = body.focusElementId ? { elementId: body.focusElementId } : {};
      break;
    default:
      throw new Error("Invalid query type");
  }

  try {
    const result = await session.run(query, params);

    // convert Neo4j-specific types to plain JS
    const normalizeValue = (v: unknown): unknown => {
      if (Array.isArray(v)) {
        return v.map(normalizeValue);
      } else if (isDateTime(v)) {
        return v.toStandardDate().toString();
      } else if (isInt(v)) {
        return v.toNumber();
      } else if (v && typeof v === "object") {
        const o: Record<string, unknown> = {};
        for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
          o[k] = normalizeValue(val);
        }
        return o;
      }
      return v;
    };

    const nodesMap = new Map<string, SimulationNode>();
    const linksMap = new Map<number, SimulationLink>();

    const processItem = (it: unknown) => {
      if (isNode(it)) {
        const id = it.elementId;
        if (!nodesMap.has(id)) {
          nodesMap.set(id, {
            elementId: id,
            labels: it.labels,
            name: it.properties?.name,
            details: Object.fromEntries(
              Object.entries(it.properties || {}).map(([k, v]) => [
                k,
                normalizeValue(v),
              ]),
            ),
          });
        }
      } else if (isRelationship(it)) {
        const key = it.identity.toNumber();
        if (!linksMap.has(key)) {
          linksMap.set(key, {
            source: String(it.startNodeElementId),
            target: String(it.endNodeElementId),
            label: it.type,
            details: Object.fromEntries(
              Object.entries(it.properties || {}).map(([k, v]) => [
                k,
                normalizeValue(v),
              ]),
            ),
          });
        }
      }
    };

    result.records.forEach((record) => {
      record.keys.forEach((key) => {
        const item = record.get(key);

        if (Array.isArray(item)) {
          item.forEach(processItem);
          return;
        }
        processItem(item);
      });
    });

    if (
      body.type === GraphQueryType.Scenario &&
      body.focusElementId &&
      nodesMap.has(body.focusElementId)
    ) {
      const n = nodesMap.get(body.focusElementId);
      if (n) {
        n.details = { ...(n.details || {}), focus: true };
      }
    }

    return NextResponse.json({
      nodes: Array.from(nodesMap.values()),
      links: Array.from(linksMap.values()),
    });
  } finally {
    await session.close();
  }
}
