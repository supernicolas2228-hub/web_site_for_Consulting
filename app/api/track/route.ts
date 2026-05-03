import { NextResponse } from "next/server";
import {
  appendSiteEvent,
  checkSiteEventStorageHealthy,
} from "@/lib/site-event-store";

export const dynamic = "force-dynamic";

/** GET: проверка API + файловое хранилище */
export async function GET() {
  const okStorage = await checkSiteEventStorageHealthy();
  return NextResponse.json(
    { ok: true, database: okStorage, storageFile: okStorage },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}

const ALLOWED = new Set([
  "page_view",
  "click_starter_pack",
  "starter_pack_survey_submit",
  "click_product",
  "click_pricing",
  "click_social",
  "scroll_depth",
]);

export async function POST(req: Request) {
  const createdAt = new Date();
  try {
    const body = (await req.json()) as {
      event?: string;
      data?: unknown;
      timestamp?: number;
    };

    const event = typeof body.event === "string" ? body.event : "";
    if (!ALLOWED.has(event)) {
      return NextResponse.json({ ok: false, error: "unknown event" }, { status: 400 });
    }

    const dataStr =
      body.data !== undefined ? JSON.stringify(body.data) : JSON.stringify({ ts: body.timestamp });

    await appendSiteEvent(event, dataStr, createdAt);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/track]", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "storage_failed" },
      { status: 500 },
    );
  }
}
