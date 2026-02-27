import { useMemo, useState } from "react";
import BalanceScale from "../visuals/BalanceScale.jsx";
import SimpleSteps from "../visuals/SimpleSteps.jsx";
import { normalizeSimulation } from "../../content/normalizeContent.js";
import { SIMULATION_CONFIGS } from "../../content/simulationConfigs.js";
import { recordSimulatorSession } from "../../utils/learningProgressStore.js";

const TYPES = [
  { id: "x_plus_a", label: "x + a = b" },
  { id: "x_minus_a", label: "x - a = b" },
  { id: "ax_b", label: "a*x = b" },
  { id: "x_div_a", label: "x/a = b" },
  { id: "paren", label: "a(x+b)=c" },
];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function buildScenario(type) {
  if (type === "x_plus_a") {
    const a = randomInt(2, 9);
    const x = randomInt(1, 9);
    const b = x + a;
    return {
      prompt: `x + ${a} = ${b}`,
      answer: x,
      steps: [
        { text: `Pornim de la x + ${a} = ${b}.`, left: `x+${a}`, right: `${b}`, tilt: "balanced", operation: null },
        { text: `Scadem ${a} din ambele parti.`, left: "x", right: `${b - a}`, tilt: "balanced", operation: `-${a}` },
        { text: `Rezultat: x = ${x}.`, left: "x", right: `${x}`, tilt: "balanced", operation: null },
      ],
    };
  }

  if (type === "x_minus_a") {
    const a = randomInt(2, 8);
    const x = randomInt(5, 14);
    const b = x - a;
    return {
      prompt: `x - ${a} = ${b}`,
      answer: x,
      steps: [
        { text: `Pornim de la x - ${a} = ${b}.`, left: `x-${a}`, right: `${b}`, tilt: "balanced", operation: null },
        { text: `Adunam ${a} in ambele parti.`, left: "x", right: `${b + a}`, tilt: "balanced", operation: `+${a}` },
        { text: `Rezultat: x = ${x}.`, left: "x", right: `${x}`, tilt: "balanced", operation: null },
      ],
    };
  }

  if (type === "ax_b") {
    const x = randomInt(2, 9);
    const a = randomInt(2, 6);
    const b = a * x;
    return {
      prompt: `${a}x = ${b}`,
      answer: x,
      steps: [
        { text: `Pornim de la ${a}x = ${b}.`, left: `${a}x`, right: `${b}`, tilt: "balanced", operation: null },
        { text: `Impartim la ${a} in ambele parti.`, left: "x", right: `${b / a}`, tilt: "balanced", operation: `:${a}` },
        { text: `Rezultat: x = ${x}.`, left: "x", right: `${x}`, tilt: "balanced", operation: null },
      ],
    };
  }

  if (type === "x_div_a") {
    const a = randomInt(2, 6);
    const b = randomInt(2, 9);
    const x = a * b;
    return {
      prompt: `x/${a} = ${b}`,
      answer: x,
      steps: [
        { text: `Pornim de la x/${a} = ${b}.`, left: `x/${a}`, right: `${b}`, tilt: "balanced", operation: null },
        { text: `Inmultim cu ${a} in ambele parti.`, left: "x", right: `${b * a}`, tilt: "balanced", operation: `*${a}` },
        { text: `Rezultat: x = ${x}.`, left: "x", right: `${x}`, tilt: "balanced", operation: null },
      ],
    };
  }

  const a = randomInt(2, 4);
  const x = randomInt(2, 8);
  const b = randomInt(1, 5);
  const c = a * (x + b);
  return {
    prompt: `${a}(x+${b}) = ${c}`,
    answer: x,
    steps: [
      { text: `Pornim de la ${a}(x+${b})=${c}.`, left: `${a}(x+${b})`, right: `${c}`, tilt: "balanced", operation: null },
      { text: `Distribuim: ${a}x + ${a * b} = ${c}.`, left: `${a}x+${a * b}`, right: `${c}`, tilt: "balanced", operation: "distribuie" },
      { text: `Scadem ${a * b}: ${a}x = ${c - a * b}.`, left: `${a}x`, right: `${c - a * b}`, tilt: "balanced", operation: `-${a * b}` },
      { text: `Impartim la ${a}: x = ${x}.`, left: "x", right: `${x}`, tilt: "balanced", operation: `:${a}` },
    ],
  };
}

export default function EquationSimulator() {
  const config = normalizeSimulation(SIMULATION_CONFIGS.equations, {
    moduleId: "equations",
  }).simulation;
  const [type, setType] = useState(config.defaults.type ?? "x_plus_a");
  const [scenario, setScenario] = useState(() => buildScenario(config.defaults.type ?? "x_plus_a"));
  const [stepIndex, setStepIndex] = useState(0);

  const step = scenario.steps[stepIndex] ?? scenario.steps[0];
  const previousStep = scenario.steps[Math.max(stepIndex - 1, 0)] ?? step;
  const stepTitles = useMemo(() => scenario.steps.map((item) => item.text), [scenario.steps]);
  const operationHint = step.operation
    ? `Aplicam ${step.operation} pe ambele parti: ${previousStep.left} = ${previousStep.right} devine ${step.left} = ${step.right}.`
    : "Balanta arata egalitatea: ce facem in stanga facem si in dreapta.";

  const refresh = () => {
    const next = buildScenario(type);
    setScenario(next);
    setStepIndex(0);
  };

  return (
    <div className="rounded-3xl bg-white/85 p-4 shadow">
      <div className="mb-3 flex flex-wrap gap-2">
        {TYPES.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setType(item.id);
              const next = buildScenario(item.id);
              setScenario(next);
              setStepIndex(0);
            }}
            className={`rounded-xl px-3 py-2 text-sm font-bold ${
              type === item.id ? "bg-cyan-600 text-white" : "bg-cyan-100 text-cyan-700"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <p className="mb-1 text-2xl font-black text-cyan-700">{scenario.prompt}</p>
      <p className="mb-3 text-base font-semibold text-slate-700">{step.text}</p>
      <p className="mb-3 rounded-xl bg-cyan-50 px-3 py-2 text-sm font-semibold text-cyan-800">
        {operationHint}
      </p>

      <div className="grid gap-3 xl:grid-cols-[1.2fr_1fr]">
        <BalanceScale
          left={step.left}
          right={step.right}
          tilt={step.tilt}
          operation={step.operation}
          pulseToken={`${scenario.prompt}-${stepIndex}`}
          compact
        />
        <SimpleSteps steps={stepTitles} current={stepIndex + 1} compact />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setStepIndex((prev) => Math.max(prev - 1, 0))}
          className="rounded-xl bg-slate-100 px-4 py-2 text-base font-bold text-slate-700"
        >
          Inapoi
        </button>
        <button
          type="button"
          onClick={() => setStepIndex((prev) => Math.min(prev + 1, scenario.steps.length - 1))}
          className="rounded-xl bg-cyan-600 px-4 py-2 text-base font-bold text-white"
        >
          Pas urmator
        </button>
        <button
          type="button"
          onClick={refresh}
          className="rounded-xl bg-white px-4 py-2 text-base font-bold text-cyan-700"
        >
          Exemplu random
        </button>
      </div>

      <button
        type="button"
        onClick={() => recordSimulatorSession("equations", { win: stepIndex >= scenario.steps.length - 1, attempts: 1, type })}
        className="mt-3 rounded-2xl bg-emerald-600 px-4 py-2 text-base font-bold text-white hover:bg-emerald-700"
      >
        Am inteles pasii ecuatiei (x = {scenario.answer})
      </button>
    </div>
  );
}
