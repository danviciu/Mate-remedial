import equationsRaw from "./equations.json";
import fractionsRaw from "./fractions.json";
import integersRaw from "./integers.json";
import percentagesRaw from "./percentages.json";
import { loadCustomContent, mergeContent } from "./customStore.js";
import { normalizeAllContentModules } from "./normalizeContent.js";
import { validateAllModulesContent } from "./schema.js";

export const RAW_CONTENT_MODULES = {
  fractions: fractionsRaw,
  percents: percentagesRaw,
  integers: integersRaw,
  equations: equationsRaw,
};

function countExercises(modulesMap) {
  return Object.values(modulesMap ?? {}).reduce((total, moduleContent) => {
    const moduleTotal = ensureArray(moduleContent?.levels).reduce(
      (sum, level) => sum + ensureArray(level?.practice).length,
      0,
    );
    return total + moduleTotal;
  }, 0);
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function enrichValidationError(error, modulesMap) {
  const rawPath = String(error?.path ?? "unknown");
  const message = String(error?.message ?? "Eroare necunoscuta.");
  const moduleFromPath = rawPath.split(".")[0] || "unknown";

  let itemId = null;
  const match = rawPath.match(/^([^.]+)\.levels\[(\d+)\]\.practice\[(\d+)\]/);
  if (match) {
    const [, moduleId, levelIndexText, itemIndexText] = match;
    const levelIndex = Number(levelIndexText);
    const itemIndex = Number(itemIndexText);
    itemId =
      modulesMap[moduleId]?.levels?.[levelIndex]?.practice?.[itemIndex]?.id ?? null;
  }

  return {
    module: moduleFromPath,
    itemId,
    path: rawPath,
    message,
  };
}

function buildValidationResult(modulesMap) {
  try {
    const rawErrors = validateAllModulesContent(modulesMap);
    const errors = ensureArray(rawErrors).map((error) =>
      enrichValidationError(error, modulesMap),
    );
    return {
      ok: errors.length === 0,
      errors,
      warnings: [],
    };
  } catch (error) {
    return {
      ok: false,
      errors: [
        {
          module: "system",
          itemId: null,
          path: "validator",
          message:
            error instanceof Error
              ? `Validator exception: ${error.message}`
              : "Validator exception necunoscuta.",
        },
      ],
      warnings: [],
    };
  }
}

export const CUSTOM_CONTENT = loadCustomContent();
export const MERGED_RAW_CONTENT_MODULES = mergeContent(
  RAW_CONTENT_MODULES,
  CUSTOM_CONTENT,
);

export const DEFAULT_VALIDATION_RESULT = buildValidationResult(RAW_CONTENT_MODULES);
export const MERGED_RAW_VALIDATION_RESULT = buildValidationResult(
  MERGED_RAW_CONTENT_MODULES,
);
export const RAW_VALIDATION_RESULT = MERGED_RAW_VALIDATION_RESULT;

const AUTO_FIX_RUN = normalizeAllContentModules(MERGED_RAW_CONTENT_MODULES, {
  regenerateInvalid: true,
});
export const AUTO_FIX_REPORT = AUTO_FIX_RUN.report;

export const CONTENT_MODULES = AUTO_FIX_RUN.modules;
export const CONTENT_VALIDATION_RESULT = buildValidationResult(CONTENT_MODULES);
export const CONTENT_VALIDATION_ERRORS = CONTENT_VALIDATION_RESULT.errors;

export const CONTENT_SOURCE_STATS = {
  defaultExerciseCount: countExercises(RAW_CONTENT_MODULES),
  customExerciseCount: ensureArray(CUSTOM_CONTENT?.exercises).length,
  mergedExerciseCount: countExercises(CONTENT_MODULES),
  customLessonCount: ensureArray(CUSTOM_CONTENT?.lessons).length,
  customSimulationCount: ensureArray(CUSTOM_CONTENT?.simulations).length,
  customTeamQuizCount: ensureArray(CUSTOM_CONTENT?.teamQuiz).length,
  hasCustom:
    ensureArray(CUSTOM_CONTENT?.exercises).length > 0 ||
    ensureArray(CUSTOM_CONTENT?.lessons).length > 0 ||
    ensureArray(CUSTOM_CONTENT?.simulations).length > 0 ||
    ensureArray(CUSTOM_CONTENT?.teamQuiz).length > 0,
};

if (
  import.meta.env.DEV &&
  typeof window !== "undefined" &&
  !window.__mateResetContentValidationWarned
) {
  window.__mateResetContentValidationWarned = true;
  if (!MERGED_RAW_VALIDATION_RESULT.ok) {
    console.warn(
      `Content invalid: ${MERGED_RAW_VALIDATION_RESULT.errors.length} errors (merged raw). Dupa Auto-Fix: ${CONTENT_VALIDATION_RESULT.errors.length}. Vezi /qa.`,
    );
  }
}

export function getModuleContent(moduleId) {
  return CONTENT_MODULES[moduleId] ?? null;
}

export function getLevelContent(moduleId, levelId) {
  const module = getModuleContent(moduleId);
  if (!module) return null;
  return module.levels.find((level) => String(level.id) === String(levelId)) ?? null;
}

export function getLevelPractice(moduleId, levelId) {
  return getLevelContent(moduleId, levelId)?.practice ?? [];
}

function mapVisualToLegacy(visualSpec) {
  if (!visualSpec || typeof visualSpec !== "object") {
    return { visualType: null, visualData: {} };
  }

  switch (visualSpec.type) {
    case "fractionCircle":
    case "fractionBar":
      return {
        visualType: "fractionBar",
        visualData: {
          totalParts: visualSpec.denominator,
          takenParts: visualSpec.numerator,
        },
      };
    case "fractionOperation":
      return {
        visualType: "fractionBar",
        visualData: {
          totalParts: visualSpec.result?.denominator,
          takenParts: Math.max(0, visualSpec.result?.numerator ?? 0),
        },
      };
    case "percentGrid":
    case "percentBar":
      return {
        visualType: "percentBar",
        visualData: {
          percent: visualSpec.percent,
          blocks: 10,
        },
      };
    case "numberLine":
      return {
        visualType: "numberLine",
        visualData: {
          min: visualSpec.min,
          max: visualSpec.max,
          points: visualSpec.highlights ?? [visualSpec.value],
        },
      };
    case "numberLineMove":
      return {
        visualType: "numberLine",
        visualData: {
          min: visualSpec.min,
          max: visualSpec.max,
          points: [visualSpec.start, visualSpec.result],
        },
      };
    case "balanceScale":
      return {
        visualType: "balance",
        visualData: {
          left: visualSpec.left,
          right: visualSpec.right,
        },
      };
    default:
      return { visualType: null, visualData: {} };
  }
}

function safeChoices(choices, fallback = []) {
  const source = ensureArray(choices).map((value) => String(value));
  if (source.length >= 3) return source.slice(0, 3);
  const merged = [...source];
  fallback.forEach((value) => {
    if (merged.length < 3 && !merged.includes(String(value))) merged.push(String(value));
  });
  while (merged.length < 3) merged.push(String(merged.length + 1));
  return merged.slice(0, 3);
}

function toLegacyStep(step) {
  const choices = safeChoices(step?.choices, [step?.correctAnswer, "0", "1"]);
  const correctIndex = choices.findIndex(
    (choice) => String(choice) === String(step?.correctAnswer),
  );
  return {
    prompt: String(step?.prompt ?? ""),
    choices,
    correctIndex: correctIndex >= 0 ? correctIndex : 0,
    hints: ensureArray(step?.hints).map((hint) => String(hint)),
    explanation: String(step?.explanation ?? ""),
  };
}

function toLegacyExercise(question, moduleId, levelId, fallbackIndex) {
  const safeQuestion = question && typeof question === "object" ? question : null;
  const { visualType, visualData } = mapVisualToLegacy(safeQuestion?.visualSpec);
  const choices = safeChoices(safeQuestion?.choices, [safeQuestion?.correctAnswer]);
  return {
    id: String(safeQuestion?.id ?? `${moduleId}_${levelId}_${fallbackIndex}`),
    title: String(safeQuestion?.skillTag ?? "exercitiu"),
    prompt: String(safeQuestion?.prompt ?? "Exercitiu"),
    skill: String(safeQuestion?.skillTag ?? "fallback"),
    steps: ensureArray(safeQuestion?.guidedSteps ?? safeQuestion?.steps).map(toLegacyStep),
    finalAnswer: String(safeQuestion?.correctAnswer ?? choices[0]),
    finalExplanation: ensureArray(safeQuestion?.explanationSteps).join(" "),
    visualType,
    visualData,
    visualSpec: safeQuestion?.visualSpec ?? null,
  };
}

export function buildExerciseDatasetsFromContent() {
  const datasets = {};
  Object.entries(CONTENT_MODULES).forEach(([moduleId, moduleContent]) => {
    ensureArray(moduleContent.levels).forEach((level, levelIndex) => {
      const key = `${moduleId}_level${level.id}`;
      const items = ensureArray(level.practice).map((question, itemIndex) =>
        toLegacyExercise(question, moduleId, String(level.id), itemIndex + 1),
      );
      datasets[key] = {
        fileName: `content/${moduleId}.json#level-${level.id}`,
        items: items.length > 0 ? items : [toLegacyExercise(null, moduleId, String(level.id), 1)],
        moduleId,
        levelId: String(level.id ?? levelIndex + 1),
      };
    });
  });
  return datasets;
}

export const CONTENT_DATASETS = buildExerciseDatasetsFromContent();

const DIFFICULTY_MAP = {
  1: "easy",
  2: "medium",
  3: "review",
};

function toTeamQuestion(question, moduleId, index) {
  const safeQuestion = question && typeof question === "object" ? question : {};
  const choices = safeChoices(safeQuestion.choices, [safeQuestion.correctAnswer]);
  const correctIndex = choices.findIndex(
    (choice) => String(choice) === String(safeQuestion.correctAnswer),
  );
  const { visualType, visualData } = mapVisualToLegacy(safeQuestion.visualSpec);
  return {
    id: String(safeQuestion.id ?? `${moduleId}_team_${index + 1}`),
    module: moduleId,
    difficulty: DIFFICULTY_MAP[safeQuestion.difficulty] ?? "easy",
    text: String(safeQuestion.prompt ?? "Intrebare"),
    visualType: visualType ?? "none",
    visualData,
    visualSpec: safeQuestion.visualSpec ?? null,
    choices,
    correctIndex: correctIndex >= 0 ? correctIndex : 0,
    explanation: ensureArray(safeQuestion.explanationSteps).join(" "),
  };
}

export function buildTeamQuizQuestions() {
  const pool = [];
  Object.entries(CONTENT_MODULES).forEach(([moduleId, moduleContent]) => {
    ensureArray(moduleContent.levels).forEach((level) => {
      ensureArray(level.practice).forEach((question, index) => {
        pool.push(toTeamQuestion(question, moduleId, index));
      });
    });
  });
  const customQuiz = ensureArray(CUSTOM_CONTENT?.teamQuiz).map((item, index) => ({
    id: String(item?.id ?? `custom_quiz_${index + 1}`),
    module: String(item?.module ?? "fractions"),
    difficulty: String(item?.difficulty ?? "easy"),
    text: String(item?.text ?? item?.prompt ?? "Întrebare custom"),
    visualType: "none",
    visualData: {},
    visualSpec: item?.visualSpec ?? null,
    choices: ensureArray(item?.choices).map((choice) => String(choice)).slice(0, 4),
    correctIndex: Number.isInteger(item?.correctIndex)
      ? item.correctIndex
      : Math.max(
          0,
          ensureArray(item?.choices).findIndex((choice) => String(choice) === String(item?.correctAnswer)),
        ),
    explanation: String(item?.explanation ?? ""),
  }));
  pool.push(...customQuiz.filter((item) => item.choices.length >= 2));
  return pool;
}

export function getLessonIdForModuleLevel(moduleId, levelId) {
  return getLevelContent(moduleId, levelId)?.lessonId ?? null;
}
