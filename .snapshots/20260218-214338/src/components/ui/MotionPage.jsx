import { motion as Motion } from "framer-motion";
import { pageVariants, shouldReduceMotion } from "../../lib/motion.js";

export default function MotionPage({ className, children, ...props }) {
  const reducedMotion = shouldReduceMotion();

  if (reducedMotion) {
    return (
      <div className={className} {...props}>
        {children}
      </div>
    );
  }

  return (
    <Motion.div
      initial="hidden"
      animate="show"
      exit="exit"
      variants={pageVariants}
      className={className}
      {...props}
    >
      {children}
    </Motion.div>
  );
}

