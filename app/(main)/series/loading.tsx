function CardSkeleton() {
  return (
    <div className="animate-pulse">
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

export default function SeriesLoading() {
  return (
    <div className="min-h-screen bg-gray-50 pt-24">
      <div className="container mx-auto px-4 md:px-8 py-8">
        <div className="animate-pulse mb-8 space-y-4">
          <div className="h-9 bg-gray-200 rounded w-32" />
          <div className="h-10 bg-gray-200 rounded-xl max-w-md" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
          {Array.from({ length: 20 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
