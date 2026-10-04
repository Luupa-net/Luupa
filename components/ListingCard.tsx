import Link from "next/link";
import Image from "next/image";
import { BadgeCheck, MapPin, Car, Star } from "lucide-react";
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
  // Optional: app/page.tsx's narrower select() doesn't fetch these, so its
  // cards simply show no rating badge rather than needing a second query.
  rating_avg?: number | null;
  review_count?: number;
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
        <div className="relative aspect-[16/9] bg-canvas2">
          <Image src={thumbnail} alt="" fill sizes="(min-width: 640px) 45vw, 90vw" className="object-cover" />
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
        {(listing.review_count ?? 0) > 0 && (
          <div className="flex items-center gap-1 text-sm text-ink/80 mt-1.5">
            <Star size={13} className="text-teal fill-current" />
            <span className="font-medium">{listing.rating_avg}</span>
            <span className="text-stone">({listing.review_count})</span>
          </div>
        )}
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
