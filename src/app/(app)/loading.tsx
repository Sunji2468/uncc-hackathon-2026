/** Shown while a page's server data loads. */
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="h-10 w-64 animate-pulse rounded-xl bg-panel motion-reduce:animate-none md:h-12" />
      <div className="mt-3 h-4 w-80 max-w-full animate-pulse rounded bg-panel motion-reduce:animate-none" />
      <div className="dotted-board mt-7 grid min-h-[360px] grid-cols-2 gap-6 rounded-[32px] border-2 border-line p-6 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-56 animate-pulse rounded-[26px] bg-line/60 motion-reduce:animate-none" />
        ))}
      </div>
      <span className="sr-only" role="status">
        Loading
      </span>
    </div>
  );
}
