function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export default function FractionVisual({ totalParts, takenParts }) {
  if (!Number.isInteger(totalParts) || totalParts <= 0) {
    return null;
  }

  const safeTaken = Number.isInteger(takenParts)
    ? clamp(takenParts, 0, totalParts)
    : 0;

  return (
    <div className="w-full rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4">
      <div className="overflow-x-auto pb-1">
        <div className="flex min-w-max items-center gap-2">
          {Array.from({ length: totalParts }, (_, index) => {
            const filled = index < safeTaken;
            return (
              <div
                key={`part-${index}`}
                className={`h-12 w-10 shrink-0 rounded-xl border-2 sm:h-14 sm:w-12 ${
                  filled
                    ? "border-indigo-700 bg-indigo-600"
                    : "border-indigo-200 bg-white"
                }`}
                aria-label={`parte ${index + 1} ${filled ? "luata" : "ne-luata"}`}
              />
            );
          })}
        </div>
      </div>
      <p className="mt-3 text-sm font-semibold text-indigo-700">
        Luate: {safeTaken} din {totalParts}
      </p>
    </div>
  );
}
