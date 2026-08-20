"use client";

export default function HeroImage() {
  return (
    <>
      <img
        src="/bahrain-hero.jpg"
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
      />
      {/* Gradient scrim — keeps white text legible over any photo, and fuses photo + content into one scene */}
      <div className="absolute inset-0 bg-gradient-to-t from-navy-dim via-navy-dim/75 to-navy-dim/40" />
    </>
  );
}
