import { AnimatePresence, motion as Motion } from "framer-motion";
import { shouldReduceMotion } from "../lib/motion.js";

export default function PageTransition({ routeKey, children }) {
  const reduceMotion = shouldReduceMotion();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <Motion.div
        key={routeKey}
        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
        animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
        exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        {children}
      </Motion.div>
    </AnimatePresence>
  );
}
