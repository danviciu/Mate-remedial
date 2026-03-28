const PLACEHOLDER_PATTERN =
  /\b(varianta\s*[abc]|optiunea?\s*[abc]|option\s*[abc]|a\/b\/c|placeholder)\b/i;

const ALLOWED_GRADE_BANDS = new Set([
  "V",
  "VI",
  "VII",
  "VIII",
  "V-VI",
  "V-VII",
  "V-VIII",
  "VI-VII",
  "VI-VIII",
  "VII-VIII",
]);
const ALLOWED_VISUALS = new Set([
  "fractionCircle",
  "fractionBar",
  "fractionOperation",
  "percentGrid",
  "percentBar",
  "numberLine",
  "numberLineMove",
  "balanceScale",
  "signTable",
  "simpleSteps",
]);

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function pushError(errors, path, message) {
  errors.push({ path, message });
}

export const CONTENT_SCHEMA = {
  ExerciseItem: [
    "id",
    "gradeBand",
    "module",
    "level",
    "title",
    "prompt",
    "steps",
    "choices",
    "correct",
    "hints",
    "explanation",
    "visualSpec",
    "tags",
  ],
  LessonSlide: ["id", "title", "narrationText", "visualSpec", "checkpointQuestion"],
  SimulationConfig: ["type", "defaults", "constraints"],
};

function validateGuidedStep(step, basePath, errors) {
  if (!hasText(step?.prompt)) {
    pushError(errors, `${basePath}.prompt`, "Prompt lipsa.");
  }
  if (!Array.isArray(step?.choices) || step.choices.length !== 3) {
    pushError(errors, `${basePath}.choices`, "choices trebuie sa aiba exact 3 optiuni.");
  } else if (new Set(step.choices.map(String)).size !== 3) {
    pushError(errors, `${basePath}.choices`, "choices trebuie sa fie unice.");
  }
  if (!hasText(step?.correctAnswer)) {
    pushError(errors, `${basePath}.correctAnswer`, "Raspuns corect lipsa.");
  } else if (!step.choices?.map(String).includes(String(step.correctAnswer))) {
    pushError(
      errors,
      `${basePath}.correctAnswer`,
      "Raspunsul corect trebuie sa existe in choices.",
    );
  }
  if (!hasText(step?.explanation)) {
    pushError(errors, `${basePath}.explanation`, "Explicatia pasului lipseste.");
  }
  if (!Array.isArray(step?.hints) || step.hints.length < 2) {
    pushError(errors, `${basePath}.hints`, "Sunt necesare cel putin 2 hint-uri.");
  }
}

function validateVisualSpec(visualSpec, basePath, errors) {
  if (!visualSpec || typeof visualSpec !== "object") {
    pushError(errors, basePath, "visualSpec lipsa.");
    return;
  }
  if (!ALLOWED_VISUALS.has(visualSpec.type)) {
    pushError(errors, `${basePath}.type`, `Tip vizual invalid: ${String(visualSpec.type)}.`);
  }

  if (visualSpec.type === "fractionCircle" || visualSpec.type === "fractionBar") {
    const num = visualSpec.numerator;
    const den = visualSpec.denominator;
    if (!Number.isInteger(num) || !Number.isInteger(den) || den < 2 || num < 0 || num > den) {
      pushError(
        errors,
        basePath,
        "La fractii simple, denominator >= 2 si numerator intre 0 si denominator.",
      );
    }
  }

  if (visualSpec.type === "fractionOperation") {
    const validPart = (part) =>
      Number.isInteger(part?.numerator) &&
      Number.isInteger(part?.denominator) &&
      part.denominator > 0;
    if (!validPart(visualSpec.left) || !validPart(visualSpec.right) || !validPart(visualSpec.result)) {
      pushError(errors, basePath, "fractionOperation trebuie sa aiba left/right/result valide.");
    }
    if (!["+", "-"].includes(visualSpec.operation)) {
      pushError(errors, `${basePath}.operation`, "Operation trebuie sa fie + sau -.");
    }
  }

  if (visualSpec.type === "percentGrid" || visualSpec.type === "percentBar") {
    if (!Number.isFinite(visualSpec.percent) || visualSpec.percent < 0 || visualSpec.percent > 100) {
      pushError(errors, `${basePath}.percent`, "percent trebuie sa fie intre 0 si 100.");
    }
  }

  if (visualSpec.type === "numberLine") {
    if (!Number.isFinite(visualSpec.min) || !Number.isFinite(visualSpec.max) || visualSpec.min >= visualSpec.max) {
      pushError(errors, basePath, "numberLine are nevoie de min < max.");
    }
  }
}

