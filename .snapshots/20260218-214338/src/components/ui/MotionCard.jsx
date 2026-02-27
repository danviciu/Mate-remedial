import { motion } from "framer-motion";
import { shouldReduceMotion, transitions } from "../../lib/motion.js";

function joinClasses(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function MotionCard({
  as = "div",
  className,
  children,
  gradient = false,
  disabled = false,
  onClick,
  ...props
}) {
  const reducedMotion = shouldReduceMotion();
  const MotionTag = motion[as] ?? motion.div;
  const interactive =
    !disabled && (typeof onClick === "function" || as === "button" || props.role === "button");
  const sharedClassName = joinClasses(
    "rounded-2xl shadow-md transition-shadow duration-200",
    interactive ? "cursor-pointer hover:shadow-xl" : "",
    gradient && !reducedMotion ? "animated-gradient-card" : "",
    className,
  );

  if (reducedMotion) {
    return (
      <MotionTag
        onClick={onClick}
        className={sharedClassName}
        disabled={as === "button" ? disabled : undefined}
        {...props}
      >
        {children}
      </MotionTag>
    );
  }

  return (
    <MotionTag
      onClick={onClick}
      whileHover={
        interactive
          ? {
              y: -6,
              scale: 1.03,
              boxShadow: "0 20px 40px rgba(79, 70, 229, 0.24)",
            }
          : undefined
      }
      whileTap={interactive ? { scale: 0.98 } : undefined}
      transition={transitions.springFast}
      className={sharedClassName}
      disabled={as === "button" ? disabled : undefined}
      {...props}
    >
      {children}
    </MotionTag>
  );
}
