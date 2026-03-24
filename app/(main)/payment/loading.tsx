export default function PaymentLoading() {
  return (
    <div className="min-h-screen bg-gray-50 pt-24">
      <div className="container mx-auto px-4 md:px-8 py-8 max-w-2xl animate-pulse">
        {/* Back link */}
        <div className="h-4 w-20 bg-gray-200 rounded mb-8" />

        {/* Title */}
        <div className="h-9 bg-gray-200 rounded w-64 mb-2" />
        <div className="h-4 bg-gray-200 rounded w-80 mb-8" />

        <div className="space-y-6">
          {/* Order summary card */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
            <div className="h-5 bg-gray-200 rounded w-36" />
            <div className="flex justify-between">
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-48" />
                <div className="h-3 bg-gray-200 rounded w-32" />
              </div>
              <div className="h-7 bg-gray-200 rounded w-20" />
            </div>
          </div>

          {/* Payment methods card */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
            <div className="h-5 bg-gray-200 rounded w-40" />
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-12 bg-gray-100 border border-gray-100 rounded-lg" />
              ))}
            </div>
          </div>

          {/* Pay button */}
          <div className="h-14 bg-gray-200 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
