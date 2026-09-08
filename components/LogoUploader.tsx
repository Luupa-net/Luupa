"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2, Upload } from "lucide-react";

export default function LogoUploader({
  ownerId,
  logoUrl,
  onChange,
}: {
  ownerId: string;
  logoUrl: string | null;
  onChange: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError("Logo must be under 2MB.");
      return;
    }

    setUploading(true);
    setError(null);

    const ext = file.name.split(".").pop();
    const path = `${ownerId}/logo-${Date.now()}.${ext}`;

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
    <div className="flex items-center gap-4">
      <div className="w-16 h-16 rounded-full bg-canvas2 border border-stone-line overflow-hidden flex items-center justify-center shrink-0">
        {logoUrl ? (
          <img src={logoUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-stone text-xs">No logo</span>
        )}
      </div>
      <div>
        <label className="inline-flex items-center gap-1.5 text-sm font-medium text-navy cursor-pointer">
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {logoUrl ? "Replace logo" : "Upload logo"}
          <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
        {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
        <p className="text-xs text-stone mt-1">Square image works best. Shown next to your name once you're live.</p>
      </div>
    </div>
  );
}
