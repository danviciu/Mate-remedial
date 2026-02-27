import { useMemo, useState } from "react";
import PercentGrid from "../visuals/PercentGrid.jsx";
import { normalizeSimulation } from "../../content/normalizeContent.js";
import { SIMULATION_CONFIGS } from "../../content/simulationConfigs.js";
import { recordSimulatorSession } from "../../utils/learningProgressStore.js";

const PRESETS = [20, 50, 100, 200];
const PERCENTS_SIM = normalizeSimulation(SIMULATION_CONFIGS.percents, {
  moduleId: "percents",
}).simulation;

export default function PercentSimulator() {
  const [percent, setPercent] = useState(PERCENTS_SIM.defaults.percent ?? 25);
  const [base, setBase] = useState(PERCENTS_SIM.defaults.base ?? 100);
  const [method, setMethod] = useState(PERCENTS_SIM.defaults.method ?? "ten");
  const [visualMode, setVisualMode] = useState("result");

  const result = useMemo(() => Math.round((percent / 100) * base * 100) / 100, [base, percent]);
  const tenPercent = useMemo(() => base / 10, [base]);
  const onePercent = useMemo(() => base / 100, [base]);
  const visualPercent = useMemo(() => {
    if (visualMode === "percent") return percent;
    return Math.max(0, Math.min(100, result));
  }, [percent, result, visualMode]);
  const visualTotalCells = useMemo(
    () => (visualMode === "percent" ? 100 : Math.max(1, Math.round(base))),
    [base, visualMode],
  );
  const visualFilledCells = useMemo(
    () => (visualMode === "percent" ? percent : result),
    [percent, result, visualMode],
  );
  const visualLabel =
    visualMode === "percent"
      ? `${percent}%`
      : `${result} din ${Math.max(0, Math.round(base))} (rezultat)`;

  const steps = useMemo(() => {
    if (method === "ten") {
      return [
        `10% din ${base} = ${tenPercent}`,
        `1% din ${base} = ${onePercent}`,
        `${percent}% din ${base} = ${percent} * ${onePercent} = ${result}`,
      ];
    }
    return [
      `${percent}% = ${percent} / 100 = ${percent / 100}`,
      `${percent / 100} * ${base}`,
      `Rezultat = ${result}`,
    ];
  }, [base, method, onePercent, percent, result, tenPercent]);

  return (
    <div className="rounded-3xl bg-white/85 p-4 shadow">
      <div className="grid gap-3 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-sm font-semibold text-slate-600">Procent</p>
          <input
            type="range"
            min="0"
            max="100"
            value={percent}
            onChange={(event) => setPercent(Number(event.target.value))}
            className="w-full"
          />
          <p className="mt-1 text-xl font-black text-emerald-700">{percent}%</p>

          <div className="mt-3 rounded-2xl bg-emerald-50 p-3">
            <p className="mb-2 text-sm font-semibold text-slate-600">N (numarul de baza)</p>
            <div className="mb-2 flex flex-wrap gap-2">
              {PRESETS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setBase(value)}
                  className={`rounded-xl px-3 py-1.5 text-base font-black ${
                    base === value ? "bg-emerald-600 text-white" : "bg-white text-emerald-700"
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
            <input
              type="number"
              value={base}
              onChange={(event) => setBase(Math.max(0, Number(event.target.value) || 0))}
              className="w-full rounded-xl border border-emerald-200 px-3 py-2 text-base font-semibold"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setVisualMode("result")}
              className={`rounded-xl px-3 py-1.5 text-sm font-bold ${
                visualMode === "result"
                  ? "bg-emerald-600 text-white"
                  : "bg-emerald-100 text-emerald-700"
              }`}
            >
              Vizual rezultat
            </button>
            <button
              type="button"
              onClick={() => setVisualMode("percent")}
              className={`rounded-xl px-3 py-1.5 text-sm font-bold ${
                visualMode === "percent"
                  ? "bg-emerald-600 text-white"
                  : "bg-emerald-100 text-emerald-700"
              }`}
            >
              Vizual procent
            </button>
          </div>
          <PercentGrid
            percent={visualPercent}
            totalCells={visualTotalCells}
            filledCells={visualFilledCells}
            label={visualLabel}
            compact
          />
          <p className="text-xs font-semibold text-slate-600">
            In modul „Vizual rezultat”, cuburile se actualizeaza cand schimbi N.
          </p>
        </div>
      </div>

      <div className="mt-3 rounded-2xl bg-white p-3">
        <div className="mb-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setMethod("ten")}
            className={`rounded-xl px-3 py-2 text-sm font-bold ${method === "ten" ? "bg-indigo-600 text-white" : "bg-indigo-100 text-indigo-700"}`}
          >
            Metoda 10% / 1%
          </button>
          <button
            type="button"
            onClick={() => setMethod("mul")}
            className={`rounded-xl px-3 py-2 text-sm font-bold ${method === "mul" ? "bg-indigo-600 text-white" : "bg-indigo-100 text-indigo-700"}`}
          >
            Metoda inmultire
          </button>
        </div>
        <p className="text-2xl font-black text-indigo-700">
          {percent}% din {base} = {result}
        </p>
        <div className="mt-3 grid gap-2">
          {steps.map((line) => (
            <p key={line} className="rounded-xl bg-indigo-50 px-3 py-2 text-base text-indigo-800">
              {line}
            </p>
          ))}
        </div>

        <button
          type="button"
          onClick={() => recordSimulatorSession("percents", { win: true, attempts: 1, lastMethod: method })}
          className="mt-3 rounded-2xl bg-emerald-600 px-4 py-2 text-base font-bold text-white hover:bg-emerald-700"
        >
          Am inteles acest calcul
        </button>
      </div>
    </div>
  );
}
