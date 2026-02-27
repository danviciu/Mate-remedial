import { motion as Motion } from "framer-motion";
import { shouldReduceMotion, transitions } from "../lib/motion.js";

function cx(...values) {
  return values.filter(Boolean).join(" ");
}

export default function ProgressBar({
  value = 0,
  className,
  trackClassName,
  fillClassName,
  showLabel = false,
}) {
  const reduceMotion = shouldReduceMotion();
  const safeValue = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
  const width = `${safeValue}%`;

  return (
    <div className={cx("w-full", className)}>
      <div
        className={cx(
          "h-3 w-full overflow-hidden rounded-full bg-indigo-100/80",
          trackClassName,
        )}
      >
        <Motion.div
          className={cx(
            "relative h-full rounded-full bg-gradient-to-r from-indigo-500 via-cyan-500 to-emerald-500",
            fillClassName,
          )}
          initial={reduceMotion ? undefined : { width: 0 }}
          animate={{ width }}
          transition={transitions.easeOut}
        >
          {reduceMotion ? null : (
            <Motion.span
              className="absolute inset-y-0 w-10 bg-white/35 blur-sm"
              animate={{ x: ["-120%", "260%"] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
            />
          )}
        </Motion.div>
      </div>
      {showLabel ? (
        <p className="mt-1 text-xs font-semibold text-slate-600">{safeValue}%</p>
      ) : null}
    </div>
  );
}
