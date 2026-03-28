import { validateAllModulesContent } from "./schema.js";

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
const PLACEHOLDER_RE =
  /\b(varianta\s*[abc]|optiunea?\s*[abc]|option\s*[abc]|a\/b\/c|placeholder)\b/i;
const CORRUPTED_TEXT_RE = /[A-Za-z]\?[A-Za-z]|�|Ä|È|Â|�/;
const FRACTION_DENOMS = [2, 3, 4, 5, 6, 8, 10];
const PERCENT_VALUES = [10, 20, 25, 50, 75];
const GRADE_BY_LEVEL = { "1": "V", "2": "VI", "3": "VII", "4": "VIII" };
const PRACTICE_ITEMS_PER_LEVEL = 20;
const DIFFICULTY_PATTERN_BY_LEVEL = {
  "1": [1, 1, 2, 1, 2, 3],
  "2": [1, 2, 2, 3, 2, 1],
  "3": [2, 3, 3, 2, 1, 3],
};

function toInt(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed) : fallback;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function pickBySeed(values, seed, fallback = null) {
  if (!Array.isArray(values) || values.length === 0) return fallback;
  return values[Math.abs(seed) % values.length];
}

function getTargetDifficulty(levelId, index) {
  const safeLevelId = String(levelId ?? "1");
  const pattern = DIFFICULTY_PATTERN_BY_LEVEL[safeLevelId] ?? DIFFICULTY_PATTERN_BY_LEVEL["2"];
  const fromPattern = pattern[index % pattern.length];
  return clamp(toInt(fromPattern, clamp(toInt(safeLevelId, 2), 1, 3)), 1, 3);
}

function stableHashInt(value) {
  let hash = 2166136261;
  const text = String(value ?? "");
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return Math.abs(hash >>> 0);
}

function stableHash(value) {
  return stableHashInt(value).toString(36);
}

