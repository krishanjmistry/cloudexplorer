import { NextResponse } from "next/server";
import { runAzureScan } from "@/src/app/_lib/scanner";
import getErrorMessage from "@/src/utils/get_error_message";

export async function POST() {
  try {
    // TODO: authentication?
    await runAzureScan();
    return NextResponse.json({ message: "Scan completed successfully" });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 },
    );
  }
}
