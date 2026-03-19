export default function WatchLoading() {
  return (
    <div className="min-h-screen bg-gray-50 pt-14 sm:pt-20 animate-pulse">
      {/* Top bar skeleton */}
      <div className="sticky top-14 sm:top-16 z-20 border-b border-gray-200 bg-white/95">
        <div className="container mx-auto px-3 sm:px-4 md:px-8 py-3 sm:py-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-200 rounded-full shrink-0" />
          <div className="h-5 bg-gray-200 rounded w-48 flex-1 max-w-xs" />
          <div className="h-7 w-20 bg-gray-200 rounded-full shrink-0" />
        </div>
      </div>

      <div className="container mx-auto px-0 sm:px-4 md:px-8 py-4 sm:py-10">
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 lg:gap-10">
          {/* Video player skeleton */}
          <div className="flex-1 min-w-0">
            <div className="rounded-none sm:rounded-2xl aspect-video bg-gray-300" />

            {/* Info row skeleton */}
            <div className="mt-4 bg-white rounded-xl border border-gray-200 px-5 py-4 space-y-2">
              <div className="h-3 bg-gray-200 rounded w-24" />
              <div className="h-5 bg-gray-200 rounded w-56" />
              <div className="flex gap-3 mt-2">
                <div className="h-3 bg-gray-200 rounded w-16" />
                <div className="h-3 bg-gray-200 rounded w-16" />
                <div className="h-3 bg-gray-200 rounded w-16" />
              </div>
            </div>

            {/* About skeleton */}
            <div className="mt-4 bg-white rounded-xl border border-gray-200 px-5 py-4 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-40" />
              <div className="h-3 bg-gray-200 rounded w-full" />
              <div className="h-3 bg-gray-200 rounded w-5/6" />
              <div className="h-3 bg-gray-200 rounded w-4/6" />
            </div>
          </div>

          {/* Episode sidebar skeleton */}
          <aside className="lg:w-80 xl:w-72 shrink-0 px-3 sm:px-0">
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-200">
                <div className="h-5 bg-gray-200 rounded w-32" />
                <div className="h-3 bg-gray-200 rounded w-20 mt-2" />
              </div>
              <div className="p-3 space-y-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-12 bg-gray-100 rounded-xl" />
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
