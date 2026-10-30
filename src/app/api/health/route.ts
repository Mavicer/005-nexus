import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
export async function GET() {
  try {
    if (
      process.env.NODE_ENV === "production" &&
      (!process.env.DATABASE_URL ||
        Buffer.byteLength(process.env.AUTH_SECRET ?? "") < 32)
    )
      throw new Error("config");
    await db.execute(sql`SELECT 1 FROM nexus_events LIMIT 1`);
    return NextResponse.json(
      { status: "ready", version: "nexus-v2" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ status: "unavailable" }, { status: 503 });
  }
}
