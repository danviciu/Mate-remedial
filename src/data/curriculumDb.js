import curriculum from "./curriculum_ro_2017.json";

export const CURRICULUM_SOURCE = curriculum.source;
export const MATH_CURRICULUM = curriculum.grades;

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function getGradeCurriculum(grade) {
  const numeric = Number(grade);
  if (!Number.isInteger(numeric)) return null;
  return MATH_CURRICULUM.find((item) => item.grade === numeric) ?? null;
}

export function getGradesList() {
  return MATH_CURRICULUM.map((item) => ({
    grade: item.grade,
    gradeLabel: item.gradeLabel,
    unitCount: Array.isArray(item.units) ? item.units.length : 0,
  }));
}

export function getUnitsForGrade(grade) {
  return getGradeCurriculum(grade)?.units ?? [];
}

export function findUnitById(unitId) {
  const target = String(unitId ?? "").trim();
  if (!target) return null;
  for (const grade of MATH_CURRICULUM) {
    const found = grade.units.find((unit) => unit.id === target);
    if (found) return { grade, unit: found };
  }
  return null;
}

export function resolveUnitForTopic(grade, topic) {
  const units = getUnitsForGrade(grade);
  if (!units.length) return null;
  const key = normalizeText(topic);
  if (!key) return null;

  const byTitle = units.find((unit) => normalizeText(unit.title).includes(key));
  if (byTitle) return byTitle;

  const byTopic = units.find((unit) =>
    (Array.isArray(unit.topics) ? unit.topics : []).some((entry) =>
      normalizeText(entry).includes(key),
    ),
  );
  if (byTopic) return byTopic;

  const reverseTitle = units.find((unit) => key.includes(normalizeText(unit.title)));
  if (reverseTitle) return reverseTitle;

  return null;
}
