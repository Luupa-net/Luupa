import Link from "next/link";
import { BadgeCheck, MapPin, Car } from "lucide-react";
import { isEffectivelyVerified } from "@/lib/verification";

export type Listing = {
  id: string;
  name: string;
  subcategories: string[];
  areas: string[];
  description: string;
  verified: boolean;
  verified_until?: string | null;
  featured: boolean;
  tier: "free" | "standard" | "featured";
  photos?: string[];
  is_mobile?: boolean;
};

export default function ListingCard({ listing }: { listing: Listing }) {
  const thumbnail = listing.photos?.[0];
  const verified = isEffectivelyVerified(listing);

  return (
    <Link
      href={`/listing/${listing.id}`}
      className={`block rounded-xl border-2 bg-white overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] ${
        verified ? "border-navy/50 shadow-md shadow-navy/5" : listing.featured ? "border-teal/40 shadow-md shadow-teal/5" : "border-stone-line"
      }`}
    >
      {thumbnail && (
        <div className="aspect-[16/9] bg-canvas2">
          <img src={thumbnail} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      <div className="p-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-xl font-semibold text-ink">{listing.name}</h3>
          <div className="shrink-0 flex flex-col items-end gap-1">
            {verified && (
              <span className="flex items-center gap-1 text-xs font-semibold text-white bg-navy px-2.5 py-1 rounded-full">
                <BadgeCheck size={13} /> Verified
              </span>
            )}
            {listing.is_mobile && (
              <span className="flex items-center gap-1 text-xs font-semibold text-teal-dim bg-teal/10 px-2.5 py-1 rounded-full">
                <Car size={13} /> Mobile
              </span>
            )}
          </div>
        </div>
        <p className="text-xs uppercase tracking-wide text-stone mt-1.5">{(listing.subcategories || []).join(" · ")}</p>
        {listing.tier !== "free" && (
          <p className="text-sm text-ink/70 mt-2 leading-relaxed line-clamp-2">{listing.description}</p>
        )}
        <div className="flex items-center gap-1 text-xs text-stone mt-3">
          <MapPin size={13} />
          {listing.is_mobile ? `Comes to you — ${(listing.areas || []).join(", ")}` : (listing.areas || []).join(", ")}
        </div>
      </div>
    </Link>
  );
}
