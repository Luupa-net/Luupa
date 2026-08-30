import { supabase } from "@/lib/supabase";
import { BadgeCheck, Phone, MapPin, Clock } from "lucide-react";
import { notFound } from "next/navigation";

export default async function ListingPage({ params }: { params: { id: string } }) {
  const { data: listing } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!listing) return notFound();

  // Fire-and-forget view tracking — doesn't block the page render, doesn't matter
  // if it occasionally fails (e.g. offline admin preview)
  supabase.rpc("increment_view_count", { business_id: listing.id }).then(() => {});

  const waMessage = encodeURIComponent(`Hi ${listing.name}, I found you on Luupa and I'd like to ask about ${listing.subcategory}.`);
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

      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-4xl font-semibold text-ink flex items-center gap-2">
            {listing.name}
            {listing.verified && <BadgeCheck className="text-terra" size={22} />}
          </h1>
          <p className="text-stone mt-1 capitalize">{listing.subcategory.replace("-", " ")} · {listing.area}</p>
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
            <p className="flex items-center gap-2 text-stone"><MapPin size={15}/> {listing.area}</p>
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
        </div>

        {listing.services && (
          <div>
            <h3 className="font-semibold text-ink mb-3">Services</h3>
            <ul className="text-sm text-stone space-y-1">
              {(listing.services as string[]).map((s, i) => (
                <li key={i}>• {s}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
