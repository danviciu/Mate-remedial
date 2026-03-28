import { useState } from "react";
import { motion as Motion } from "framer-motion";
import MotionPage from "../components/ui/MotionPage.jsx";
import { shouldReduceMotion, springFast } from "../lib/motion.js";
import { useSettings } from "../context/AppSettingsContext.jsx";
import { resetLearningProgress } from "../utils/learningProgressStore.js";
import { resetProgress, setStudentInfo } from "../utils/progressStore.js";
import { useProgress } from "../utils/useProgress.js";

const DIFFICULTY_OPTIONS = [
  {
    value: "mixed",
    label: "Mix 1-2-3 (recomandat)",
    hint: "Ruleaza exercitii in cicluri usor -> mediu -> greu.",
  },
  {
    value: "easy",
    label: "Doar usor",
    hint: "Selecteaza doar exercitii cu dificultate 1.",
  },
  {
    value: "medium",
    label: "Doar mediu",
    hint: "Selecteaza doar exercitii cu dificultate 2.",
  },
  {
    value: "hard",
    label: "Doar greu",
    hint: "Selecteaza doar exercitii cu dificultate 3.",
  },
];

export default function Settings({ goHome }) {
  const {
    settings,
    setAnimations,
    setSounds,
    setStudentName,
    setSuperSimpleMode,
    setExerciseDifficultyMode,
    prefersReducedMotion,
  } = useSettings();
  const progress = useProgress();
  const reducedMotion = shouldReduceMotion();
  const [name, setName] = useState(settings.studentName || progress.student?.name || "");
  const [studentClass, setStudentClass] = useState(progress.student?.class ?? "");
  const [saved, setSaved] = useState(false);

  const buttonMotionProps = reducedMotion
    ? {}
    : {
        whileHover: { y: -2, scale: 1.01 },
        whileTap: { scale: 0.98 },
        transition: springFast,
      };

  const save = () => {
    const safeName = name.trim();
    setStudentName(safeName);
    setStudentInfo({ name: safeName, class: studentClass });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1200);
  };

  const handleReset = () => {
    const ok = window.confirm(
      "Sigur vrei sa stergi tot progresul? Actiunea nu poate fi anulata.",
    );
    if (!ok) return;
    resetProgress();
    resetLearningProgress();
    setName("");
    setStudentClass("");
    setSaved(false);
  };

  return (
    <MotionPage className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 p-6">
      <div className="max-w-3xl mx-auto">
        <Motion.button
          type="button"
          onClick={goHome}
          className="mb-6 px-4 py-2 rounded-xl bg-white/70 shadow hover:bg-white"
          {...buttonMotionProps}
        >
          &larr; Inapoi acasa
        </Motion.button>

        <div className="bg-white/80 rounded-2xl shadow-lg p-6 border border-indigo-100">
          <h1 className="text-3xl font-bold text-indigo-700 mb-2">Setari elev</h1>
          <p className="text-gray-600 mb-6">
            Completeaza datele elevului si administreaza progresul salvat local.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Nume elev
              </label>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-xl border border-indigo-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="Ex: Popescu Andrei"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Clasa
              </label>
              <select
                value={studentClass}
                onChange={(event) => setStudentClass(event.target.value)}
                className="w-full rounded-xl border border-indigo-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                <option value="">Alege clasa</option>
                <option value="V">V</option>
                <option value="VI">VI</option>
                <option value="VII">VII</option>
              </select>
            </div>

            <label className="flex items-start gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3">
              <input
                type="checkbox"
                checked={settings.animations}
                onChange={(event) => setAnimations(event.target.checked)}
                className="mt-1 h-4 w-4"
              />
              <span>
                <span className="block text-sm font-semibold text-indigo-700">Animatii: ON/OFF</span>
                <span className="block text-xs text-indigo-600">
                  Cand este OFF, animatiile sunt reduse in toata aplicatia.
                </span>
              </span>
            </label>

            <label className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <input
                type="checkbox"
                checked={settings.sounds}
                onChange={(event) => setSounds(event.target.checked)}
                className="mt-1 h-4 w-4"
              />
              <span>
                <span className="block text-sm font-semibold text-emerald-700">Sunete: ON/OFF</span>
                <span className="block text-xs text-emerald-600">
                  Activeaza sau dezactiveaza efectele audio discrete.
                </span>
              </span>
            </label>

            <label className="flex items-start gap-3 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3">
              <input
                type="checkbox"
                checked={settings.superSimpleMode === true}
                onChange={(event) => setSuperSimpleMode(event.target.checked)}
                className="mt-1 h-4 w-4"
              />
              <span>
                <span className="block text-sm font-semibold text-cyan-800">Mod super simplu</span>
                <span className="block text-xs text-cyan-700">
                  In exercitii, afiseaza hint-uri pe niveluri (1-2-3) si explica mai ghidat.
                </span>
              </span>
            </label>

            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <label
                htmlFor="exerciseDifficultyMode"
                className="block text-sm font-semibold text-amber-900 mb-2"
              >
                Selectie dificultate exercitii
              </label>
              <select
                id="exerciseDifficultyMode"
                value={settings.exerciseDifficultyMode ?? "mixed"}
                onChange={(event) => setExerciseDifficultyMode(event.target.value)}
                className="w-full rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-300"
              >
                {DIFFICULTY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-amber-700">
                {
                  DIFFICULTY_OPTIONS.find(
                    (option) => option.value === (settings.exerciseDifficultyMode ?? "mixed"),
                  )?.hint
                }
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-sm font-semibold text-slate-700">Reduce motion sistem</p>
              <p className="text-sm text-slate-600">
                {prefersReducedMotion ? "Activ in sistemul de operare." : "Inactiv in sistemul de operare."}
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Motion.button
              type="button"
              onClick={save}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition"
              {...buttonMotionProps}
            >
              Salveaza datele
            </Motion.button>
            <Motion.button
              type="button"
              onClick={handleReset}
              className="px-4 py-2 rounded-xl bg-white border border-rose-300 text-rose-700 hover:bg-rose-50 transition"
              {...buttonMotionProps}
            >
              Reseteaza progresul
            </Motion.button>
          </div>

          {saved ? (
            <p className="mt-3 text-sm font-semibold text-emerald-700">Date salvate.</p>
          ) : null}
        </div>
      </div>
    </MotionPage>
  );
}
