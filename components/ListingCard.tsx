import Link from "next/link";
import { BadgeCheck, MapPin } from "lucide-react";

export type Listing = {
  id: string;
  name: string;
  subcategory: string;
  area: string;
  description: string;
  verified: boolean;
  featured: boolean;
  tier: "free" | "standard" | "featured";
};

export default function ListingCard({ listing }: { listing: Listing }) {
  return (
    <Link
      href={`/listing/${listing.id}`}
      className={`block rounded-lg border bg-white p-5 hover:shadow-md transition-shadow ${
        listing.featured ? "border-ignition/50" : "border-black/10"
      }`}
    >
      <div className="flex items-start justify-between">
        <h3 className="font-display text-xl font-semibold text-ink">{listing.name}</h3>
        {listing.verified && <BadgeCheck size={18} className="text-ignition shrink-0" />}
      </div>
      <p className="text-xs uppercase tracking-wide text-steel mt-1">{listing.subcategory}</p>
      {listing.tier !== "free" && (
        <p className="text-sm text-steel/80 mt-2 leading-relaxed line-clamp-2">{listing.description}</p>
      )}
      <div className="flex items-center gap-1 text-xs text-titanium-dim mt-3">
        <MapPin size={13} />
        {listing.area}
      </div>
    </Link>
  );
}
