import confetti from "canvas-confetti";
import { getUiAnimationsEnabled } from "./motion.js";

function prefersReducedMotion() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function burstConfetti({
  particleCount = 80,
  durationMs = 900,
  originX = 0.5,
  originY = 0.25,
} = {}) {
  if (
    typeof window === "undefined" ||
    !getUiAnimationsEnabled() ||
    prefersReducedMotion()
  ) {
    return;
  }

  const count = Math.max(20, Math.floor(particleCount));
  const end = Date.now() + Math.max(450, durationMs);

  const launch = () => {
    confetti({
      particleCount: Math.max(5, Math.round(count * 0.16)),
      spread: 72,
      startVelocity: 35,
      origin: { x: originX, y: originY },
      colors: ["#4f46e5", "#14b8a6", "#22c55e", "#f97316", "#f43f5e"],
      scalar: 0.95,
      gravity: 0.95,
    });
    if (Date.now() < end) {
      window.requestAnimationFrame(launch);
    }
  };

  launch();
}
