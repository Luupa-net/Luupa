"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const [listing, setListing] = useState<any>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/business/login");
        return;
      }
      const { data } = await supabase.from("businesses").select("*").eq("owner_id", user.id).single();
      setListing(data);
      setLoading(false);
    }
    load();
  }, [router]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    await supabase.from("businesses").update(listing).eq("id", listing.id);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  if (loading) return <div className="max-w-3xl mx-auto px-6 py-16 text-steel">Loading…</div>;
  if (!listing) return <div className="max-w-3xl mx-auto px-6 py-16 text-steel">No listing found.</div>;

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-semibold text-ink">Your listing</h1>
        <button onClick={handleLogout} className="text-sm text-steel hover:text-ink">Log out</button>
      </div>

      <p className="text-sm mt-2 inline-block px-3 py-1 rounded-full bg-steel/10 text-steel capitalize">
        Status: {listing.status} · Tier: {listing.tier}
      </p>

      <form onSubmit={handleSave} className="mt-8 space-y-5">
        <label className="block">
          <span className="text-sm font-medium text-ink">Business name</span>
          <input className="input mt-1" value={listing.name || ""} onChange={(e) => setListing({ ...listing, name: e.target.value })} />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-ink">Description (shown to customers, used for search matching)</span>
          <textarea
            className="input mt-1 h-28 py-2"
            value={listing.description || ""}
            onChange={(e) => setListing({ ...listing, description: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-ink">WhatsApp number (with country code, no +)</span>
          <input className="input mt-1" value={listing.whatsapp || ""} onChange={(e) => setListing({ ...listing, whatsapp: e.target.value })} />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-ink">Area</span>
          <input className="input mt-1" value={listing.area || ""} onChange={(e) => setListing({ ...listing, area: e.target.value })} />
        </label>

        <button className="px-6 py-3 rounded-md bg-ignition text-white font-semibold hover:bg-ignition-dim transition-colors">
          Save changes
        </button>
        {saved && <span className="text-sm text-green-700 ml-3">Saved</span>}
      </form>
    </div>
  );
}
