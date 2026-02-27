import { motion } from "framer-motion";
import { shouldReduceMotion, transitions } from "../lib/motion.js";

const VARIANT_CLASSES = {
  primary: "bg-indigo-600 text-white hover:bg-indigo-700 focus-visible:ring-indigo-300",
  secondary:
    "bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-50 focus-visible:ring-indigo-300",
  soft: "bg-indigo-100 text-indigo-700 hover:bg-indigo-200 focus-visible:ring-indigo-300",
  success: "bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-300",
  danger: "bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-300",
  ghost: "bg-transparent text-slate-700 hover:bg-slate-100 focus-visible:ring-slate-300",
};

const SIZE_CLASSES = {
  sm: "min-h-9 px-3 py-2 text-sm",
  md: "min-h-11 px-4 py-2.5 text-base",
  lg: "min-h-12 px-5 py-3 text-lg",
};

function cx(...values) {
  return values.filter(Boolean).join(" ");
}

export default function Button({
  as = "button",
  type = "button",
  variant = "primary",
  size = "md",
  className,
  disabled = false,
  children,
  ...props
}) {
  const reduceMotion = shouldReduceMotion();
  const MotionTag = motion[as] ?? motion.button;
  const interactive = !disabled;

  return (
    <MotionTag
      type={as === "button" ? type : undefined}
      disabled={as === "button" ? disabled : undefined}
      whileHover={
        !reduceMotion && interactive
          ? {
              y: -1.5,
              scale: 1.01,
            }
          : undefined
      }
      whileTap={!reduceMotion && interactive ? { scale: 0.98 } : undefined}
      transition={transitions.springFast}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition focus:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-55",
        VARIANT_CLASSES[variant] ?? VARIANT_CLASSES.primary,
        SIZE_CLASSES[size] ?? SIZE_CLASSES.md,
        className,
      )}
      {...props}
    >
      {children}
    </MotionTag>
  );
}
