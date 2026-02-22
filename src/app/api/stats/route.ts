import { NextResponse } from "next/server";
import { SCENARIOS } from "@/src/app/_lib/queries";
import driver from "@/src/utils/db_connection";
import getErrorMessage from "@/src/utils/get_error_message";

export interface Stat {
  id: string;
  title: string;
  description: string;
  count: number;
  // severity reported to the UI (or 'Safe' when there are no matches)
  severity: "Critical" | "High" | "Medium" | "Low" | "Safe";
  remediation: string;
}

export async function GET() {
  const session = driver.session();
  const stats: Stat[] = [];

  try {
    // Run all count queries sequentially (driver/session safety) — keep logic simple
    for (const key of Object.keys(SCENARIOS)) {
      const scenario = SCENARIOS[key];
      const result = await session.run(scenario.countQuery);
      const count = result.records[0].get("count").toNumber();

      stats.push({
        id: scenario.id,
        title: scenario.title,
        description: scenario.description,
        count: count,
        // when count > 0 surface the configured severity, otherwise show Safe
        severity: count > 0 ? scenario.severity : "Safe",
        remediation: scenario.remediation,
      });
    }
    return NextResponse.json(stats);
  } catch (e) {
    return NextResponse.json({ error: getErrorMessage(e) }, { status: 500 });
  } finally {
    await session.close();
  }
}
