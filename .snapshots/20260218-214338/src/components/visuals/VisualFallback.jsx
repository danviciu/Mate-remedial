export default function VisualFallback({
  title = "Date vizuale lipsa",
  detail = "Nu putem afisa acest vizual in siguranta.",
  compact = false,
}) {
  return (
    <div
      className={`rounded-2xl border border-amber-200 bg-amber-50 text-amber-900 ${
        compact ? "p-3" : "p-4"
      }`}
      role="status"
      aria-live="polite"
    >
      <p className={`${compact ? "text-sm" : "text-base"} font-bold`}>{title}</p>
      <p className={`${compact ? "mt-1 text-xs" : "mt-1 text-sm"} opacity-85`}>{detail}</p>
    </div>
  );
}
