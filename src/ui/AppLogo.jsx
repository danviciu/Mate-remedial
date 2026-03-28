function cx(...values) {
  return values.filter(Boolean).join(" ");
}

const SIZE_CLASS = {
  sm: "h-9",
  md: "h-11",
  lg: "h-14",
};

export default function AppLogo({ size = "md", withLabel = false, className }) {
  return (
    <div className={cx("inline-flex items-center gap-2", className)}>
      <img
        src={`${import.meta.env.BASE_URL}sc5logo.png`}
        alt="SC5 Logo"
        className={cx(
          "w-auto rounded-xl border border-indigo-200 bg-white/90 p-1 shadow-sm",
          SIZE_CLASS[size] ?? SIZE_CLASS.md,
        )}
        loading="lazy"
      />
      {withLabel ? (
        <span className="text-base font-black text-indigo-800 sm:text-lg">Mate Reset</span>
      ) : null}
    </div>
  );
}
