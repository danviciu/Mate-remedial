import { useEffect, useRef } from "react";
import { AnimatePresence, motion as Motion } from "framer-motion";
import { X } from "lucide-react";
import { shouldReduceMotion } from "../lib/motion.js";

function getFocusable(root) {
  if (!root) return [];
  return Array.from(
    root.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((node) => !node.hasAttribute("disabled"));
}

function cx(...values) {
  return values.filter(Boolean).join(" ");
}

export default function Modal({
  open,
  onClose,
  title,
  children,
  ariaLabel,
  maxWidth = "max-w-4xl",
  panelClassName,
  overlayClassName,
  closeOnOverlay = true,
  showClose = true,
  footer = null,
}) {
  const reduceMotion = shouldReduceMotion();
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose?.();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = getFocusable(panelRef.current);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.setTimeout(() => getFocusable(panelRef.current)[0]?.focus(), 0);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose, open]);

  return (
    <AnimatePresence>
      {open ? (
        <Motion.div
          className={cx(
            "fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm",
            overlayClassName,
          )}
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={reduceMotion ? undefined : { opacity: 1 }}
          exit={reduceMotion ? undefined : { opacity: 0 }}
          onClick={closeOnOverlay ? () => onClose?.() : undefined}
        >
          <Motion.section
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel ?? title ?? "Dialog"}
            className={cx(
              "flex w-full max-h-[92vh] flex-col overflow-hidden rounded-3xl border border-white/70 bg-white shadow-2xl",
              maxWidth,
              panelClassName,
            )}
            initial={reduceMotion ? false : { opacity: 0, y: 14, scale: 0.97 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
            onClick={(event) => event.stopPropagation()}
          >
            {(title || showClose) && (
              <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
                <h2 className="text-lg font-black text-slate-800 sm:text-xl">{title}</h2>
                {showClose ? (
                  <button
                    type="button"
                    onClick={() => onClose?.()}
                    aria-label="Închide"
                    className="rounded-xl bg-slate-100 p-2 text-slate-700 transition hover:bg-slate-200"
                  >
                    <X size={18} />
                  </button>
                ) : null}
              </header>
            )}

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">{children}</div>

            {footer ? (
              <footer className="border-t border-slate-100 px-5 py-4 sm:px-6">{footer}</footer>
            ) : null}
          </Motion.section>
        </Motion.div>
      ) : null}
    </AnimatePresence>
  );
}
