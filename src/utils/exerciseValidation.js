const PLACEHOLDER_PREFIX_PATTERN =
  /^(varianta|varianta|optiunea|optiune|option)\b/i;
const PLACEHOLDER_LETTER_PATTERN = /^[abc](\s*\/\s*[abc]){0,2}$/i;
const PLACEHOLDER_GROUP_PATTERN =
  /\b(a\s*\/\s*b\s*\/\s*c|varianta\s*[abc]|optiunea?\s*[abc]|option\s*[abc])\b/i;

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeText(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function isPlaceholderChoice(value) {
  if (!isNonEmptyString(value)) return false;
  const normalized = normalizeText(value);
  return (
    PLACEHOLDER_PREFIX_PATTERN.test(normalized) ||
    PLACEHOLDER_LETTER_PATTERN.test(normalized) ||
    PLACEHOLDER_GROUP_PATTERN.test(normalized)
  );
}

function validateStep(fileName, itemId, step, stepIndex, expectedPrompt) {
  const errors = [];
  const label = `${fileName} -> ${itemId} -> pas ${stepIndex + 1}`;

  if (!isNonEmptyString(step?.prompt)) {
    errors.push(`${label}: lipseste prompt-ul pasului.`);
  }

  if (expectedPrompt) {
    let validPrompt = true;
    let message = "";

    if (typeof expectedPrompt === "string") {
      validPrompt = step.prompt === expectedPrompt;
      message = `Trebuie sa fie exact: "${expectedPrompt}".`;
    } else if (expectedPrompt instanceof RegExp) {
      validPrompt = expectedPrompt.test(step.prompt);
      message = `Prompt-ul trebuie sa respecte formatul ${expectedPrompt}.`;
    } else if (typeof expectedPrompt === "function") {
      validPrompt = Boolean(expectedPrompt(step.prompt));
      message =
        "Prompt-ul pasului nu respecta sablonul pedagogic cerut pentru acest nivel.";
    }

    if (!validPrompt) {
      errors.push(`${label}: prompt invalid. ${message}`);
    }
  }

  if (!Array.isArray(step?.choices) || step.choices.length < 3) {
    errors.push(`${label}: choices trebuie sa aiba cel putin 3 optiuni.`);
  } else {
    step.choices.forEach((choice) => {
      if (!isNonEmptyString(choice)) {
        errors.push(`${label}: fiecare optiune trebuie sa fie text nenul.`);
      }
      if (isPlaceholderChoice(choice)) {
        errors.push(
          `${label}: optiune placeholder interzisa ("${choice}").`,
        );
      }
    });
  }

  if (
    !Number.isInteger(step?.correctIndex) ||
    step.correctIndex < 0 ||
    !Array.isArray(step?.choices) ||
    step.correctIndex >= step.choices.length
  ) {
    errors.push(`${label}: correctIndex este invalid.`);
  }

  if (!Array.isArray(step?.hints) || step.hints.length !== 3) {
    errors.push(`${label}: hints trebuie sa aiba exact 3 hint-uri.`);
  } else {
    step.hints.forEach((hint, hintIndex) => {
      if (!isNonEmptyString(hint)) {
        errors.push(`${label}: hint-ul ${hintIndex + 1} este gol.`);
      }
    });
  }

  if (!isNonEmptyString(step?.explanation)) {
    errors.push(`${label}: lipseste explanation pentru pas.`);
  }

  return errors;
}

export function validateExerciseFile({
  fileName,
  items,
  expectedStepPrompts,
}) {
  const errors = [];

  if (!Array.isArray(items)) {
    return [`${fileName}: continut invalid. Se asteapta un array de exercitii.`];
  }

  items.forEach((item, itemIndex) => {
    const itemId = item?.id ?? `index-${itemIndex + 1}`;
    const label = `${fileName} -> ${itemId}`;

    if (!isNonEmptyString(item?.prompt)) {
      errors.push(`${label}: lipseste prompt-ul principal.`);
    }

    if (!Array.isArray(item?.steps) || item.steps.length !== 3) {
      errors.push(`${label}: steps trebuie sa aiba exact 3 pasi.`);
    }

    if (!isNonEmptyString(item?.finalAnswer)) {
      errors.push(`${label}: lipseste finalAnswer.`);
    }

    if (!isNonEmptyString(item?.finalExplanation)) {
      errors.push(`${label}: lipseste finalExplanation.`);
    }

    if (Array.isArray(item?.steps) && item.steps.length === 3) {
      item.steps.forEach((step, stepIndex) => {
        errors.push(
          ...validateStep(
            fileName,
            itemId,
            step,
            stepIndex,
            expectedStepPrompts?.[stepIndex],
          ),
        );
      });
    }
  });

  return errors;
}
