"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { BadgeCheck, LayoutDashboard } from "lucide-react";

export default function BusinessQuickActions() {
  const [businessName, setBusinessName] = useState<string | null>(null);

  useEffect(() => {
    async function check() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const { data } = await supabase.from("businesses").select("name").eq("owner_id", session.user.id).single();
      if (data) setBusinessName(data.name);
    }
    check();
  }, []);

  // Renders nothing at all for customers or logged-out visitors — no layout shift, no empty box
  if (!businessName) return null;

  return (
    <div className="bg-navy/5 border border-navy/10 rounded-xl px-5 py-4 flex flex-wrap items-center justify-between gap-3 mb-10">
      <p className="text-sm text-ink">
        Welcome back, <span className="font-medium">{businessName}</span>.
      </p>
      <div className="flex gap-2">
        <Link
          href="/business/dashboard"
          className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg bg-navy text-white hover:bg-navy-light transition-colors"
        >
          <LayoutDashboard size={15} /> Manage listing
        </Link>
        <a
          href="mailto:hello@luupa.net?subject=Verification request"
          className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg border border-navy/20 text-navy hover:bg-navy/5 transition-colors"
        >
          <BadgeCheck size={15} /> Get verified
        </a>
      </div>
    </div>
  );
}
