import { motion as Motion } from "framer-motion";
import { shouldReduceMotion } from "../../lib/motion.js";
import VisualFallback from "./VisualFallback.jsx";

export default function NumberLine({
  min = -10,
  max = 10,
  value = 0,
  highlights = [],
  compact = false,
}) {
  const reducedMotion = shouldReduceMotion();
  const parsedMin = Number(min);
  const parsedMax = Number(max);
  const parsedValue = Number(value);
  const safeHighlights = Array.isArray(highlights) ? highlights : [];
  const hasValidHighlights = safeHighlights.every((point) => Number.isInteger(Number(point)));
  const isValidLine =
    Number.isInteger(parsedMin) &&
    Number.isInteger(parsedMax) &&
    parsedMin < parsedMax &&
    Number.isInteger(parsedValue) &&
    parsedValue >= parsedMin &&
    parsedValue <= parsedMax &&
    hasValidHighlights;

  if (!isValidLine) {
    return (
      <VisualFallback
        compact
        title="Date vizuale lipsa"
        detail="Axa invalida. Min/Max/valoare trebuie sa fie intregi finite, cu min < max."
      />
    );
  }

  const safeMin = parsedMin;
  const safeMax = parsedMax;
  const span = Math.max(1, safeMax - safeMin);
  const points = [];

  for (let step = safeMin; step <= safeMax; step += 1) points.push(step);

  const normalize = (point) => ((point - safeMin) / span) * 100;
  const safeValue = Math.min(Math.max(parsedValue, safeMin), safeMax);

  return (
    <div className={`w-full rounded-3xl bg-orange-50 ${compact ? "p-3" : "p-5"}`}>
      <div className={`relative ${compact ? "h-16" : "h-20"}`}>
        <div
          className={`absolute w-full rounded-full bg-orange-200 ${compact ? "top-8 h-1.5" : "top-10 h-[5px]"}`}
        />
        {points.map((point) => (
          <div
            key={`tick-${point}`}
            className={`absolute flex -translate-x-1/2 flex-col items-center ${compact ? "top-5" : "top-7"}`}
            style={{ left: `${normalize(point)}%` }}
          >
            <div className={`w-[2px] bg-orange-400 ${compact ? "h-5" : "h-7"}`} />
            <span className={`mt-1 font-bold text-orange-700 ${compact ? "text-xs" : "text-sm"}`}>{point}</span>
          </div>
        ))}

        {safeHighlights.map((point) => (
          <div
            key={`highlight-${point}`}
            className={`absolute -translate-x-1/2 rounded-xl bg-orange-200 font-semibold text-orange-800 ${compact ? "top-0 px-1.5 py-0.5 text-xs" : "top-0 px-2 py-1 text-sm"}`}
            style={{ left: `${normalize(Number(point))}%` }}
          >
            {point}
          </div>
        ))}

        <Motion.div
          className={`absolute -translate-x-1/2 rounded-full bg-orange-600 font-black text-white shadow ${compact ? "top-1.5 px-2 py-0.5 text-xs" : "top-3 px-3 py-1 text-sm"}`}
          style={{ left: `${normalize(safeValue)}%` }}
          initial={false}
          animate={{ left: `${normalize(safeValue)}%` }}
          transition={reducedMotion ? { duration: 0 } : { duration: 0.45, ease: "easeOut" }}
        >
          {safeValue}
        </Motion.div>
      </div>
    </div>
  );
}
