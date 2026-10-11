"use client";

import { useState } from "react";
import Image from "next/image";
import { Star, MessageCircle, Loader2, BadgeCheck, Flag, Check, ShieldCheck } from "lucide-react";
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

type BusinessIdentity = { name: string; logo_url?: string | null; verified?: boolean };

export type ReportReason = "fake" | "abusive" | "wrong_business" | "personal_info" | "other";
const REPORT_REASONS: { key: ReportReason; label: string }[] = [
  { key: "fake", label: "Not a real customer / fake" },
  { key: "abusive", label: "Abusive or offensive" },
  { key: "wrong_business", label: "Meant for a different business" },
  { key: "personal_info", label: "Shares private information" },
  { key: "other", label: "Something else" },
];

// A starting point, not a script — every template is fully editable.
const REPLY_STARTERS = [
  { label: "Thank you", text: "Thank you for taking the time to leave a review — it means a lot to our team. We look forward to seeing you again!" },
  { label: "Make it right", text: "Thank you for your feedback, and we're sorry your visit didn't meet expectations. We'd like to make this right — please contact us directly so we can help." },
  { label: "Glad you liked it", text: "We're so glad you're happy with the result! Thanks for choosing us, and see you next time." },
];

// Read-only on the public listing page; reply + report mode on the owner
// dashboard (when onReply is passed). Owner replies are shown as the
// business's OFFICIAL response — with its name, logo and verified badge —
// not as an anonymous "Business reply" line, and they're permanent once
// posted (the customer is emailed a copy). Owners can't delete reviews;
// they can report one to Luupa, which decides whether to hide it.
export default function ReviewsSection({
  reviews,
  loading,
  loadError,
  business,
  onReply,
  onReport,
}: {
  reviews: PublicReview[];
  loading?: boolean;
  loadError?: boolean;
  business?: BusinessIdentity;
  onReply?: (reviewId: string, reply: string) => Promise<{ error?: string } | void>;
  onReport?: (reviewId: string, reason: ReportReason, details: string) => Promise<{ error?: string } | void>;
}) {
  const avg = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;
  const counts = [5, 4, 3, 2, 1].map((n) => reviews.filter((r) => r.rating === n).length);
  const unanswered = reviews.filter((r) => !r.owner_reply).length;

  return (
    <div id="reviews" className="rounded-2xl bg-white border border-stone-line p-6 scroll-mt-24">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-lg bg-teal/10 flex items-center justify-center shrink-0">
            <Star size={15} className="text-teal-dim" />
          </span>
          <h3 className="font-display text-lg font-semibold text-ink">Reviews</h3>
        </div>
        {onReply && unanswered > 0 && (
          <span className="text-xs font-semibold text-teal-dim bg-teal/10 px-2.5 py-1 rounded-full">{unanswered} awaiting your response</span>
        )}
      </div>

      {reviews.length > 0 && (
        <div className="mt-4 grid sm:grid-cols-[auto_1fr] gap-4 sm:gap-6 items-center bg-canvas2 rounded-xl p-4">
          <div className="text-center sm:pr-6 sm:border-r border-stone-line">
            <p className="font-display text-4xl font-semibold text-ink leading-none">{avg.toFixed(1)}</p>
            <div className="mt-1.5 flex justify-center"><StarRating value={avg} size={14} /></div>
            <p className="text-xs text-stone mt-1">{reviews.length} review{reviews.length === 1 ? "" : "s"}</p>
          </div>
          <div className="space-y-1">
            {counts.map((c, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className="w-3 text-stone">{5 - i}</span>
                <div className="flex-1 h-1.5 rounded-full bg-stone-line overflow-hidden">
                  <div className="h-full bg-teal rounded-full transition-all duration-500" style={{ width: `${reviews.length ? (c / reviews.length) * 100 : 0}%` }} />
                </div>
                <span className="w-5 text-right text-stone">{c}</span>
              </div>
            ))}
          </div>
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
            <ReviewRow key={r.id} review={r} business={business} onReply={onReply} onReport={onReport} />
          ))}
        </div>
      )}
    </div>
  );
}

