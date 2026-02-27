import { motion as Motion } from "framer-motion";
import { shouldReduceMotion, transitions } from "../../lib/motion.js";

function joinClasses(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function MotionProgress({ value = 0, className, barClassName }) {
  const reducedMotion = shouldReduceMotion();
  const safeValue = Math.max(0, Math.min(100, Number(value) || 0));
  const widthValue = `${safeValue}%`;

  if (reducedMotion) {
    return (
      <div className={joinClasses("h-2 rounded-full overflow-hidden bg-indigo-100", className)}>
        <div className={joinClasses("h-full bg-indigo-500", barClassName)} style={{ width: widthValue }} />
      </div>
    );
  }

  return (
    <div className={joinClasses("h-2 rounded-full overflow-hidden bg-indigo-100", className)}>
      <Motion.div
        key={safeValue}
        className={joinClasses("h-full bg-indigo-500", barClassName)}
        initial={{ width: "0%" }}
        animate={{ width: widthValue }}
        transition={transitions.easeOut}
      />
    </div>
  );
}

