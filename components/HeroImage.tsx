"use client";

import { useState } from "react";

export default function HeroImage() {
  const [failed, setFailed] = useState(false);

  return (
    <>
      {!failed && (
        <img
          src="/bahrain-hero.jpg"
          alt=""
          className="absolute inset-0 w-full h-full object-cover scale-110"
          style={{ filter: "blur(3px)" }}
          onError={() => setFailed(true)}
        />
      )}
      {/* Overlay — darkens for text legibility whether or not a photo is present */}
      <div className="absolute inset-0 bg-navy-dim/55" />
    </>
  );
}
