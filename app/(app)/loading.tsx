export default function Loading() {
  return (
    <div className="p-4 sm:p-6 space-y-4" aria-busy="true" aria-label="Loading">
      <div className="h-6 w-40 animate-pulse rounded bg-paper-line" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-lg bg-paper-line" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-lg bg-paper-line" />
    </div>
  );
}