export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-100 gap-4">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-4 border-[#333333]"></div>
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-brand-red animate-spin"></div>
      </div>
      <p className="text-[#808080] text-sm">Loading...</p>
    </div>
  );
}

