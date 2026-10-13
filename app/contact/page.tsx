import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircle, Clock, HelpCircle } from "lucide-react";
import ContactForm from "@/components/ContactForm";
import { CONTACT_TOPICS, supportWhatsAppHref, type ContactTopicKey } from "@/lib/support";

export const metadata: Metadata = {
  title: "Contact us — Luupa",
  description: "Questions about a booking, listing your business or getting verified? Send Luupa a message.",
};

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ topic?: string }> }) {
  const { topic } = await searchParams;
  const initialTopic = CONTACT_TOPICS.find((t) => t.key === topic)?.key as ContactTopicKey | undefined;
  const whatsappHref = supportWhatsAppHref("Hi Luupa, ");

  return (
    <div className="max-w-5xl mx-auto px-5 py-14 sm:py-20 grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-10 lg:gap-14">
      <div>
        <span className="inline-block text-xs font-bodyAlt uppercase tracking-wide font-bold text-teal-dim bg-teal/10 px-3 py-1.5 rounded-full mb-4">
          Contact us
        </span>
        <h1 className="font-displayAlt text-3xl sm:text-4xl font-bold text-ink leading-tight">How can we help?</h1>
        <p className="text-stone font-bodyAlt mt-3 leading-relaxed">
          Questions about a booking, listing your business or getting verified — send us a message and a real
          person will get back to you.
        </p>

        <div className="mt-8 space-y-3">
          {whatsappHref && (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3.5 rounded-2xl bg-navy text-white px-5 py-4 hover:bg-navy-light transition-colors"
            >
              <span className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                <MessageCircle size={18} />
              </span>
              <span>
                <span className="block font-bodyAlt font-bold">Message us on WhatsApp</span>
                <span className="block text-sm text-white/65">Usually the quickest way to reach us</span>
              </span>
            </a>
          )}
          <div className="flex items-center gap-3.5 rounded-2xl bg-canvas2 px-5 py-4">
            <span className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0">
              <Clock size={18} className="text-navy" />
            </span>
            <span>
              <span className="block font-bodyAlt font-bold text-ink">We reply within a day</span>
              <span className="block text-sm text-stone">Usually the same day, often on WhatsApp</span>
            </span>
          </div>
          <Link href="/help" className="flex items-center gap-3.5 rounded-2xl bg-canvas2 px-5 py-4 hover:bg-stone-line/60 transition-colors">
            <span className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0">
              <HelpCircle size={18} className="text-navy" />
            </span>
            <span>
              <span className="block font-bodyAlt font-bold text-ink">Read the FAQ</span>
              <span className="block text-sm text-stone">Quick answers about listing, verification and pricing</span>
            </span>
          </Link>
        </div>
      </div>

      <ContactForm initialTopic={initialTopic} />
    </div>
  );
}
