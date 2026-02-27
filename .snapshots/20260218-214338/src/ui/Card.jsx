import { motion } from "framer-motion";
import { shouldReduceMotion, transitions } from "../lib/motion.js";

function cx(...values) {
  return values.filter(Boolean).join(" ");
}

export default function Card({
  as = "div",
  interactive = false,
  className,
  children,
  ...props
}) {
  const reduceMotion = shouldReduceMotion();
  const MotionTag = motion[as] ?? motion.div;

  return (
    <MotionTag
      whileHover={
        !reduceMotion && interactive
          ? {
              y: -4,
              scale: 1.01,
              boxShadow: "0 22px 40px rgba(30, 41, 59, 0.16)",
            }
          : undefined
      }
      whileTap={!reduceMotion && interactive ? { scale: 0.98 } : undefined}
      transition={transitions.springFast}
      className={cx(
        "rounded-3xl border border-white/60 bg-white/80 p-4 shadow-[0_10px_30px_rgba(15,23,42,0.08)] backdrop-blur",
        interactive ? "cursor-pointer" : "",
        className,
      )}
      {...props}
    >
      {children}
    </MotionTag>
  );
}
