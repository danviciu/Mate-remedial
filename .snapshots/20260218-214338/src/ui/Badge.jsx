function cx(...values) {
  return values.filter(Boolean).join(" ");
}

const VARIANT_CLASSES = {
  indigo: "bg-indigo-100 text-indigo-700 border-indigo-200",
  emerald: "bg-emerald-100 text-emerald-700 border-emerald-200",
  amber: "bg-amber-100 text-amber-700 border-amber-200",
  rose: "bg-rose-100 text-rose-700 border-rose-200",
  slate: "bg-slate-100 text-slate-700 border-slate-200",
};

export default function Badge({ children, className, variant = "indigo" }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide",
        VARIANT_CLASSES[variant] ?? VARIANT_CLASSES.indigo,
        className,
      )}
    >
      {children}
    </span>
  );
}
