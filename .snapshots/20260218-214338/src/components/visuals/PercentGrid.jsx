import { motion as Motion } from "framer-motion";
import { shouldReduceMotion } from "../../lib/motion.js";
import VisualFallback from "./VisualFallback.jsx";

const MAX_RENDER_CELLS = 400;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function formatNumber(value) {
  if (!Number.isFinite(value)) return "0";
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100);
}

function getColumns(totalCells) {
  if (totalCells <= 100) return 10;
  if (totalCells <= 200) return 20;
  if (totalCells <= 400) return 20;
  return 25;
}

export default function PercentGrid({
  percent = 0,
  label,
  compact = false,
  totalCells = 100,
  filledCells = null,
}) {
  const reducedMotion = shouldReduceMotion();
  const parsedPercent = Number(percent);
  const parsedTotal = Number(totalCells);
  const initialFilled = filledCells === null ? (parsedPercent / 100) * parsedTotal : Number(filledCells);
  const isValidInput =
    Number.isFinite(parsedTotal) &&
    parsedTotal >= 1 &&
    Number.isFinite(initialFilled) &&
    initialFilled >= 0 &&
    Number.isFinite(parsedPercent) &&
    parsedPercent >= 0 &&
    parsedPercent <= 100;

  if (!isValidInput) {
    return (
      <VisualFallback
        compact
        title="Date vizuale lipsa"
        detail="Date procent invalide. Verifica procentul, totalul si valoarea colorata."
      />
    );
  }

  const safeTotal = Math.max(1, Math.round(parsedTotal));
  const safeFilled = clamp(initialFilled, 0, safeTotal);
  const needsScale = safeTotal > MAX_RENDER_CELLS;
  const scale = needsScale ? MAX_RENDER_CELLS / safeTotal : 1;
  const renderTotal = needsScale ? MAX_RENDER_CELLS : safeTotal;
  const renderFilled = safeFilled * scale;
  const fullFilled = Math.floor(renderFilled);
  const partial = renderFilled - fullFilled;
  const columns = getColumns(renderTotal);
  const finalLabel = label ?? `${formatNumber(safeFilled)} din ${safeTotal}`;

  return (
    <div
      className={`mx-auto w-full rounded-3xl bg-emerald-50 ${
        compact ? "max-w-[460px] p-2.5" : "max-w-[560px] p-3 sm:p-4"
      }`}
    >
      <div
        className={`grid rounded-2xl bg-white/70 ${compact ? "gap-0.5 p-1.5" : "gap-1 p-2"}`}
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: renderTotal }, (_, index) => {
          const filled = index < fullFilled;
          const partiallyFilled = !filled && index === fullFilled && partial > 0;
          const partialPercent = clamp(Math.round(partial * 100), 0, 100);
          const cellStyle = partiallyFilled
            ? {
                background: `linear-gradient(to right, rgb(16 185 129) ${partialPercent}%, rgb(209 250 229) ${partialPercent}%)`,
              }
            : undefined;
          return (
            <Motion.div
              key={`cell-${index}-${renderTotal}-${formatNumber(renderFilled)}`}
              className={`aspect-square rounded-[4px] ${
                filled ? "bg-emerald-500" : "bg-emerald-100"
              }`}
              style={cellStyle}
              initial={false}
              animate={{ opacity: filled || partiallyFilled ? 1 : 0.5 }}
              transition={reducedMotion ? { duration: 0 } : { duration: 0.2, delay: filled ? index * 0.002 : 0 }}
            />
          );
        })}
      </div>
      <p className={`mt-2 text-center font-black text-emerald-700 ${compact ? "text-lg" : "text-xl sm:text-2xl"}`}>
        {finalLabel}
      </p>
      {needsScale ? (
        <p className="mt-1 text-center text-xs font-semibold text-emerald-700">
          Vizual simplificat: {renderTotal} celule pentru total {safeTotal}.
        </p>
      ) : null}
    </div>
  );
}