function validateNoPlaceholders(texts, basePath, errors) {
  texts.forEach((value, index) => {
    if (!hasText(value)) return;
    if (PLACEHOLDER_PATTERN.test(value)) {
      pushError(errors, `${basePath}[${index}]`, `Text placeholder interzis: "${value}".`);
    }
  });
}

function validateFractionConsistency(item, basePath, errors) {
  const spec = item.visualSpec;
  if (!spec || !["fractionCircle", "fractionBar"].includes(spec.type)) return;
  const denMatch = item.prompt.match(/(\d+)\s*p[ăa]r[țt]i/i);
  if (denMatch) {
    const expectedDen = Number(denMatch[1]);
    if (Number.isFinite(expectedDen) && spec.denominator !== expectedDen) {
      pushError(
        errors,
        `${basePath}.visualSpec.denominator`,
        `Prompt-ul indica ${expectedDen} parti, dar vizualul are denominator ${spec.denominator}.`,
      );
    }
  }
}

function validatePracticeItem(item, basePath, errors) {
  const requiredStringFields = [
    "id",
    "gradeBand",
    "module",
    "level",
    "title",
    "skillTag",
    "prompt",
    "correctAnswer",
  ];
  requiredStringFields.forEach((field) => {
    if (!hasText(item?.[field])) {
      pushError(errors, `${basePath}.${field}`, `Camp lipsa: ${field}.`);
    }
  });

  if (!ALLOWED_GRADE_BANDS.has(item?.gradeBand)) {
    pushError(errors, `${basePath}.gradeBand`, "gradeBand trebuie sa fie V, VI sau VII.");
  }

  if (!Number.isInteger(item?.difficulty) || item.difficulty < 1 || item.difficulty > 3) {
    pushError(errors, `${basePath}.difficulty`, "difficulty trebuie sa fie intre 1 si 3.");
  }

  if (!Array.isArray(item?.choices) || item.choices.length !== 3) {
    pushError(errors, `${basePath}.choices`, "choices trebuie sa aiba exact 3 optiuni.");
  } else if (new Set(item.choices.map(String)).size !== 3) {
    pushError(errors, `${basePath}.choices`, "choices trebuie sa fie unice.");
  } else if (!item.choices.map(String).includes(String(item.correctAnswer))) {
    pushError(errors, `${basePath}.correctAnswer`, "correctAnswer trebuie sa existe in choices.");
  }

  if (!Array.isArray(item?.explanationSteps) || item.explanationSteps.length < 2) {
    pushError(errors, `${basePath}.explanationSteps`, "explanationSteps trebuie sa aiba cel putin 2 pasi.");
  }
  if (!Array.isArray(item?.hints) || item.hints.length < 2) {
    pushError(errors, `${basePath}.hints`, "hints trebuie sa aiba cel putin 2 elemente.");
  }
  const steps = Array.isArray(item?.guidedSteps) ? item.guidedSteps : item?.steps;
  if (!Array.isArray(steps) || steps.length < 2) {
    pushError(errors, `${basePath}.guidedSteps`, "guidedSteps/steps trebuie sa aiba cel putin 2 pasi.");
  } else {
    steps.slice(0, 3).forEach((step, index) =>
      validateGuidedStep(step, `${basePath}.guidedSteps[${index}]`, errors),
    );
  }

  if (!Array.isArray(item?.tags) || item.tags.length === 0) {
    pushError(errors, `${basePath}.tags`, "tags trebuie sa contina cel putin un element.");
  }

  validateVisualSpec(item?.visualSpec, `${basePath}.visualSpec`, errors);

  validateNoPlaceholders(
    [
      item?.prompt,
      ...(item?.choices ?? []),
      ...(item?.explanationSteps ?? []),
      ...(item?.hints ?? []),
      ...(item?.guidedSteps ?? []).flatMap((step) => [
        step?.prompt,
        ...(step?.choices ?? []),
        step?.explanation,
        ...(step?.hints ?? []),
      ]),
    ],
    `${basePath}.texts`,
    errors,
  );

  validateFractionConsistency(item, basePath, errors);
}

