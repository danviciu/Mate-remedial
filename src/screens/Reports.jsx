import { useEffect, useMemo, useRef, useState } from "react";
import { motion as Motion } from "framer-motion";
import { BookOpen } from "lucide-react";
import MotionPage from "../components/ui/MotionPage.jsx";
import MotionProgress from "../components/ui/MotionProgress.jsx";
import { MODULES } from "../data/modulesConfig.js";
import { fadeUp, shouldReduceMotion, springFast } from "../lib/motion.js";
import { generateReportPdfFromElement } from "../reports/generateReport.js";
import { useSettings } from "../context/AppSettingsContext.jsx";
import {
  LEARNING_PROGRESS_EVENT,
  loadLessonProgress,
} from "../utils/learningProgressStore.js";
import {
  loadClassProgress,
  loadTeacherNotes,
  saveClassProgress,
  saveTeacherNotes,
} from "../utils/progressStore.js";
import { useProgress } from "../utils/useProgress.js";

function formatDate(isoString) {
  if (!isoString) return "-";
  const date = new Date(isoString);
  return date.toLocaleDateString("ro-RO");
}

function downloadJson(filename, value) {
  const blob = new Blob([JSON.stringify(value, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function getWeakLevels(progress) {
  const rows = [];
  MODULES.forEach((module) => {
    module.levels.forEach((level) => {
      const stats =
        progress.modules?.[module.id]?.levels?.[String(level.id).toLowerCase()] ?? null;
      if (!stats || !stats.totalCount) return;
      rows.push({
        moduleTitle: module.title,
        levelTitle: level.title,
        accuracyPct: stats.accuracyPct ?? 0,
      });
    });
  });
  return rows.sort((a, b) => a.accuracyPct - b.accuracyPct).slice(0, 5);
}

function classAggregate(classProgress) {
  if (!classProgress.length) {
    return {
      avgDiagnostic: 0,
      hardestModule: "-",
      hardestSkill: "-",
      completionDistribution: [],
    };
  }

  const diagnosticScores = classProgress
    .map((item) => item?.diagnostic?.score)
    .filter((value) => typeof value === "number");
  const avgDiagnostic =
    diagnosticScores.length > 0
      ? Math.round(
          (diagnosticScores.reduce((sum, value) => sum + value, 0) /
            diagnosticScores.length) *
            10,
        ) / 10
      : 0;

  const moduleAccuracy = {};
  classProgress.forEach((studentProgress) => {
    MODULES.forEach((module) => {
      const levels = Object.values(studentProgress?.modules?.[module.id]?.levels ?? {});
      const avg =
        levels.length > 0
          ? levels.reduce((sum, level) => sum + (level.accuracyPct ?? 0), 0) /
            levels.length
          : 0;
      if (!moduleAccuracy[module.id]) moduleAccuracy[module.id] = [];
      moduleAccuracy[module.id].push(avg);
    });
  });

  const hardestModule = MODULES.map((module) => {
    const values = moduleAccuracy[module.id] ?? [];
    const avg = values.length
      ? values.reduce((sum, value) => sum + value, 0) / values.length
      : 0;
    return { moduleTitle: module.title, avgAccuracy: avg };
  }).sort((a, b) => a.avgAccuracy - b.avgAccuracy)[0];

  const completionDistribution = classProgress.map((studentProgress) => {
    const totals = MODULES.flatMap((module) =>
      Object.values(studentProgress?.modules?.[module.id]?.levels ?? {}),
    );
    const completed = totals.reduce(
      (sum, level) => sum + (level.completedCount ?? 0),
      0,
    );
    const total = totals.reduce((sum, level) => sum + (level.totalCount ?? 0), 0);
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return {
      name: studentProgress?.student?.name || "Elev fara nume",
      completionPct: pct,
    };
  });

  const skillScores = {};
  classProgress.forEach((studentProgress) => {
    (studentProgress?.history ?? []).forEach((entry) => {
      if (!entry?.skill) return;
      const ratio =
        entry.attempts > 0 ? (entry.scoreStepCorrect ?? 0) / entry.attempts : 0;
      if (!skillScores[entry.skill]) {
        skillScores[entry.skill] = [];
      }
      skillScores[entry.skill].push(ratio);
    });
  });

  const hardestSkill = Object.entries(skillScores)
    .map(([skill, values]) => ({
      skill,
      avgRatio:
        values.length > 0
          ? values.reduce((sum, value) => sum + value, 0) / values.length
          : 0,
    }))
    .sort((a, b) => a.avgRatio - b.avgRatio)[0];

  return {
    avgDiagnostic,
    hardestModule: hardestModule?.moduleTitle ?? "-",
    hardestSkill: hardestSkill?.skill ?? "-",
    completionDistribution,
  };
}

function lessonAggregate(lessonProgress) {
  const rows = Object.entries(lessonProgress ?? {});
  if (!rows.length) {
    return {
      total: 0,
      completed: 0,
      accuracyPct: 0,
      details: [],
    };
  }

  const completed = rows.filter(([, item]) => item?.completed).length;
  const checksTotal = rows.reduce((sum, [, item]) => sum + (item?.totalChecks ?? 0), 0);
  const checksCorrect = rows.reduce((sum, [, item]) => sum + (item?.correctChecks ?? 0), 0);
  const accuracyPct = checksTotal > 0 ? Math.round((checksCorrect / checksTotal) * 100) : 0;

  return {
    total: rows.length,
    completed,
    accuracyPct,
    details: rows.map(([id, item]) => ({
      id,
      completed: Boolean(item?.completed),
      lastSlide: item?.lastSlide ?? 0,
      correctChecks: item?.correctChecks ?? 0,
      totalChecks: item?.totalChecks ?? 0,
    })),
  };
}

function buildBadges(progress, lessonStats) {
  const badges = [];
  const historyCount = progress.history.length;

  if (historyCount >= 10) badges.push("Perseverent: minim 10 exercitii finalizate");
  if (lessonStats.completed >= 4) badges.push("Explorator: minim 4 lectii finalizate");
  if (lessonStats.accuracyPct >= 80) badges.push("Mini-check Expert: acuratete peste 80%");

  const moduleAccuracies = MODULES.map((module) => {
    const levels = Object.values(progress.modules?.[module.id]?.levels ?? {});
    if (!levels.length) return 0;
    return Math.round(
      levels.reduce((sum, level) => sum + (level.accuracyPct ?? 0), 0) / levels.length,
    );
  });
  if (moduleAccuracies.length && Math.max(...moduleAccuracies) >= 85) {
    badges.push("Precizie ridicata: minim un modul cu acuratete >= 85%");
  }

  return badges;
}

export default function Reports({ goHome }) {
  const { settings } = useSettings();
  const reducedMotion = shouldReduceMotion();
  const progress = useProgress();
  const reportRef = useRef(null);
  const importRef = useRef(null);
  const [activeTab, setActiveTab] = useState("student");
  const [classProgress, setClassProgress] = useState(() => loadClassProgress());
  const [teacherNotes, setTeacherNotes] = useState(() => loadTeacherNotes());
  const [lessonProgress, setLessonProgress] = useState(() => loadLessonProgress());

  const weakLevels = useMemo(() => getWeakLevels(progress), [progress]);
  const classStats = useMemo(() => classAggregate(classProgress), [classProgress]);
  const lessonStats = useMemo(() => lessonAggregate(lessonProgress), [lessonProgress]);
  const badges = useMemo(
    () => buildBadges(progress, lessonStats),
    [lessonStats, progress],
  );

  useEffect(() => {
    const onLearningUpdate = () => {
      setLessonProgress(loadLessonProgress());
    };
    window.addEventListener(LEARNING_PROGRESS_EVENT, onLearningUpdate);
    return () => window.removeEventListener(LEARNING_PROGRESS_EVENT, onLearningUpdate);
  }, []);

  const buttonMotionProps = reducedMotion
    ? {}
    : {
        whileHover: { y: -2, scale: 1.01 },
        whileTap: { scale: 0.98 },
        transition: springFast,
      };

  const handlePrint = () => window.print();

  const handlePdfDownload = async () => {
    await generateReportPdfFromElement(reportRef.current, "mate-reset-raport.pdf");
  };

  const handleExportProgress = () => {
    downloadJson("mate-reset-progress.json", progress);
  };

  const handleImportProgress = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const entries = Array.isArray(parsed) ? parsed : [parsed];
      const validEntries = entries.filter(
        (entry) => entry && typeof entry === "object" && entry.modules,
      );
      const merged = [...classProgress, ...validEntries];
      setClassProgress(merged);
      saveClassProgress(merged);
    } catch (error) {
      console.error("Import JSON esuat.", error);
      window.alert("Fisier JSON invalid.");
    }
    event.target.value = "";
  };

  const addCurrentToClass = () => {
    const merged = [...classProgress, progress];
    setClassProgress(merged);
    saveClassProgress(merged);
  };

  const saveNotes = (value) => {
    setTeacherNotes(value);
    saveTeacherNotes(value);
  };

  return (
    <MotionPage className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="no-print flex flex-wrap items-center justify-between gap-3 mb-6">
          <button
            type="button"
            onClick={goHome}
            className="px-4 py-2 rounded-xl bg-white/70 shadow hover:bg-white"
          >
            &larr; Inapoi acasa
          </button>

          <div className="flex flex-wrap gap-2">
            <Motion.button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50"
              {...buttonMotionProps}
            >
              Printeaza
            </Motion.button>
            <Motion.button
              type="button"
              onClick={handlePdfDownload}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"
              {...buttonMotionProps}
            >
              Download PDF
            </Motion.button>
            <Motion.button
              type="button"
              onClick={handleExportProgress}
              className="px-4 py-2 rounded-xl bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50"
              {...buttonMotionProps}
            >
              Export progres (JSON)
            </Motion.button>
            <Motion.button
              type="button"
              onClick={() => importRef.current?.click()}
              className="px-4 py-2 rounded-xl bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50"
              {...buttonMotionProps}
            >
              Import progres (JSON)
            </Motion.button>
            <input
              ref={importRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={handleImportProgress}
            />
          </div>
        </div>

        <div className="no-print flex gap-2 mb-4">
          <Motion.button
            type="button"
            onClick={() => setActiveTab("student")}
            className={`px-4 py-2 rounded-xl border ${
              activeTab === "student"
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white text-indigo-700 border-indigo-200"
            }`}
            {...buttonMotionProps}
          >
            Raport elev
          </Motion.button>
          <Motion.button
            type="button"
            onClick={() => setActiveTab("class")}
            className={`px-4 py-2 rounded-xl border ${
              activeTab === "class"
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white text-indigo-700 border-indigo-200"
            }`}
            {...buttonMotionProps}
          >
            Raport clasa
          </Motion.button>
        </div>

        <Motion.div
          ref={reportRef}
          className="report-sheet report-entry-hook bg-white rounded-2xl shadow-lg p-8 border border-indigo-100"
          variants={fadeUp}
          initial={reducedMotion ? false : "hidden"}
          animate="show"
        >
          <header className="border-b border-indigo-100 pb-4 mb-6">
            <h1 className="text-3xl font-bold text-indigo-700">Mate Reset - Raport</h1>
            <p className="text-gray-600">
              Elev: {settings.studentName || progress.student?.name || "-"} | Clasa: {progress.student?.class || "-"} | Data: {formatDate(new Date().toISOString())}
            </p>
          </header>

          {activeTab === "student" ? (
            <div className="space-y-8">
              <section className="report-entry-hook">
                <h2 className="text-xl font-bold text-indigo-700 mb-2">Diagnostic</h2>
                <p className="text-gray-700">
                  Scor: {typeof progress.diagnostic?.score === "number" ? `${progress.diagnostic.score}/10` : "-"}
                </p>
                <p className="text-gray-700">
                  Module recomandate: {progress.diagnostic?.recommendedModuleIds?.join(", ") || "-"}
                </p>
                <p className="mt-2 rounded-xl bg-indigo-50 p-3 text-sm text-indigo-800">
                  Recomandare urmator pas:{" "}
                  {weakLevels[0]
                    ? `Consolideaza ${weakLevels[0].moduleTitle} - ${weakLevels[0].levelTitle}.`
                    : "Continua lectiile si exercitiile pentru date mai precise."}
                </p>
              </section>

              <section className="report-entry-hook">
                <h2 className="text-xl font-bold text-indigo-700 mb-3">Progres pe module</h2>
                <div className="space-y-3">
                  {MODULES.map((module) => {
                    const levels = Object.values(progress.modules?.[module.id]?.levels ?? {});
                    const done = levels.reduce((sum, level) => sum + (level.completedCount ?? 0), 0);
                    const total = levels.reduce((sum, level) => sum + (level.totalCount ?? 0), 0);
                    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                    return (
                      <div key={module.id} className="rounded-xl border border-indigo-100 p-3">
                        <div className="flex justify-between text-sm font-semibold text-indigo-700">
                          <span>{module.title}</span>
                          <span>{pct}%</span>
                        </div>
                        <MotionProgress value={pct} className="mt-2" barClassName="bg-indigo-500" />
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="report-entry-hook">
                <h2 className="mb-3 flex items-center gap-2 text-xl font-bold text-indigo-700">
                  <BookOpen size={20} /> Lectii animate
                </h2>
                <div className="rounded-xl border border-indigo-100 p-4">
                  <p className="text-gray-700">Lectii deschise: {lessonStats.total}</p>
                  <p className="text-gray-700">Lectii finalizate: {lessonStats.completed}</p>
                  <p className="text-gray-700">Acuratete mini-check: {lessonStats.accuracyPct}%</p>
                </div>
                <div className="mt-3 grid gap-2">
                  {lessonStats.details.slice(0, 8).map((row) => (
                    <div key={row.id} className="rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-sm">
                      <p className="font-semibold text-indigo-700">{row.id}</p>
                      <p className="text-slate-600">
                        {row.completed ? "Finalizata" : `Ultimul pas: ${row.lastSlide + 1}`} | Mini-check:{" "}
                        {row.correctChecks}/{row.totalChecks}
                      </p>
                    </div>
                  ))}
                  {lessonStats.details.length === 0 ? (
                    <p className="text-gray-600">Nu exista lectii parcurse.</p>
                  ) : null}
                </div>
              </section>

              <section className="report-entry-hook">
                <h2 className="text-xl font-bold text-indigo-700 mb-3">Abilitati slabe</h2>
                <div className="grid gap-2">
                  {weakLevels.length > 0 ? (
                    weakLevels.map((row) => (
                      <div key={`${row.moduleTitle}-${row.levelTitle}`} className="rounded-xl border border-rose-100 bg-rose-50 p-3 text-rose-800">
                        {row.moduleTitle} - {row.levelTitle}: {row.accuracyPct}%
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-600">Nu exista suficiente date.</p>
                  )}
                </div>
              </section>

              <section className="report-entry-hook">
                <h2 className="text-xl font-bold text-indigo-700 mb-3">Badge-uri</h2>
                <div className="grid gap-2 sm:grid-cols-2">
                  {badges.length > 0 ? (
                    badges.map((badge) => (
                      <div
                        key={badge}
                        className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900"
                      >
                        {badge}
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-600">
                      Continua activitatea pentru a debloca badge-uri.
                    </p>
                  )}
                </div>
              </section>

              <section className="report-entry-hook">
                <h2 className="text-xl font-bold text-indigo-700 mb-3">Ultimele 10 sesiuni</h2>
                <div className="space-y-2">
                  {progress.history.slice(-10).reverse().map((entry) => (
                    <div key={`${entry.dateISO}-${entry.exerciseId}`} className="rounded-xl border border-indigo-100 p-3 text-sm text-gray-700">
                      {formatDate(entry.dateISO)} | {entry.moduleId} / {entry.levelId} | exercitiu {entry.exerciseId} | incercari {entry.attempts} | hint-uri {entry.hintsUsed}
                    </div>
                  ))}
                  {progress.history.length === 0 ? (
                    <p className="text-gray-600">Nu exista sesiuni inregistrate.</p>
                  ) : null}
                </div>
              </section>

              <section className="report-entry-hook">
                <h2 className="text-xl font-bold text-indigo-700 mb-2">Notite profesor</h2>
                <textarea
                  value={teacherNotes}
                  onChange={(event) => saveNotes(event.target.value)}
                  className="w-full min-h-28 rounded-xl border border-indigo-200 p-3 text-gray-700"
                  placeholder="Observatii pentru elev..."
                />
              </section>
            </div>
          ) : (
            <div className="space-y-8">
              <section className="no-print report-entry-hook">
                <Motion.button
                  type="button"
                  onClick={addCurrentToClass}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"
                  {...buttonMotionProps}
                >
                  Adauga elevul curent in raportul clasei
                </Motion.button>
              </section>

              <section className="report-entry-hook">
                <h2 className="text-xl font-bold text-indigo-700 mb-3">Sinteza clasa</h2>
                <p className="text-gray-700">Numar elevi: {classProgress.length}</p>
                <p className="text-gray-700">Scor diagnostic mediu: {classStats.avgDiagnostic}</p>
                <p className="text-gray-700">Modul cel mai dificil: {classStats.hardestModule}</p>
                <p className="text-gray-700">Skill cel mai dificil: {classStats.hardestSkill}</p>
              </section>

              <section className="report-entry-hook">
                <h2 className="text-xl font-bold text-indigo-700 mb-3">Distributie completare</h2>
                <div className="space-y-3">
                  {classStats.completionDistribution.map((row) => (
                    <div key={row.name} className="rounded-xl border border-indigo-100 p-3">
                      <div className="flex justify-between text-sm font-semibold text-indigo-700">
                        <span>{row.name}</span>
                        <span>{row.completionPct}%</span>
                      </div>
                      <MotionProgress value={row.completionPct} className="mt-2" barClassName="bg-indigo-500" />
                    </div>
                  ))}
                  {classStats.completionDistribution.length === 0 ? (
                    <p className="text-gray-600">Importa progres JSON pentru a vedea datele clasei.</p>
                  ) : null}
                </div>
              </section>
            </div>
          )}
        </Motion.div>
      </div>
    </MotionPage>
  );
}

