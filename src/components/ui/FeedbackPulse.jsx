import { motion as Motion } from "framer-motion";
import { popCorrect, shakeWrong, shouldReduceMotion } from "../../lib/motion.js";

function getAnimation(state) {
  if (state === "correct") return popCorrect;
  if (state === "wrong") return shakeWrong;
  return undefined;
}

export default function FeedbackPulse({ state = "idle", className, children }) {
  const reducedMotion = shouldReduceMotion();

  if (reducedMotion) {
    return <div className={className}>{children}</div>;
  }

  const animation = getAnimation(state);

  return (
    <Motion.div
      key={state}
      className={className}
      initial={false}
      animate={animation}
    >
      {children}
    </Motion.div>
  );
}
