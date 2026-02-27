import { MODULES, normalizeLevelId } from "../data/modulesConfig.js";
import { getDatasetByKey } from "../data/exerciseDatasets.js";
import { resetLearningProgress } from "./learningProgressStore.js";

export const PROGRESS_STORAGE_KEY = "mateResetProgress";
export const CLASS_STORAGE_KEY = "mateResetClassProgress";
export const TEACHER_NOTES_KEY = "mateResetTeacherNotes";
export const PROGRESS_EVENT = "mate-progress-updated";

function buildDefaultModulesState() {
  return MODULES.reduce((acc, module) => {
    acc[module.id] = {
      levels: module.levels.reduce((levelsAcc, level) => {
        levelsAcc[normalizeLevelId(level.id ?? level.level)] = {
          completedCount: 0,
          totalCount: getDatasetByKey(level.datasetKey)?.items?.length ?? 0,
          accuracyPct: 0,
          avgAttempts: 0,
          hintsUsed: 0,
          bestStreak: 0,
          stars: 0,
          totalTimeMs: 0,
          lastExerciseId: null,
          lastPlayedISO: null,
        };
        return levelsAcc;
      }, {}),
    };
    return acc;
  }, {});
}

export function createEmptyProgress() {
  return {
    student: { name: "", class: "" },
    diagnostic: null,
    modules: buildDefaultModulesState(),
    history: [],
  };
}

function emitProgress(progress) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(PROGRESS_EVENT, { detail: progress }));
}

function ensureShape(input) {
  const base = createEmptyProgress();
  const safe = input && typeof input === "object" ? input : {};
  const result = {
    ...base,
    ...safe,
    student: { ...base.student, ...(safe.student ?? {}) },
    modules: { ...base.modules, ...(safe.modules ?? {}) },
    history: Array.isArray(safe.history) ? safe.history : [],
  };

  for (const module of MODULES) {
    if (!result.modules[module.id]) {
      result.modules[module.id] = { levels: {} };
    }
    if (!result.modules[module.id].levels) {
      result.modules[module.id].levels = {};
    }

    for (const level of module.levels) {
      const key = normalizeLevelId(level.id ?? level.level);
      const mergedLevel = {
        ...base.modules[module.id].levels[key],
        ...(result.modules[module.id].levels[key] ?? {}),
      };
      if (!Number.isFinite(mergedLevel.totalCount) || mergedLevel.totalCount <= 0) {
        mergedLevel.totalCount = base.modules[module.id].levels[key].totalCount;
      }
      result.modules[module.id].levels[key] = mergedLevel;
    }
  }

  return result;
}

export function loadProgress() {
  if (typeof window === "undefined") {
    return createEmptyProgress();
  }

  try {
    const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (!raw) {
      const empty = createEmptyProgress();
      const legacyRaw = localStorage.getItem("mateResetDiagnostic");
      if (legacyRaw) {
        try {
          const legacy = JSON.parse(legacyRaw);
          if (typeof legacy?.score === "number") {
            empty.diagnostic = {
              dateISO: new Date().toISOString(),
              score: legacy.score,
              weakAreas: Array.isArray(legacy.weakAreas) ? legacy.weakAreas : [],
              recommended: Array.isArray(legacy.recommended) ? legacy.recommended : [],
              recommendedModuleIds: [],
            };
          }
        } catch {
          // ignore legacy parse errors
        }
      }
      return empty;
    }
    return ensureShape(JSON.parse(raw));
  } catch (error) {
    console.error("Nu am putut citi progresul.", error);
    return createEmptyProgress();
  }
}

export function saveProgress(progress) {
  if (typeof window === "undefined") return progress;
  const safeProgress = ensureShape(progress);
  localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(safeProgress));
  emitProgress(safeProgress);
  return safeProgress;
}