function shuffleDeterministic(values, seedValue) {
  const list = [...values];
  let seed = stableHashInt(seedValue);
  for (let i = list.length - 1; i > 0; i -= 1) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const j = seed % (i + 1);
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

function sanitizeString(value) {
  if (typeof value !== "string") return "";
  let next = value.trim().replace(/\s+/g, " ").replace(/\b1 parti\b/gi, "1 parte");
  next = next
    .replace(/\bax\?/gi, "axa")
    .replace(/\becua\?ii\b/gi, "ecuatii")
    .replace(/\bfrac\?ii\b/gi, "fractii")
    .replace(/\bnumere \?ntregi\b/gi, "numere intregi")
    .replace(/\b\?n\b/gi, "in");
  return next;
}

function sanitizeArray(value, fallback = []) {
  const source = Array.isArray(value) ? value : fallback;
  return source.map((item) => sanitizeString(String(item ?? ""))).filter(Boolean);
}

function uniq(values) {
  const out = [];
  values.forEach((value) => {
    if (!out.includes(value)) out.push(value);
  });
  return out;
}

function isMeaningfulLabel(value) {
  const text = sanitizeString(value);
  if (!text) return false;
  if (text.includes("?")) return false;
  if (PLACEHOLDER_RE.test(text)) return false;
  return true;
}

function defaultVisual(moduleId, seed = 0) {
  if (moduleId === "fractions") {
    const d = FRACTION_DENOMS[seed % FRACTION_DENOMS.length];
    const n = clamp((seed % Math.max(d - 1, 1)) + 1, 1, d - 1);
    return { type: "fractionCircle", numerator: n, denominator: d, label: `${n}/${d}` };
  }
  if (moduleId === "percents") {
    const p = PERCENT_VALUES[seed % PERCENT_VALUES.length];
    return { type: "percentGrid", percent: p, label: `${p}%` };
  }
  if (moduleId === "integers") {
    const marker = clamp((seed % 17) - 8, -10, 10);
    return { type: "numberLine", min: -10, max: 10, value: marker, highlights: [0, marker] };
  }
  return { type: "balanceScale", left: ["x", "+2"], right: ["5"], tilt: "balanced" };
}

function normalizeVisualSpec(rawVisual, moduleId, seed = 0) {
  const visual = rawVisual && typeof rawVisual === "object" ? { ...rawVisual } : null;
  if (!visual) return { visualSpec: defaultVisual(moduleId, seed), fixes: ["visualSpec lipsa."] };

  const type = sanitizeString(visual.type) || defaultVisual(moduleId, seed).type;
  if (type === "fractionCircle" || type === "fractionBar") {
    const denominator = Math.max(2, toInt(visual.denominator ?? visual.denom, 4));
    const numerator = clamp(toInt(visual.numerator ?? visual.numer, 1), 0, denominator);
    const fallbackLabel = `${numerator}/${denominator}`;
    const label = isMeaningfulLabel(visual.label) ? sanitizeString(visual.label) : fallbackLabel;
    return {
      visualSpec: {
        type,
        numerator,
        denominator,
        label,
      },
      fixes: [],
    };
  }
  if (type === "percentGrid" || type === "percentBar") {
    const percent = clamp(toInt(visual.percent, 25), 0, 100);
    const fallbackLabel = `${percent}%`;
    const label = isMeaningfulLabel(visual.label) ? sanitizeString(visual.label) : fallbackLabel;
    return {
      visualSpec: { type, percent, label },
      fixes: [],
    };
  }
  if (type === "numberLine" || type === "numberLineMove") {
    const min = toInt(visual.min, -10);
    const max = Math.max(min + 1, toInt(visual.max, 10));
    const value = clamp(toInt(visual.value ?? visual.result, 0), min, max);
    const highlights = Array.isArray(visual.highlights)
      ? visual.highlights.map((point) => clamp(toInt(point, value), min, max))
      : [];
    return { visualSpec: { type, min, max, value, highlights }, fixes: [] };
  }
  if (type === "balanceScale") {
    const normalizePlate = (value) => {
      if (Array.isArray(value)) return value.map((item) => sanitizeString(String(item))).filter(Boolean);
      const text = sanitizeString(String(value ?? ""));
      return text ? [text] : [];
    };
    return {
      visualSpec: {
        type,
        left: normalizePlate(visual.left),
        right: normalizePlate(visual.right),
        tilt: ["left", "right", "balanced"].includes(visual.tilt) ? visual.tilt : "balanced",
      },
      fixes: [],
    };
  }
  if (type === "simpleSteps") {
    const normalizedSteps = sanitizeArray(visual.steps, ["Pas 1", "Pas 2", "Pas 3"]).map(
      (step, index) => (step.includes("?") ? `Pas ${index + 1}` : step),
    );
    return {
      visualSpec: {
        type,
        steps: normalizedSteps,
        current: Math.max(0, toInt(visual.current, 0)),
      },
      fixes: [],
    };
  }
  return { visualSpec: defaultVisual(moduleId, seed), fixes: [`Tip vizual necunoscut (${type}).`] };
}

export function deriveTextFromVisual(visualSpec) {
  if (!visualSpec || typeof visualSpec !== "object") return [];
  if (visualSpec.type === "fractionCircle" || visualSpec.type === "fractionBar") {
    const n = toInt(visualSpec.numerator, 0);
    const d = Math.max(2, toInt(visualSpec.denominator, 2));
    return [
      `Fractia din vizual este ${n}/${d}.`,
      `${n === 1 ? "Este colorata 1 parte" : `Sunt colorate ${n} parti`} din ${d} parti egale.`,
      `Scriere corecta: ${n}/${d}.`,
    ];
  }
  if (visualSpec.type === "percentGrid" || visualSpec.type === "percentBar") {
    const percent = clamp(toInt(visualSpec.percent, 0), 0, 100);
    return [
      `Vizualul arata ${percent}%.`,
      `${percent}% inseamna ${percent} din 100.`,
      `Forma fractie: ${percent}/100.`,
    ];
  }
  if (visualSpec.type === "numberLine") {
    const value = toInt(visualSpec.value, 0);
    return [
      `Pe axa numerelor, markerul este la ${value}.`,
      "Mai la dreapta inseamna mai mare.",
    ];
  }
  if (visualSpec.type === "balanceScale") {
    return [
      "Balanta arata egalitatea dintre cele doua parti.",
      "Aplicam aceeasi operatie in ambele parti.",
    ];
  }
  return [];
}

export function harmonizeTextWithVisual(lines, visualSpec) {
  const source = sanitizeArray(lines).slice(0, 8);
  const derived = deriveTextFromVisual(visualSpec);
  if (!source.length) return derived;

  if (visualSpec?.type === "fractionCircle" || visualSpec?.type === "fractionBar") {
    return derived;
  }

  if (visualSpec?.type === "percentGrid" || visualSpec?.type === "percentBar") {
    const conceptual = source.find(
      (line) => !/\d/.test(line) && !/%/.test(line) && !/sfert|jumat|treime|optime/i.test(line),
    );
    return conceptual ? [conceptual, ...derived] : derived;
  }

  if (visualSpec?.type === "numberLine" || visualSpec?.type === "balanceScale") {
    const conceptual = source.find((line) => !/\d/.test(line));
    return conceptual ? [conceptual, ...derived] : derived;
  }

  return source;
}

function normalizeChoiceSet(choices, correctAnswer, prompt = "") {
  const base = sanitizeArray(choices).filter((choice) => !PLACEHOLDER_RE.test(choice));
  const correct = sanitizeString(correctAnswer || base[0] || "1");
  const pool = uniq([correct, ...base.filter((choice) => choice !== correct)]);

  const numeric = /^-?\d+$/.test(correct) ? toInt(correct, 0) : null;
  if (/\d+\/\d+/.test(correct)) {
    const [nRaw, dRaw] = correct.split("/");
    const n = toInt(nRaw, 1);
    const d = Math.max(2, toInt(dRaw, 2));
    [ `${d}/${Math.max(n, 1)}`, `${n}/${d + 1}`, `${Math.max(n - 1, 0)}/${d}` ].forEach((item) => {
      if (!pool.includes(item)) pool.push(item);
    });
  } else if (numeric !== null) {
    [String(numeric + 1), String(numeric - 1), String(numeric + 2)].forEach((item) => {
      if (!pool.includes(item)) pool.push(item);
    });
  } else if (/%/.test(correct)) {
    const p = clamp(toInt(correct, 25), 0, 100);
    [`${clamp(p + 10, 0, 100)}%`, `${clamp(p - 10, 0, 100)}%`, `${clamp(p + 5, 0, 100)}%`].forEach((item) => {
      if (!pool.includes(item)) pool.push(item);
    });
  } else if (/stanga|dreapta/i.test(prompt)) {
    ["La stanga lui 0", "La dreapta lui 0", "Chiar pe 0"].forEach((item) => {
      if (!pool.includes(item)) pool.push(item);
    });
  } else {
    ["0", "1", "2"].forEach((item) => {
      if (!pool.includes(item)) pool.push(item);
    });
  }

  const finalChoices = uniq(pool).slice(0, 3);
  while (finalChoices.length < 3) finalChoices.push(String(finalChoices.length + 1));
  if (!finalChoices.includes(correct)) finalChoices[finalChoices.length - 1] = correct;

  const shuffledChoices = shuffleDeterministic(
    finalChoices,
    `${prompt}|${correct}|${finalChoices.join("|")}`,
  );

  return { choices: shuffledChoices, correctAnswer: correct };
}

function buildTemplate(moduleId, levelId, index, forcedDifficulty = null) {
  const seed = index + toInt(levelId, 1) * 13;
  const difficulty = clamp(
    toInt(forcedDifficulty, getTargetDifficulty(levelId, index)),
    1,
    3,
  );

  if (moduleId === "fractions") {
    const denominatorPool =
      difficulty === 1
        ? [2, 3, 4, 5, 6]
        : difficulty === 2
          ? [4, 5, 6, 8, 10]
          : [6, 8, 10, 12, 14];
    const denominator = pickBySeed(denominatorPool, seed, FRACTION_DENOMS[seed % FRACTION_DENOMS.length]);
    const numeratorMin = difficulty === 3 ? 2 : 1;
    const numeratorMax = Math.max(numeratorMin, denominator - 1);
    const numerator = clamp(((seed * 3) % denominator) + numeratorMin, numeratorMin, numeratorMax);
    const fraction = `${numerator}/${denominator}`;

    return {
      id: `fractions_l${levelId}_auto_${index + 1}_${stableHash(`f-${levelId}-${index}-d${difficulty}`)}`,
      gradeBand: levelId === "1" ? "V" : levelId === "2" ? "VI" : "VII",
      difficulty,
      skillTag:
        levelId === "1"
          ? "fractii_parte_intreg"
          : levelId === "2"
            ? "fractii_echivalente"
            : "fractii_operatii",
      title: difficulty === 3 ? "Fractii - antrenament avansat" : "Fractii ghidate",
      prompt:
        difficulty === 3
          ? `Din ${denominator} parti egale sunt colorate ${numerator}. Alege fractia ireductibila corecta pentru partea colorata.`
          : `Un intreg este impartit in ${denominator} parti egale. Sunt colorate ${numerator} ${numerator === 1 ? "parte" : "parti"}. Ce fractie reprezinta partea colorata?`,
      choices: [fraction, `${denominator}/${numerator}`, `${numerator}/${denominator + 1}`],
      correctAnswer: fraction,
      explanationSteps: [
        `Numitorul este ${denominator}.`,
        `Numaratorul este ${numerator}.`,
        `Fractia corecta este ${fraction}.`,
      ],
      hints: [
        "Numara partile totale.",
        "Numara partile colorate.",
        "Scrie fractia finala.",
      ],
      visualSpec: { type: "fractionCircle", numerator, denominator, label: fraction },
    };
  }

  if (moduleId === "percents") {
    const percentPool =
      difficulty === 1
        ? [10, 20, 25, 50]
        : difficulty === 2
          ? [15, 30, 40, 60, 75]
          : [5, 12, 35, 45, 65, 90];
    const basePool =
      difficulty === 1 ? [20, 50, 100] : difficulty === 2 ? [40, 80, 120, 200] : [60, 125, 240, 360];

    const percent = pickBySeed(percentPool, seed, PERCENT_VALUES[seed % PERCENT_VALUES.length]);
    const base = pickBySeed(basePool, seed * 7, 100);
    const result = Math.round((percent / 100) * base);
    const conceptMode = levelId === "1" && difficulty === 1;

    return {
      id: `percents_l${levelId}_auto_${index + 1}_${stableHash(`p-${levelId}-${index}-d${difficulty}`)}`,
      gradeBand: levelId === "1" ? "V" : "VI",
      difficulty,
      skillTag:
        levelId === "1"
          ? "procente_din_100"
          : levelId === "2"
            ? "procente_dintr_numar"
            : "procente_raport",
      title: difficulty === 3 ? "Procente - provocare" : "Procente ghidate",
      prompt: conceptMode ? `Ce inseamna ${percent}%?` : `${percent}% din ${base} este:`,
      choices: conceptMode
        ? [`${percent}/100`, `${percent}/10`, `100/${percent}`]
        : [String(result), String(result + (difficulty === 3 ? 12 : 10)), String(Math.max(result - (difficulty === 3 ? 8 : 10), 0))],
      correctAnswer: conceptMode ? `${percent}/100` : String(result),
      explanationSteps: conceptMode
        ? [
            "Procent inseamna parti din 100.",
            `${percent}% = ${percent}/100.`,
            "Alegem varianta corecta.",
          ]
        : [
            `Calculam ${percent}/100 * ${base}.`,
            `Rezultatul este ${result}.`,
            "Verificam raspunsul.",
          ],
      hints: [
        "Citeste atent enuntul.",
        "Foloseste relatia procent = p/100.",
        "Verifica rezultatul cu vizualul.",
      ],
      visualSpec: { type: "percentGrid", percent, label: `${percent}%` },
    };
  }

  if (moduleId === "integers") {
    const range = difficulty === 1 ? 10 : difficulty === 2 ? 20 : 40;
    const a = clamp((seed % (range * 2 + 1)) - range, -range, range);
    const b = clamp(((seed * 3 + 5) % (range * 2 + 1)) - range, -range, range);

    let op = "cmp";
    if (levelId !== "1") {
      if (difficulty === 1) op = "add";
      else if (difficulty === 2) op = seed % 2 === 0 ? "add" : "sub";
      else op = seed % 2 === 0 ? "sub" : "add";
    }

    const correct =
      op === "cmp"
        ? a === b
          ? "Sunt egale"
          : a > b
            ? String(a)
            : String(b)
        : String(op === "add" ? a + b : a - b);

    return {
      id: `integers_l${levelId}_auto_${index + 1}_${stableHash(`i-${levelId}-${index}-d${difficulty}`)}`,
      gradeBand: levelId === "1" ? "V" : "VI",
      difficulty,
      skillTag: op === "cmp" ? "intregi_comparare" : op === "add" ? "intregi_adunare" : "intregi_scadere",
      title: difficulty === 3 ? "Numere intregi - nivel greu" : "Numere intregi ghidate",
      prompt:
        op === "cmp"
          ? `Care numar este mai mare: ${a} sau ${b}?`
          : `Calculeaza: ${a} ${op === "add" ? "+" : "-"} ${b}`,
      choices:
        op === "cmp"
          ? [String(a), String(b), "Sunt egale"]
          : [correct, String(toInt(correct, 0) + (difficulty === 3 ? 4 : 2)), String(toInt(correct, 0) - (difficulty === 3 ? 4 : 2))],
      correctAnswer: correct,
      explanationSteps:
        op === "cmp"
          ? [
              "Comparam pozitiile pe axa numerelor.",
              "Numarul mai la dreapta este mai mare.",
              `Raspunsul corect este ${correct}.`,
            ]
          : [
              "Folosim regulile pentru numere intregi.",
              "Calculam pas cu pas.",
              `Rezultatul este ${correct}.`,
            ],
      hints: ["Marcheaza numerele pe axa.", "Urmareste semnele.", "Verifica rezultatul final."],
      visualSpec: {
        type: "numberLine",
        min: -range,
        max: range,
        value: op === "cmp" ? Math.max(a, b) : toInt(correct, 0),
        highlights: [a, b],
      },
    };
  }

  const baseA = (seed % 7) + 2;
  const baseX = (seed % 9) + 1;
  const parenK = (seed % 5) + 1;
  let equationType = "plus";

  if (difficulty === 1) equationType = "plus";
  if (difficulty === 2) equationType = seed % 2 === 0 ? "minus" : "multiply";
  if (difficulty === 3) equationType = seed % 2 === 0 ? "divide" : "paren";

  if (levelId === "1") equationType = difficulty === 3 ? "minus" : "plus";
  if (levelId === "2" && equationType === "paren") equationType = "multiply";

  let prompt = "";
  let correct = baseX;
  let visualLeft = ["x", `+${baseA}`];
  let visualRight = [String(baseX + baseA)];

  if (equationType === "plus") {
    const rhs = baseX + baseA;
    prompt = `Rezolva ecuatia: x + ${baseA} = ${rhs}`;
    correct = baseX;
    visualLeft = ["x", `+${baseA}`];
    visualRight = [String(rhs)];
  } else if (equationType === "minus") {
    const rhs = baseX - baseA;
    prompt = `Rezolva ecuatia: x - ${baseA} = ${rhs}`;
    correct = baseX;
    visualLeft = ["x", `-${baseA}`];
    visualRight = [String(rhs)];
  } else if (equationType === "multiply") {
    const rhs = baseA * baseX;
    prompt = `Rezolva ecuatia: ${baseA}x = ${rhs}`;
    correct = baseX;
    visualLeft = [`${baseA}x`];
    visualRight = [String(rhs)];
  } else if (equationType === "divide") {
    const rhs = baseX;
    const numerator = baseA * rhs;
    prompt = `Rezolva ecuatia: x / ${baseA} = ${rhs}`;
    correct = numerator;
    visualLeft = ["x", `/${baseA}`];
    visualRight = [String(rhs)];
  } else {
    const rhs = baseA * (baseX + parenK);
    prompt = `Rezolva ecuatia: ${baseA}(x + ${parenK}) = ${rhs}`;
    correct = baseX;
    visualLeft = [`${baseA}(x+${parenK})`];
    visualRight = [String(rhs)];
  }

  return {
    id: `equations_l${levelId}_auto_${index + 1}_${stableHash(`e-${levelId}-${index}-d${difficulty}`)}`,
    gradeBand: levelId === "1" ? "VI" : "VII",
    difficulty,
    skillTag: "ecuatie_liniara",
    title: difficulty === 3 ? "Ecuatii - nivel avansat" : "Ecuatii ghidate",
    prompt,
    choices: [String(correct), String(toInt(correct, 0) + 1), String(toInt(correct, 0) - 1)],
    correctAnswer: String(correct),
    explanationSteps: [
      "Izolam necunoscuta x cu operatia inversa.",
      "Aplicam aceeasi operatie in ambele parti.",
      `Solutia este x = ${correct}.`,
    ],
    hints: ["Observa termenul de langa x.", "Alege operatia inversa.", "Verifica prin inlocuire."],
    visualSpec: { type: "balanceScale", left: visualLeft, right: visualRight, tilt: "right" },
  };
}

function buildGuidedSteps(moduleId, item, visualSpec) {
  if (moduleId === "fractions" && (visualSpec.type === "fractionCircle" || visualSpec.type === "fractionBar")) {
    const n = visualSpec.numerator;
    const d = visualSpec.denominator;
    const fraction = `${n}/${d}`;
    return [
      { prompt: "Cate parti egale are intregul?", ...normalizeChoiceSet([String(d), String(d - 1), String(d + 1)], String(d)), explanation: `Numitorul este ${d}.`, hints: ["Priveste totalul partilor.", "Numitorul merge jos."] },
      { prompt: "Cate parti sunt colorate?", ...normalizeChoiceSet([String(n), String(n + 1), String(Math.max(n - 1, 0))], String(n)), explanation: `Numaratorul este ${n}.`, hints: ["Numara partile colorate.", "Numaratorul merge sus."] },
      { prompt: "Scrie fractia corecta.", ...normalizeChoiceSet([fraction, `${d}/${Math.max(n, 1)}`, `${n}/${d + 1}`], fraction), explanation: `Fractia corecta este ${fraction}.`, hints: ["Scrie: parti colorate/parti totale.", "Verifica vizualul."] },
    ];
  }
  if (moduleId === "percents") {
    const p = visualSpec.percent ?? clamp(toInt(item.correctAnswer, 25), 0, 100);
    return [
      { prompt: "Procentul se raporteaza la cate parti?", ...normalizeChoiceSet(["100", "10", "1000"], "100"), explanation: "Procent inseamna din 100.", hints: ["Semnul % inseamna la suta.", "Numitorul este 100."] },
      { prompt: `Cate parti colorate reprezinta ${p}%?`, ...normalizeChoiceSet([String(p), String(p + 10), String(Math.max(p - 10, 0))], String(p)), explanation: `${p}% inseamna ${p} parti.`, hints: ["Numarul procentului este numarul partilor.", "Urmareste vizualul."] },
      { prompt: "Alege forma corecta.", ...normalizeChoiceSet([item.correctAnswer, "0", "1"], item.correctAnswer), explanation: "Alegem raspunsul corect din variante.", hints: ["Compara variantele.", "Pastreaza regula procentului."] },
    ];
  }
  if (moduleId === "integers") {
    const first = toInt(visualSpec.highlights?.[0], 0);
    const second = toInt(visualSpec.highlights?.[1], 0);
    const positionOf = (value) =>
      value === 0 ? "Chiar pe 0" : value < 0 ? "La stanga lui 0" : "La dreapta lui 0";
    const exprMatch = sanitizeString(item.prompt).match(/(-?\d+)\s*([+-])\s*(-?\d+)/);

    if (exprMatch) {
      const firstTerm = toInt(exprMatch[1], first);
      const operator = exprMatch[2];
      const secondTerm = toInt(exprMatch[3], second);
      const movement = operator === "+" ? secondTerm : -secondTerm;
      const movementDirection =
        movement === 0 ? "Nu ne miscam" : movement > 0 ? "Dreapta" : "Stanga";
      const movementSteps = Math.abs(movement);
      const result = sanitizeString(item.correctAnswer || String(firstTerm + movement));

      return [
        {
          prompt: `Unde este ${firstTerm} pe axa la inceput?`,
          ...normalizeChoiceSet(
            [positionOf(firstTerm), "Chiar pe 0", firstTerm < 0 ? "La dreapta lui 0" : "La stanga lui 0"],
            positionOf(firstTerm),
          ),
          explanation: "Primul termen este punctul de pornire pe axa.",
          hints: ["Priveste semnul numarului.", "Negativele sunt la stanga."],
        },
        {
          prompt: `Al doilea pas: ne miscam ${movementSteps} unitati spre...`,
          ...normalizeChoiceSet([movementDirection, "Stanga", "Dreapta", "Nu ne miscam"], movementDirection),
          explanation:
            movement === 0
              ? "Al doilea termen este 0, deci nu exista deplasare."
              : `Semnul operatiei da deplasarea pe axa: ${movementDirection.toLowerCase()}.`,
          hints: ["La adunare, folosim semnul termenului al doilea.", "La scadere, adunam opusul."],
        },
        {
          prompt: "Care este rezultatul final?",
          ...normalizeChoiceSet([result, String(toInt(result, 0) + 2), String(toInt(result, 0) - 2)], result),
          explanation: `Dupa deplasare, ajungem la ${result}.`,
          hints: ["Numara pasii pe axa.", "Verifica semnul rezultatului."],
        },
      ];
    }

    const bigger = first === second ? "Sunt egale" : first > second ? String(first) : String(second);
    return [
      {
        prompt: `Unde este ${first} pe axa?`,
        ...normalizeChoiceSet(
          [positionOf(first), "Chiar pe 0", first < 0 ? "La dreapta lui 0" : "La stanga lui 0"],
          positionOf(first),
        ),
        explanation: "Semnul numarului indica partea axei.",
        hints: ["Negativele merg la stanga.", "Pozitivele merg la dreapta."],
      },
      {
        prompt: `Unde este ${second} pe axa?`,
        ...normalizeChoiceSet(
          [positionOf(second), "Chiar pe 0", second < 0 ? "La dreapta lui 0" : "La stanga lui 0"],
          positionOf(second),
        ),
        explanation: "Comparatia se face pe aceeasi axa.",
        hints: ["Priveste semnul.", "Marcheaza pozitia."],
      },
      {
        prompt: "Care este numarul mai mare?",
        ...normalizeChoiceSet([String(first), String(second), "Sunt egale"], bigger),
        explanation: "Mai la dreapta inseamna mai mare.",
        hints: ["Compara pozitiile finale.", "Alege varianta corecta."],
      },
    ];
  }
  const correct = sanitizeString(item.correctAnswer || "1");
  const promptText = sanitizeString(item.prompt).toLowerCase();
  let inverseOperation = "Scadere";
  let inverseExplain = "Aplicam operatia inversa corecta.";
  if (/x\s*-\s*\d+/.test(promptText)) {
    inverseOperation = "Adunare";
    inverseExplain = "La x-a=b, adunam a in ambele parti.";
  } else if (/(\d+)\s*x|x\s*\*\s*\d+|[a-z]\s*x/.test(promptText)) {
    inverseOperation = "Impartire";
    inverseExplain = "La a*x=b, impartim ambele parti la a.";
  } else if (/x\s*\/\s*\d+/.test(promptText)) {
    inverseOperation = "Inmultire";
    inverseExplain = "La x/a=b, inmultim ambele parti cu a.";
  } else if (/\(/.test(promptText)) {
    inverseOperation = "Distributivitate";
    inverseExplain = "La paranteze, incepem cu distributivitatea.";
  }
  return [
    {
      prompt: "Ce operatie folosim la primul pas pentru a izola pe x?",
      ...normalizeChoiceSet(
        [inverseOperation, "Adunare", "Scadere", "Impartire", "Inmultire", "Distributivitate"],
        inverseOperation,
      ),
      explanation: inverseExplain,
      hints: ["Priveste semnul de langa x.", "Pastreaza egalitatea in ambele parti."],
    },
    {
      prompt: "Care este valoarea lui x dupa transformare?",
      ...normalizeChoiceSet([correct, "0", "1"], correct),
      explanation: `Dupa calcule, x = ${correct}.`,
      hints: ["Calculeaza numeric.", "Verifica rapid."],
    },
    {
      prompt: "Alege raspunsul final corect.",
      ...normalizeChoiceSet([correct, "2", "-1"], correct),
      explanation: `Solutia finala este x = ${correct}.`,
      hints: ["Testeaza in ecuatie.", "Alege varianta valida."],
    },
  ];
}

export function normalizeExercise(item, context = {}) {
  const moduleId = context.moduleId ?? "fractions";
  const levelId = String(context.levelId ?? "1");
  const index = Number.isFinite(context.index) ? context.index : 0;
  const targetDifficulty = clamp(
    toInt(context.targetDifficulty, getTargetDifficulty(levelId, index)),
    1,
    3,
  );
  const base =
    item && typeof item === "object"
      ? { ...item }
      : buildTemplate(moduleId, levelId, index, targetDifficulty);

  const visual = normalizeVisualSpec(base.visualSpec, moduleId, index).visualSpec;
  const choices = normalizeChoiceSet(base.choices, base.correctAnswer, base.prompt);
  const explanationSteps = sanitizeArray(base.explanationSteps, [base.explanation]);
  const hints = sanitizeArray(base.hints, []);
  const guidedSteps = buildGuidedSteps(moduleId, { ...base, correctAnswer: choices.correctAnswer }, visual);

  const normalized = {
    id: sanitizeString(base.id) || `${moduleId}_l${levelId}_${index + 1}_${stableHash(`${moduleId}:${levelId}:${index}`)}`,
    gradeBand: ALLOWED_GRADE_BANDS.has(sanitizeString(base.gradeBand)) ? sanitizeString(base.gradeBand) : GRADE_BY_LEVEL[levelId] ?? "V",
    module: moduleId,
    level: levelId,
    title: sanitizeString(base.title || base.skillTag || "Exercitiu ghidat"),
    difficulty: clamp(toInt(base.difficulty, targetDifficulty), 1, 3),
    skillTag: sanitizeString(base.skillTag || `${moduleId}_skill`),
    tags: uniq(sanitizeArray(base.tags, [base.skillTag || moduleId]).map((tag) => tag.toLowerCase())),
    prompt:
      sanitizeString(base.prompt) ||
      sanitizeString(buildTemplate(moduleId, levelId, index, targetDifficulty).prompt),
    choices: choices.choices,
    correctAnswer: choices.correctAnswer,
    hints: hints.length >= 2 ? hints : ["Citeste atent enuntul.", "Verifica raspunsul cu vizualul."],
    explanationSteps: explanationSteps.length >= 2 ? explanationSteps.slice(0, 4) : [`Raspunsul corect este ${choices.correctAnswer}.`, "Acesta respecta datele din problema."],
    explanation: sanitizeString(base.explanation || ""),
    visualSpec: visual,
    guidedSteps,
    steps: guidedSteps,
  };
  if (!normalized.explanation) normalized.explanation = normalized.explanationSteps.join(" ");
  return { item: normalized, fixes: [] };
}

export function normalizeLesson(lesson, context = {}) {
  const moduleId = context.moduleId ?? sanitizeString(lesson?.module) ?? "fractions";
  const safe = lesson && typeof lesson === "object" ? { ...lesson } : {};
  const slides = Array.isArray(safe.slides) ? safe.slides : [];
  const miniChecks = Array.isArray(safe.miniChecks) ? safe.miniChecks : [];
  const lessonMeta = {
    ...(Number.isInteger(safe.grade) ? { grade: safe.grade } : {}),
    ...(sanitizeString(safe.unitId) ? { unitId: sanitizeString(safe.unitId) } : {}),
    ...(sanitizeString(safe.unitTitle) ? { unitTitle: sanitizeString(safe.unitTitle) } : {}),
    ...(Number.isInteger(safe.lessonNo) ? { lessonNo: safe.lessonNo } : {}),
    ...(sanitizeString(safe.sourceType) ? { sourceType: sanitizeString(safe.sourceType) } : {}),
    ...(sanitizeString(safe.manualTitle) ? { manualTitle: sanitizeString(safe.manualTitle) } : {}),
    ...(Number.isInteger(safe.manualYear) ? { manualYear: safe.manualYear } : {}),
    ...(Number.isInteger(safe.page) ? { page: safe.page } : {}),
  };

  const normalizedSlides = slides.map((slide, index) => {
    const visual = normalizeVisualSpec(slide?.visualSpec ?? slide?.visual, moduleId, index).visualSpec;
    return {
      id: sanitizeString(slide?.id) || `s${index + 1}`,
      kind: sanitizeString(slide?.kind) || "concept",
      heading: sanitizeString(slide?.heading ?? slide?.title) || `Pasul ${index + 1}`,
      text: harmonizeTextWithVisual(slide?.text ?? slide?.narrationText, visual),
      visual,
      ...(slide?.checkId ? { checkId: sanitizeString(slide.checkId) } : {}),
    };
  });

  return {
    lesson: {
      id: sanitizeString(safe.id) || `lesson_${moduleId}_${stableHash(JSON.stringify(safe).slice(0, 160))}`,
      module: moduleId,
      title: sanitizeString(safe.title) || "Lectie",
      icon: sanitizeString(safe.icon) || "BookOpen",
      gradeBand: ALLOWED_GRADE_BANDS.has(sanitizeString(safe.gradeBand)) ? sanitizeString(safe.gradeBand) : "V-VIII",
      estMinutes: Math.max(2, toInt(safe.estMinutes, 4)),
      slides: normalizedSlides.length ? normalizedSlides : [{ id: "s1", kind: "concept", heading: "Concept de baza", text: ["Lectie reparata automat."], visual: defaultVisual(moduleId, 1) }],
      miniChecks: miniChecks.map((check, index) => {
        const normalized = normalizeChoiceSet(check?.options ?? check?.choices, check?.options?.[check?.correctIndex] ?? check?.correctAnswer, check?.prompt);
        return {
          id: sanitizeString(check?.id) || `c${index + 1}`,
          prompt: sanitizeString(check?.prompt) || "Alege raspunsul corect.",
          options: normalized.choices,
          correctIndex: Math.max(0, normalized.choices.findIndex((choice) => choice === normalized.correctAnswer)),
          explain: sanitizeArray(check?.explain, ["Raspunsul corect este sustinut de vizual."]).slice(0, 2),
        };
      }),
      ...lessonMeta,
    },
    fixes: [],
  };
}

export function normalizeSimulation(simulation, context = {}) {
  const moduleId = context.moduleId ?? "fractions";
  const defaults = {
    fractions: { type: "fractions", defaults: { mode: "add", denom: 4, leftNumerator: 1, rightNumerator: 2 }, constraints: { denoms: [2, 3, 4, 5, 6, 8, 10, 12] } },
    percents: { type: "percents", defaults: { percent: 25, base: 100, method: "ten" }, constraints: { percentMin: 0, percentMax: 100 } },
    integers: { type: "integers", defaults: { mode: "add", start: -2, delta: 5 }, constraints: { min: -20, max: 20 } },
    equations: { type: "equations", defaults: { type: "x_plus_a", stepIndex: 0 }, constraints: { allowedTypes: ["x_plus_a", "x_minus_a", "ax_b", "x_div_a", "paren"] } },
  };
  const fallback = defaults[moduleId] ?? defaults.fractions;
  const safe = simulation && typeof simulation === "object" ? simulation : {};
  return {
    simulation: {
      type: sanitizeString(safe.type) || fallback.type,
      defaults: { ...fallback.defaults, ...(safe.defaults && typeof safe.defaults === "object" ? safe.defaults : {}) },
      constraints: { ...fallback.constraints, ...(safe.constraints && typeof safe.constraints === "object" ? safe.constraints : {}) },
    },
    fixes: [],
  };
}

function parseItemPath(path) {
  const match = String(path).match(/^([^.]+)\.levels\[(\d+)\]\.practice\[(\d+)\]/);
  if (!match) return null;
  return { moduleId: match[1], levelIndex: toInt(match[2], -1), itemIndex: toInt(match[3], -1) };
}

function needsFullRegeneration(sourceItem) {
  if (!sourceItem || typeof sourceItem !== "object") return true;
  if (PLACEHOLDER_RE.test(JSON.stringify(sourceItem))) return true;
  if (CORRUPTED_TEXT_RE.test(JSON.stringify(sourceItem))) return true;
  if (!Array.isArray(sourceItem.choices) || sourceItem.choices.length !== 3) return true;
  if (!Array.isArray(sourceItem.guidedSteps) || sourceItem.guidedSteps.length < 2) return true;
  return false;
}

function normalizeLevel(level, moduleId, levelIndex, options = {}) {
  const levelId = sanitizeString(level?.id || String(levelIndex + 1)) || String(levelIndex + 1);
  const input = Array.isArray(level?.practice) ? level.practice : [];
  const practice = [];
  const fixes = [];

  for (let itemIndex = 0; itemIndex < PRACTICE_ITEMS_PER_LEVEL; itemIndex += 1) {
    const source = input[itemIndex];
    const forceRegenerate = options.forceRegenerateAll === true;
    const targetDifficulty = getTargetDifficulty(levelId, itemIndex);
    const sourceDifficulty = clamp(toInt(source?.difficulty, targetDifficulty), 1, 3);
    const needsDifficultyRebalance = source && sourceDifficulty !== targetDifficulty;
    const candidate =
      forceRegenerate || needsFullRegeneration(source) || needsDifficultyRebalance
        ? buildTemplate(moduleId, levelId, itemIndex, targetDifficulty)
        : source;
    if (candidate !== source) {
      fixes.push(
        `levels[${levelIndex}].practice[${itemIndex}] regenerat (difficulty ${targetDifficulty}).`,
      );
    }
    practice.push(
      normalizeExercise(candidate, {
        moduleId,
        levelId,
        index: itemIndex,
        targetDifficulty,
      }).item,
    );
  }

  return {
    level: {
      id: levelId,
      title:
        sanitizeString(level?.title) && !CORRUPTED_TEXT_RE.test(sanitizeString(level?.title))
          ? sanitizeString(level?.title)
          : `Nivel ${levelId}`,
      lessonId: sanitizeString(level?.lessonId) || `${moduleId}_lesson_${levelId}`,
      practice,
    },
    fixes,
  };
}

export function normalizeModuleContent(moduleContent, moduleId, options = {}) {
  const safeModuleId = sanitizeString(moduleId || moduleContent?.moduleId) || "fractions";
  const levelsInput = Array.isArray(moduleContent?.levels) ? moduleContent.levels : [];
  const levels = [];
  const fixes = [];
  for (let levelIndex = 0; levelIndex < 3; levelIndex += 1) {
    const normalized = normalizeLevel(levelsInput[levelIndex], safeModuleId, levelIndex, options);
    levels.push(normalized.level);
    fixes.push(...normalized.fixes);
  }
  const rawTitle = sanitizeString(moduleContent?.title);
  return {
    module: {
      moduleId: safeModuleId,
      title: rawTitle && !CORRUPTED_TEXT_RE.test(rawTitle) ? rawTitle : safeModuleId,
      icon: sanitizeString(moduleContent?.icon) || "BookOpen",
      levels,
    },
    fixes,
  };
}

export function normalizeAllContentModules(modulesMap, options = {}) {
  const modules = {};
  const fixes = [];
  let fixedCount = 0;
  let unchangedCount = 0;

  Object.entries(modulesMap ?? {}).forEach(([moduleId, moduleContent]) => {
    const normalized = normalizeModuleContent(moduleContent, moduleId, options);
    modules[moduleId] = normalized.module;
    if (normalized.fixes.length > 0) {
      fixedCount += normalized.fixes.length;
      fixes.push(...normalized.fixes.map((message) => ({ module: moduleId, message })));
    } else {
      unchangedCount += 1;
    }
  });

  let errors = validateAllModulesContent(modules);
  if (options.regenerateInvalid !== false && errors.length > 0) {
    errors.forEach((error) => {
      const path = parseItemPath(error.path);
      if (!path) return;
      const level = modules[path.moduleId]?.levels?.[path.levelIndex];
      if (!level) return;
      const targetDifficulty = getTargetDifficulty(level.id, path.itemIndex);
      level.practice[path.itemIndex] = normalizeExercise(
        buildTemplate(path.moduleId, level.id, path.itemIndex, targetDifficulty),
        {
          moduleId: path.moduleId,
          levelId: level.id,
          index: path.itemIndex,
          targetDifficulty,
        },
      ).item;
      fixes.push({ module: path.moduleId, message: `Item invalid regenerat: levels[${path.levelIndex}].practice[${path.itemIndex}]` });
      fixedCount += 1;
    });
    errors = validateAllModulesContent(modules);
  }

  const enrichedErrors = errors.map((error) => {
    const path = String(error.path ?? "unknown");
    return { module: path.split(".")[0] || "unknown", path, message: String(error.message ?? "Eroare.") };
  });

  return {
    modules,
    fixes,
    report: {
      fixedCount,
      unchangedCount,
      stillInvalidCount: enrichedErrors.length,
      stillInvalidItems: enrichedErrors.map((error) => ({ path: error.path, message: error.message })),
    },
    validationErrors: enrichedErrors,
  };
}

export function normalizeLessonsCollection(lessonsByModule) {
  const lessons = {};
  const fixes = [];
  Object.entries(lessonsByModule ?? {}).forEach(([moduleId, source]) => {
    lessons[moduleId] = (Array.isArray(source) ? source : []).map((lesson) => {
      const normalized = normalizeLesson(lesson, { moduleId });
      return normalized.lesson;
    });
  });
  return { lessonsByModule: lessons, fixes };
}
