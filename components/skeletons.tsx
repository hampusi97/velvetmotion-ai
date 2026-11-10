export function CharacterGridSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8" aria-busy="true">
      <p className="sr-only">Loading characters</p>
      <div className="mb-8 space-y-3" aria-hidden="true">
        <div className="skeleton h-3 w-28" />
        <div className="skeleton h-14 w-72 max-w-full" />
        <div className="skeleton h-11 w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="skeleton h-80 rounded-3xl" />
        ))}
      </div>
    </div>
  );
}

export function ChatSkeleton() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-4 py-6" aria-busy="true">
      <p className="sr-only">Loading conversation</p>
      <div className="space-y-4" aria-hidden="true">
        <div className="skeleton h-12 w-48" />
        <div className="skeleton h-28 w-4/5 rounded-3xl" />
        <div className="skeleton ml-auto h-16 w-2/3 rounded-3xl" />
        <div className="skeleton h-28 w-4/5 rounded-3xl" />
      </div>
    </div>
  );
}
