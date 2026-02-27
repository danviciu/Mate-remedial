import { useMemo, useState } from "react";
import { motion as Motion } from "framer-motion";
import FractionCircle from "../visuals/FractionCircle.jsx";
import { shouldReduceMotion } from "../../lib/motion.js";
import { normalizeSimulation } from "../../content/normalizeContent.js";
import { SIMULATION_CONFIGS } from "../../content/simulationConfigs.js";
import { recordSimulatorSession } from "../../utils/learningProgressStore.js";

const FRACTIONS_SIM = normalizeSimulation(SIMULATION_CONFIGS.fractions, {
  moduleId: "fractions",
}).simulation;
const DENOMS = FRACTIONS_SIM.constraints.denoms ?? [2, 3, 4, 5, 6, 8, 10, 12];

function gcd(a, b) {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

function simplify(numerator, denominator) {
  const d = Math.max(1, Math.abs(denominator));
  const div = gcd(numerator, d);
  return { numerator: numerator / div, denominator: d / div };
}

export default function FractionSimulator() {
  const reducedMotion = shouldReduceMotion();
  const [tab, setTab] = useState(FRACTIONS_SIM.defaults.mode ?? "add");
  const [denom, setDenom] = useState(FRACTIONS_SIM.defaults.denom ?? 4);
  const [a, setA] = useState(FRACTIONS_SIM.defaults.leftNumerator ?? 1);
  const [b, setB] = useState(FRACTIONS_SIM.defaults.rightNumerator ?? 2);

  const clampToDenom = (value) => Math.min(Math.max(value, 0), denom);
  const clampB = (value, currentA = a) =>
    tab === "sub" ? Math.min(Math.max(value, 0), currentA) : clampToDenom(value);

  const incA = (delta) =>
    setA((prev) => {
      const nextA = clampToDenom(prev + delta);
      if (tab === "sub") {
        setB((prevB) => clampB(prevB, nextA));
      }
      return nextA;
    });
  const incB = (delta) => setB((prev) => clampB(prev + delta));

  const computed = useMemo(() => {
    const add = a + b;
    const sub = a - b;
    const rel = a === b ? "=" : a > b ? ">" : "<";
    const bigger = a === b ? "egale" : a > b ? "prima" : "a doua";
    const addWhole = Math.floor(add / denom);
    const addRemainder = add % denom;
    const addSimplified = simplify(add, denom);
    const subSimplified = simplify(sub, denom);
    return { add, sub, rel, bigger, addWhole, addRemainder, addSimplified, subSimplified };
  }, [a, b, denom]);

  const compareExplain = useMemo(() => {
    return "Au acelasi numitor, deci comparam numaratorii.";
  }, []);

  const onSuccess = () => {
    recordSimulatorSession("fractions", { win: true, attempts: 1, lastTab: tab });
  };

  return (
    <div className="rounded-3xl bg-white/85 p-4 shadow">
      <div className="mb-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTab("add")}
          className={`rounded-2xl px-4 py-2 text-base font-bold ${tab === "add" ? "bg-indigo-600 text-white" : "bg-indigo-100 text-indigo-700"}`}
        >
          Adunare
        </button>
        <button
          type="button"
          onClick={() => {
            setTab("sub");
            setB((prev) => Math.min(prev, a));
          }}
          className={`rounded-2xl px-4 py-2 text-base font-bold ${tab === "sub" ? "bg-indigo-600 text-white" : "bg-indigo-100 text-indigo-700"}`}
        >
          - Scadere
        </button>
        <button
          type="button"
          onClick={() => setTab("cmp")}
          className={`rounded-2xl px-4 py-2 text-base font-bold ${tab === "cmp" ? "bg-indigo-600 text-white" : "bg-indigo-100 text-indigo-700"}`}
        >
          Comparare
        </button>
      </div>

      <div className="mb-3 rounded-2xl bg-indigo-50 p-3">
        <p className="mb-2 text-sm font-semibold text-slate-600">Numitor</p>
        <div className="flex flex-wrap gap-2">
          {DENOMS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setDenom(value);
                setA((prev) => {
                  const nextA = Math.min(prev, value);
                  setB((prevB) => {
                    const nextB = Math.min(prevB, value);
                    return tab === "sub" ? Math.min(nextB, nextA) : nextB;
                  });
                  return nextA;
                });
              }}
              className={`h-10 min-w-10 rounded-xl px-3 text-base font-black ${
                denom === value ? "bg-indigo-600 text-white" : "bg-white text-indigo-700"
              }`}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Counter title="Fractia 1" value={a} denom={denom} onChange={incA} />
        <Counter title="Fractia 2" value={b} denom={denom} onChange={incB} />
      </div>

      <div className="mt-3 grid gap-2.5 lg:grid-cols-3">
        <div className="rounded-2xl bg-indigo-50 p-3">
          <p className="text-center text-base font-black text-indigo-700">{a}/{denom}</p>
          <div className="mt-2 flex justify-center">
            <FractionCircle numer={a} denom={denom} size={132} showLabel={false} />
          </div>
        </div>

        <div className="rounded-2xl bg-cyan-50 p-3">
          <p className="text-center text-base font-black text-cyan-700">{b}/{denom}</p>
          <div className="mt-2 flex justify-center">
            <FractionCircle numer={b} denom={denom} size={132} showLabel={false} />
          </div>
        </div>

        <Motion.div
          className="rounded-2xl bg-emerald-50 p-3"
          animate={reducedMotion ? undefined : { scale: [1, 1.01, 1] }}
          transition={reducedMotion ? undefined : { duration: 0.6 }}
        >
          {tab === "add" ? (
            <>
              <p className="text-center text-xl font-black text-emerald-700">
                {a}/{denom} + {b}/{denom} = {computed.add}/{denom}
              </p>
              {(computed.addSimplified.numerator !== computed.add ||
                computed.addSimplified.denominator !== denom) ? (
                <p className="mt-1 text-center text-base font-semibold text-emerald-700">
                  Simplificat: {computed.addSimplified.numerator}/{computed.addSimplified.denominator}
                </p>
              ) : null}
              <div className="mt-2 flex justify-center">
                <FractionCircle numer={computed.addRemainder} denom={denom} size={132} showLabel={false} />
              </div>
              {computed.addWhole > 0 ? (
                <p className="mt-2 text-center text-sm font-semibold text-slate-700">
                  Rezultat impropriu: {computed.addWhole} intreg si {computed.addRemainder}/{denom}
                </p>
              ) : null}
            </>
          ) : null}

          {tab === "sub" ? (
            <>
              <p className="text-center text-xl font-black text-emerald-700">
                {a}/{denom} - {b}/{denom} = {computed.sub}/{denom}
              </p>
              {(computed.subSimplified.numerator !== computed.sub ||
                computed.subSimplified.denominator !== denom) ? (
                <p className="mt-1 text-center text-base font-semibold text-emerald-700">
                  Simplificat: {computed.subSimplified.numerator}/{computed.subSimplified.denominator}
                </p>
              ) : null}
              <div className="mt-2 flex justify-center">
                <FractionCircle numer={computed.sub} denom={denom} size={132} showLabel={false} />
              </div>
              <p className="mt-2 text-center text-sm font-semibold text-slate-700">
                In modul scadere, Fractia 2 nu poate depasi Fractia 1.
              </p>
            </>
          ) : null}

          {tab === "cmp" ? (
            <>
              <p className="text-center text-xl font-black text-emerald-700">
                {a}/{denom} {computed.rel} {b}/{denom}
              </p>
              <p className="mt-2 text-center text-base font-semibold text-slate-700">
                {computed.bigger === "egale"
                  ? "Fractiile sunt egale."
                  : `Fractia ${computed.bigger} este mai mare.`}
              </p>
              <p className="mt-2 rounded-xl bg-white p-2 text-sm text-slate-600">{compareExplain}</p>
            </>
          ) : null}
        </Motion.div>
      </div>

      <button
        type="button"
        onClick={onSuccess}
        className="mt-3 rounded-2xl bg-emerald-600 px-4 py-2 text-base font-bold text-white hover:bg-emerald-700"
      >
        Am inteles acest exemplu
      </button>
    </div>
  );
}

function Counter({ title, value, denom, onChange }) {
  return (
    <div className="rounded-2xl bg-white p-3 shadow">
      <p className="mb-2 text-base font-black text-slate-700">{title}</p>
      <div className="flex items-center justify-center gap-2.5">
        <button type="button" onClick={() => onChange(-1)} className="h-10 w-10 rounded-xl bg-slate-100 text-xl font-black">
          -
        </button>
        <div className="min-w-24 rounded-xl bg-indigo-50 px-3 py-2 text-center">
          <p className="text-2xl font-black text-indigo-700">{value}</p>
          <p className="text-sm font-semibold text-indigo-600">din {denom}</p>
        </div>
        <button type="button" onClick={() => onChange(1)} className="h-10 w-10 rounded-xl bg-slate-100 text-xl font-black">
          +
        </button>
      </div>
    </div>
  );
}

