import {
  normalizeExercise,
  normalizeLesson,
  normalizeSimulation,
} from "../content/normalizeContent.js";
import {
  validateExerciseItem,
  validateLessonSlide,
  validateSimulationConfig,
} from "../content/schema.js";

const PLACEHOLDER_RE =
  /\b(varianta\s*[abc]|optiunea?\s*[abc]|a\/b\/c|option\s*[abc]|placeholder)\b/i;

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function asId(value, fallback) {
  const text = typeof value === "string" ? value.trim() : "";
  return text || fallback;
}

function collectExerciseTexts(item) {
  return [
    String(item?.prompt ?? ""),
    String(item?.explanation ?? ""),
    ...toArray(item?.explanationSteps).map(String),
    ...toArray(item?.guidedSteps).flatMap((step) => [String(step?.prompt ?? ""), String(step?.explanation ?? "")]),
  ];
}

function hasTextVisualMismatch(texts, visualSpec) {
  if (!visualSpec || typeof visualSpec !== "object") return false;
  const allText = texts.join(" ");
  if (visualSpec.type === "fractionCircle" || visualSpec.type === "fractionBar") {
    const expected = `${visualSpec.numerator}/${visualSpec.denominator}`;
    const found = allText.match(/\b\d+\s*\/\s*\d+\b/g) ?? [];
    return found.some((token) => token.replace(/\s+/g, "") !== expected);
  }
  if (visualSpec.type === "percentGrid" || visualSpec.type === "percentBar") {
    const expected = `${visualSpec.percent}%`;
    const found = allText.match(/\b\d+\s*%/g) ?? [];
    return found.some((token) => token.replace(/\s+/g, "") !== expected);
  }
  return false;
}

function hasDuplicateChoices(choices) {
  const normalized = toArray(choices).map((choice) => String(choice).trim());
  return new Set(normalized).size !== normalized.length;
}

function hasPlaceholderChoice(choices) {
  return toArray(choices).some((choice) => PLACEHOLDER_RE.test(String(choice)));
}

function correctAnswerCount(choices, correctAnswer) {
  return toArray(choices).filter((choice) => String(choice) === String(correctAnswer)).length;
}

export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Nu am putut citi fisierul."));
    reader.readAsText(file, "utf-8");
  });
}

export function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Fisier invalid JSON.");
  }
}

export function normalizeImportShape(data) {
  if (Array.isArray(data)) {
    return { exercises: data, lessons: [], simulations: [], teamQuiz: [] };
  }
  if (!data || typeof data !== "object") {
    return { exercises: [], lessons: [], simulations: [], teamQuiz: [] };
  }
  return {
    exercises: toArray(data.exercises),
    lessons: toArray(data.lessons),
    simulations: toArray(data.simulations),
    teamQuiz: toArray(data.teamQuiz),
  };
}

function reject(type, item, reasons, index) {
  return {
    type,
    id: asId(item?.id, `${type}-${index + 1}`),
    module: String(item?.module ?? item?.moduleId ?? "unknown"),
    reasons,
  };
}

function validateExerciseImport(item, index) {
  const moduleId = String(item?.module ?? item?.moduleId ?? "fractions");
  const levelId = String(item?.level ?? item?.levelId ?? "1");
  const reasons = [];
  const choices = toArray(item?.choices);
  const correct = item?.correctAnswer ?? item?.correct;

  if (choices.length > 0) {
    if (hasPlaceholderChoice(choices)) {
      reasons.push("Optiuni placeholder detectate (Varianta A/B/C).");
    }
    if (hasDuplicateChoices(choices)) {
      reasons.push("Optiuni duplicate (ambiguu).");
    }
    if (correctAnswerCount(choices, correct) !== 1) {
      reasons.push("Nu exista un singur raspuns corect unic in optiuni.");
    }
  }
  if (hasTextVisualMismatch(collectExerciseTexts(item), item?.visualSpec)) {
    reasons.push("Textul contine valori care nu corespund vizualului.");
  }
  if (reasons.length > 0) {
    return {
      accepted: null,
      rejected: reject("exercise", item, reasons, index),
      fixes: [],
    };
  }

  const normalized = normalizeExercise(
    { ...item, correctAnswer: correct, module: moduleId, level: levelId },
    { moduleId, levelId, index },
  ).item;
  const validationErrors = validateExerciseItem(normalized);
  if (validationErrors.length > 0) {
    return {
      accepted: null,
      rejected: reject(
        "exercise",
        item,
        validationErrors.map((entry) => entry.message),
        index,
      ),
      fixes: [],
    };
  }

  const changed = JSON.stringify(item ?? {}) !== JSON.stringify(normalized);
  return {
    accepted: normalized,
    rejected: null,
    fixes: changed
      ? [{ type: "exercise", id: normalized.id, message: "Item normalizat automat." }]
      : [],
  };
}

