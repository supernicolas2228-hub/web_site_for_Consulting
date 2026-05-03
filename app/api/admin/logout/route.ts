import { NextResponse } from "next/server";
import { adminSessionCookieBase } from "@/lib/admin-cookie-secure";
import { ADMIN_COOKIE } from "@/lib/admin-session";

export async function POST(req: Request) {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, "", {
    ...adminSessionCookieBase(req),
    maxAge: 0,
  });
  return res;
}