function computeLevelStats(entries, totalCount) {
  if (!entries.length) {
    return {
      completedCount: 0,
      totalCount,
      accuracyPct: 0,
      avgAttempts: 0,
      hintsUsed: 0,
      bestStreak: 0,
      stars: 0,
      totalTimeMs: 0,
      lastExerciseId: null,
      lastPlayedISO: null,
    };
  }

  const uniqueExercises = new Set(entries.map((entry) => entry.exerciseId));
  const attemptsSum = entries.reduce((sum, entry) => sum + (entry.attempts ?? 0), 0);
  const correctSum = entries.reduce(
    (sum, entry) => sum + (entry.scoreStepCorrect ?? 0),
    0,
  );
  const hintsSum = entries.reduce((sum, entry) => sum + (entry.hintsUsed ?? 0), 0);
  const timeSum = entries.reduce((sum, entry) => sum + (entry.timeMs ?? 0), 0);
  const starsAvgRaw =
    entries.reduce((sum, entry) => sum + (entry.stars ?? 0), 0) / entries.length;

  let bestStreak = 0;
  let currentStreak = 0;
  for (const entry of entries) {
    const perfect =
      entry.scoreStepCorrect >= 3 &&
      entry.attempts <= entry.scoreStepCorrect &&
      entry.hintsUsed === 0;
    if (perfect) {
      currentStreak += 1;
      bestStreak = Math.max(bestStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }

  const lastEntry = entries[entries.length - 1];

  return {
    completedCount: uniqueExercises.size,
    totalCount,
    accuracyPct: attemptsSum > 0 ? Math.round((correctSum / attemptsSum) * 100) : 0,
    avgAttempts: Math.round((attemptsSum / entries.length) * 10) / 10,
    hintsUsed: hintsSum,
    bestStreak,
    stars: Math.round(starsAvgRaw * 10) / 10,
    totalTimeMs: timeSum,
    lastExerciseId: lastEntry?.exerciseId ?? null,
    lastPlayedISO: lastEntry?.dateISO ?? null,
  };
}

function updateAggregates(progress, moduleId, levelId, totalCount) {
  const safeLevelId = normalizeLevelId(levelId);
  const entries = progress.history.filter(
    (entry) =>
      entry.moduleId === moduleId && normalizeLevelId(entry.levelId) === safeLevelId,
  );
  const stats = computeLevelStats(entries, totalCount);
  progress.modules[moduleId].levels[safeLevelId] = {
    ...progress.modules[moduleId].levels[safeLevelId],
    ...stats,
  };
}

export function setStudentInfo(studentPatch) {
  const progress = loadProgress();
  progress.student = {
    ...progress.student,
    ...studentPatch,
  };
  return saveProgress(progress);
}

export function setDiagnosticResult(diagnostic) {
  const progress = loadProgress();
  progress.diagnostic = diagnostic;
  return saveProgress(progress);
}

export function recordExerciseResult({
  moduleId,
  levelId,
  totalCount,
  exerciseId,
  skill,
  scoreStepCorrect,
  attempts,
  hintsUsed,
  timeMs,
  stars,
}) {
  const progress = loadProgress();
  const safeLevelId = normalizeLevelId(levelId);

  if (!progress.modules[moduleId]) {
    progress.modules[moduleId] = { levels: {} };
  }
  if (!progress.modules[moduleId].levels[safeLevelId]) {
    progress.modules[moduleId].levels[safeLevelId] = {
      completedCount: 0,
      totalCount: totalCount ?? 0,
      accuracyPct: 0,
      avgAttempts: 0,
      hintsUsed: 0,
      bestStreak: 0,
      stars: 0,
      totalTimeMs: 0,
      lastExerciseId: null,
      lastPlayedISO: null,
    };
  }

  progress.history.push({
    dateISO: new Date().toISOString(),
    moduleId,
    levelId: safeLevelId,
    exerciseId,
    skill: skill ?? null,
    scoreStepCorrect,
    attempts,
    hintsUsed,
    timeMs,
    stars,
  });

  updateAggregates(progress, moduleId, safeLevelId, totalCount);
  return saveProgress(progress);
}

export function resetProgress() {
  const empty = createEmptyProgress();
  if (typeof window !== "undefined") {
    localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(empty));
    resetLearningProgress();
    emitProgress(empty);
  }
  return empty;
}

export function loadClassProgress() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CLASS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Nu am putut citi progresul clasei.", error);
    return [];
  }
}

export function saveClassProgress(entries) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CLASS_STORAGE_KEY, JSON.stringify(entries));
}

export function loadTeacherNotes() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(TEACHER_NOTES_KEY) ?? "";
}

export function saveTeacherNotes(notes) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TEACHER_NOTES_KEY, notes);
}

export function getModuleCompletion(progress, moduleId) {
  const module = progress.modules[moduleId];
  if (!module) return 0;

  const levels = Object.values(module.levels ?? {});
  if (!levels.length) return 0;
  const completed = levels.reduce((sum, level) => sum + (level.completedCount ?? 0), 0);
  const total = levels.reduce((sum, level) => sum + (level.totalCount ?? 0), 0);
  if (total <= 0) return 0;
  return Math.round((completed / total) * 100);
}

export function getLastPlayedEntry(progress) {
  if (!progress.history.length) return null;
  return progress.history[progress.history.length - 1];
}
