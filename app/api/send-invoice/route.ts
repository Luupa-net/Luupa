import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { sendInvoiceEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  // SECURITY: require a real logged-in session token, not just any request —
  // otherwise this endpoint could be used as a free, anonymous email relay.
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { to, businessName, customerName, service, vehicle, amount, paymentMethod, qrUrl } = await req.json();

  if (!to || !businessName || !customerName || !["cash", "card"].includes(paymentMethod)) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  const result = await sendInvoiceEmail(to, { businessName, customerName, service, vehicle, amount, paymentMethod, qrUrl });
  return NextResponse.json(result);
}
