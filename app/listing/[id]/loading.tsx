export default function ListingLoading() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-10 animate-pulse">
      <div className="h-9 w-72 bg-stone-line rounded-md" />
      <div className="h-4 w-40 bg-stone-line rounded-md mt-3" />
      <div className="h-4 w-full max-w-xl bg-stone-line rounded-md mt-6" />
      <div className="h-4 w-2/3 bg-stone-line rounded-md mt-2" />
      <div className="grid sm:grid-cols-2 gap-8 mt-10">
        <div className="space-y-3">
          <div className="h-4 w-40 bg-stone-line rounded-md" />
          <div className="h-4 w-32 bg-stone-line rounded-md" />
          <div className="h-11 w-44 bg-stone-line rounded-lg mt-4" />
        </div>
      </div>
    </div>
  );
}
