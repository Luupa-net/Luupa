export default function BrowseLoading() {
  return (
    <div className="max-w-6xl mx-auto px-5 py-6 sm:py-10 animate-pulse">
      <div className="h-8 w-64 bg-stone-line rounded-md" />
      <div className="h-4 w-32 bg-stone-line rounded-md mt-3" />

      <div className="grid md:grid-cols-[200px_1fr] gap-8 mt-6">
        <aside className="hidden md:block space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-4 w-24 bg-stone-line rounded-md" />
          ))}
        </aside>
        <div className="grid sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border-2 border-stone-line p-5 h-32" />
          ))}
        </div>
      </div>
    </div>
  );
}
