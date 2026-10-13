import { createHmac } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { readJson, siteUrl } from "@/lib/serverAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendContactMessageEmail } from "@/lib/email";
import { normalizeWhatsAppNumber } from "@/lib/validation";
import { CONTACT_ROLES, CONTACT_TOPICS, SUPPORT_EMAIL } from "@/lib/support";

// Public contact form. The message is saved first (contact_messages,
// migration-v32 — service role only) and only then emailed, so it's never
// lost when email delivery is down; the admin page is the source of truth.
const MAX_PER_HOUR = 5;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Body = {
  name?: unknown; phone?: unknown; email?: unknown; role?: unknown;
  topic?: unknown; car?: unknown; message?: unknown; website?: unknown;
};

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

// Only a keyed hash of the IP is stored — enough to rate-limit, useless for
// identifying anyone.
function ipHash(req: NextRequest): string | null {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip");
  const secret = process.env.LINK_SIGNING_SECRET || process.env.ADMIN_SESSION_SECRET;
  if (!ip || !secret) return null;
  return createHmac("sha256", secret).update(`luupa-contact:${ip}`).digest("hex").slice(0, 32);
}

export async function POST(req: NextRequest) {
  const body = await readJson<Body>(req);
  if (!body) return NextResponse.json({ error: "Something went wrong — try again." }, { status: 400 });

  // Honeypot: a field real visitors never see. Bots that fill it get a
  // normal-looking success and nothing is saved.
  if (text(body.website, 200)) return NextResponse.json({ ok: true });

  const name = text(body.name, 100);
  const phoneDigits = normalizeWhatsAppNumber(text(body.phone, 30));
  const email = text(body.email, 200).toLowerCase();
  const role = CONTACT_ROLES.find((r) => r.key === body.role);
  const topic = CONTACT_TOPICS.find((t) => t.key === body.topic);
  const car = role?.key === "driver" ? text(body.car, 100) : "";
  const message = text(body.message, 3000);

  if (!name) return NextResponse.json({ error: "Add your name." }, { status: 400 });
  if (phoneDigits.length < 8 || phoneDigits.length > 15) {
    return NextResponse.json({ error: "Enter a valid phone number, like 3600 0000." }, { status: 400 });
  }
  if (email && !EMAIL_RE.test(email)) return NextResponse.json({ error: "That email doesn't look right." }, { status: 400 });
  if (!role || !topic) return NextResponse.json({ error: "Choose who you are and what it's about." }, { status: 400 });
  if (message.length < 5) return NextResponse.json({ error: "Add a few words about how we can help." }, { status: 400 });

  const hash = ipHash(req);
  if (hash) {
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabaseAdmin
      .from("contact_messages")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", hash)
      .gte("created_at", since);
    if ((count ?? 0) >= MAX_PER_HOUR) {
      return NextResponse.json({ error: "You've sent a few messages already — we'll be in touch soon." }, { status: 429 });
    }
  }

  const phone = `+${phoneDigits}`;
  const { data: saved, error } = await supabaseAdmin
    .from("contact_messages")
    .insert({ name, phone, email: email || null, role: role.key, topic: topic.label, car: car || null, message, ip_hash: hash })
    .select("id")
    .single();
  if (error || !saved) {
    console.error("Failed to save contact message:", error);
    return NextResponse.json({ error: "Your message didn't send — try again in a moment." }, { status: 500 });
  }

  const result = await sendContactMessageEmail(SUPPORT_EMAIL, {
    name, phone, email: email || null, role: role.label, topic: topic.label, car: car || null, message,
    adminUrl: `${siteUrl(req)}/admin`,
  });
  if (result.sent) await supabaseAdmin.from("contact_messages").update({ emailed: true }).eq("id", saved.id);

  return NextResponse.json({ ok: true });
}
