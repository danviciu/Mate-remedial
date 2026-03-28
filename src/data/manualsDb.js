import manualKnowledge from "./manualKnowledge.json";
import { getGradeCurriculum } from "./curriculumDb.js";

export const MANUALS_SOURCE = manualKnowledge.source;
export const MATH_MANUALS = manualKnowledge.manuals;

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokenize(value) {
  return normalizeText(value)
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);
}

function overlapScore(aTokens, bTokens) {
  if (!aTokens.length || !bTokens.length) return 0;
  const bSet = new Set(bTokens);
  let score = 0;
  aTokens.forEach((token) => {
    if (bSet.has(token)) score += 1;
  });
  return score;
}

export function getManualByGrade(grade) {
  const numeric = Number(grade);
  if (!Number.isInteger(numeric)) return null;
  return MATH_MANUALS.find((item) => item.grade === numeric) ?? null;
}

export function getManualUnitById(grade, unitId) {
  const manual = getManualByGrade(grade);
  if (!manual) return null;
  const target = String(unitId ?? "").trim();
  if (!target) return null;
  return manual.units.find((unit) => unit.id === target) ?? null;
}

export function mapCurriculumUnitToManualUnit(grade, curriculumUnitId) {
  const manual = getManualByGrade(grade);
  const curriculum = getGradeCurriculum(grade);
  if (!manual || !curriculum) return null;

  const targetUnit =
    curriculum.units.find((unit) => unit.id === String(curriculumUnitId ?? "")) ?? null;
  if (!targetUnit) return null;

  const targetTokens = tokenize([
    targetUnit.title,
    ...(Array.isArray(targetUnit.topics) ? targetUnit.topics : []),
  ].join(" "));

  if (targetTokens.length > 0) {
    const ranked = manual.units
      .map((unit) => {
        const titleTokens = tokenize(unit.title);
        const lessonsTokens = tokenize(
          (Array.isArray(unit.lessons) ? unit.lessons : [])
            .map((lesson) => lesson.title)
            .join(" "),
        );
        const score =
          overlapScore(targetTokens, titleTokens) * 4 +
          overlapScore(targetTokens, lessonsTokens);
        return { unit, score };
      })
      .sort((a, b) => b.score - a.score);

    if (ranked[0]?.score > 0) return ranked[0].unit;
  }

  const index = curriculum.units.findIndex((unit) => unit.id === targetUnit.id);
  if (index >= 0 && manual.units[index]) return manual.units[index];
  return null;
}

export function resolveManualUnit(grade, { manualUnitId = null, curriculumUnitId = null, topic = null } = {}) {
  const manual = getManualByGrade(grade);
  if (!manual) return null;

  const explicitManualUnit = getManualUnitById(grade, manualUnitId);
  if (explicitManualUnit) return explicitManualUnit;

  const key = normalizeText(topic);
  if (key) {
    const byTitle = manual.units.find((unit) => normalizeText(unit.title).includes(key));
    if (byTitle) return byTitle;

    const byLesson = manual.units.find((unit) =>
      (Array.isArray(unit.lessons) ? unit.lessons : []).some((lesson) =>
        normalizeText(lesson.title).includes(key),
      ),
    );
    if (byLesson) return byLesson;
  }

  return mapCurriculumUnitToManualUnit(grade, curriculumUnitId);
}

export function getManualLessonTitles(grade, options = {}) {
  const unit = resolveManualUnit(grade, options);
  if (!unit) return [];
  return (Array.isArray(unit.lessons) ? unit.lessons : []).map((lesson) => lesson.title);
}
