import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { buildAnalytics } from "@/lib/analytics";
import { getAdminPassword } from "@/lib/admin-password";
import { ADMIN_COOKIE, verifyAdminCookie } from "@/lib/admin-session";
import { readSiteEventsSince } from "@/lib/site-event-store";

export const dynamic = "force-dynamic";

export async function GET() {
  const cookie = cookies().get(ADMIN_COOKIE)?.value;
  const ok = await verifyAdminCookie(cookie, getAdminPassword());
  if (!ok) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const since = new Date();
  since.setDate(since.getDate() - 120);

  try {
    const events = await readSiteEventsSince(since);
    return NextResponse.json(buildAnalytics(events));
  } catch (err) {
    console.error("[api/analytics]", err);
    return NextResponse.json(buildAnalytics([]));
  }
}
