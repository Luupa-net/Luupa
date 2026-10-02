/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Lets next/image optimize photos stored in Supabase Storage (business
    // logos, listing photos) — without this, next/image refuses to load
    // any remote host it doesn't explicitly allow.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "illqnwboycmtuusfrkpv.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};
module.exports = nextConfig;
