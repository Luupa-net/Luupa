"use client";

export default function HeroImage() {
  return (
    <img
      src="/bahrain-hero.jpg"
      alt="Bahrain"
      className="w-full h-full object-cover"
      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
    />
  );
}
