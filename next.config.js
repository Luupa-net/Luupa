/** @type {import('next').NextConfig} */

// Baseline security headers for every response. Deliberately no full
// script-src CSP (Next's inline runtime scripts would need nonces) — but
// frame-ancestors alone stops clickjacking (another site framing the
// dashboard or the admin page and tricking a click).
const securityHeaders = [
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Signed receipt/review links carry their token in the URL — never leak
  // full URLs to other sites through the Referer header.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
];

// Taken from the project URL rather than hardcoded, so moving to another
// Supabase project (e.g. a different region) only means changing env vars.
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : null;

const nextConfig = {
  poweredByHeader: false,
  images: {
    // Lets next/image optimize photos stored in Supabase Storage (business
    // logos, listing photos) — without this, next/image refuses to load
    // any remote host it doesn't explicitly allow.
    remotePatterns: supabaseHost
      ? [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }]
      : [],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};
module.exports = nextConfig;
