import { useMemo, useState } from "react";
import NumberLine from "../visuals/NumberLine.jsx";
import SimpleSteps from "../visuals/SimpleSteps.jsx";
import { normalizeSimulation } from "../../content/normalizeContent.js";
import { SIMULATION_CONFIGS } from "../../content/simulationConfigs.js";
import { recordSimulatorSession } from "../../utils/learningProgressStore.js";

const INTEGERS_SIM = normalizeSimulation(SIMULATION_CONFIGS.integers, {
  moduleId: "integers",
}).simulation;

export default function IntegerSimulator() {
  const [mode, setMode] = useState(INTEGERS_SIM.defaults.mode ?? "add");
  const [start, setStart] = useState(INTEGERS_SIM.defaults.start ?? -2);
  const [delta, setDelta] = useState(INTEGERS_SIM.defaults.delta ?? 5);

  const result = useMemo(() => (mode === "add" ? start + delta : start - delta), [delta, mode, start]);
  const operationLabel = mode === "add" ? `${start} + ${delta}` : `${start} - ${delta}`;

  const steps = useMemo(() => {
    const direction = mode === "add" ? "dreapta" : "stanga";
    return [
      `Pornim din ${start}.`,
      `${mode === "add" ? "Adunam" : "Scadem"} ${delta}.`,
      `Pe axa ne mutam ${direction} cu ${delta} unitati.`,
      `Ajungem la ${result}.`,
    ];
  }, [delta, mode, result, start]);

  return (
    <div className="rounded-3xl bg-white/85 p-4 shadow">
      <div className="mb-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setMode("add")}
          className={`rounded-2xl px-4 py-2 text-base font-bold ${mode === "add" ? "bg-orange-600 text-white" : "bg-orange-100 text-orange-700"}`}
        >
          Adunare
        </button>
        <button
          type="button"
          onClick={() => setMode("sub")}
          className={`rounded-2xl px-4 py-2 text-base font-bold ${mode === "sub" ? "bg-orange-600 text-white" : "bg-orange-100 text-orange-700"}`}
        >
          Scadere
        </button>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl bg-orange-50 p-3">
          <p className="text-sm font-semibold text-slate-600">Marker start (tragere pe slider)</p>
          <input
            type="range"
            min="-10"
            max="10"
            value={start}
            onChange={(event) => setStart(Number(event.target.value))}
            className="w-full"
          />
          <p className="mt-2 text-xl font-black text-orange-700">Start: {start}</p>

          <p className="mt-3 text-sm font-semibold text-slate-600">Pas</p>
          <input
            type="range"
            min="0"
            max="10"
            value={delta}
            onChange={(event) => setDelta(Number(event.target.value))}
            className="w-full"
          />
          <p className="mt-2 text-xl font-black text-orange-700">Pas: {delta}</p>
        </div>

        <div>
          <NumberLine min={-10} max={10} value={result} highlights={[start]} compact />
          <p className="mt-2 text-center text-2xl font-black text-orange-700">
            {operationLabel} = {result}
          </p>
        </div>
      </div>

      <div className="mt-3">
        <SimpleSteps steps={steps} current={steps.length} compact />
      </div>

      <button
        type="button"
        onClick={() => recordSimulatorSession("integers", { win: true, attempts: 1, lastMode: mode })}
        className="mt-3 rounded-2xl bg-emerald-600 px-4 py-2 text-base font-bold text-white hover:bg-emerald-700"
      >
        Am inteles miscarea pe axa
      </button>
    </div>
  );
}
