export const LESSON_PROGRESS_KEY = "mateReset.lessonProgress";
export const SIMULATOR_PROGRESS_KEY = "mateReset.simulatorProgress";
export const LEARNING_PROGRESS_EVENT = "mate-learning-progress-updated";

function emit(detail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(LEARNING_PROGRESS_EVENT, { detail }));
}

function readJson(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  if (typeof window === "undefined") return value;
  window.localStorage.setItem(key, JSON.stringify(value));
  return value;
}

export function loadLessonProgress() {
  return readJson(LESSON_PROGRESS_KEY, {});
}

export function saveLessonProgress(progress) {
  const safe = progress && typeof progress === "object" ? progress : {};
  writeJson(LESSON_PROGRESS_KEY, safe);
  emit({ type: "lesson", value: safe });
  return safe;
}

export function updateLessonProgress(lessonId, patch) {
  const current = loadLessonProgress();
  const prev = current[lessonId] ?? {};
  const next = {
    ...prev,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  const merged = { ...current, [lessonId]: next };
  return saveLessonProgress(merged);
}

export function loadSimulatorProgress() {
  return readJson(SIMULATOR_PROGRESS_KEY, {});
}

export function saveSimulatorProgress(progress) {
  const safe = progress && typeof progress === "object" ? progress : {};
  writeJson(SIMULATOR_PROGRESS_KEY, safe);
  emit({ type: "simulator", value: safe });
  return safe;
}

export function recordSimulatorSession(simulatorId, payload = {}) {
  const current = loadSimulatorProgress();
  const prev = current[simulatorId] ?? {
    sessions: 0,
    wins: 0,
    attempts: 0,
  };

  const next = {
    ...prev,
    ...payload,
    sessions: (prev.sessions ?? 0) + 1,
    wins: (prev.wins ?? 0) + (payload.win ? 1 : 0),
    attempts: (prev.attempts ?? 0) + (payload.attempts ?? 1),
    updatedAt: new Date().toISOString(),
  };

  const merged = { ...current, [simulatorId]: next };
  return saveSimulatorProgress(merged);
}

export function resetLearningProgress() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(LESSON_PROGRESS_KEY);
    window.localStorage.removeItem(SIMULATOR_PROGRESS_KEY);
  }
  emit({ type: "reset" });
}
