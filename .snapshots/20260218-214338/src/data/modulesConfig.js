export const MODULES = [
  {
    id: "fractions",
    title: "Fracții",
    description: "Înțelege fracțiile pas cu pas, cu desene clare.",
    levels: [
      {
        id: "1",
        level: "1",
        title: "Nivel 1: Parte din întreg",
        datasetKey: "fractions_level1",
        playable: true,
      },
      {
        id: "2",
        level: "2",
        title: "Nivel 2: Fracții echivalente",
        datasetKey: "fractions_level2",
        playable: true,
      },
      {
        id: "3",
        level: "3",
        title: "Nivel 3: Operații cu fracții",
        datasetKey: "fractions_level3",
        playable: true,
      },
    ],
  },
  {
    id: "percents",
    title: "Procente",
    description: "Procente explicate vizual, scurt și clar.",
    levels: [
      {
        id: "1",
        level: "1",
        title: "Nivel 1: Procentul din 100",
        datasetKey: "percents_level1",
        playable: true,
      },
      {
        id: "2",
        level: "2",
        title: "Nivel 2: Procent - fracție - zecimal",
        datasetKey: "percents_level2",
        playable: true,
      },
      {
        id: "3",
        level: "3",
        title: "Nivel 3: p% dintr-un număr",
        datasetKey: "percents_level3",
        playable: true,
      },
    ],
  },
  {
    id: "integers",
    title: "Numere întregi",
    description: "Axa numerelor, semne și operații corecte.",
    levels: [
      {
        id: "1",
        level: "1",
        title: "Nivel 1: Comparare pe axă",
        datasetKey: "integers_level1",
        playable: true,
      },
      {
        id: "2",
        level: "2",
        title: "Nivel 2: Adunare și scădere",
        datasetKey: "integers_level2",
        playable: true,
      },
      {
        id: "3",
        level: "3",
        title: "Nivel 3: Înmulțire și împărțire",
        datasetKey: "integers_level3",
        playable: true,
      },
    ],
  },
  {
    id: "equations",
    title: "Ecuații",
    description: "Rezolvare ghidată cu model de balanță.",
    levels: [
      {
        id: "1",
        level: "1",
        title: "Nivel 1: x + a = b",
        datasetKey: "equations_level1",
        playable: true,
      },
      {
        id: "2",
        level: "2",
        title: "Nivel 2: x - a = b și ax = b",
        datasetKey: "equations_level2",
        playable: true,
      },
      {
        id: "3",
        level: "3",
        title: "Nivel 3: x/a = b și paranteze",
        datasetKey: "equations_level3",
        playable: true,
      },
    ],
  },
];

export function normalizeLevelId(levelId) {
  return String(levelId ?? "").toLowerCase();
}

export function getModuleById(moduleId) {
  return MODULES.find((module) => module.id === moduleId) ?? null;
}

export function getLevelByDatasetKey(datasetKey) {
  for (const module of MODULES) {
    const found = module.levels.find((level) => level.datasetKey === datasetKey);
    if (found) {
      return { module, level: found };
    }
  }
  return null;
}
