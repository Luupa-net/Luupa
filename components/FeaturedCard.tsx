import Link from "next/link";
import { BadgeCheck, MapPin, Car } from "lucide-react";
import { isEffectivelyVerified } from "@/lib/verification";
import type { Listing } from "@/components/ListingCard";

export default function FeaturedCard({ listing }: { listing: Listing }) {
  const verified = isEffectivelyVerified(listing);
  const thumbnail = listing.photos?.[0];

  return (
    <Link
      href={`/listing/${listing.id}`}
      className={`block rounded-lg border bg-white overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:scale-[1.03] hover:shadow-lg active:scale-[0.98] ${
        verified ? "border-navy/40" : "border-stone-line"
      }`}
    >
      <div className="aspect-square bg-canvas2 relative">
        {thumbnail ? (
          <img src={thumbnail} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-stone-dim font-display text-2xl">
            {listing.name?.[0]?.toUpperCase()}
          </div>
        )}
        <div className="absolute top-1.5 right-1.5 flex flex-col gap-1 items-end">
          {verified && (
            <span className="w-5 h-5 rounded-full bg-navy flex items-center justify-center">
              <BadgeCheck size={11} className="text-white" />
            </span>
          )}
          {listing.is_mobile && (
            <span className="w-5 h-5 rounded-full bg-teal flex items-center justify-center">
              <Car size={11} className="text-white" />
            </span>
          )}
        </div>
      </div>
      <div className="p-2.5">
        <p className="font-medium text-ink text-sm truncate">{listing.name}</p>
        <p className="flex items-center gap-1 text-xs text-stone mt-0.5 truncate">
          <MapPin size={10} className="shrink-0" />
          {(listing.areas || [])[0]}
        </p>
      </div>
    </Link>
  );
}
