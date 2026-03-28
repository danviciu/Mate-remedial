import { useEffect, useMemo, useState } from "react";
import { motion as Motion } from "framer-motion";
import { ArrowLeftRight, BookOpen, Filter, Percent, PieChart, Sigma } from "lucide-react";
import LessonPlayer from "../components/LessonPlayer.jsx";
import MotionPage from "../components/ui/MotionPage.jsx";
import {
  ALL_LESSONS,
  MANUAL_LESSON_CATALOG,
  getLessonById,
  resolveManualRouteToLesson,
} from "../lessons/lessonsData.js";
import { fadeUp, shouldReduceMotion } from "../lib/motion.js";
import {
  LEARNING_PROGRESS_EVENT,
  loadLessonProgress,
  updateLessonProgress,
} from "../utils/learningProgressStore.js";
import Badge from "../ui/Badge.jsx";
import Button from "../ui/Button.jsx";
import Card from "../ui/Card.jsx";
import SectionTitle from "../ui/SectionTitle.jsx";

const MODULE_LABELS = {
  all: "Toate modulele",
  fractions: "Fractii",
  percents: "Procente",
  integers: "Numere intregi",
  equations: "Ecuatii",
  manual: "Programa + manuale",
};

const ICONS = {
  PieChart,
  Percent,
  ArrowLeftRight,
  Sigma,
};

const GRADE_TO_BAND = {
  5: "V",
  6: "VI",
  7: "VII",
  8: "VIII",
};

const BAND_TO_GRADE = {
  V: 5,
  VI: 6,
  VII: 7,
  VIII: 8,
};

function lessonIncludesGrade(gradeBand, gradeFilter) {
  if (gradeFilter === "all") return true;
  if (typeof gradeBand !== "string") return false;
  return gradeBand
    .split("-")
    .map((token) => token.trim())
    .filter(Boolean)
    .includes(gradeFilter);
}

function getProgressLabel(item) {
  if (!item) return "Neinceputa";
  if (item.completed) return "Finalizata";
  return `Pas ${Math.max((item.lastSlide ?? 0) + 1, 1)}`;
}

function normalizeText(value) {
  return String(value ?? "").trim().toLowerCase();
}

