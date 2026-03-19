function CardSkeleton() {
  return (
    <div className="shrink-0 w-1/2 sm:w-1/3 md:w-1/4 lg:w-1/5 max-w-xs animate-pulse">
      <div className="bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm">
        <div className="aspect-[2/3] bg-gray-200" />
        <div className="p-3 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="h-3 bg-gray-200 rounded w-1/2" />
        </div>
        <div className="px-3 pb-3">
          <div className="h-8 bg-gray-200 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

function SectionSkeleton() {
  return (
    <section className="py-12 md:py-16">
      <div className="container mx-auto px-4 md:px-8">
        <div className="flex items-center justify-between mb-8 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-1 h-8 bg-gray-200 rounded-full" />
            <div className="h-7 w-48 bg-gray-200 rounded-lg" />
          </div>
          <div className="h-4 w-16 bg-gray-200 rounded" />
        </div>
        <div className="flex gap-4 md:gap-6 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default function HomeLoading() {
  return (
    <div className="min-h-screen bg-gray-50 pt-24">
      {/* Hero promo skeleton */}
      <section className="pb-10 md:pb-14 mt-7">
        <div className="container mx-auto px-4 md:px-8">
          <div className="animate-pulse h-56 md:h-64 bg-gray-200 rounded-none md:rounded-xl" />
        </div>
      </section>

      <SectionSkeleton />
      <SectionSkeleton />
      <SectionSkeleton />
    </div>
  );
}
