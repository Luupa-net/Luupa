import { supabase } from "@/lib/supabase";
import { isEffectivelyVerified } from "@/lib/verification";
import { BadgeCheck, Phone, MapPin, Clock, Car, MessageCircle, AlertCircle, Wrench, Building2 } from "lucide-react";
import { notFound } from "next/navigation";
import BookingForm from "@/components/BookingForm";

export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  // Next.js 15+: params is now a Promise and must be awaited
  const { id } = await params;
  // SECURITY: query the businesses_public VIEW, not the businesses table —
  // the view already projects down to a public-safe column list and only
  // ever contains active rows (see supabase/schema.sql), so this is safe
  // against direct REST access with the anon key, not just against what
  // this page happens to ask for. A non-active/nonexistent id simply isn't
  // in the view, so this still 404s the same way it did before.
  const { data: listing, error } = await supabase
    .from("businesses_public")
    .select("id, name, logo_url, subcategories, areas, description, phone, whatsapp, hours, services, photos, is_mobile, verified, verified_until")
    .eq("id", id)
    .single();

  // A transient DB/network failure must not read as "this listing doesn't
  // exist" — notFound() renders an identical 404 either way from the
  // visitor's side, so a real outage would look like the business had been
  // deleted. Only a genuine missing row (no error, no data) 404s.
  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-5 sm:px-6 py-24 text-center">
        <AlertCircle size={28} className="text-red-600 mx-auto mb-3" />
        <p className="text-ink font-medium">Couldn't load this listing</p>
        <p className="text-sm text-stone mt-1">Something went wrong on our end — try again in a moment.</p>
      </div>
    );
  }
  if (!listing) return notFound();

  // Fire-and-forget view tracking — doesn't block the page render, doesn't matter
  // if it occasionally fails (e.g. offline admin preview)
  supabase.rpc("increment_view_count", { business_id: listing.id }).then(() => {});

  const verified = isEffectivelyVerified(listing);
  const subcategories: string[] = listing.subcategories || [];
  const areas: string[] = listing.areas || [];
  const waMessage = encodeURIComponent(`Hi ${listing.name}, I found you on Luupa and I'd like to ask about ${subcategories[0] || "your services"}.`);
  const photos: string[] = listing.photos || [];
  const services = (listing.services as { name: string; price?: string }[] | null) || [];

  return (
    <div className="bg-canvas2 min-h-screen">
      <div className="max-w-6xl mx-auto px-5 sm:px-6 py-8 sm:py-10">
        {/* Hero — same gradient/orb language as the business dashboard and
            staff headers, so a customer arriving from a booking link and an
            owner arriving at their own dashboard see one consistent brand. */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-navy to-navy-dim px-6 py-8 sm:px-10 sm:py-10 fade-up">
          <div className="absolute -top-14 -right-10 w-56 h-56 rounded-full bg-teal/25 blur-3xl drift-slow pointer-events-none" />
          <div className="absolute -bottom-20 -left-16 w-60 h-60 rounded-full bg-white/5 blur-3xl drift-slow-reverse pointer-events-none" />
          <div className="relative flex items-start gap-4 sm:gap-5 flex-wrap">
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white/10 border-2 border-white/20 overflow-hidden flex items-center justify-center shrink-0">
              {listing.logo_url ? (
                <img src={listing.logo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white font-display text-3xl font-semibold">{listing.name?.[0]?.toUpperCase()}</span>
              )}
              {verified && (
                <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-teal ring-2 ring-navy flex items-center justify-center">
                  <BadgeCheck size={13} className="text-white" />
                </span>
              )}
            </div>
            <div className="flex-1 min-w-[220px]">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-display text-3xl sm:text-4xl font-semibold text-white">{listing.name}</h1>
                {verified && (
                  <span className="flex items-center gap-1 text-xs font-semibold text-white bg-white/15 px-2.5 py-1 rounded-full shrink-0">
                    <BadgeCheck size={12} />
                    {listing.verified_until ? `Verified until ${new Date(listing.verified_until).toLocaleDateString()}` : "Verified"}
                  </span>
                )}
              </div>
              <p className="text-white/60 mt-1.5 text-sm sm:text-base">
                {subcategories.join(" · ")}
                {areas.length > 0 && ` · ${areas.join(", ")}`}
              </p>
            </div>
          </div>
        </div>

        {photos.length > 0 && (
          <div className="grid grid-cols-3 gap-2.5 mt-6">
            {photos.slice(0, 6).map((url, i) => (
              <div key={i} className={`rounded-xl overflow-hidden bg-stone-line ${i === 0 ? "col-span-3 aspect-[2/1]" : "aspect-square"}`}>
                <img src={url} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        )}

        {listing.description && (
          <div className="rounded-2xl bg-white border border-stone-line p-6 mt-6">
            <p className="text-ink/80 leading-relaxed">{listing.description}</p>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-5 mt-6">
          <div className="rounded-2xl bg-white border border-stone-line p-6">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="w-8 h-8 rounded-lg bg-teal/10 flex items-center justify-center shrink-0">
                <Building2 size={15} className="text-teal-dim" />
              </span>
              <h3 className="font-display text-lg font-semibold text-ink">Contact</h3>
            </div>
            <div className="space-y-2.5 text-sm">
              {listing.phone && (
                <p className="flex items-center gap-2.5 text-ink/80"><Phone size={15} className="text-stone shrink-0" /> {listing.phone}</p>
              )}
              <p className="flex items-center gap-2.5 text-ink/80">
                {listing.is_mobile ? <Car size={15} className="text-stone shrink-0" /> : <MapPin size={15} className="text-stone shrink-0" />}
                {listing.is_mobile ? `Comes to you — serves ${areas.join(", ")}` : areas.join(", ")}
              </p>
              {listing.hours && (
                <p className="flex items-center gap-2.5 text-ink/80"><Clock size={15} className="text-stone shrink-0" /> {listing.hours}</p>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              {listing.whatsapp && (
                <a
                  href={`https://wa.me/${listing.whatsapp}?text=${waMessage}`}
                  target="_blank"
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full border-2 border-teal text-teal-dim font-semibold hover:bg-teal/5 active:scale-95 transition-all"
                >
                  <MessageCircle size={16} /> Message on WhatsApp
                </a>
              )}
              <BookingForm businessId={listing.id} services={listing.services} />
            </div>
          </div>

          <div className="rounded-2xl bg-white border border-stone-line p-6">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="w-8 h-8 rounded-lg bg-navy/10 flex items-center justify-center shrink-0">
                <Wrench size={15} className="text-navy" />
              </span>
              <h3 className="font-display text-lg font-semibold text-ink">Services</h3>
            </div>
            {services.length > 0 ? (
              <ul className="text-sm divide-y divide-dashed divide-stone-line">
                {services.map((s, i) => (
                  <li key={i} className="flex items-baseline justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                    <span className="text-ink">{s.name}</span>
                    {s.price && <span className="text-stone shrink-0">BHD {s.price}</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-stone">No services listed yet — message on WhatsApp to ask what's available.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
