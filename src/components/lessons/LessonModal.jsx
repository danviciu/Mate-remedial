import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion as Motion } from "framer-motion";
import {
  ArrowLeftRight,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  PauseCircle,
  Percent,
  PieChart,
  PlayCircle,
  Sigma,
  X,
} from "lucide-react";
import { shouldReduceMotion } from "../../lib/motion.js";
import { normalizeLesson } from "../../content/normalizeContent.js";
import { useSettings } from "../../context/AppSettingsContext.jsx";
import VisualRenderer from "../visuals/VisualRenderer.jsx";

const ICONS = {
  PieChart,
  Percent,
  ArrowLeftRight,
  Sigma,
  BookOpen,
};

function MiniCheckCard({ check, answer, onAnswer }) {
  if (!check) return null;

  return (
    <div className="mt-4 rounded-3xl border border-indigo-200 bg-indigo-50 p-4">
      <p className="text-xl font-black text-indigo-800">{check.prompt}</p>
      <div className="mt-3 grid gap-2">
        {check.options.map((option, index) => {
          const selected = answer?.selectedIndex === index;
          const correct = index === check.correctIndex;
          const showFeedback = answer != null;
          const className = showFeedback
            ? correct
              ? "border-emerald-500 bg-emerald-50 text-emerald-900"
              : selected
                ? "border-rose-400 bg-rose-50 text-rose-900"
                : "border-indigo-200 bg-white text-slate-700 opacity-80"
            : "border-indigo-200 bg-white text-slate-700 hover:bg-indigo-100";

          return (
            <button
              key={`${check.id}-${index}`}
              type="button"
              onClick={() => onAnswer(index)}
              disabled={showFeedback}
              className={`w-full rounded-2xl border-2 px-4 py-3 text-left text-lg font-semibold transition ${className}`}
            >
              {option}
            </button>
          );
        })}
      </div>

      {answer ? (
        <div className="mt-3 rounded-2xl bg-white p-3">
          <p className={`text-lg font-black ${answer.correct ? "text-emerald-700" : "text-rose-700"}`}>
            {answer.correct ? "Corect" : "Inca putin"}
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-600">De ce?</p>
          {check.explain.map((line) => (
            <p key={`${check.id}-${line}`} className="text-base text-slate-700">
              {line}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function LessonModal({
  lesson,
  isOpen,
  onClose,
  initialSlide = 0,
  onProgress,
  onComplete,
}) {
  const { settings } = useSettings();
  const superSimpleMode = settings.superSimpleMode === true;
  const reducedMotion = shouldReduceMotion();
  const normalizedLesson = useMemo(() => {
    if (!lesson) return null;
    return normalizeLesson(lesson, { moduleId: lesson.module }).lesson;
  }, [lesson]);
  const initialIndex = Math.min(
    Math.max(initialSlide, 0),
    Math.max((normalizedLesson?.slides?.length ?? 1) - 1, 0),
  );
  const [currentSlideIndex, setCurrentSlideIndex] = useState(initialIndex);
  const [answers, setAnswers] = useState({});
  const [paused, setPaused] = useState(false);
  const panelRef = useRef(null);

  const slides = normalizedLesson?.slides ?? [];
  const totalSlides = slides.length;
  const currentSlide = slides[currentSlideIndex] ?? null;

  const miniChecksById = useMemo(() => {
    const entries = normalizedLesson?.miniChecks ?? [];
    return entries.reduce((acc, item) => ({ ...acc, [item.id]: item }), {});
  }, [normalizedLesson]);

  const Icon = ICONS[normalizedLesson?.icon] ?? BookOpen;

  const handleClose = useCallback(() => {
    onClose?.();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    onProgress?.({
      lessonId: normalizedLesson?.id,
      slideIndex: currentSlideIndex,
      totalSlides,
      answers,
    });
  }, [answers, currentSlideIndex, isOpen, normalizedLesson?.id, onProgress, totalSlides]);

  useEffect(() => {
    if (!isOpen) return;
    const onEsc = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        handleClose();
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        setCurrentSlideIndex((prev) => Math.min(prev + 1, Math.max(totalSlides - 1, 0)));
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setCurrentSlideIndex((prev) => Math.max(prev - 1, 0));
        return;
      }
      if (event.key === " " || event.key === "Spacebar") {
        const targetTag = event.target?.tagName?.toLowerCase?.();
        if (targetTag !== "button") {
          event.preventDefault();
          setPaused((prev) => !prev);
        }
      }

      if (event.key !== "Tab") return;
      const focusable = Array.from(
        panelRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((element) => !element.hasAttribute("disabled"));
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onEsc);
    window.setTimeout(() => {
      const firstButton = panelRef.current?.querySelector("button");
      firstButton?.focus();
    }, 0);
    return () => window.removeEventListener("keydown", onEsc);
  }, [handleClose, isOpen, totalSlides]);

  if (!isOpen || !normalizedLesson) return null;

  const check = currentSlide?.checkId ? miniChecksById[currentSlide.checkId] : null;
  const answer = check ? answers[check.id] : null;

  const goNext = () => {
    if (currentSlideIndex >= totalSlides - 1) {
      const allChecks = normalizedLesson.miniChecks ?? [];
      const correctChecks = allChecks.filter((item) => answers[item.id]?.correct).length;
      onComplete?.({
        lessonId: normalizedLesson.id,
        totalChecks: allChecks.length,
        correctChecks,
        lastSlide: totalSlides - 1,
      });
      handleClose();
      return;
    }
    setCurrentSlideIndex((prev) => Math.min(prev + 1, totalSlides - 1));
  };

  const goBack = () => setCurrentSlideIndex((prev) => Math.max(prev - 1, 0));

  const onAnswer = (index) => {
    if (!check || answers[check.id]) return;
    setAnswers((prev) => ({
      ...prev,
      [check.id]: {
        selectedIndex: index,
        correct: index === check.correctIndex,
      },
    }));
  };

  return (
    <AnimatePresence>
      <Motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-indigo-950/35 p-4 backdrop-blur-sm"
        initial={reducedMotion ? false : { opacity: 0 }}
        animate={reducedMotion ? undefined : { opacity: 1 }}
        exit={reducedMotion ? undefined : { opacity: 0 }}
        onClick={handleClose}
      >
        <Motion.div
          ref={panelRef}
          className="flex h-[min(92vh,860px)] w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] border border-indigo-200 bg-gradient-to-b from-white to-indigo-50 shadow-2xl"
          initial={reducedMotion ? false : { opacity: 0, y: 16 }}
          animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
          exit={reducedMotion ? undefined : { opacity: 0, y: 16 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          onClick={(event) => event.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label={`Lectie ${normalizedLesson.title}`}
        >
          <div className="flex items-start justify-between gap-3 border-b border-indigo-100 px-5 py-4 sm:px-7">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-indigo-100 p-2 text-indigo-700">
                <Icon size={26} />
              </div>
              <div>
                <h2 className="text-xl font-black text-indigo-700 sm:text-2xl">{normalizedLesson.title}</h2>
                <p className="text-sm text-slate-600 sm:text-base">
                  {normalizedLesson.gradeBand} - {normalizedLesson.estMinutes} min
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-xl bg-white p-2 text-slate-600 transition hover:bg-slate-100"
              aria-label="Inchide lectia"
            >
              <X size={22} />
            </button>
          </div>

          <div className="px-5 pt-3 sm:px-7">
            <div className="grid grid-cols-5 gap-2">
              {slides.map((slide, index) => {
                const active = index <= currentSlideIndex;
                return (
                  <div
                    key={`progress-${slide.id}`}
                    className={`h-2 rounded-full ${active ? "bg-indigo-500" : "bg-indigo-100"}`}
                  />
                );
              })}
            </div>
            {superSimpleMode ? (
              <div className="mt-3 rounded-2xl border border-cyan-200 bg-cyan-50 px-3 py-2">
                <p className="text-sm font-semibold text-cyan-800">
                  Mod super simplu: citeste rand cu rand si foloseste pasii ghidati.
                </p>
              </div>
            ) : null}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-3 pt-4 sm:px-7">
            <AnimatePresence mode="wait">
              {currentSlide ? (
                <Motion.div
                  key={`slide-${currentSlide.id}`}
                  initial={reducedMotion ? false : { opacity: 0, x: paused ? 0 : 20 }}
                  animate={reducedMotion ? undefined : { opacity: 1, x: 0 }}
                  exit={reducedMotion ? undefined : { opacity: 0, x: paused ? 0 : -20 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                >
                  <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(280px,460px)] xl:items-start">
                    <div>
                      <h3 className="text-2xl font-black text-indigo-700 sm:text-3xl">
                        {currentSlide.heading}
                      </h3>
                      <div className="mt-3 grid gap-1">
                        {(currentSlide.text ?? []).map((line) => (
                          <p
                            key={`${currentSlide.id}-${line}`}
                            className={`${superSimpleMode ? "text-xl sm:text-2xl" : "text-lg sm:text-xl"} leading-relaxed text-slate-700`}
                          >
                            {line}
                          </p>
                        ))}
                      </div>
                    </div>

                    <div className="w-full xl:pt-1">
                      <div className="mx-auto w-full max-w-[460px]">
                        <VisualRenderer
                          spec={currentSlide.visual ?? null}
                          modalTitle="Vizual lectie"
                          withModal
                        />
                      </div>
                    </div>
                  </div>

                  {check ? (
                    <MiniCheckCard check={check} answer={answer} onAnswer={onAnswer} />
                  ) : null}
                </Motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-indigo-100 bg-white/80 px-5 py-3 sm:px-7">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={goBack}
                disabled={currentSlideIndex === 0}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-2 text-lg font-semibold text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={18} /> Inapoi
              </button>

              <button
                type="button"
                onClick={() => setPaused((prev) => !prev)}
                className="inline-flex items-center gap-2 rounded-2xl bg-amber-100 px-4 py-2 text-lg font-semibold text-amber-800 transition hover:bg-amber-200"
              >
                {paused ? <PlayCircle size={18} /> : <PauseCircle size={18} />}
                {paused ? "Continua" : "Pauza"}
              </button>
            </div>

            <p className="text-lg font-bold text-indigo-700">
              Pasul {currentSlideIndex + 1} / {totalSlides}
            </p>

            <button
              type="button"
              onClick={goNext}
              className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-2 text-lg font-semibold text-white transition hover:bg-indigo-700"
            >
              {currentSlideIndex >= totalSlides - 1 ? "Finalizeaza" : "Inainte"} <ChevronRight size={18} />
            </button>
          </div>
        </Motion.div>
      </Motion.div>
    </AnimatePresence>
  );
}

