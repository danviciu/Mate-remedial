function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export default function PercentBarVisual({ percent = 0, blocks = 10 }) {
  const safePercent = clamp(Number(percent) || 0, 0, 100);
  const totalBlocks = Number.isInteger(blocks) && blocks > 0 ? blocks : 10;

  return (
    <div className="w-full rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4">
      <div className="flex gap-2">
        {Array.from({ length: totalBlocks }, (_, index) => {
          const blockStart = (index / totalBlocks) * 100;
          const blockEnd = ((index + 1) / totalBlocks) * 100;
          const fillPercent = clamp(
            ((safePercent - blockStart) / (blockEnd - blockStart)) * 100,
            0,
            100,
          );

          return (
            <div
              key={`percent-block-${index}`}
              className="relative h-12 flex-1 overflow-hidden rounded-lg border border-emerald-300 bg-white"
            >
              <div
                className="absolute inset-y-0 left-0 bg-emerald-500 transition-all"
                style={{ width: `${fillPercent}%` }}
              />
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-sm font-semibold text-emerald-800">
        Procent colorat: {safePercent}%
      </p>
    </div>
  );
}