export function validateExerciseItem(item) {
  const errors = [];
  validatePracticeItem(item, "item", errors);
  return errors;
}

export function validateLessonSlide(slide) {
  const errors = [];
  if (!hasText(slide?.id)) pushError(errors, "slide.id", "id lipsa.");
  if (!hasText(slide?.title ?? slide?.heading)) pushError(errors, "slide.title", "title lipsa.");
  const narrationText = Array.isArray(slide?.narrationText) ? slide.narrationText : slide?.text;
  if (!Array.isArray(narrationText) || narrationText.length === 0) {
    pushError(errors, "slide.narrationText", "narrationText/text lipsa.");
  }
  validateVisualSpec(slide?.visualSpec ?? slide?.visual, "slide.visualSpec", errors);
  return errors;
}

export function validateSimulationConfig(config) {
  const errors = [];
  if (!hasText(config?.type)) pushError(errors, "simulation.type", "type lipsa.");
  if (!config?.defaults || typeof config.defaults !== "object") {
    pushError(errors, "simulation.defaults", "defaults lipsa.");
  }
  if (!config?.constraints || typeof config.constraints !== "object") {
    pushError(errors, "simulation.constraints", "constraints lipsa.");
  }
  return errors;
}

export function validateModuleContent(moduleContent) {
  const errors = [];
  if (!moduleContent || typeof moduleContent !== "object") {
    return [{ path: "module", message: "Modul invalid." }];
  }
  if (!hasText(moduleContent.moduleId)) {
    pushError(errors, "moduleId", "moduleId lipsa.");
  }
  if (!Array.isArray(moduleContent.levels) || moduleContent.levels.length !== 3) {
    pushError(errors, "levels", "Fiecare modul trebuie sa aiba exact 3 niveluri.");
    return errors;
  }

  moduleContent.levels.forEach((level, levelIndex) => {
    const levelPath = `levels[${levelIndex}]`;
    if (!hasText(level?.id)) pushError(errors, `${levelPath}.id`, "id nivel lipsa.");
    if (!hasText(level?.title)) pushError(errors, `${levelPath}.title`, "title nivel lipsa.");
    if (!hasText(level?.lessonId)) pushError(errors, `${levelPath}.lessonId`, "lessonId nivel lipsa.");
    if (!Array.isArray(level?.practice) || level.practice.length < 1) {
      pushError(errors, `${levelPath}.practice`, "Fiecare nivel trebuie sa aiba cel putin 1 item.");
      return;
    }
    level.practice.forEach((item, itemIndex) => {
      validatePracticeItem(item, `${levelPath}.practice[${itemIndex}]`, errors);
    });
  });

  return errors;
}

export function validateAllModulesContent(modulesMap) {
  const errors = [];
  Object.entries(modulesMap).forEach(([key, moduleContent]) => {
    validateModuleContent(moduleContent).forEach((error) => {
      errors.push({
        path: `${key}.${error.path}`,
        message: error.message,
      });
    });
  });
  return errors;
}
