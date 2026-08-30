import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { createAdminToken, ADMIN_COOKIE_NAME } from "@/lib/adminAuth";

export async function POST(req: NextRequest) {
  const { password } = await req.json();

  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return NextResponse.json({ error: "Admin login is not configured." }, { status: 500 });
  }

  const provided = Buffer.from(password || "");
  const correct = Buffer.from(expected);

  // Constant-time comparison so a wrong guess can't be timed to learn the password
  const matches = provided.length === correct.length && timingSafeEqual(provided, correct);

  if (!matches) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE_NAME, createAdminToken(), {
    httpOnly: true,       // never readable by browser JavaScript
    secure: true,         // only sent over HTTPS
    sameSite: "strict",   // never sent on cross-site requests
    maxAge: 60 * 60 * 8,  // 8 hours
    path: "/",
  });
  return res;
}
