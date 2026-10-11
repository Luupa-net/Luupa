import { isEffectivelyVerified } from "@/lib/verification";

const TIER_RANK: Record<string, number> = { featured: 2, standard: 1, free: 0 };

type Rankable = {
  verified?: boolean;
  verified_until?: string | null;
  tier?: string | null;
  rating_avg?: number | string | null;
  review_count?: number | null;
};

// "Recommended" order for the homepage and /browse.
//
// BUG FIX: this used to be `.order("tier", { ascending: false })` in SQL.
// tier is TEXT, so that sorted alphabetically — standard > free > featured —
// putting the paid "featured" businesses LAST. It also ranked expired
// verifications as verified. Ranked in code now: currently-verified first,
// then featured > standard > free, then better-reviewed. Stable for ties.
export function rankListings<T extends Rankable>(listings: T[]): T[] {
  return listings
    .map((l, i) => ({ l, i }))
    .sort((a, b) => {
      const va = isEffectivelyVerified(a.l as any) ? 1 : 0;
      const vb = isEffectivelyVerified(b.l as any) ? 1 : 0;
      if (vb !== va) return vb - va;
      const ta = TIER_RANK[a.l.tier || "free"] ?? 0;
      const tb = TIER_RANK[b.l.tier || "free"] ?? 0;
      if (tb !== ta) return tb - ta;
      const ra = Number(a.l.rating_avg) || 0;
      const rb = Number(b.l.rating_avg) || 0;
      if (rb !== ra) return rb - ra;
      const ca = a.l.review_count ?? 0;
      const cb = b.l.review_count ?? 0;
      if (cb !== ca) return cb - ca;
      return a.i - b.i;
    })
    .map(({ l }) => l);
}
