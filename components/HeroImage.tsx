"use client";

import { useState } from "react";
import Image from "next/image";

export default function HeroImage() {
  const [failed, setFailed] = useState(false);

  return (
    <>
      {!failed && (
        <Image
          src="/bahrain-hero.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          quality={80}
          className="object-cover scale-110"
          style={{ filter: "blur(2px)" }}
          onError={() => setFailed(true)}
        />
      )}
      {/* Overlay — darkens for text legibility whether or not a photo is present */}
      <div className="absolute inset-0 bg-navy-dim/55" />
    </>
  );
}
