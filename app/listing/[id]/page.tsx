import { supabase } from "@/lib/supabase";
import { isEffectivelyVerified } from "@/lib/verification";
import { BadgeCheck, Phone, MapPin, Clock, Car } from "lucide-react";
import { notFound } from "next/navigation";
import RequestQuoteForm from "@/components/RequestQuoteForm";
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
  const { data: listing } = await supabase
    .from("businesses_public")
    .select("id, name, logo_url, subcategories, areas, description, phone, whatsapp, hours, services, photos, is_mobile, verified, verified_until")
    .eq("id", id)
    .single();

  if (!listing) return notFound();

  // Fire-and-forget view tracking — doesn't block the page render, doesn't matter
  // if it occasionally fails (e.g. offline admin preview)
  supabase.rpc("increment_view_count", { business_id: listing.id }).then(() => {});

  const verified = isEffectivelyVerified(listing);
  const subcategories: string[] = listing.subcategories || [];
  const areas: string[] = listing.areas || [];
  const waMessage = encodeURIComponent(`Hi ${listing.name}, I found you on Luupa and I'd like to ask about ${subcategories[0] || "your services"}.`);
  const photos: string[] = listing.photos || [];

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-8">
          {photos.slice(0, 6).map((url, i) => (
            <div key={i} className={`rounded-lg overflow-hidden bg-canvas2 ${i === 0 ? "col-span-3 aspect-[2/1]" : "aspect-square"}`}>
              <img src={url} alt="" className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      )}

      <div className="flex items-start gap-4">
        {listing.logo_url && (
          <div className="w-14 h-14 rounded-full overflow-hidden bg-canvas2 shrink-0 border border-stone-line">
            <img src={listing.logo_url} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        <div>
          <h1 className="font-display text-4xl font-semibold text-ink flex items-center gap-2">
            {listing.name}
            {verified && <BadgeCheck className="text-navy" size={22} />}
          </h1>
          <p className="text-stone mt-1">{subcategories.join(" · ")} · {areas.join(", ")}</p>
        </div>
      </div>

      <p className="mt-6 text-ink/80 leading-relaxed max-w-2xl">{listing.description}</p>

      <div className="grid sm:grid-cols-2 gap-8 mt-10">
        <div>
          <h3 className="font-semibold text-ink mb-3">Contact</h3>
          <div className="space-y-2 text-sm">
            {listing.phone && (
              <p className="flex items-center gap-2 text-stone"><Phone size={15}/> {listing.phone}</p>
            )}
            <p className="flex items-center gap-2 text-stone">
              {listing.is_mobile ? <Car size={15}/> : <MapPin size={15}/>}
              {listing.is_mobile ? `Comes to you — serves ${areas.join(", ")}` : areas.join(", ")}
            </p>
            {listing.hours && (
              <p className="flex items-center gap-2 text-stone"><Clock size={15}/> {listing.hours}</p>
            )}
          </div>
          {listing.whatsapp && (
            <a
              href={`https://wa.me/${listing.whatsapp}?text=${waMessage}`}
              target="_blank"
              className="inline-block mt-5 px-6 py-3 rounded-full bg-terra text-white font-semibold hover:bg-terra-dim active:scale-95 transition-colors"
            >
              Message on WhatsApp
            </a>
          )}
          <RequestQuoteForm businessId={listing.id} />
          <BookingForm businessId={listing.id} services={listing.services} />
        </div>

        {listing.services && listing.services.length > 0 && (
          <div>
            <h3 className="font-semibold text-ink mb-3">Services</h3>
            <ul className="text-sm space-y-2">
              {(listing.services as { name: string; price?: string }[]).map((s, i) => (
                <li key={i} className="flex items-baseline justify-between gap-3 border-b border-dashed border-stone-line pb-2">
                  <span className="text-ink">{s.name}</span>
                  {s.price && <span className="text-stone shrink-0">BHD {s.price}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