function validateLessonImport(item, index) {
  const reasons = [];
  toArray(item?.miniChecks).forEach((check) => {
    const options = toArray(check?.options ?? check?.choices);
    if (options.length > 0) {
      if (hasPlaceholderChoice(options)) reasons.push("Mini-check cu optiuni placeholder.");
      if (hasDuplicateChoices(options)) reasons.push("Mini-check cu optiuni duplicate.");
      const correctIndex = Number.isInteger(check?.correctIndex) ? check.correctIndex : -1;
      if (correctIndex < 0 || correctIndex >= options.length) {
        reasons.push("Mini-check fara raspuns corect valid.");
      }
    }
  });
  toArray(item?.slides).forEach((slide, slideIndex) => {
    const slideTexts = [
      String(slide?.heading ?? slide?.title ?? ""),
      ...toArray(slide?.text ?? slide?.narrationText).map(String),
    ];
    if (hasTextVisualMismatch(slideTexts, slide?.visualSpec ?? slide?.visual)) {
      reasons.push(`Slide ${slideIndex + 1} cu text care nu corespunde vizualului.`);
    }
  });
  if (reasons.length > 0) {
    return {
      accepted: null,
      rejected: reject("lesson", item, reasons, index),
      fixes: [],
    };
  }

  const normalized = normalizeLesson(item, {
    moduleId: String(item?.module ?? "fractions"),
  }).lesson;
  const slideErrors = normalized.slides.flatMap((slide) => validateLessonSlide(slide));
  if (slideErrors.length > 0) {
    return {
      accepted: null,
      rejected: reject(
        "lesson",
        item,
        slideErrors.map((entry) => entry.message),
        index,
      ),
      fixes: [],
    };
  }

  const changed = JSON.stringify(item ?? {}) !== JSON.stringify(normalized);
  return {
    accepted: normalized,
    rejected: null,
    fixes: changed ? [{ type: "lesson", id: normalized.id, message: "Lectie normalizata." }] : [],
  };
}

function validateSimulationImport(item, index) {
  const normalized = normalizeSimulation(item, {
    moduleId: String(item?.module ?? item?.type ?? "fractions"),
  }).simulation;
  const errors = validateSimulationConfig(normalized);
  if (errors.length > 0) {
    return {
      accepted: null,
      rejected: reject(
        "simulation",
        item,
        errors.map((entry) => entry.message),
        index,
      ),
      fixes: [],
    };
  }
  const changed = JSON.stringify(item ?? {}) !== JSON.stringify(normalized);
  return {
    accepted: normalized,
    rejected: null,
    fixes: changed
      ? [{ type: "simulation", id: asId(item?.id, normalized.type), message: "Configuratie normalizata." }]
      : [],
  };
}

export function validateAndFixAll(payloadInput) {
  const payload = normalizeImportShape(payloadInput);
  const accepted = { exercises: [], lessons: [], simulations: [], teamQuiz: [] };
  const rejected = [];
  const fixes = [];

  payload.exercises.forEach((item, index) => {
    const result = validateExerciseImport(item, index);
    if (result.accepted) accepted.exercises.push(result.accepted);
    if (result.rejected) rejected.push(result.rejected);
    fixes.push(...result.fixes);
  });

  payload.lessons.forEach((item, index) => {
    const result = validateLessonImport(item, index);
    if (result.accepted) accepted.lessons.push(result.accepted);
    if (result.rejected) rejected.push(result.rejected);
    fixes.push(...result.fixes);
  });

  payload.simulations.forEach((item, index) => {
    const result = validateSimulationImport(item, index);
    if (result.accepted) accepted.simulations.push(result.accepted);
    if (result.rejected) rejected.push(result.rejected);
    fixes.push(...result.fixes);
  });

  payload.teamQuiz.forEach((item, index) => {
    const choices = toArray(item?.choices).map((choice) => String(choice));
    const reasons = [];
    if (choices.length < 2) reasons.push("TeamQuiz: minim 2 opțiuni.");
    if (hasPlaceholderChoice(choices)) reasons.push("TeamQuiz: opțiuni placeholder interzise.");
    if (hasDuplicateChoices(choices)) reasons.push("TeamQuiz: opțiuni duplicate.");
    const correctIndex = Number.isInteger(item?.correctIndex)
      ? item.correctIndex
      : choices.findIndex((choice) => choice === String(item?.correctAnswer));
    if (correctIndex < 0 || correctIndex >= choices.length) {
      reasons.push("TeamQuiz: răspuns corect invalid.");
    }
    if (reasons.length > 0) {
      rejected.push(reject("teamQuiz", item, reasons, index));
      return;
    }
    accepted.teamQuiz.push({
      id: asId(item?.id, `teamQuiz-${index + 1}`),
      module: String(item?.module ?? "fractions"),
      difficulty: String(item?.difficulty ?? "easy"),
      text: String(item?.text ?? item?.prompt ?? ""),
      choices,
      correctIndex,
      explanation: String(item?.explanation ?? ""),
      visualSpec: item?.visualSpec ?? null,
    });
  });

  return {
    accepted,
    rejected,
    fixesReport: fixes,
    summary: {
      acceptedCount:
        accepted.exercises.length +
        accepted.lessons.length +
        accepted.simulations.length +
        accepted.teamQuiz.length,
      acceptedExercises: accepted.exercises.length,
      acceptedLessons: accepted.lessons.length,
      acceptedSimulations: accepted.simulations.length,
      acceptedTeamQuiz: accepted.teamQuiz.length,
      rejectedCount: rejected.length,
      fixedCount: fixes.length,
    },
  };
}
