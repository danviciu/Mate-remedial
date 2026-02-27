function range(start, end) {
  const values = [];
  for (let value = start; value <= end; value += 1) {
    values.push(value);
  }
  return values;
}

export default function NumberLineVisual({ min = -10, max = 10, points = [] }) {
  const values = range(min, max);
  const pointSet = new Set(points);

  return (
    <div className="w-full rounded-2xl border border-orange-200 bg-orange-50/80 p-4">
      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-max items-end gap-2">
          {values.map((value) => {
            const highlighted = pointSet.has(value);
            return (
              <div key={`line-${value}`} className="flex w-9 flex-col items-center">
                <div
                  className={`h-5 w-5 rounded-full border-2 ${
                    highlighted
                      ? "border-orange-700 bg-orange-500"
                      : "border-orange-300 bg-white"
                  }`}
                />
                <div className="mt-1 h-6 border-l-2 border-orange-300" />
                <span className="text-xs font-semibold text-orange-900">{value}</span>
              </div>
            );
          })}
        </div>
      </div>
      <p className="mt-2 text-sm font-semibold text-orange-800">
        Puncte marcate: {points.join(", ")}
      </p>
    </div>
  );
}
