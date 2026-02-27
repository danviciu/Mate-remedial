import { validateLessonSlide, validateSimulationConfig } from "./schema.js";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asText(value) {
  return typeof value === "string" ? value : "";
}

export function validateLessonsBundle(lessonsByModule) {
  const errors = [];

  Object.entries(lessonsByModule ?? {}).forEach(([moduleId, lessons]) => {
    asArray(lessons).forEach((lesson, lessonIndex) => {
      const lessonId = asText(lesson?.id) || `${moduleId}-lesson-${lessonIndex + 1}`;
      const slides = asArray(lesson?.slides);

      if (slides.length < 5) {
        errors.push({
          kind: "lesson",
          module: moduleId,
          itemId: lessonId,
          path: `${moduleId}.lessons[${lessonIndex}].slides`,
          message: "Lectia trebuie sa aiba minimum 5 pasi.",
        });
      }

      slides.forEach((slide, slideIndex) => {
        const slideErrors = validateLessonSlide(slide);
        slideErrors.forEach((entry) => {
          errors.push({
            kind: "lesson",
            module: moduleId,
            itemId: lessonId,
            path: `${moduleId}.lessons[${lessonIndex}].slides[${slideIndex}].${entry.path}`,
            message: entry.message,
          });
        });
      });

      const checks = asArray(lesson?.miniChecks);
      checks.forEach((check, checkIndex) => {
        const options = asArray(check?.options);
        if (options.length !== 3) {
          errors.push({
            kind: "lesson",
            module: moduleId,
            itemId: lessonId,
            path: `${moduleId}.lessons[${lessonIndex}].miniChecks[${checkIndex}].options`,
            message: "Mini-check trebuie sa aiba exact 3 optiuni.",
          });
        }
      });
    });
  });

  return errors;
}

export function validateSimulationBundle(simulationsMap) {
  const errors = [];

  Object.entries(simulationsMap ?? {}).forEach(([moduleId, config]) => {
    const configErrors = validateSimulationConfig(config);
    configErrors.forEach((entry) => {
      errors.push({
        kind: "simulation",
        module: moduleId,
        itemId: asText(config?.id) || moduleId,
        path: `${moduleId}.${entry.path}`,
        message: entry.message,
      });
    });
  });

  return errors;
}

export function mergeQaErrors(exerciseErrors, lessonErrors, simulationErrors) {
  const normalizedExercises = asArray(exerciseErrors).map((entry) => ({
    ...entry,
    kind: "exercise",
  }));
  return [...normalizedExercises, ...asArray(lessonErrors), ...asArray(simulationErrors)];
}
