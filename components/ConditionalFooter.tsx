"use client";

import { usePathname } from "next/navigation";
import Footer from "@/components/Footer";

// The marketing footer (category links, "List your business", legal pages)
// belongs on public/content pages — it doesn't belong at the bottom of an
// authenticated app screen a staff member or owner scrolls through dozens of
// times a day. Those pages already have their own internal navigation (the
// sidebar/tabs), so the footer there was just dead space to scroll past.
const NO_FOOTER_PREFIXES = [
  "/business/dashboard",
  "/business/bookings",
  "/business/customers",
  "/business/staff",
  "/business/verify",
  "/account/profile",
  "/staff/login",
  "/admin",
];

export default function ConditionalFooter() {
  const pathname = usePathname();
  const hideFooter = NO_FOOTER_PREFIXES.some((prefix) => pathname?.startsWith(prefix));
  if (hideFooter) return null;
  return <Footer />;
}