function OfficialResponse({ business, reply, repliedAt }: { business?: BusinessIdentity; reply: string; repliedAt: string | null }) {
  return (
    <div className="mt-3 rounded-xl border border-navy/10 bg-gradient-to-br from-navy/[0.04] to-transparent p-3.5">
      <div className="flex items-center gap-2">
        <span className="relative w-7 h-7 rounded-lg bg-navy text-white overflow-hidden flex items-center justify-center shrink-0 text-[11px] font-semibold">
          {business?.logo_url ? <Image src={business.logo_url} alt="" fill sizes="28px" className="object-cover" /> : (business?.name?.[0]?.toUpperCase() || "B")}
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-ink flex items-center gap-1 truncate">
            {business?.name || "The business"}
            {business?.verified && <BadgeCheck size={13} className="text-navy shrink-0" />}
          </p>
          <p className="text-[10px] uppercase tracking-wide text-navy/70 font-semibold flex items-center gap-1">
            <ShieldCheck size={10} /> Official response{repliedAt ? ` · ${formatRelativeTime(repliedAt)}` : ""}
          </p>
        </div>
      </div>
      <p className="text-sm text-ink/85 mt-2 leading-relaxed whitespace-pre-line">{reply}</p>
    </div>
  );
}

function ReviewRow({
  review,
  business,
  onReply,
  onReport,
}: {
  review: PublicReview;
  business?: BusinessIdentity;
  onReply?: (reviewId: string, reply: string) => Promise<{ error?: string } | void>;
  onReport?: (reviewId: string, reason: ReportReason, details: string) => Promise<{ error?: string } | void>;
}) {
  const [mode, setMode] = useState<"idle" | "reply" | "confirm" | "report">("idle");
  const [reply, setReply] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState("");
  const [reported, setReported] = useState(false);

  async function submitReply() {
    if (!onReply || !reply.trim()) return;
    setSaving(true);
    setError(null);
    const result = await onReply(review.id, reply.trim());
    setSaving(false);
    if (result?.error) {
      setError(result.error);
      setMode("reply");
      return;
    }
    setMode("idle");
  }

  async function submitReport() {
    if (!onReport || !reason) return;
    setSaving(true);
    setError(null);
    const result = await onReport(review.id, reason, details.trim());
    setSaving(false);
    if (result?.error) return setError(result.error);
    setReported(true);
    setMode("idle");
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
            <span className="flex items-center gap-1 text-[10px] font-semibold text-teal-dim bg-teal/10 px-1.5 py-0.5 rounded-full" title="Left after a completed booking on Luupa">
              <Check size={9} strokeWidth={3} /> Verified visit
            </span>
            <StarRating value={review.rating} size={12} />
            <span className="text-xs text-stone">{formatRelativeTime(review.created_at)}</span>
          </div>
          {review.body && <p className="text-sm text-ink/80 mt-1.5 leading-relaxed">{review.body}</p>}

          {review.owner_reply ? (
            <OfficialResponse business={business} reply={review.owner_reply} repliedAt={review.owner_replied_at} />
          ) : onReply && (mode === "reply" || mode === "confirm") ? (
            <div className="mt-3 rounded-xl border border-stone-line p-3.5 space-y-2.5 max-w-xl">
              <p className="text-[11px] uppercase tracking-wide font-semibold text-navy flex items-center gap-1">
                <ShieldCheck size={11} /> Official response from {business?.name || "your business"}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {REPLY_STARTERS.map((s) => (
                  <button key={s.label} type="button" onClick={() => setReply(s.text)} className="text-[11px] font-medium px-2.5 py-1 rounded-full border border-stone-line text-ink/70 hover:border-navy/30 hover:text-ink">
                    {s.label}
                  </button>
                ))}
              </div>
              <textarea
                autoFocus
                value={reply}
                onChange={(e) => { setReply(e.target.value); if (mode === "confirm") setMode("reply"); }}
                placeholder={`Thank ${review.author_name.split(" ")[0]}, address any concerns, and keep it professional…`}
                maxLength={2000}
                className="input h-24 py-2"
              />
              <div className="flex items-center justify-between text-[11px] text-stone">
                <span>Shown publicly on your listing · {review.author_name.split(" ")[0]} gets an email copy</span>
                <span>{reply.length}/2000</span>
              </div>
              {error && <p className="text-xs text-red-600">{error}</p>}
              {mode === "confirm" ? (
                <div className="flex flex-wrap items-center gap-2 bg-canvas2 rounded-lg px-3 py-2.5">
                  <span className="text-xs text-ink flex-1 min-w-[160px]">Official responses are permanent and can't be edited. Post it?</span>
                  <button type="button" disabled={saving} onClick={submitReply} className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-full bg-navy text-white hover:bg-navy-light disabled:opacity-60">
                    {saving && <Loader2 size={12} className="animate-spin" />} {saving ? "Posting…" : "Yes, post"}
                  </button>
                  <button type="button" onClick={() => setMode("reply")} className="text-xs text-stone hover:text-ink">Keep editing</button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={!reply.trim()}
                    onClick={() => setMode("confirm")}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-full bg-navy text-white hover:bg-navy-light disabled:opacity-50 transition-colors"
                  >
                    Post official response
                  </button>
                  <button type="button" onClick={() => { setMode("idle"); setError(null); }} className="text-xs text-stone hover:text-ink">Cancel</button>
                </div>
              )}
            </div>
          ) : null}

          {onReport && mode === "report" ? (
            <ReportForm
              name={`report-${review.id}`}
              reason={reason}
              setReason={setReason}
              details={details}
              setDetails={setDetails}
              error={error}
              saving={saving}
              onSubmit={submitReport}
              onCancel={() => { setMode("idle"); setError(null); }}
            />
          ) : onReply && mode === "idle" ? (
            <div className="flex items-center gap-4 mt-2">
              {!review.owner_reply && (
                <button type="button" onClick={() => setMode("reply")} className="flex items-center gap-1.5 text-xs font-semibold text-navy hover:text-navy-light">
                  <MessageCircle size={12} /> Respond officially
                </button>
              )}
              {onReport && (reported ? (
                <span className="flex items-center gap-1 text-xs text-stone"><Check size={12} /> Reported to Luupa</span>
              ) : (
                <button type="button" onClick={() => setMode("report")} className="flex items-center gap-1 text-xs text-stone hover:text-ink">
                  <Flag size={11} /> Report
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ReportForm({
  name,
  reason,
  setReason,
  details,
  setDetails,
  error,
  saving,
  onSubmit,
  onCancel,
}: {
  name: string;
  reason: ReportReason | null;
  setReason: (r: ReportReason) => void;
  details: string;
  setDetails: (d: string) => void;
  error: string | null;
  saving: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="mt-3 rounded-xl border border-stone-line p-3.5 space-y-2 max-w-xl">
      <p className="text-xs font-semibold text-ink">Report this review to Luupa</p>
      <p className="text-[11px] text-stone">We look at every report. Reviews aren't removed just for being negative — fake or abusive ones are.</p>
      <div className="space-y-1">
        {REPORT_REASONS.map((r) => (
          <label key={r.key} className="flex items-center gap-2 text-sm text-ink cursor-pointer">
            <input type="radio" name={name} checked={reason === r.key} onChange={() => setReason(r.key)} className="accent-navy" />
            {r.label}
          </label>
        ))}
      </div>
      <input value={details} onChange={(e) => setDetails(e.target.value)} maxLength={400} placeholder="Anything we should know? (optional)" className="input text-sm" />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex items-center gap-3">
        <button type="button" disabled={!reason || saving} onClick={onSubmit} className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-full bg-ink text-white disabled:opacity-50">
          {saving && <Loader2 size={12} className="animate-spin" />} Send report
        </button>
        <button type="button" onClick={onCancel} className="text-xs text-stone hover:text-ink">Cancel</button>
      </div>
    </div>
  );
}
