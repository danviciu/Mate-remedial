const STORAGE_KEY = "mateReset.customContent.v1";
const STORAGE_VERSION = 1;
const DEFAULT_MODULE_IDS = ["fractions", "percents", "integers", "equations"];

function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function createEmptyCustomContent() {
  return {
    version: STORAGE_VERSION,
    updatedAt: null,
    exercises: [],
    lessons: [],
    simulations: [],
    teamQuiz: [],
  };
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeContentPayload(payload) {
  const safe = payload && typeof payload === "object" ? payload : {};
  return {
    version: STORAGE_VERSION,
    updatedAt: safe.updatedAt ?? null,
    exercises: toArray(safe.exercises),
    lessons: toArray(safe.lessons),
    simulations: toArray(safe.simulations),
    teamQuiz: toArray(safe.teamQuiz),
  };
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function loadCustomContent() {
  if (!isBrowser()) return createEmptyCustomContent();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createEmptyCustomContent();
    const parsed = JSON.parse(raw);
    return normalizeContentPayload(parsed);
  } catch {
    return createEmptyCustomContent();
  }
}

export function saveCustomContent(payload) {
  const normalized = normalizeContentPayload(payload);
  normalized.updatedAt = new Date().toISOString();
  if (isBrowser()) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  }
  return normalized;
}

export function resetCustomContent() {
  if (isBrowser()) window.localStorage.removeItem(STORAGE_KEY);
}

function upsertById(items, item) {
  const id = String(item?.id ?? "");
  if (!id) return;
  const index = items.findIndex((entry) => String(entry?.id ?? "") === id);
  if (index >= 0) items[index] = item;
  else items.push(item);
}

function ensureModuleSkeleton(modules, moduleId) {
  if (!modules[moduleId]) {
    modules[moduleId] = {
      moduleId,
      title: moduleId,
      icon: "BookOpen",
      levels: [
        { id: "1", title: "Nivel 1", lessonId: `${moduleId}_lesson_1`, practice: [] },
        { id: "2", title: "Nivel 2", lessonId: `${moduleId}_lesson_2`, practice: [] },
        { id: "3", title: "Nivel 3", lessonId: `${moduleId}_lesson_3`, practice: [] },
      ],
    };
  }
  return modules[moduleId];
}

function ensureLevel(moduleContent, levelId) {
  const id = String(levelId || "1");
  let level = moduleContent.levels.find((entry) => String(entry.id) === id);
  if (!level) {
    level = {
      id,
      title: `Nivel ${id}`,
      lessonId: `${moduleContent.moduleId}_lesson_${id}`,
      practice: [],
    };
    moduleContent.levels.push(level);
  }
  return level;
}

export function mergeContent(defaultContent, customContent) {
  const merged = deepClone(defaultContent);
  const payload = normalizeContentPayload(customContent);

  payload.exercises.forEach((exercise) => {
    const moduleId = String(exercise?.module ?? exercise?.moduleId ?? "fractions");
    const safeModuleId = DEFAULT_MODULE_IDS.includes(moduleId) ? moduleId : "fractions";
    const moduleContent = ensureModuleSkeleton(merged, safeModuleId);
    const level = ensureLevel(moduleContent, exercise?.level ?? exercise?.levelId ?? "1");
    upsertById(level.practice, exercise);
  });

  return merged;
}

export function mergeLessons(defaultLessonsByModule, customContent) {
  const merged = deepClone(defaultLessonsByModule);
  const payload = normalizeContentPayload(customContent);
  payload.lessons.forEach((lesson) => {
    const moduleId = String(lesson?.module ?? "fractions");
    const safeModuleId = DEFAULT_MODULE_IDS.includes(moduleId) ? moduleId : "fractions";
    if (!Array.isArray(merged[safeModuleId])) merged[safeModuleId] = [];
    upsertById(merged[safeModuleId], lesson);
  });
  return merged;
}

export function mergeSimulationConfigs(defaultConfigs, customContent) {
  const merged = deepClone(defaultConfigs);
  const payload = normalizeContentPayload(customContent);
  payload.simulations.forEach((simulation) => {
    const key = String(
      simulation?.module ?? simulation?.moduleId ?? simulation?.type ?? "fractions",
    );
    merged[key] = {
      ...(merged[key] ?? {}),
      ...(simulation ?? {}),
    };
  });
  return merged;
}

export function mergeCustomPayload(basePayload, incomingPayload) {
  const base = normalizeContentPayload(basePayload);
  const incoming = normalizeContentPayload(incomingPayload);

  const next = {
    version: STORAGE_VERSION,
    updatedAt: new Date().toISOString(),
    exercises: deepClone(base.exercises),
    lessons: deepClone(base.lessons),
    simulations: deepClone(base.simulations),
    teamQuiz: deepClone(base.teamQuiz),
  };

  incoming.exercises.forEach((item) => upsertById(next.exercises, item));
  incoming.lessons.forEach((item) => upsertById(next.lessons, item));
  incoming.simulations.forEach((item) => {
    const key = String(item?.id ?? item?.module ?? item?.type ?? "");
    if (!key) return;
    const idx = next.simulations.findIndex(
      (entry) => String(entry?.id ?? entry?.module ?? entry?.type ?? "") === key,
    );
    if (idx >= 0) next.simulations[idx] = item;
    else next.simulations.push(item);
  });
  incoming.teamQuiz.forEach((item) => upsertById(next.teamQuiz, item));

  return next;
}

export function getCustomStorageKey() {
  return STORAGE_KEY;
}
