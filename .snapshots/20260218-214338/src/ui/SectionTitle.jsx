export default function SectionTitle({ title, subtitle, icon: Icon, className }) {
  return (
    <div className={className}>
      <div className="flex items-start gap-3">
        {Icon ? (
          <span className="mt-1 rounded-xl bg-indigo-100 p-2 text-indigo-700" aria-hidden="true">
            <Icon size={20} />
          </span>
        ) : null}
        <div>
          <h2 className="text-2xl font-black text-slate-900 sm:text-3xl">{title}</h2>
          {subtitle ? <p className="mt-1 text-base text-slate-600">{subtitle}</p> : null}
        </div>
      </div>
    </div>
  );
}
