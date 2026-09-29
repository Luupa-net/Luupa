export default function ListingLoading() {
  return (
    <div className="bg-canvas2 min-h-screen">
      <div className="max-w-6xl mx-auto px-5 sm:px-6 py-8 sm:py-10 animate-pulse">
        <div className="h-[132px] sm:h-[152px] bg-stone-line/60 rounded-2xl" />
        <div className="grid grid-cols-3 gap-2.5 mt-6">
          <div className="col-span-3 aspect-[2/1] bg-stone-line/50 rounded-xl" />
          <div className="aspect-square bg-stone-line/50 rounded-xl" />
          <div className="aspect-square bg-stone-line/50 rounded-xl" />
          <div className="aspect-square bg-stone-line/50 rounded-xl" />
        </div>
        <div className="h-20 bg-white border border-stone-line rounded-2xl mt-6" />
        <div className="grid sm:grid-cols-2 gap-5 mt-6">
          <div className="h-56 bg-white border border-stone-line rounded-2xl" />
          <div className="h-56 bg-white border border-stone-line rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
