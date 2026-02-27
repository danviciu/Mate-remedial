export default function BalanceVisual({ left = "", right = "" }) {
  return (
    <div className="w-full rounded-2xl border border-cyan-200 bg-cyan-50/80 p-4">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="rounded-xl border-2 border-cyan-300 bg-white p-3 text-center text-lg font-bold text-cyan-900">
          {left}
        </div>
        <div className="text-2xl font-black text-cyan-700">=</div>
        <div className="rounded-xl border-2 border-cyan-300 bg-white p-3 text-center text-lg font-bold text-cyan-900">
          {right}
        </div>
      </div>
      <p className="mt-3 text-sm font-semibold text-cyan-800">
        Pastreaza echilibrul: facem aceeasi operatie in ambele parti.
      </p>
    </div>
  );
}
