import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";

export const UI_ANIMATIONS_STORAGE_KEY = "ui_animations";
export const UI_ANIMATIONS_EVENT = "mate-ui-animations-updated";

export const transitions = {
  springFast: {
    type: "spring",
    stiffness: 320,
    damping: 24,
    mass: 0.8,
  },
  springSoft: {
    type: "spring",
    stiffness: 220,
    damping: 24,
    mass: 1,
  },
  easeOut: {
    duration: 0.25,
    ease: [0.22, 1, 0.36, 1],
  },
};

export const pageVariants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: transitions.springSoft },
  exit: { opacity: 0, y: -10, transition: transitions.easeOut },
};

export const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

export const staggerItem = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: transitions.springSoft },
};

export const popCorrect = {
  scale: [1, 1.04, 1],
  transition: { duration: 0.25, ease: "easeOut" },
};

export const shakeWrong = {
  x: [0, -6, 6, -4, 4, 0],
  transition: { duration: 0.28, ease: "easeOut" },
};

export function getUiAnimationsEnabled() {
  if (typeof window === "undefined") return true;
  const value = window.localStorage.getItem(UI_ANIMATIONS_STORAGE_KEY);
  return value !== "false";
}

export function setUiAnimationsEnabled(enabled) {
  const safeValue = Boolean(enabled);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(UI_ANIMATIONS_STORAGE_KEY, safeValue ? "true" : "false");
    window.dispatchEvent(new CustomEvent(UI_ANIMATIONS_EVENT, { detail: safeValue }));
  }
  return safeValue;
}

export function useUiAnimationsEnabled() {
  const [enabled, setEnabled] = useState(() => getUiAnimationsEnabled());

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const onCustomUpdate = (event) => {
      setEnabled(Boolean(event.detail));
    };

    const onStorage = (event) => {
      if (event.key === UI_ANIMATIONS_STORAGE_KEY) {
        setEnabled(event.newValue !== "false");
      }
    };

    window.addEventListener(UI_ANIMATIONS_EVENT, onCustomUpdate);
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener(UI_ANIMATIONS_EVENT, onCustomUpdate);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return enabled;
}

export function usePrefersReducedMotion() {
  return useReducedMotion() ?? false;
}

export function useShouldReduceMotion() {
  const prefersReduced = usePrefersReducedMotion();
  const uiAnimationsEnabled = useUiAnimationsEnabled();
  return prefersReduced || !uiAnimationsEnabled;
}

export function useMotionEnabled() {
  return !useShouldReduceMotion();
}

export const springFast = transitions.springFast;
export const springSoft = transitions.springSoft;
export const fadeUp = staggerItem;
export const fadeIn = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: transitions.easeOut },
};
export const pageVariant = pageVariants;
export const shouldReduceMotion = useShouldReduceMotion;
