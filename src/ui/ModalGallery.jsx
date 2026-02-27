import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Modal from "./Modal.jsx";

function clampIndex(index, size) {
  if (!size) return 0;
  if (index < 0) return size - 1;
  if (index >= size) return 0;
  return index;
}

export default function ModalGallery({
  open,
  onClose,
  title = "Previzualizare",
  items = [],
  initialIndex = 0,
}) {
  const safeItems = useMemo(() => (Array.isArray(items) ? items : []), [items]);
  const [index, setIndex] = useState(() => clampIndex(initialIndex, safeItems.length));
  const safeIndex = clampIndex(index, safeItems.length);
  const active = useMemo(() => safeItems[safeIndex] ?? null, [safeIndex, safeItems]);
  const hasMany = safeItems.length > 1;

  useEffect(() => {
    if (!open || !hasMany) return undefined;
    const onKey = (event) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setIndex((prev) => clampIndex(prev - 1, safeItems.length));
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        setIndex((prev) => clampIndex(prev + 1, safeItems.length));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hasMany, open, safeItems.length]);

  return (
    <Modal open={open} onClose={onClose} title={title} maxWidth="max-w-5xl">
      {active ? (
        <div className="space-y-3">
          <div className="relative overflow-hidden rounded-2xl bg-slate-100">
            {hasMany ? (
              <>
                <button
                  type="button"
                  className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/80 p-2 text-slate-800 shadow hover:bg-white"
                  onClick={() => setIndex((prev) => clampIndex(prev - 1, safeItems.length))}
                  aria-label="Imaginea anterioară"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  type="button"
                  className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/80 p-2 text-slate-800 shadow hover:bg-white"
                  onClick={() => setIndex((prev) => clampIndex(prev + 1, safeItems.length))}
                  aria-label="Imaginea următoare"
                >
                  <ChevronRight size={20} />
                </button>
              </>
            ) : null}

            <img
              src={active.src}
              alt={active.alt ?? "Imagine"}
              className="mx-auto max-h-[62vh] w-auto object-contain"
              draggable={false}
            />
          </div>

          <div className="flex items-center justify-between text-sm text-slate-600">
            <p>{active.caption ?? ""}</p>
            {hasMany ? (
              <p className="font-semibold">
                {safeIndex + 1} / {safeItems.length}
              </p>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Nu există imagini disponibile.
        </div>
      )}
    </Modal>
  );
}
