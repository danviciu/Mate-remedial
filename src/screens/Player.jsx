import { useState } from "react";
import VisualRenderer from "../components/visuals/VisualRenderer.jsx";
import { CONTENT_VALIDATION_ERRORS } from "../content/index.js";
import { useSettings } from "../context/AppSettingsContext.jsx";
import { DATASET_CONFIGS, getDatasetByKey } from "../data/exerciseDatasets.js";
import { normalizeLevelId } from "../data/modulesConfig.js";
import { recordExerciseResult } from "../utils/progressStore.js";

function getStars(mistakes, hintsUsed, explanationUsed) {
  let stars = 3;
  if (mistakes >= 2) stars -= 1;
  if (hintsUsed >= 2) stars -= 1;
  if (explanationUsed) stars -= 1;
  return Math.max(1, stars);
}

const VALIDATION_ERRORS = CONTENT_VALIDATION_ERRORS.map(
  (error) => `${error.path}: ${error.message}`,
);

function cloneItem(item, idPrefix, title) {
  const copy = JSON.parse(JSON.stringify(item));
  copy.id = `${idPrefix}-${item.id}`;
  copy.title = title;
  return copy;
}

function buildRemedialBySkill() {
  const map = {};
  Object.values(DATASET_CONFIGS).forEach((dataset) => {
    dataset.items.forEach((item) => {
      if (!item.skill || map[item.skill]) return;
      map[item.skill] = cloneItem(item, "R", "Exemplu de sprijin");
    });
  });
  return map;
}

const REMEDIAL_BY_SKILL = buildRemedialBySkill();

function renderExerciseVisual(exercise) {
  if (!exercise) return null;
  return (
    <VisualRenderer
      spec={exercise.visualSpec}
      modalTitle="Vizual exercitiu"
      withModal
    />
  );
}

function buildHintLevels(step) {
  const source = Array.isArray(step?.hints)
    ? step.hints.map((hint) => String(hint ?? "").trim()).filter(Boolean)
    : [];
  const correctChoice =
    Array.isArray(step?.choices) &&
    Number.isInteger(step?.correctIndex) &&
    step.correctIndex >= 0 &&
    step.correctIndex < step.choices.length
      ? String(step.choices[step.correctIndex])
      : null;

  const level1 = source[0] ?? "Priveste datele din enunt si compara cu vizualul.";
  const level2 =
    source[1] ??
    String(step?.explanation ?? "Foloseste relatia corecta pentru acest pas.");
  const level3 =
    source[2] ??
    (correctChoice
      ? `Aproape de raspuns: varianta corecta este "${correctChoice}".`
      : "Aproape de raspuns: urmareste explicatia pasului.");

  return [level1, level2, level3];
}

