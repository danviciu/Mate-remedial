import { AnimatePresence, motion as Motion } from "framer-motion";
import { shouldReduceMotion } from "../../lib/motion.js";
import VisualFallback from "./VisualFallback.jsx";

const ROTATION = {
  left: -6,
  right: 6,
  balanced: 0,
};

function normalizePlate(value) {
  if (Array.isArray(value)) return value.filter((item) => item !== null && item !== undefined);
  if (value === null || value === undefined || value === "") return [];
  return [value];
}

function Plate({ items }) {
  if (!items.length) {
    return <span className="text-base font-bold text-cyan-500">gol</span>;
  }
  return (
    <div className="flex flex-wrap items-center justify-center gap-1">
      {items.map((item, index) => (
        <span
          key={`${String(item)}-${index}`}
          className="rounded-lg bg-cyan-100 px-2 py-1 text-sm font-bold text-cyan-700"
        >
          {String(item)}
        </span>
      ))}
    </div>
  );
}

export default function BalanceScale({
  left = [],
  right = [],
  tilt = "balanced",
  operation = null,
  pulseToken = "",
  compact = false,
}) {
  const reducedMotion = shouldReduceMotion();
  const safeLeft = normalizePlate(left);
  const safeRight = normalizePlate(right);
  const safeTilt = ROTATION[tilt] === undefined ? "balanced" : tilt;
  const angle = ROTATION[safeTilt];
  const plateOffset = angle === 0 ? 0 : 10;
  const leftY = angle === 0 ? 0 : angle > 0 ? -plateOffset : plateOffset;
  const rightY = angle === 0 ? 0 : angle > 0 ? plateOffset : -plateOffset;
  const leftX = angle === 0 ? 0 : angle > 0 ? -2 : 2;
  const rightX = angle === 0 ? 0 : angle > 0 ? 2 : -2;
  const hasValidItems = [...safeLeft, ...safeRight].every(
    (item) => typeof item === "string" || typeof item === "number",
  );
  const showOperation = typeof operation === "string" && operation.trim().length > 0;
  const stageHeight = compact ? 184 : 224;
  const armWidth = compact ? 288 : 340;
  const beamThickness = 12;
  const beamX = -armWidth / 2;
  const pivotY = compact ? 84 : 102;
  const plateOffsetFromCenter = compact ? 112 : 136;
  const plateTop = compact ? 120 : 142;
  const plateWidth = compact ? 96 : 112;
  const leftPlateBaseX = -plateOffsetFromCenter - plateWidth / 2;
  const rightPlateBaseX = plateOffsetFromCenter - plateWidth / 2;
  const plateWidthClass = compact ? "w-24" : "w-28";
  const stageMaxWidthClass = compact ? "max-w-[460px]" : "max-w-lg";
  const standWidth = compact ? 12 : 14;
  const standTop = pivotY + 10;
  const standHeight = stageHeight - standTop;
  const standCapWidth = compact ? 52 : 70;
  const standCapHeight = compact ? 18 : 22;
  const standCapTop = pivotY - Math.floor(standCapHeight / 2);
  const leftSignature = safeLeft.map((item) => String(item)).join("|");
  const rightSignature = safeRight.map((item) => String(item)).join("|");

  if (!hasValidItems) {
    return (
      <VisualFallback
        compact
        title="Date vizuale lipsa"
        detail="Balanta are nevoie de valori text sau numere pe ambele parti."
      />
    );
  }

  return (
    <div className={`w-full rounded-3xl bg-cyan-50 ${compact ? "p-4" : "p-5"}`}>
      <div className={`relative mx-auto ${stageMaxWidthClass}`} style={{ height: stageHeight }}>
        <div
          className="absolute left-1/2 -translate-x-1/2 rounded bg-cyan-500"
          style={{ top: standTop, width: standWidth, height: standHeight }}
        />
        <div
          className="absolute left-1/2 -translate-x-1/2 rounded-t-full bg-cyan-600"
          style={{ top: standCapTop, width: standCapWidth, height: standCapHeight }}
        />

        <Motion.div
          key={`beam-${pulseToken}-${String(operation ?? "none")}`}
          className="absolute left-1/2 rounded-full bg-cyan-700"
          style={{ top: pivotY - beamThickness / 2, width: armWidth, height: beamThickness }}
          initial={false}
          animate={{
            x: beamX,
            rotate: showOperation ? [angle, angle - 1.8, angle + 1.8, angle] : angle,
            scaleX: showOperation ? [1, 1.01, 1] : 1,
          }}
          transition={reducedMotion ? { duration: 0 } : { duration: 0.45, ease: "easeOut" }}
        />
        <div
          className="absolute left-1/2 -translate-x-1/2 rounded-full border-2 border-cyan-700 bg-cyan-300"
          style={{ top: pivotY - 7, width: 14, height: 14 }}
        />

        <Motion.div
          className={`absolute left-1/2 ${plateWidthClass} rounded-2xl border-2 border-cyan-600 bg-white px-3 py-2 text-center text-lg font-black text-cyan-700`}
          style={{ top: plateTop }}
          animate={{
            x: leftPlateBaseX + leftX,
            y: leftY,
            scale: showOperation ? [1, 1.04, 1] : 1,
            boxShadow: showOperation
              ? ["0 0 0 rgba(6,182,212,0)", "0 0 0 6px rgba(34,211,238,0.2)", "0 0 0 rgba(6,182,212,0)"]
              : "0 0 0 rgba(6,182,212,0)",
          }}
          transition={
            reducedMotion
              ? { duration: 0 }
              : { duration: 0.45, ease: "easeOut", times: [0, 0.5, 1] }
          }
        >
          {showOperation ? (
            <Motion.div
              key={`left-op-${pulseToken}`}
              initial={reducedMotion ? false : { y: -10, opacity: 0, scale: 0.9 }}
              animate={reducedMotion ? undefined : { y: -26, opacity: 1, scale: [1, 1.08, 1] }}
              className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-cyan-600 px-2 py-0.5 text-xs font-black text-white"
            >
              {operation}
            </Motion.div>
          ) : null}
          <AnimatePresence mode="wait">
            <Motion.div
              key={`left-plate-${leftSignature}-${pulseToken}`}
              initial={reducedMotion ? false : { opacity: 0, y: 6 }}
              animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
              exit={reducedMotion ? undefined : { opacity: 0, y: -6 }}
              transition={reducedMotion ? { duration: 0 } : { duration: 0.22 }}
            >
              <Plate items={safeLeft} />
            </Motion.div>
          </AnimatePresence>
        </Motion.div>

        <Motion.div
          className={`absolute left-1/2 ${plateWidthClass} rounded-2xl border-2 border-cyan-600 bg-white px-3 py-2 text-center text-lg font-black text-cyan-700`}
          style={{ top: plateTop }}
          animate={{
            x: rightPlateBaseX + rightX,
            y: rightY,
            scale: showOperation ? [1, 1.04, 1] : 1,
            boxShadow: showOperation
              ? ["0 0 0 rgba(6,182,212,0)", "0 0 0 6px rgba(34,211,238,0.2)", "0 0 0 rgba(6,182,212,0)"]
              : "0 0 0 rgba(6,182,212,0)",
          }}
          transition={
            reducedMotion
              ? { duration: 0 }
              : { duration: 0.45, ease: "easeOut", times: [0, 0.5, 1] }
          }
        >
          {showOperation ? (
            <Motion.div
              key={`right-op-${pulseToken}`}
              initial={reducedMotion ? false : { y: -10, opacity: 0, scale: 0.9 }}
              animate={reducedMotion ? undefined : { y: -26, opacity: 1, scale: [1, 1.08, 1] }}
              className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-cyan-600 px-2 py-0.5 text-xs font-black text-white"
            >
              {operation}
            </Motion.div>
          ) : null}
          <AnimatePresence mode="wait">
            <Motion.div
              key={`right-plate-${rightSignature}-${pulseToken}`}
              initial={reducedMotion ? false : { opacity: 0, y: 6 }}
              animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
              exit={reducedMotion ? undefined : { opacity: 0, y: -6 }}
              transition={reducedMotion ? { duration: 0 } : { duration: 0.22 }}
            >
              <Plate items={safeRight} />
            </Motion.div>
          </AnimatePresence>
        </Motion.div>
      </div>
    </div>
  );
}
