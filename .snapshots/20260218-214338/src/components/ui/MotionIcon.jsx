import { motion as Motion } from "framer-motion";
import { shouldReduceMotion, springFast } from "../../lib/motion.js";

export default function MotionIcon({ className, children, ...props }) {
  const reducedMotion = shouldReduceMotion();

  return (
    <Motion.span
      className={`inline-flex ${className ?? ""}`.trim()}
      whileHover={!reducedMotion ? { rotate: -8, scale: 1.08 } : undefined}
      whileTap={!reducedMotion ? { scale: 0.95 } : undefined}
      transition={springFast}
      {...props}
    >
      {children}
    </Motion.span>
  );
}