export default function Player({ module, level, onBack, onOpenLesson, onOpenSimulator }) {
  const { settings } = useSettings();
  const superSimpleMode = settings.superSimpleMode === true;

  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [mainStepIndex, setMainStepIndex] = useState(0);

  const [mode, setMode] = useState("main");
  const [returnStepIndex, setReturnStepIndex] = useState(0);
  const [remedialSkill, setRemedialSkill] = useState(null);
  const [remedialStepIndex, setRemedialStepIndex] = useState(0);
  const [showRemedialModal, setShowRemedialModal] = useState(false);

  const [selectedChoice, setSelectedChoice] = useState(null);
  const [isCorrect, setIsCorrect] = useState(false);
  const [attemptsOnStep, setAttemptsOnStep] = useState(0);
  const [visibleHintLevel, setVisibleHintLevel] = useState(
    superSimpleMode ? 1 : 0,
  );
  const [feedbackText, setFeedbackText] = useState("");
  const [showStepExplanation, setShowStepExplanation] = useState(false);

  const [exerciseMistakes, setExerciseMistakes] = useState(0);
  const [exerciseHintsUsed, setExerciseHintsUsed] = useState(0);
  const [mainExplanationUsed, setMainExplanationUsed] = useState(false);
  const [remedialExplanationUsed, setRemedialExplanationUsed] = useState(false);

  const [exerciseStartedAt, setExerciseStartedAt] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [stepAttempts, setStepAttempts] = useState([0, 0, 0]);

  const [showExerciseSummary, setShowExerciseSummary] = useState(false);
  const [exerciseSummary, setExerciseSummary] = useState(null);

  const dataset = level?.datasetKey ? getDatasetByKey(level.datasetKey) : null;
  const exercises = dataset?.items ?? [];
  const isLevelCompleted = exerciseIndex >= exercises.length;

  const currentExercise = exercises[exerciseIndex] ?? null;
  const remedialExercise = remedialSkill ? REMEDIAL_BY_SKILL[remedialSkill] : null;

  const activeExercise = mode === "remedial" ? remedialExercise : currentExercise;
  const activeStepIndex = mode === "remedial" ? remedialStepIndex : mainStepIndex;
  const activeStep = activeExercise?.steps?.[activeStepIndex] ?? null;
  const hintLevels = buildHintLevels(activeStep);
  const activeComplete = activeExercise
    ? activeStepIndex >= activeExercise.steps.length
    : false;

  const stars = getStars(exerciseMistakes, exerciseHintsUsed, mainExplanationUsed);

  const totalProgress = (() => {
    if (!exercises.length || mode === "remedial") {
      if (!activeExercise) return 0;
      const current = Math.min(activeStepIndex + 1, activeExercise.steps.length);
      return Math.round((current / activeExercise.steps.length) * 100);
    }

    const completedSteps = exerciseIndex * 3 + Math.min(mainStepIndex + 1, 3);
    return Math.round((completedSteps / (exercises.length * 3)) * 100);
  })();

  const clearStepState = () => {
    setSelectedChoice(null);
    setIsCorrect(false);
    setAttemptsOnStep(0);
    setVisibleHintLevel(superSimpleMode ? 1 : 0);
    setFeedbackText("");
    setShowStepExplanation(false);
  };

  const resetMainExerciseTracking = () => {
    setExerciseMistakes(0);
    setExerciseHintsUsed(0);
    setMainExplanationUsed(false);
    setTotalAttempts(0);
    setStepAttempts([0, 0, 0]);
    setExerciseStartedAt(0);
  };

  const startRemedial = () => {
    if (!currentExercise?.skill || !REMEDIAL_BY_SKILL[currentExercise.skill]) {
      setShowRemedialModal(false);
      return;
    }

    setReturnStepIndex(mainStepIndex);
    setRemedialSkill(currentExercise.skill);
    setRemedialStepIndex(0);
    setMode("remedial");
    setShowRemedialModal(false);
    setRemedialExplanationUsed(false);
    clearStepState();
  };

  const returnFromRemedial = () => {
    setMode("main");
    setRemedialSkill(null);
    setRemedialStepIndex(0);
    setMainStepIndex(returnStepIndex);
    clearStepState();
  };

  const handleChoice = (choiceIndex, eventTimeStamp) => {
    if (!activeStep || showRemedialModal || isCorrect || showExerciseSummary) return;

    if (mode === "main") {
      if (totalAttempts === 0) {
        setExerciseStartedAt(eventTimeStamp ?? 0);
      }
      setTotalAttempts((prev) => prev + 1);
      setStepAttempts((prev) => {
        const next = [...prev];
        next[mainStepIndex] = (next[mainStepIndex] ?? 0) + 1;
        return next;
      });
    }

    setSelectedChoice(choiceIndex);

    if (choiceIndex === activeStep.correctIndex) {
      setIsCorrect(true);
      setFeedbackText("Corect. Poti merge la pasul urmator.");
      return;
    }

    const nextAttempts = attemptsOnStep + 1;
    setIsCorrect(false);
    setAttemptsOnStep(nextAttempts);
    setFeedbackText("Nu este corect. Citeste indiciul si incearca din nou.");
    setVisibleHintLevel((prev) => (prev === 0 ? 1 : prev));

    if (mode === "main") {
      setExerciseMistakes((prev) => prev + 1);
      if (nextAttempts >= 2) {
        setShowRemedialModal(true);
      }
    }
  };

  const completeMainExercise = (endedAtMs) => {
    if (!currentExercise) return;

    const timeMs = Math.max(0, Math.round((endedAtMs ?? 0) - (exerciseStartedAt ?? 0)));
    const firstTrySteps = stepAttempts.filter((attempts) => attempts === 1).length;
    const recommendation =
      firstTrySteps === currentExercise.steps.length && exerciseHintsUsed === 0
        ? "Treci mai departe. Ai inteles foarte bine."
        : "Mai repeta un exercitiu asemanator pentru consolidare.";

    const summary = {
      firstTrySteps,
      attempts: totalAttempts,
      hintsUsed: exerciseHintsUsed,
      timeMs,
      recommendation,
      stars,
    };

    recordExerciseResult({
      moduleId: module.id,
      levelId: normalizeLevelId(level.id ?? level.level),
      totalCount: exercises.length,
      exerciseId: currentExercise.id,
      skill: currentExercise.skill,
      scoreStepCorrect: currentExercise.steps.length,
      attempts: totalAttempts,
      hintsUsed: exerciseHintsUsed,
      timeMs,
      stars,
    });

    setExerciseSummary(summary);
    setShowExerciseSummary(true);
    setMainStepIndex(currentExercise.steps.length);
    clearStepState();
  };

  const handleNext = (eventTimeStamp) => {
    if (!isCorrect || !activeExercise) return;

    if (mode === "main") {
      if (mainStepIndex >= activeExercise.steps.length - 1) {
        completeMainExercise(eventTimeStamp ?? exerciseStartedAt);
      } else {
        setMainStepIndex((prev) => prev + 1);
        clearStepState();
      }
      return;
    }

    if (remedialStepIndex >= activeExercise.steps.length - 1) {
      setRemedialStepIndex(activeExercise.steps.length);
    } else {
      setRemedialStepIndex((prev) => prev + 1);
    }
    clearStepState();
  };

  const handleHint = () => {
    const hintsCount = hintLevels.length;
    if (!activeStep || activeComplete || visibleHintLevel >= hintsCount) return;

    setVisibleHintLevel((prev) => {
      if (prev >= hintsCount) return prev;
      if (mode === "main") {
        setExerciseHintsUsed((total) => total + 1);
      }
      return prev + 1;
    });
  };

  const handleShowExplanation = () => {
    if (!activeStep || activeComplete) return;
    if (mode === "main" && mainExplanationUsed) return;
    if (mode === "remedial" && remedialExplanationUsed) return;

    if (mode === "main") setMainExplanationUsed(true);
    if (mode === "remedial") setRemedialExplanationUsed(true);
    setShowStepExplanation(true);
  };

  const nextExercise = () => {
    setShowExerciseSummary(false);
    setExerciseSummary(null);
    setExerciseIndex((prev) => prev + 1);
    setMainStepIndex(0);
    resetMainExerciseTracking();
    clearStepState();
  };

  if (!level?.datasetKey) {
    return (
      <div className="bg-white/80 backdrop-blur rounded-2xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-rose-700 mb-2">Nivel fara dataset</h2>
        <button
          type="button"
          onClick={onBack}
          className="mt-3 px-4 py-2 rounded-xl bg-white border border-rose-300 text-rose-700 hover:bg-rose-50 transition"
        >
          &larr; Inapoi la niveluri
        </button>
      </div>
    );
  }

  if (!dataset) {
    return (
      <div className="bg-white/80 backdrop-blur rounded-2xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-rose-700 mb-2">
          Fisierul pentru acest nivel nu a fost gasit
        </h2>
        <button
          type="button"
          onClick={onBack}
          className="mt-3 px-4 py-2 rounded-xl bg-white border border-rose-300 text-rose-700 hover:bg-rose-50 transition"
        >
          &larr; Inapoi la niveluri
        </button>
      </div>
    );
  }

  if (isLevelCompleted) {
    return (
      <div className="bg-white/80 backdrop-blur rounded-2xl shadow-lg p-6">
        <h2 className="text-3xl font-bold text-emerald-700 mb-2">Nivel finalizat</h2>
        <p className="text-gray-700 mb-5">Ai parcurs toate exercitiile din acest nivel.</p>
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition"
        >
          Inapoi la niveluri
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white/80 backdrop-blur rounded-2xl shadow-lg p-6 transition-all duration-300">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <p className="text-sm text-gray-500">
            {module.title} - {level.title}
          </p>
          <h2 className="text-2xl font-bold text-indigo-700">
            {mode === "remedial" ? "Exemplu de sprijin" : activeExercise?.title}
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onOpenLesson?.()}
            className="px-3 py-2 rounded-xl bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 transition text-sm font-semibold"
          >
            Lectie animata
          </button>
          <button
            type="button"
            onClick={() => onOpenSimulator?.()}
            className="px-3 py-2 rounded-xl bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition text-sm font-semibold"
          >
            Simulare
          </button>
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 rounded-xl bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 transition"
          >
            &larr; Inapoi la niveluri
          </button>
        </div>
      </div>

      <div className="w-full h-2 bg-indigo-100 rounded-full mb-3 overflow-hidden">
        <div
          className="h-full bg-indigo-500 transition-all duration-300"
          style={{ width: `${totalProgress}%` }}
        />
      </div>

      {mode === "main" ? (
        <p className="text-sm text-gray-500 mb-4">
          Exercitiul {exerciseIndex + 1} din {exercises.length}
        </p>
      ) : (
        <p className="text-sm text-amber-700 mb-4">Remedial pentru skill-ul {remedialSkill}</p>
      )}

      {superSimpleMode ? (
        <div className="mb-4 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3">
          <p className="text-sm font-bold text-cyan-800">Mod super simplu activ</p>
          <p className="text-sm text-cyan-700">
            Indicii apar pe niveluri: 1 (orientare), 2 (pas intermediar), 3 (aproape raspuns).
          </p>
        </div>
      ) : null}

      {import.meta.env.DEV && VALIDATION_ERRORS.length > 0 ? (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Continutul are {VALIDATION_ERRORS.length} erori de validare. Exercitiile folosesc date de
          fallback cand este nevoie. Vezi <span className="font-bold">/qa</span> pentru detalii.
        </div>
      ) : null}

      {!activeComplete && activeExercise && activeStep ? (
        <>
          <div className="mb-4">{renderExerciseVisual(activeExercise)}</div>
          <p className={`${superSimpleMode ? "text-xl" : "text-lg"} text-gray-700 mb-3`}>
            {activeExercise.prompt}
          </p>
          <p
            className={`${superSimpleMode ? "text-2xl" : "text-xl"} font-semibold text-indigo-700 mb-4`}
          >
            {activeStep.prompt}
          </p>

          <div className="space-y-3">
            {activeStep.choices.map((choice, index) => {
              const isSelected = selectedChoice === index;
              let choiceClass =
                "w-full text-left rounded-xl border-2 bg-white hover:bg-indigo-50 border-indigo-100 transition-all duration-200 active:scale-[0.99]";
              choiceClass += superSimpleMode ? " p-5 text-xl font-semibold" : " p-4 text-lg";

              if (isSelected && isCorrect) choiceClass += " border-emerald-500 bg-emerald-50";
              if (isSelected && !isCorrect) choiceClass += " border-rose-400 bg-rose-50";

              return (
                <button
                  key={`${activeExercise.id}-${activeStepIndex}-${index}`}
                  type="button"
                  onClick={(event) => handleChoice(index, event.timeStamp)}
                  className={choiceClass}
                >
                  {choice}
                </button>
              );
            })}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleHint}
              disabled={visibleHintLevel >= hintLevels.length}
              className={`${superSimpleMode ? "px-5 py-3 text-lg font-bold" : "px-4 py-2"} rounded-xl bg-amber-100 text-amber-900 hover:bg-amber-200 transition disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {visibleHintLevel >= hintLevels.length
                ? "Toate indiciile sunt afisate"
                : `Ajutor nivel ${Math.min(visibleHintLevel + 1, hintLevels.length)}`}
            </button>
            <button
              type="button"
              onClick={handleShowExplanation}
              disabled={mode === "main" ? mainExplanationUsed : remedialExplanationUsed}
              className="px-4 py-2 rounded-xl bg-cyan-100 text-cyan-900 hover:bg-cyan-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Arata explicatia
            </button>
            <button
              type="button"
              onClick={(event) => handleNext(event.timeStamp)}
              disabled={!isCorrect}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Pasul urmator
            </button>
          </div>

          {selectedChoice !== null ? (
            <p className="mt-3 text-sm font-medium text-indigo-700">{feedbackText}</p>
          ) : null}

          {visibleHintLevel > 0 ? (
            <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 p-4">
              <p className="font-semibold text-amber-900 mb-2">Indicii pe niveluri</p>
              <div className="space-y-2">
                {hintLevels.slice(0, visibleHintLevel).map((hint, index) => (
                  <div
                    key={`${activeExercise.id}-${activeStepIndex}-hint-${index + 1}`}
                    className="rounded-lg bg-white/70 px-3 py-2"
                  >
                    <p className="text-xs font-bold uppercase tracking-wide text-amber-700">
                      Nivel {index + 1}
                    </p>
                    <p className="text-amber-900">{hint}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {showStepExplanation ? (
            <div className="mt-3 rounded-xl bg-cyan-50 border border-cyan-200 p-4">
              <p className="font-semibold text-cyan-900 mb-1">Explicatie pas</p>
              <p className="text-cyan-900">{activeStep.explanation}</p>
            </div>
          ) : null}
        </>
      ) : null}

      {mode === "remedial" &&
      remedialExercise &&
      remedialStepIndex >= remedialExercise.steps.length ? (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-5">
          <h3 className="text-2xl font-bold text-emerald-700 mb-2">Remedial finalizat</h3>
          <p className="text-emerald-900 mb-3">{remedialExercise.finalExplanation}</p>
          <button
            type="button"
            onClick={returnFromRemedial}
            className="px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition"
          >
            Revin la exercitiul meu
          </button>
        </div>
      ) : null}

      {showRemedialModal ? (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-indigo-700 mb-2">
              Hai sa vedem un exemplu similar.
            </h3>
            <p className="text-gray-700 mb-4">
              Ai avut doua raspunsuri gresite la acest pas.
            </p>
            <button
              type="button"
              onClick={startRemedial}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition"
            >
              Incep exemplul de sprijin
            </button>
          </div>
        </div>
      ) : null}

      {showExerciseSummary && exerciseSummary ? (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-lg w-full">
            <h3 className="text-xl font-bold text-indigo-700 mb-2">Rezumat exercitiu</h3>
            <p className="text-gray-700">Corect din prima: {exerciseSummary.firstTrySteps}/3 pasi</p>
            <p className="text-gray-700">Incercari totale: {exerciseSummary.attempts}</p>
            <p className="text-gray-700">Hint-uri folosite: {exerciseSummary.hintsUsed}</p>
            <p className="text-gray-700">
              Timp petrecut: {Math.max(1, Math.round(exerciseSummary.timeMs / 1000))} sec
            </p>
            <p className="text-gray-700">Stele: {"★".repeat(exerciseSummary.stars)}</p>
            <p className="mt-3 rounded-xl bg-indigo-50 border border-indigo-200 p-3 text-indigo-800">
              Recomandare: {exerciseSummary.recommendation}
            </p>

            <button
              type="button"
              onClick={nextExercise}
              className="mt-5 px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition"
            >
              {exerciseIndex < exercises.length - 1 ? "Exercitiul urmator" : "Finalizeaza nivelul"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
