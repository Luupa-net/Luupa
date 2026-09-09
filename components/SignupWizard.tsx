"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { SUBCATEGORIES, AREAS, Service } from "@/lib/taxonomy";
import { isValidBahrainPhone, isValidWhatsAppNumber } from "@/lib/validation";
import ServicesEditor from "@/components/ServicesEditor";
import PasswordChecklist, { passwordIsValid } from "@/components/PasswordChecklist";
import { Check, ChevronLeft } from "lucide-react";

const STEPS = ["Account", "Details", "Services", "Verification", "Review"];

type FormState = {
  email: string;
  password: string;
  name: string;
  subcategories: string[];
  areas: string[];
  phone: string;
  whatsapp: string;
  hours: string;
  description: string;
  services: Service[];
  crNumber: string;
  socialLink: string;
  applicantNote: string;
};

const initialState: FormState = {
  email: "", password: "", name: "", subcategories: [], areas: [],
  phone: "", whatsapp: "", hours: "", description: "", services: [],
  crNumber: "", socialLink: "", applicantNote: "",
};

export default function SignupWizard() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(initialState);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const router = useRouter();

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggle(key: "subcategories" | "areas", value: string) {
    const current = form[key];
    update(key, current.includes(value) ? current.filter((v) => v !== value) : [...current, value]);
  }

  function validateStep(): string | null {
    if (step === 0) {
      if (!form.email || !form.password) return "Email and password are required.";
      if (!passwordIsValid(form.password)) return "Please meet all password requirements.";
    }
    if (step === 1) {
      if (!form.name || !form.phone || !form.whatsapp) return "Business name, phone, and WhatsApp are required.";
      if (!isValidBahrainPhone(form.phone)) return "Phone should be an 8-digit Bahrain number.";
      if (!isValidWhatsAppNumber(form.whatsapp)) return "WhatsApp number looks incomplete — include the country code.";
      if (form.subcategories.length === 0) return "Select at least one service you offer.";
      if (form.areas.length === 0) return "Select at least one area you serve.";
    }
    return null;
  }

  function next() {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError(null);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function back() {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  async function handleFinalSubmit() {
    setLoading(true);
    setError(null);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    });
    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      const { error: insertError } = await supabase.from("businesses").insert({
        owner_id: data.user.id,
        name: form.name,
        subcategories: form.subcategories,
        areas: form.areas,
        phone: form.phone,
        whatsapp: form.whatsapp,
        hours: form.hours,
        description: form.description,
        services: form.services,
        cr_number: form.crNumber || null,
        social_link: form.socialLink || null,
        applicant_note: form.applicantNote || null,
        status: "pending",
        tier: "free",
      });
      if (insertError) {
        setError("Account created, but we couldn't save your business details: " + insertError.message);
        setLoading(false);
        return;
      }
    }

    setLoading(false);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="bg-canvas2 rounded-2xl p-10 text-center">
        <div className="w-14 h-14 rounded-full bg-navy/10 flex items-center justify-center mx-auto mb-5">
          <Check size={26} className="text-navy" />
        </div>
        <h2 className="font-display text-2xl font-semibold text-ink">Submitted for review</h2>
        <p className="text-stone mt-2 max-w-sm mx-auto text-sm leading-relaxed">
          Thanks — your application is in. We manually review every new listing before it goes live,
          usually within a day or two. You can check your status anytime from your dashboard.
        </p>
        <button
          onClick={() => router.push("/business/dashboard")}
          className="mt-6 px-6 py-3 rounded-lg bg-terra text-white font-medium hover:bg-terra-dim transition-colors"
        >
          Go to dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="bg-canvas2 rounded-2xl p-6 sm:p-8">
      {/* Step indicator */}
      <div className="flex items-center gap-1.5 mb-7">
        {STEPS.map((label, i) => (
          <div key={label} className="flex-1">
            <div className={`h-1 rounded-full ${i <= step ? "bg-terra" : "bg-stone-line"}`} />
          </div>
        ))}
      </div>
      <p className="text-xs uppercase tracking-wide text-stone font-medium mb-1">
        Step {step + 1} of {STEPS.length}
      </p>
      <h2 className="font-display text-2xl font-semibold text-ink mb-6">{STEPS[step]}</h2>

      {step === 0 && (
        <div className="space-y-4">
          <Field label="Email">
            <input type="email" className="input" value={form.email} onChange={(e) => update("email", e.target.value)} />
          </Field>
          <Field label="Password">
            <input type="password" className="input" value={form.password} onChange={(e) => update("password", e.target.value)} />
            <PasswordChecklist password={form.password} />
          </Field>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-5">
          <Field label="Business name">
            <input className="input" value={form.name} onChange={(e) => update("name", e.target.value)} />
          </Field>

          <div>
            <span className="text-sm font-medium text-ink">Services you offer</span>
            <span className="block text-xs text-stone mt-0.5 mb-2">Select all that apply</span>
            <div className="flex flex-wrap gap-2">
              {SUBCATEGORIES.map((s) => (
                <Chip key={s} label={s} active={form.subcategories.includes(s)} onClick={() => toggle("subcategories", s)} />
              ))}
            </div>
          </div>

          <div>
            <span className="text-sm font-medium text-ink">Areas you serve</span>
            <span className="block text-xs text-stone mt-0.5 mb-2">Select all that apply</span>
            <div className="flex flex-wrap gap-2">
              {AREAS.map((a) => (
                <Chip key={a} label={a} active={form.areas.includes(a)} onClick={() => toggle("areas", a)} />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone">
              <input className="input" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
            </Field>
            <Field label="WhatsApp" hint="With country code, no +">
              <input className="input" value={form.whatsapp} onChange={(e) => update("whatsapp", e.target.value)} />
            </Field>
          </div>
          <Field label="Hours" hint="e.g. Sat–Thu 9am–7pm">
            <input className="input" value={form.hours} onChange={(e) => update("hours", e.target.value)} />
          </Field>
          <Field label="Description" hint="Shown to customers, used for search matching">
            <textarea className="input h-24 py-2" value={form.description} onChange={(e) => update("description", e.target.value)} />
          </Field>
        </div>
      )}

      {step === 2 && (
        <div>
          <p className="text-sm text-stone -mt-1 mb-3">
            Add each service separately with its own price — customers can scan a long list much
            faster this way than a paragraph of text.
          </p>
          <ServicesEditor services={form.services} onChange={(services) => update("services", services)} />
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <p className="text-sm text-stone -mt-2 mb-2">
            This helps us verify you're a real business — none of it blocks approval on its own.
          </p>
          <Field label="CR / trade license number" hint="Don't have one yet? Leave blank">
            <input className="input" value={form.crNumber} onChange={(e) => update("crNumber", e.target.value)} />
          </Field>
          <Field label="Instagram or website" hint="Optional, but helps us verify you faster">
            <input className="input" value={form.socialLink} onChange={(e) => update("socialLink", e.target.value)} />
          </Field>
          <Field label="Anything else we should know?">
            <textarea className="input h-20 py-2" value={form.applicantNote} onChange={(e) => update("applicantNote", e.target.value)} />
          </Field>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4 text-sm">
          <ReviewRow label="Email" value={form.email} onEdit={() => setStep(0)} />
          <ReviewRow label="Business name" value={form.name} onEdit={() => setStep(1)} />
          <ReviewRow label="Services" value={form.subcategories.join(", ") || "None selected"} onEdit={() => setStep(1)} />
          <ReviewRow label="Areas" value={form.areas.join(", ") || "None selected"} onEdit={() => setStep(1)} />
          <ReviewRow label="Phone / WhatsApp" value={`${form.phone} / ${form.whatsapp}`} onEdit={() => setStep(1)} />
          <ReviewRow
            label="Services listed"
            value={form.services.length ? form.services.map((s) => s.price ? `${s.name} (BHD ${s.price})` : s.name).join(", ") : "None"}
            onEdit={() => setStep(2)}
          />
          <ReviewRow label="CR number" value={form.crNumber || "Not provided"} onEdit={() => setStep(3)} />
          <ReviewRow label="Social / website" value={form.socialLink || "Not provided"} onEdit={() => setStep(3)} />
          <p className="text-stone text-xs pt-2">
            By submitting, your listing is sent for manual review. It won't be visible to customers until approved.
          </p>
        </div>
      )}

      {error && <p className="text-sm text-red-600 mt-4">{error}</p>}

      <div className="flex items-center justify-between mt-8">
        {step > 0 ? (
          <button onClick={back} className="flex items-center gap-1 text-sm text-stone font-medium">
            <ChevronLeft size={16} /> Back
          </button>
        ) : <span />}

        {step < STEPS.length - 1 ? (
          <button
            onClick={next}
            className="px-6 py-3 rounded-lg bg-terra text-white font-medium hover:bg-terra-dim active:scale-[0.98] transition-all"
          >
            Continue
          </button>
        ) : (
          <button
            onClick={handleFinalSubmit}
            disabled={loading}
            className="px-6 py-3 rounded-lg bg-terra text-white font-medium hover:bg-terra-dim active:scale-[0.98] transition-all disabled:opacity-60"
          >
            {loading ? "Submitting…" : "Submit for review"}
          </button>
        )}
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-ink">{label}</span>
      {hint && <span className="block text-xs text-stone mt-0.5">{hint}</span>}
      <div className="mt-1">{children}</div>
    </label>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-sm px-3.5 py-2 rounded-full border-2 transition-colors ${
        active ? "bg-navy border-navy text-white font-medium" : "bg-white border-stone-line text-ink/70"
      }`}
    >
      {label}
    </button>
  );
}

function ReviewRow({ label, value, onEdit }: { label: string; value: string; onEdit: () => void }) {
  return (
    <div className="flex items-start justify-between bg-white rounded-lg px-4 py-3 gap-3">
      <div>
        <p className="text-xs text-stone">{label}</p>
        <p className="text-ink font-medium mt-0.5">{value}</p>
      </div>
      <button onClick={onEdit} className="text-terra-dim text-xs font-medium shrink-0">Edit</button>
    </div>
  );
}
