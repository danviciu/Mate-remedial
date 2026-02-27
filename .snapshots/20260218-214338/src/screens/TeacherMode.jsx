import { useMemo, useState } from "react";
import { BookOpen, GraduationCap, Monitor, Play, Settings2, Trophy } from "lucide-react";
import ContentManagerPanel from "../components/content/ContentManagerPanel.jsx";
import MotionPage from "../components/ui/MotionPage.jsx";
import { getDatasetByKey } from "../data/exerciseDatasets.js";
import { MODULES } from "../data/modulesConfig.js";
import { getLessonsByModule, MODULE_DEFAULT_LESSON } from "../lessons/lessonsData.js";
import Button from "../ui/Button.jsx";
import Card from "../ui/Card.jsx";
import SectionTitle from "../ui/SectionTitle.jsx";

function buildInitialScores() {
  return [
    { name: "Echipa A", points: 0 },
    { name: "Echipa B", points: 0 },
  ];
}

export default function TeacherMode({ goHome, onGo }) {
  const [moduleId, setModuleId] = useState(MODULES[0].id);
  const module = useMemo(
    () => MODULES.find((item) => item.id === moduleId) ?? MODULES[0],
    [moduleId],
  );
  const [quickModule, setQuickModule] = useState(MODULES[0].id);
  const [quickLessonId, setQuickLessonId] = useState(MODULE_DEFAULT_LESSON[MODULES[0].id]);

  const [levelId, setLevelId] = useState(module.levels[0].id);
  const [exerciseSet, setExerciseSet] = useState("all");
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [frozen, setFrozen] = useState(true);
  const [scores, setScores] = useState(buildInitialScores);

  const level = useMemo(
    () => module.levels.find((item) => item.id === levelId) ?? module.levels[0],
    [levelId, module.levels],
  );

  const dataset = getDatasetByKey(level.datasetKey);
  const allExercises = dataset?.items ?? [];
  const exercises = exerciseSet === "first5" ? allExercises.slice(0, 5) : allExercises;
  const currentExercise = exercises[exerciseIndex] ?? null;
  const currentStep = currentExercise?.steps?.[stepIndex] ?? null;

  const resetSession = () => {
    setExerciseIndex(0);
    setStepIndex(0);
    setFrozen(true);
  };

  const nextStep = () => {
    if (!currentExercise) return;
    if (stepIndex < currentExercise.steps.length - 1) {
      setStepIndex((prev) => prev + 1);
      setFrozen(true);
      return;
    }
    if (exerciseIndex < exercises.length - 1) {
      setExerciseIndex((prev) => prev + 1);
      setStepIndex(0);
      setFrozen(true);
    }
  };

  const addPoints = (teamIndex, delta) => {
    setScores((prev) => {
      const next = [...prev];
      next[teamIndex] = {
        ...next[teamIndex],
        points: Math.max(0, next[teamIndex].points + delta),
      };
      return next;
    });
  };

  const onChangeModule = (nextModuleId) => {
    const nextModule = MODULES.find((item) => item.id === nextModuleId) ?? MODULES[0];
    setModuleId(nextModule.id);
    setLevelId(nextModule.levels[0].id);
    setExerciseSet("all");
    resetSession();
  };

  const quickLessons = useMemo(() => getLessonsByModule(quickModule), [quickModule]);
  const onChangeQuickModule = (nextModule) => {
    setQuickModule(nextModule);
    setQuickLessonId(MODULE_DEFAULT_LESSON[nextModule] ?? getLessonsByModule(nextModule)[0]?.id ?? null);
  };

  const openLesson = () => {
    onGo({ path: "/lessons", state: { moduleId: quickModule, lessonId: quickLessonId } });
  };

  const openSimulator = () => {
    onGo({ path: "/simulators", state: { simulatorId: quickModule } });
  };

  const openAdmin = () => {
    onGo("admin");
  };

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
      return;
    }
    await document.exitFullscreen();
  };

  return (
    <MotionPage className="min-h-screen p-4 sm:p-6">
      <div className="mx-auto max-w-6xl">
        <Button variant="secondary" onClick={goHome}>
          ← Înapoi acasă
        </Button>

        <div className="mt-4">
          <SectionTitle
            title="Mod profesor"
            subtitle="Control rapid pentru lecții, simulări, import conținut și lucru la tablă."
            icon={GraduationCap}
          />
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-4">
          <Card className="p-4 lg:col-span-3">
            <p className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-600">Quick launch</p>
            <div className="grid gap-3 md:grid-cols-3">
              <label className="text-sm font-semibold text-indigo-700">
                Modul
                <select
                  value={quickModule}
                  onChange={(event) => onChangeQuickModule(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-indigo-200 px-3 py-2"
                >
                  {MODULES.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-semibold text-indigo-700 md:col-span-2">
                Lecție
                <select
                  value={quickLessonId ?? ""}
                  onChange={(event) => setQuickLessonId(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-indigo-200 px-3 py-2"
                >
                  {quickLessons.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </Card>

          <Card className="flex flex-col gap-2 p-4">
            <Button variant="primary" onClick={openLesson}>
              <BookOpen size={16} /> Start lecție
            </Button>
            <Button variant="success" onClick={openSimulator}>
              <Play size={16} /> Deschide simulare
            </Button>
            <Button variant="soft" onClick={openAdmin}>
              <Settings2 size={16} /> Panou conținut
            </Button>
            <Button variant="secondary" onClick={toggleFullscreen}>
              <Monitor size={16} /> Fullscreen
            </Button>
          </Card>
        </div>

        <div className="mt-5">
          <ContentManagerPanel
            title="Panou administrator: gestionare conținut"
            compact
            onApplied={() => window.location.reload()}
          />
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <Card className="p-4 lg:col-span-2">
            <p className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-600">
              <Settings2 size={16} /> Setări tablă
            </p>
            <div className="grid gap-3 md:grid-cols-3">
              <label className="text-sm font-semibold text-indigo-700">
                Modul
                <select
                  value={module.id}
                  onChange={(event) => onChangeModule(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-indigo-200 px-3 py-2"
                >
                  {MODULES.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-semibold text-indigo-700">
                Nivel
                <select
                  value={level.id}
                  onChange={(event) => {
                    setLevelId(event.target.value);
                    resetSession();
                  }}
                  className="mt-1 w-full rounded-xl border border-indigo-200 px-3 py-2"
                >
                  {module.levels.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-semibold text-indigo-700">
                Set exerciții
                <select
                  value={exerciseSet}
                  onChange={(event) => {
                    setExerciseSet(event.target.value);
                    resetSession();
                  }}
                  className="mt-1 w-full rounded-xl border border-indigo-200 px-3 py-2"
                >
                  <option value="all">Toate exercițiile</option>
                  <option value="first5">Primele 5 exerciții</option>
                </select>
              </label>
            </div>
          </Card>

          <Card className="p-4">
            <p className="text-sm font-bold uppercase tracking-wide text-slate-600">Control pași</p>
            <div className="mt-3 flex flex-col gap-2">
              <Button variant="soft" onClick={() => setFrozen((prev) => !prev)}>
                {frozen ? "Reveal" : "Freeze"}
              </Button>
              <Button variant="primary" onClick={nextStep}>
                Pas următor
              </Button>
            </div>
          </Card>
        </div>

        <Card className="mt-5 p-5">
          <p className="text-sm text-slate-500">
            {module.title} • {level.title}
          </p>
          <h2 className="mt-1 text-2xl font-black text-indigo-700">Tabla interactivă</h2>

          {currentExercise ? (
            <div className="mt-3 space-y-3">
              <p className="text-sm text-slate-500">
                Exercițiul {exerciseIndex + 1} din {exercises.length}
              </p>
              <p className="text-lg text-slate-700">{currentExercise.prompt}</p>
              <p className="text-xl font-semibold text-indigo-700">
                {currentStep?.prompt ?? "Set complet"}
              </p>

              {currentStep ? (
                frozen ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 font-semibold text-amber-900">
                    Opțiunile sunt ascunse. Apasă Reveal.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {currentStep.choices.map((choice, index) => (
                      <div
                        key={`${currentExercise.id}-${stepIndex}-${choice}`}
                        className={`rounded-xl border p-3 ${
                          index === currentStep.correctIndex
                            ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                            : "border-indigo-100 bg-white text-slate-700"
                        }`}
                      >
                        {choice}
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
                  Exercițiul curent este finalizat. Apasă Pas următor.
                </div>
              )}
            </div>
          ) : (
            <p className="mt-3 text-slate-700">Nu există exerciții pentru setarea curentă.</p>
          )}
        </Card>

        <Card className="mt-5 p-5">
          <p className="mb-3 flex items-center gap-2 text-xl font-black text-indigo-700">
            <Trophy size={20} /> Scoreboard clasă
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {scores.map((team, index) => (
              <div key={team.name} className="rounded-xl border border-indigo-100 p-4">
                <p className="text-lg font-bold text-indigo-700">{team.name}</p>
                <p className="my-3 text-3xl font-black text-slate-800">{team.points}</p>
                <div className="flex gap-2">
                  <Button variant="soft" size="sm" onClick={() => addPoints(index, 1)}>
                    +1
                  </Button>
                  <Button variant="success" size="sm" onClick={() => addPoints(index, 5)}>
                    +5
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => addPoints(index, -1)}>
                    -1
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </MotionPage>
  );
}
