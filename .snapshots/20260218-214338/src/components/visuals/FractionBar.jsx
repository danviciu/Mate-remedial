import { motion as Motion } from "framer-motion";
import { shouldReduceMotion } from "../../lib/motion.js";
import VisualFallback from "./VisualFallback.jsx";

export default function FractionBar({
  numer = 0,
  denom = 1,
  showLabel = true,
  label,
}) {
  const reducedMotion = shouldReduceMotion();
  const parsedDenom = Number(denom);
  const parsedNumer = Number(numer);
  const isValidFraction =
    Number.isInteger(parsedDenom) &&
    parsedDenom >= 1 &&
    Number.isInteger(parsedNumer) &&
    parsedNumer >= 0 &&
    parsedNumer <= parsedDenom;

  if (!isValidFraction) {
    return (
      <VisualFallback
        compact
        title="Date vizuale lipsa"
        detail="Fractie invalida. Foloseste numitor >= 1 si numarator intre 0 si numitor."
      />
    );
  }

  const safeDenom = parsedDenom;
  const safeNumer = parsedNumer;
  const finalLabel = label ?? `${safeNumer}/${safeDenom}`;

  return (
    <div className="w-full rounded-3xl bg-indigo-50 p-4">
      <div className="grid w-full gap-2" style={{ gridTemplateColumns: `repeat(${safeDenom}, minmax(0, 1fr))` }}>
        {Array.from({ length: safeDenom }, (_, index) => {
          const filled = index < safeNumer;
          return (
            <Motion.div
              key={`bar-${index}-${safeNumer}`}
              className={`h-16 rounded-xl border-2 ${
                filled ? "border-indigo-700 bg-indigo-500" : "border-indigo-200 bg-white"
              }`}
              animate={reducedMotion ? undefined : { scale: filled ? [1, 1.03, 1] : 1 }}
              transition={reducedMotion ? undefined : { duration: 0.5, delay: index * 0.03 }}
            />
          );
        })}
      </div>
      {showLabel ? (
        <p className="mt-3 text-center text-2xl font-black text-indigo-700">{finalLabel}</p>
      ) : null}
    </div>
  );
}
