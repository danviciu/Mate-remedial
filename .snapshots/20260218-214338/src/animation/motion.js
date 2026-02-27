import { transitions } from "../lib/motion.js";

export const fadeIn = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: transitions.easeOut },
};

export const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: transitions.springSoft },
};

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.96 },
  show: { opacity: 1, scale: 1, transition: transitions.springSoft },
};

export const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

export const staggerItem = fadeUp;
