"use client";

import { useState } from "react";
import { Star, MessageCircle, Loader2 } from "lucide-react";
import StarRating from "@/components/StarRating";
import { formatRelativeTime } from "@/lib/formatRelativeTime";

export type PublicReview = {
  id: string;
  rating: number;
  body: string | null;
  author_name: string;
  owner_reply: string | null;
  owner_replied_at: string | null;
  created_at: string;
};

// Read-only on the public listing page, reply-mode on the owner dashboard —
// which mode just depends on whether onReply is passed. Deliberately not
// used for admin moderation or the customer's "Your reviews" list: both of
// those need a different row shape (business name + hide/restore; edit/
// delete + locked state) that doesn't fit either mode here.
export default function ReviewsSection({
  reviews,
  loading,
  loadError,
  onReply,
}: {
  reviews: PublicReview[];
  loading?: boolean;
  loadError?: boolean;
  onReply?: (reviewId: string, reply: string) => Promise<{ error?: string } | void>;
}) {
  const avg = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;

  return (
    <div className="rounded-2xl bg-white border border-stone-line p-6">
      <div className="flex items-center gap-2.5 mb-1">
        <span className="w-8 h-8 rounded-lg bg-teal/10 flex items-center justify-center shrink-0">
          <Star size={15} className="text-teal-dim" />
        </span>
        <h3 className="font-display text-lg font-semibold text-ink">Reviews</h3>
      </div>

      {reviews.length > 0 && (
        <div className="flex items-center gap-2 ml-[42px] mb-2">
          <StarRating value={avg} size={14} />
          <span className="text-sm text-stone">
            {avg.toFixed(1)} · {reviews.length} review{reviews.length === 1 ? "" : "s"}
          </span>
        </div>
      )}

      {loading ? (
        <div className="space-y-3 mt-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-20 bg-canvas2 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : loadError ? (
        <p className="text-sm text-red-600 text-center py-8">Couldn't load reviews — try refreshing the page.</p>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-stone text-center py-8">No reviews yet.</p>
      ) : (
        <div className="divide-y divide-stone-line mt-3">
          {reviews.map((r) => (
            <ReviewRow key={r.id} review={r} onReply={onReply} />
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewRow({
  review,
  onReply,
}: {
  review: PublicReview;
  onReply?: (reviewId: string, reply: string) => Promise<{ error?: string } | void>;
}) {
  const [replying, setReplying] = useState(false);
  const [reply, setReply] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitReply() {
    if (!onReply || !reply.trim()) return;
    setSaving(true);
    setError(null);
    const result = await onReply(review.id, reply.trim());
    setSaving(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    setReplying(false);
  }

  return (
    <div className="py-4 first:pt-0 last:pb-0">
      <div className="flex items-start gap-3">
        <span className="w-9 h-9 rounded-full bg-navy/10 text-navy font-semibold text-xs flex items-center justify-center shrink-0">
          {review.author_name?.[0]?.toUpperCase() || "?"}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-ink text-sm">{review.author_name}</span>
            <StarRating value={review.rating} size={12} />
            <span className="text-xs text-stone">{formatRelativeTime(review.created_at)}</span>
          </div>
          {review.body && <p className="text-sm text-ink/80 mt-1.5 leading-relaxed">{review.body}</p>}

          {review.owner_reply ? (
            <div className="mt-3 ml-3 pl-3 border-l-2 border-teal/30">
              <p className="text-xs font-semibold text-teal-dim">Business reply</p>
              <p className="text-sm text-ink/80 mt-0.5 leading-relaxed">{review.owner_reply}</p>
            </div>
          ) : onReply && replying ? (
            <div className="mt-2.5 space-y-2 max-w-md">
              <textarea
                autoFocus
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Write a reply…"
                maxLength={2000}
                className="input h-20 py-2"
              />
              {error && <p className="text-xs text-red-600">{error}</p>}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={saving || !reply.trim()}
                  onClick={submitReply}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-full bg-teal text-white hover:bg-teal-dim disabled:opacity-60 transition-colors"
                >
                  {saving && <Loader2 size={12} className="animate-spin" />}
                  {saving ? "Posting…" : "Post reply"}
                </button>
                <button
                  type="button"
                  onClick={() => { setReplying(false); setError(null); }}
                  className="text-xs text-stone hover:text-ink"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : onReply ? (
            <button
              type="button"
              onClick={() => setReplying(true)}
              className="flex items-center gap-1.5 text-xs font-medium text-navy hover:text-navy-light mt-2"
            >
              <MessageCircle size={12} /> Reply
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
