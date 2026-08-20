import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function BackHome() {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-1.5 text-sm text-stone hover:text-navy transition-colors mb-6"
    >
      <ArrowLeft size={15} />
      Back to Luupa
    </Link>
  );
}
