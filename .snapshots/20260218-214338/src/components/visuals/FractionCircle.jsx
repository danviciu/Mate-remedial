import { motion as Motion } from "framer-motion";
import { shouldReduceMotion } from "../../lib/motion.js";
import VisualFallback from "./VisualFallback.jsx";

function polarToCartesian(centerX, centerY, radius, angleDeg) {
  const radians = (Math.PI / 180) * angleDeg;
  return {
    x: centerX + radius * Math.cos(radians),
    y: centerY + radius * Math.sin(radians),
  };
}

function getSlicePath(index, total) {
  const startAngle = -90 + (360 / total) * index;
  const endAngle = startAngle + 360 / total;
  const start = polarToCartesian(50, 50, 48, startAngle);
  const end = polarToCartesian(50, 50, 48, endAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;

  return `M 50 50 L ${start.x} ${start.y} A 48 48 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
}

export default function FractionCircle({
  numer = 0,
  denom = 1,
  size = 220,
  showLabel = true,
  label,
}) {
  const reducedMotion = shouldReduceMotion();
  const parsedDenom = Number(denom);
  const parsedNumer = Number(numer);
  const safeSize = Number.isFinite(Number(size)) ? Math.max(96, Number(size)) : 220;
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
    <div className="flex flex-col items-center gap-3">
      <svg
        viewBox="0 0 100 100"
        style={{ width: safeSize, height: safeSize }}
        className="drop-shadow-sm"
      >
        {Array.from({ length: safeDenom }, (_, index) => {
          const filled = index < safeNumer;
          return (
            <Motion.path
              key={`slice-${safeDenom}-${index}-${safeNumer}`}
              d={getSlicePath(index, safeDenom)}
              stroke="#ffffff"
              strokeWidth="1.6"
              initial={false}
              animate={{ fill: filled ? "#4f46e5" : "#e0e7ff" }}
              transition={reducedMotion ? { duration: 0 } : { duration: 0.35, delay: index * 0.04 }}
            />
          );
        })}
        <circle cx="50" cy="50" r="18" fill="white" />
        <text
          x="50"
          y="56"
          textAnchor="middle"
          className="fill-indigo-700 text-[10px] font-black"
        >
          {finalLabel}
        </text>
      </svg>
      {showLabel ? (
        <p className="text-xl font-bold text-indigo-700">{finalLabel}</p>
      ) : null}
    </div>
  );
}
