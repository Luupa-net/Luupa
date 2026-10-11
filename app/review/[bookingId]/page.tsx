"use client";

import { Suspense, use, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { currentPath, loginHref, rememberReturnTo } from "@/lib/authReturn";
import GoogleAuthButton from "@/components/GoogleAuthButton";
import { Star, Loader2, Check, AlertCircle, ArrowRight } from "lucide-react";

// Landing page for the review-request email. The email's stars link here
// with ?rating=N already chosen, so the customer's tap in their inbox IS
// the rating — this page just lets them add a few words and post it.
// Signing in (if needed) returns straight back here, rating intact.

type Info = {
  businessId: string;
  businessName: string;
  businessLogo: string | null;
  service: string | null;
  date: string | null;
  completed: boolean;
  existing: { id: string; rating: number; body: string | null; owner_reply: string | null } | null;
};

const QUICK_TAGS = ["Great quality", "On time", "Friendly staff", "Good value", "Spotless finish", "Would come back"];
const RATING_WORDS = ["", "Poor", "Fair", "Good", "Great", "Excellent"];

function ReviewContent({ bookingId }: { bookingId: string }) {
  const searchParams = useSearchParams();
  const token = searchParams.get("t") || "";
  const initialRating = Math.min(5, Math.max(0, Number(searchParams.get("rating")) || 0));

  const [state, setState] = useState<"loading" | "signin" | "ready" | "error" | "done">("loading");
  const [info, setInfo] = useState<Info | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rating, setRating] = useState(initialRating);
  const [hover, setHover] = useState<number | null>(null);
  const [body, setBody] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        rememberReturnTo(currentPath());
        if (!cancelled) setState("signin");
        return;
      }
      const res = await fetch(`/api/reviews/submit?bookingId=${encodeURIComponent(bookingId)}&t=${encodeURIComponent(token)}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json().catch(() => null);
      if (cancelled) return;
      if (!res.ok) {
        setError(data?.error || "This review link isn't valid.");
        setState("error");
        return;
      }
      setInfo(data);
      setState(data.existing ? "done" : "ready");
    })();
    return () => { cancelled = true; };
  }, [bookingId, token]);

  function toggleTag(tag: string) {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  async function submit() {
    if (rating < 1) return setError("Tap a star to rate your visit.");
    setSaving(true);
    setError(null);
    const text = [tags.length ? `${tags.join(" · ")}.` : "", body.trim()].filter(Boolean).join(" ");
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/reviews/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
      body: JSON.stringify({ bookingId, t: token, rating, body: text }),
    });
    const data = await res.json().catch(() => null);
    setSaving(false);
    if (!res.ok) return setError(data?.error || "Couldn't post your review — try again.");
    setInfo((prev) => (prev ? { ...prev, existing: { id: data.review.id, rating, body: text, owner_reply: null } } : prev));
    setState("done");
  }

  if (state === "loading") {
    return (
      <div className="py-28 flex justify-center">
        <Loader2 size={26} className="animate-spin text-stone" />
      </div>
    );
  }

  if (state === "signin") {
    const here = currentPath();
    return (
      <Shell>
        <p className="text-[11px] uppercase tracking-wider font-bold text-teal-dim">Leave a review</p>
        <h1 className="font-display text-3xl font-semibold text-ink mt-1">How was your visit?</h1>
        {initialRating > 0 && (
          <div className="flex gap-1 mt-4" aria-label={`${initialRating} stars selected`}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Star key={n} size={30} className={n <= initialRating ? "text-teal" : "text-stone-line"} fill="currentColor" stroke="none" />
            ))}
          </div>
        )}
        <p className="text-sm text-stone mt-4">
          Sign in to post your review — it keeps reviews on Luupa real. You'll come straight back here{initialRating ? " with your rating saved" : ""}.
        </p>
        <div className="mt-6 space-y-2.5">
          <GoogleAuthButton next={here} label="Continue with Google" />
          <Link href={loginHref(here)} className="block w-full text-center h-12 leading-[48px] rounded-full bg-teal text-white font-semibold hover:bg-teal-dim transition-colors">
            Log in with email
          </Link>
          <Link href={loginHref(here, "signup")} className="block w-full text-center text-sm text-stone hover:text-ink pt-1">
            New to Luupa? <span className="text-teal-dim font-medium">Create a free account</span>
          </Link>
        </div>
      </Shell>
    );
  }

  if (state === "error" || !info) {
    return (
      <Shell>
        <AlertCircle size={28} className="text-red-600" />
        <h1 className="font-display text-2xl font-semibold text-ink mt-3">We couldn't open this review</h1>
        <p className="text-sm text-stone mt-2">{error}</p>
        <Link href="/account/profile?tab=bookings" className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-dim mt-6">
          Go to my bookings <ArrowRight size={14} />
        </Link>
      </Shell>
    );
  }

  const header = (
    <div className="flex items-center gap-3">
      <span className="relative w-12 h-12 rounded-xl bg-navy/10 overflow-hidden flex items-center justify-center shrink-0">
        {info.businessLogo ? (
          <Image src={info.businessLogo} alt="" fill sizes="48px" className="object-cover" />
        ) : (
          <span className="font-display text-lg font-semibold text-navy">{info.businessName[0]?.toUpperCase()}</span>
        )}
      </span>
      <div className="min-w-0">
        <p className="font-semibold text-ink truncate">{info.businessName}</p>
        <p className="text-xs text-stone truncate">
          {[info.service, info.date ? new Date(`${info.date}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : null].filter(Boolean).join(" · ") || "Your visit"}
        </p>
      </div>
    </div>
  );

  if (state === "done" && info.existing) {
    return (
      <Shell>
        {header}
        <div className="text-center py-8">
          <span className="mx-auto w-16 h-16 rounded-full bg-teal/10 flex items-center justify-center pop-in">
            <Check size={30} strokeWidth={3} className="text-teal-dim" />
          </span>
          <h1 className="font-display text-3xl font-semibold text-ink mt-5">Thank you!</h1>
          <p className="text-sm text-stone mt-2 max-w-xs mx-auto">Your review is live on {info.businessName}'s page and helps other drivers in Bahrain choose with confidence.</p>
          <div className="flex justify-center gap-1 mt-4">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star key={n} size={22} className={n <= info.existing!.rating ? "text-teal" : "text-stone-line"} fill="currentColor" stroke="none" />
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <Link href={`/listing/${info.businessId}`} className="text-center text-sm font-semibold py-3 rounded-full bg-navy text-white hover:bg-navy-light">See it live</Link>
          <Link href="/account/profile?tab=bookings" className="text-center text-sm font-semibold py-3 rounded-full border border-stone-line text-ink hover:bg-canvas2">My bookings</Link>
        </div>
      </Shell>
    );
  }

  const display = hover ?? rating;
  return (
    <Shell>
      {header}
      {!info.completed ? (
        <p className="text-sm text-stone mt-6 bg-canvas2 rounded-xl px-4 py-3">You can review this visit once {info.businessName} marks it completed.</p>
      ) : (
        <>
          <h1 className="font-display text-3xl font-semibold text-ink mt-6">How was it?</h1>
          <div className="mt-4 flex items-center gap-1.5" onMouseLeave={() => setHover(null)}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                onMouseEnter={() => setHover(n)}
                aria-label={`Rate ${n} star${n === 1 ? "" : "s"}`}
                className="p-0.5 transition-transform hover:scale-110 active:scale-95"
              >
                <Star size={40} className={`transition-colors ${n <= display ? "text-teal" : "text-stone-line"}`} fill="currentColor" stroke="none" />
              </button>
            ))}
            <span className="ml-2 text-sm font-semibold text-ink w-20">{RATING_WORDS[display] || ""}</span>
          </div>

          <p className="text-xs font-semibold text-stone uppercase tracking-wide mt-6 mb-2">What stood out? <span className="normal-case font-normal">(optional)</span></p>
          <div className="flex flex-wrap gap-2">
            {QUICK_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                aria-pressed={tags.includes(tag)}
                className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
                  tags.includes(tag) ? "bg-navy border-navy text-white" : "border-stone-line text-ink/70 hover:border-navy/30"
                }`}
              >
                {tags.includes(tag) && <Check size={11} className="inline -mt-0.5 mr-1" />}
                {tag}
              </button>
            ))}
          </div>

          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={1800}
            placeholder="Tell others about your experience…"
            className="input h-28 py-3 mt-4"
          />
          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
          <button
            type="button"
            onClick={submit}
            disabled={saving || rating < 1}
            className="mt-4 w-full h-13 py-3.5 rounded-full bg-teal text-white font-semibold flex items-center justify-center gap-2 hover:bg-teal-dim active:scale-[0.99] transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 size={17} className="animate-spin" /> : <Star size={16} fill="currentColor" stroke="none" />}
            {saving ? "Posting…" : "Post review"}
          </button>
          <p className="text-[11px] text-stone text-center mt-3">Shown publicly with your first name and last initial.</p>
        </>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-canvas2 min-h-[calc(100vh-64px)] px-5 py-10 sm:py-16">
      <div className="max-w-md mx-auto bg-white rounded-3xl border border-stone-line shadow-sm p-6 sm:p-8 fade-up">{children}</div>
    </div>
  );
}

export default function ReviewPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = use(params);
  return (
    <Suspense>
      <ReviewContent bookingId={bookingId} />
    </Suspense>
  );
}
