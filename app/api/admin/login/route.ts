import { NextRequest, NextResponse } from "next/server";
import { createAdminToken, adminPasswordMatches, ADMIN_COOKIE_NAME, ADMIN_SESSION_SECONDS } from "@/lib/adminAuth";
import { readJson } from "@/lib/serverAuth";

export async function POST(req: NextRequest) {
  if (!process.env.ADMIN_PASSWORD || !process.env.ADMIN_SESSION_SECRET) {
    return NextResponse.json({ error: "Admin login is not configured." }, { status: 500 });
  }

  const body = await readJson<{ password?: unknown }>(req);
  const password = typeof body?.password === "string" ? body.password : "";

  if (!adminPasswordMatches(password)) {
    // Slows down password guessing — every wrong attempt costs the caller a
    // second, which turns a scripted brute force into a non-starter.
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE_NAME, createAdminToken(), {
    httpOnly: true,       // never readable by browser JavaScript
    secure: process.env.NODE_ENV === "production", // HTTPS-only in production (plain http://localhost in dev)
    sameSite: "strict",   // never sent on cross-site requests
    maxAge: ADMIN_SESSION_SECONDS,
    path: "/",
  });
  return res;
}
