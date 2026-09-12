"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2, Upload, QrCode } from "lucide-react";

export default function PaymentQRUploader({
  ownerId,
  qrUrl,
  onChange,
}: {
  ownerId: string;
  qrUrl: string | null;
  onChange: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError("Image must be under 2MB.");
      return;
    }

    setUploading(true);
    setError(null);

    const ext = file.name.split(".").pop();
    const path = `${ownerId}/payment-qr-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("business-photos")
      .upload(path, file, { cacheControl: "3600", upsert: false });

    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from("business-photos").getPublicUrl(path);
    onChange(data.publicUrl);
    setUploading(false);
    e.target.value = "";
  }

  return (
    <div className="rounded-xl bg-navy/5 border border-navy/10 p-4">
      <p className="flex items-center gap-1.5 text-sm font-medium text-ink mb-1"><QrCode size={15} /> BenefitPay QR code</p>
      <p className="text-xs text-stone mb-3">
        Upload your own BenefitPay QR code and it'll be included on every invoice you send — customers pay you directly, Luupa never touches the money.
      </p>
      <div className="flex items-center gap-4">
        <div className="w-20 h-20 rounded-lg bg-white border border-stone-line overflow-hidden flex items-center justify-center shrink-0">
          {qrUrl ? (
            <img src={qrUrl} alt="" className="w-full h-full object-contain" />
          ) : (
            <QrCode size={22} className="text-stone-dim" />
          )}
        </div>
        <div>
          <label className="inline-flex items-center gap-1.5 text-sm font-medium text-navy cursor-pointer">
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            {qrUrl ? "Replace QR code" : "Upload QR code"}
            <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
          {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
        </div>
      </div>
    </div>
  );
}
