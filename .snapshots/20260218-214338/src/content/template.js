import { DEFAULT_SIMULATION_TEMPLATE } from "./simulationConfigs.js";

export const CONTENT_IMPORT_TEMPLATE = {
  exercises: [
    {
      id: "tpl_fractions_l1_part",
      module: "fractions",
      level: "1",
      title: "Fractii - parte din intreg",
      gradeBand: "V",
      difficulty: 1,
      skillTag: "fractii_parte_intreg",
      prompt:
        "Un intreg este impartit in 4 parti egale. Sunt colorate 1 parte. Ce fractie reprezinta partea colorata?",
      choices: ["1/4", "4/1", "1/5"],
      correctAnswer: "1/4",
      explanation:
        "Numitorul arata partile totale (4), iar numaratorul arata partile colorate (1).",
      explanationSteps: [
        "Numitorul este 4.",
        "Numaratorul este 1.",
        "Fractia corecta este 1/4.",
      ],
      hints: ["Numara partile totale.", "Numara partile colorate.", "Scrie fractia finala."],
      visualSpec: { type: "fractionCircle", numerator: 1, denominator: 4, label: "1/4" },
      guidedSteps: [
        {
          prompt: "Cate parti egale are intregul?",
          choices: ["4", "3", "5"],
          correctAnswer: "4",
          explanation: "Intregul are 4 parti egale.",
          hints: ["Priveste totalul partilor.", "Numitorul merge jos."],
        },
        {
          prompt: "Cate parti sunt colorate?",
          choices: ["1", "2", "0"],
          correctAnswer: "1",
          explanation: "Este colorata o singura parte.",
          hints: ["Numara partile colorate.", "Numaratorul merge sus."],
        },
        {
          prompt: "Scrie fractia corecta.",
          choices: ["1/4", "4/1", "1/5"],
          correctAnswer: "1/4",
          explanation: "Fractia finala este 1/4.",
          hints: ["Fractia este parti colorate/parti totale.", "Verifica vizualul."],
        },
      ],
      tags: ["template", "fractii"],
    },
    {
      id: "tpl_fractions_l2_equiv",
      module: "fractions",
      level: "2",
      title: "Fractii echivalente",
      gradeBand: "VI",
      difficulty: 2,
      skillTag: "fractii_echivalente",
      prompt: "Care fractie este echivalenta cu 1/2?",
      choices: ["2/4", "1/4", "3/4"],
      correctAnswer: "2/4",
      explanation: "Inmultim numaratorul si numitorul cu acelasi numar.",
      explanationSteps: ["1/2 * 2/2 = 2/4.", "Valoarea ramane aceeasi."],
      hints: ["Aplicam aceeasi operatie sus si jos.", "Comparam marimea partii colorate."],
      visualSpec: { type: "fractionBar", numerator: 2, denominator: 4, label: "2/4" },
      guidedSteps: [],
      tags: ["template", "fractii"],
    },
    {
      id: "tpl_percents_l1",
      module: "percents",
      level: "1",
      title: "Procente - baza",
      gradeBand: "V",
      difficulty: 1,
      skillTag: "procente_din_100",
      prompt: "Ce inseamna 25%?",
      choices: ["25/100", "25/10", "100/25"],
      correctAnswer: "25/100",
      explanation: "Procent inseamna parti din 100.",
      explanationSteps: ["25% inseamna 25 parti din 100.", "Scriem 25/100."],
      hints: ["Numitorul este 100.", "Numaratorul este procentul."],
      visualSpec: { type: "percentGrid", percent: 25, label: "25%" },
      guidedSteps: [],
      tags: ["template", "procente"],
    },
    {
      id: "tpl_integers_l1",
      module: "integers",
      level: "1",
      title: "Numere intregi - comparare",
      gradeBand: "V",
      difficulty: 1,
      skillTag: "intregi_comparare",
      prompt: "Care numar este mai mare: -2 sau 5?",
      choices: ["5", "-2", "Sunt egale"],
      correctAnswer: "5",
      explanation: "Pe axa numerelor, numarul mai la dreapta este mai mare.",
      explanationSteps: ["5 este la dreapta lui -2.", "Deci 5 este mai mare."],
      hints: ["Compara pozitiile pe axa.", "Mai la dreapta inseamna mai mare."],
      visualSpec: { type: "numberLine", min: -10, max: 10, value: 5, highlights: [-2, 5] },
      guidedSteps: [],
      tags: ["template", "intregi"],
    },
    {
      id: "tpl_equations_l1",
      module: "equations",
      level: "1",
      title: "Ecuatii - x + a = b",
      gradeBand: "VI",
      difficulty: 1,
      skillTag: "ecuatie_liniara",
      prompt: "Rezolva ecuatia: x + 3 = 8",
      choices: ["5", "3", "8"],
      correctAnswer: "5",
      explanation: "Scadem 3 din ambele parti si obtinem x = 5.",
      explanationSteps: ["x + 3 = 8", "x = 8 - 3", "x = 5"],
      hints: ["Aplicam operatia inversa.", "Pastram egalitatea in ambele parti."],
      visualSpec: { type: "balanceScale", left: ["x", "+3"], right: ["8"], tilt: "right" },
      guidedSteps: [],
      tags: ["template", "ecuatii"],
    },
  ],
  lessons: [
    {
      id: "tpl_lesson_fractions_intro",
      module: "fractions",
      title: "Introducere in fractii (template)",
      icon: "PieChart",
      gradeBand: "V-VI",
      estMinutes: 4,
      slides: [
        {
          id: "s1",
          kind: "concept",
          heading: "Ce este o fractie?",
          text: ["O fractie arata o parte dintr-un intreg."],
          visual: { type: "fractionCircle", numerator: 1, denominator: 4, label: "1/4" },
        },
      ],
      miniChecks: [
        {
          id: "c1",
          prompt: "Cate parti are intregul in 1/4?",
          options: ["4", "1", "5"],
          correctIndex: 0,
          explain: ["Numitorul arata partile totale."],
        },
      ],
    },
  ],
  simulations: [
    {
      id: "tpl_sim_fractions",
      module: "fractions",
      ...DEFAULT_SIMULATION_TEMPLATE.fractions,
    },
  ],
  teamQuiz: [
    {
      id: "tpl_team_fraction_1",
      module: "fractions",
      difficulty: "easy",
      text: "Care fracție este egală cu 2/4?",
      choices: ["1/2", "2/3", "3/4"],
      correctIndex: 0,
      explanation: "2/4 se simplifică la 1/2.",
      visualSpec: { type: "fractionCircle", numerator: 2, denominator: 4, label: "2/4" },
    },
  ],
};

export function downloadTemplateJson() {
  const blob = new Blob([JSON.stringify(CONTENT_IMPORT_TEMPLATE, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = "mate-reset-content-template.json";
  anchor.click();
  URL.revokeObjectURL(href);
}