export default function Lessons({
  goHome,
  onGo,
  initialLessonId = null,
  initialModuleId = null,
  afterCompletePath = null,
  afterCompleteState = null,
  initialManualGrade = null,
  initialManualUnitId = null,
  initialManualLessonNo = null,
}) {
  const reducedMotion = shouldReduceMotion();
  const [moduleFilter, setModuleFilter] = useState(
    initialModuleId ?? "manual",
  );
  const [gradeFilter, setGradeFilter] = useState(
    initialManualGrade ? GRADE_TO_BAND[initialManualGrade] ?? "all" : "all",
  );
  const [activeLessonId, setActiveLessonId] = useState(() => {
    if (initialLessonId) return initialLessonId;
    if (initialManualGrade && initialManualUnitId && initialManualLessonNo) {
      const resolved = resolveManualRouteToLesson(
        initialManualGrade,
        initialManualUnitId,
        initialManualLessonNo,
      );
      return resolved?.lessonId ?? null;
    }
    return null;
  });
  const [lessonProgress, setLessonProgress] = useState(() => loadLessonProgress());

  const [manualGrade, setManualGrade] = useState(initialManualGrade ?? BAND_TO_GRADE[gradeFilter] ?? 5);
  const [manualUnitId, setManualUnitId] = useState(initialManualUnitId ?? "");
  const [manualSearch, setManualSearch] = useState("");

  useEffect(() => {
    const onUpdate = () => setLessonProgress(loadLessonProgress());
    window.addEventListener(LEARNING_PROGRESS_EVENT, onUpdate);
    return () => window.removeEventListener(LEARNING_PROGRESS_EVENT, onUpdate);
  }, []);

  const genericLessons = useMemo(
    () =>
      ALL_LESSONS.filter((item) => {
        if (item.module === "manual") return false;
        const moduleOk = moduleFilter === "all" || item.module === moduleFilter;
        const gradeOk = lessonIncludesGrade(item.gradeBand, gradeFilter);
        return moduleOk && gradeOk;
      }),
    [gradeFilter, moduleFilter],
  );

  const manualCatalog = useMemo(
    () =>
      MANUAL_LESSON_CATALOG.find((entry) => entry.grade === manualGrade) ??
      MANUAL_LESSON_CATALOG[0] ??
      null,
    [manualGrade],
  );
  const manualUnits = manualCatalog?.units ?? [];
  const effectiveManualUnitId =
    manualUnits.find((unit) => unit.id === manualUnitId)?.id ?? manualUnits[0]?.id ?? "";
  const selectedManualUnit =
    manualUnits.find((unit) => unit.id === effectiveManualUnitId) ?? manualUnits[0] ?? null;

  const visibleManualLessons = useMemo(() => {
    const list = Array.isArray(selectedManualUnit?.lessons) ? selectedManualUnit.lessons : [];
    const key = normalizeText(manualSearch);
    if (!key) return list;
    return list.filter((item) => normalizeText(item.title).includes(key));
  }, [manualSearch, selectedManualUnit]);

  const activeLesson = activeLessonId ? getLessonById(activeLessonId) : null;
  const closeLesson = () => setActiveLessonId(null);

  const onProgress = ({ lessonId, slideIndex, answers, totalSlides }) => {
    const allChecks = Object.values(answers);
    const correctChecks = allChecks.filter((item) => item.correct).length;
    updateLessonProgress(lessonId, {
      lastSlide: slideIndex,
      completed: slideIndex >= totalSlides - 1,
      correctChecks,
      totalChecks: allChecks.length,
    });
  };

  const onComplete = ({ lessonId, correctChecks, totalChecks, lastSlide }) => {
    updateLessonProgress(lessonId, {
      completed: true,
      lastSlide,
      correctChecks,
      totalChecks,
    });
    if (afterCompletePath && typeof onGo === "function") {
      onGo({ path: afterCompletePath, state: afterCompleteState ?? null });
    }
  };

  const openManualLesson = (lessonItem) => {
    setActiveLessonId(lessonItem.lessonId);
    if (!selectedManualUnit || typeof onGo !== "function") return;
    onGo({
      path: `/learn/${manualGrade}/${selectedManualUnit.id}/${lessonItem.lessonNo}`,
      state: {
        moduleId: "manual",
        lessonId: lessonItem.lessonId,
      },
    });
  };

  return (
    <MotionPage className="min-h-screen p-4 sm:p-6">
      <div className="mx-auto max-w-7xl">
        <Button variant="secondary" onClick={goHome}>
          &larr; Inapoi acasa
        </Button>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
          <SectionTitle
            title="Biblioteca lectii"
            subtitle="Clasele V-VIII. Deschizi orice lectie din programa/manual."
            icon={BookOpen}
          />

          <Card className="w-full p-3 sm:w-auto">
            <p className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-600">
              <Filter size={16} /> Filtre
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <select
                value={moduleFilter}
                onChange={(event) => setModuleFilter(event.target.value)}
                className="rounded-xl border border-indigo-200 px-3 py-2 font-semibold"
              >
                {Object.entries(MODULE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>

              <select
                value={gradeFilter}
                onChange={(event) => {
                  const next = event.target.value;
                  setGradeFilter(next);
                  if (next !== "all" && BAND_TO_GRADE[next]) {
                    setManualGrade(BAND_TO_GRADE[next]);
                  }
                }}
                className="rounded-xl border border-indigo-200 px-3 py-2 font-semibold"
              >
                <option value="all">Toate clasele</option>
                <option value="V">Clasa V</option>
                <option value="VI">Clasa VI</option>
                <option value="VII">Clasa VII</option>
                <option value="VIII">Clasa VIII</option>
              </select>
            </div>
          </Card>
        </div>

        {moduleFilter === "manual" ? (
          <div className="mt-5 grid gap-4 xl:grid-cols-[280px_340px_1fr]">
            <Card className="p-4">
              <p className="text-xs font-black uppercase tracking-wide text-indigo-600">Clasa</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {[5, 6, 7, 8].map((grade) => (
                  <button
                    key={`manual-grade-${grade}`}
                    type="button"
                    onClick={() => {
                      setManualGrade(grade);
                      setGradeFilter(GRADE_TO_BAND[grade] ?? "all");
                      setManualSearch("");
                    }}
                    className={`rounded-xl border px-3 py-2 text-sm font-black transition ${
                      manualGrade === grade
                        ? "border-indigo-600 bg-indigo-600 text-white"
                        : "border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50"
                    }`}
                  >
                    Clasa {grade}
                  </button>
                ))}
              </div>

              <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs text-indigo-900">
                <p className="font-bold">{manualCatalog?.title ?? "Manual indisponibil"}</p>
                <p>
                  Unitati: {manualUnits.length} | Lectii:{" "}
                  {manualUnits.reduce(
                    (sum, unit) => sum + (Array.isArray(unit.lessons) ? unit.lessons.length : 0),
                    0,
                  )}
                </p>
              </div>
            </Card>

            <Card className="p-4">
              <p className="text-xs font-black uppercase tracking-wide text-slate-500">Unitati</p>
              <div className="mt-3 max-h-[560px] space-y-2 overflow-auto pr-1">
                {manualUnits.map((unit) => {
                  const lessonsCount = Array.isArray(unit.lessons) ? unit.lessons.length : 0;
                  const active = unit.id === effectiveManualUnitId;
                  return (
                    <button
                      key={unit.id}
                      type="button"
                      onClick={() => setManualUnitId(unit.id)}
                      className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                        active
                          ? "border-indigo-500 bg-indigo-50"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <p className="text-xs font-black uppercase tracking-wide text-indigo-600">
                        Unitatea {unit.number}
                      </p>
                      <p className="mt-1 text-sm font-bold text-slate-800">{unit.title}</p>
                      <p className="text-xs font-semibold text-slate-500">{lessonsCount} lectii</p>
                    </button>
                  );
                })}
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-black uppercase tracking-wide text-slate-500">Lectii</p>
                <input
                  value={manualSearch}
                  onChange={(event) => setManualSearch(event.target.value)}
                  placeholder="Cauta lectie..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold sm:w-56"
                />
              </div>

              <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
                <p className="font-black text-slate-800">
                  {selectedManualUnit
                    ? `Unitatea ${selectedManualUnit.number}: ${selectedManualUnit.title}`
                    : "Alege o unitate"}
                </p>
              </div>

              <div className="mt-3 max-h-[560px] space-y-2 overflow-auto pr-1">
                {visibleManualLessons.map((item) => {
                  const progress = lessonProgress[item.lessonId];
                  const isCurrent = activeLessonId === item.lessonId;
                  return (
                    <button
                      key={item.lessonId}
                      type="button"
                      onClick={() => openManualLesson(item)}
                      className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                        isCurrent
                          ? "border-emerald-400 bg-emerald-50"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-black text-slate-800">
                          L{item.lessonNo}: {item.title}
                        </p>
                        {item.page ? (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">
                            pag. {item.page}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs font-semibold text-indigo-700">
                        Progres: {getProgressLabel(progress)}
                      </p>
                    </button>
                  );
                })}
                {!visibleManualLessons.length ? (
                  <p className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-600">
                    Nu exista lectii pentru filtrul curent.
                  </p>
                ) : null}
              </div>
            </Card>
          </div>
        ) : (
          <Motion.div
            className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3"
            variants={fadeUp}
            initial={reducedMotion ? false : "hidden"}
            animate="show"
          >
            {genericLessons.map((item) => {
              const Icon = ICONS[item.icon] ?? BookOpen;
              const progress = lessonProgress[item.id];
              const checksDone =
                typeof progress?.correctChecks === "number" &&
                typeof progress?.totalChecks === "number"
                  ? `${progress.correctChecks}/${progress.totalChecks}`
                  : "-";

              return (
                <Card
                  key={item.id}
                  as="button"
                  type="button"
                  interactive
                  onClick={() => setActiveLessonId(item.id)}
                  className="w-full p-5 text-left"
                >
                  <div className="mb-3 flex items-center gap-2 text-indigo-700">
                    <div className="rounded-xl bg-indigo-100 p-2">
                      <Icon size={20} />
                    </div>
                    <Badge variant="indigo">{MODULE_LABELS[item.module] ?? item.module}</Badge>
                  </div>
                  <h2 className="text-2xl font-black text-indigo-700">{item.title}</h2>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    {item.gradeBand} • {item.estMinutes} min
                  </p>
                  <div className="mt-4 rounded-2xl bg-indigo-50 p-3 text-sm">
                    <p className="font-bold text-indigo-700">Progres: {getProgressLabel(progress)}</p>
                    <p className="text-slate-600">Mini-check: {checksDone}</p>
                  </div>
                </Card>
              );
            })}
          </Motion.div>
        )}
      </div>

      <LessonPlayer
        key={activeLesson?.id ?? "no-lesson"}
        lesson={activeLesson}
        isOpen={Boolean(activeLesson)}
        onClose={closeLesson}
        initialSlide={lessonProgress[activeLesson?.id ?? ""]?.lastSlide ?? 0}
        onProgress={onProgress}
        onComplete={onComplete}
      />
    </MotionPage>
  );
}
