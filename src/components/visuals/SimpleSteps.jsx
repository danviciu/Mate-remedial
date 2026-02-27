import { motion as Motion } from "framer-motion";
import { shouldReduceMotion } from "../../lib/motion.js";

export default function SimpleSteps({ steps = [], current = 0, compact = false }) {
  const reducedMotion = shouldReduceMotion();
  const safeCurrent = Math.min(Math.max(Number(current) || 0, 0), steps.length);

  return (
    <div className={`w-full rounded-3xl bg-slate-50 ${compact ? "p-3" : "p-4"}`}>
      <p className={`mb-3 font-black text-slate-700 ${compact ? "text-lg" : "text-xl"}`}>Pasii</p>
      <div className="grid gap-2">
        {steps.map((step, index) => {
          const done = index < safeCurrent;
          return (
            <Motion.div
              key={`step-${index}-${step}`}
              className={`flex items-center gap-3 rounded-2xl border ${compact ? "px-3 py-2 text-base" : "px-4 py-3 text-lg"} ${
                done
                  ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                  : "border-slate-200 bg-white text-slate-700"
              }`}
              animate={reducedMotion ? undefined : { scale: done ? [1, 1.01, 1] : 1 }}
            >
              <span
                className={`inline-flex items-center justify-center rounded-full bg-white font-black ${
                  compact ? "h-7 w-7 text-sm" : "h-8 w-8 text-base"
                }`}
              >
                {done ? "OK" : index + 1}
              </span>
              <span className="font-semibold">{step}</span>
            </Motion.div>
          );
        })}
      </div>
    </div>
  );
}

