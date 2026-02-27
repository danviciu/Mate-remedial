function cx(...values) {
  return values.filter(Boolean).join(" ");
}

const TONE_CLASSES = {
  indigo: "bg-indigo-50 border-indigo-200 text-indigo-800",
  emerald: "bg-emerald-50 border-emerald-200 text-emerald-800",
  amber: "bg-amber-50 border-amber-200 text-amber-800",
  rose: "bg-rose-50 border-rose-200 text-rose-800",
  slate: "bg-slate-50 border-slate-200 text-slate-800",
};

export default function StatPill({ label, value, icon: Icon, tone = "indigo", className }) {
  return (
    <div
      className={cx(
        "flex min-h-20 items-center gap-3 rounded-2xl border px-4 py-3",
        TONE_CLASSES[tone] ?? TONE_CLASSES.indigo,
        className,
      )}
    >
      {Icon ? (
        <span className="rounded-xl bg-white/80 p-2" aria-hidden="true">
          <Icon size={18} />
        </span>
      ) : null}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide opacity-85">{label}</p>
        <p className="text-2xl font-black leading-none">{value}</p>
      </div>
    </div>
  );
}
