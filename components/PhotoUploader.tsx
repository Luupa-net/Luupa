"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { X, Upload, Loader2 } from "lucide-react";

export default function PhotoUploader({
  businessId,
  ownerId,
  photos,
  onChange,
}: {
  businessId: string;
  ownerId: string;
  photos: string[];
  onChange: (photos: string[]) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("Photo must be under 5MB.");
      return;
    }
    if (photos.length >= 6) {
      setError("Maximum 6 photos per listing.");
      return;
    }

    setUploading(true);
    setError(null);

    const ext = file.name.split(".").pop();
    const path = `${ownerId}/${businessId}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("business-photos")
      .upload(path, file, { cacheControl: "3600", upsert: false });

    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("business-photos").getPublicUrl(path);
    onChange([...photos, urlData.publicUrl]);
    setUploading(false);
    e.target.value = "";
  }

  function removePhoto(url: string) {
    onChange(photos.filter((p) => p !== url));
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-2.5">
        {photos.map((url) => (
          <div key={url} className="relative aspect-square rounded-lg overflow-hidden bg-stone-line group">
            <img src={url} alt="" className="w-full h-full object-cover" />
            <button
              onClick={() => removePhoto(url)}
              className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Remove photo"
            >
              <X size={13} />
            </button>
          </div>
        ))}

        {photos.length < 6 && (
          <label className="aspect-square rounded-lg border-2 border-dashed border-stone-line flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-terra transition-colors">
            {uploading ? (
              <Loader2 size={20} className="text-stone animate-spin" />
            ) : (
              <>
                <Upload size={18} className="text-stone" />
                <span className="text-xs text-stone">Add photo</span>
              </>
            )}
            <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
        )}
      </div>
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      <p className="text-xs text-stone mt-2">Up to 6 photos, 5MB each. Real photos of your work convert best.</p>
    </div>
  );
}
