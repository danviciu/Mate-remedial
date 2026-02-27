import { useEffect, useMemo, useState } from "react";
import { motion as Motion } from "framer-motion";
import { ArrowLeftRight, BookOpen, Filter, Percent, PieChart, Sigma } from "lucide-react";
import LessonPlayer from "../components/LessonPlayer.jsx";
import MotionPage from "../components/ui/MotionPage.jsx";
import { ALL_LESSONS, getLessonById } from "../lessons/lessonsData.js";
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
  fractions: "Fracții",
  percents: "Procente",
  integers: "Numere întregi",
  equations: "Ecuații",
};

const ICONS = {
  PieChart,
  Percent,
  ArrowLeftRight,
  Sigma,
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
  if (!item) return "Neîncepută";
  if (item.completed) return "Finalizată";
  return `Pas ${Math.max((item.lastSlide ?? 0) + 1, 1)}`;
}

export default function Lessons({
  goHome,
  onGo,
  initialLessonId = null,
  initialModuleId = null,
  afterCompletePath = null,
  afterCompleteState = null,
}) {
  const reducedMotion = shouldReduceMotion();
  const [moduleFilter, setModuleFilter] = useState(initialModuleId ?? "all");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [activeLessonId, setActiveLessonId] = useState(initialLessonId);
  const [lessonProgress, setLessonProgress] = useState(() => loadLessonProgress());

  useEffect(() => {
    const onUpdate = () => setLessonProgress(loadLessonProgress());
    window.addEventListener(LEARNING_PROGRESS_EVENT, onUpdate);
    return () => window.removeEventListener(LEARNING_PROGRESS_EVENT, onUpdate);
  }, []);

  const filteredLessons = useMemo(
    () =>
      ALL_LESSONS.filter((item) => {
        const moduleOk = moduleFilter === "all" || item.module === moduleFilter;
        const gradeOk = lessonIncludesGrade(item.gradeBand, gradeFilter);
        return moduleOk && gradeOk;
      }),
    [gradeFilter, moduleFilter],
  );

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

  return (
    <MotionPage className="min-h-screen p-4 sm:p-6">
      <div className="mx-auto max-w-6xl">
        <Button variant="secondary" onClick={goHome}>
          ← Înapoi acasă
        </Button>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
          <SectionTitle
            title="Lecții animate"
            subtitle="Structură: Intro → Concept → Exemplu → Mini-check → Recap."
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
                onChange={(event) => setGradeFilter(event.target.value)}
                className="rounded-xl border border-indigo-200 px-3 py-2 font-semibold"
              >
                <option value="all">Toate clasele</option>
                <option value="V">Clasa V</option>
                <option value="VI">Clasa VI</option>
                <option value="VII">Clasa VII</option>
              </select>
            </div>
          </Card>
        </div>

        <Motion.div
          className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3"
          variants={fadeUp}
          initial={reducedMotion ? false : "hidden"}
          animate="show"
        >
          {filteredLessons.map((item) => {
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
