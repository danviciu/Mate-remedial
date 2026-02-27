
import { loadCustomContent, mergeLessons } from "../content/customStore.js";
import { normalizeLessonsCollection } from "../content/normalizeContent.js";

const s = (id, kind, heading, text, visual, checkId) => ({
  id,
  kind,
  heading,
  text,
  visual,
  ...(checkId ? { checkId } : {}),
});

const q = (id, prompt, options, correctIndex, explain) => ({
  id,
  prompt,
  options,
  correctIndex,
  explain,
});

const lesson = ({
  id,
  module,
  title,
  icon,
  gradeBand,
  estMinutes,
  slides,
  miniChecks,
}) => ({
  id,
  module,
  title,
  icon,
  gradeBand,
  estMinutes,
  slides,
  miniChecks,
});

const pack = ({ intro, concept, example, mini, recap, visuals, checkId }) => [
  s("s1", "intro", intro.heading, intro.text, visuals[0]),
  s("s2", "concept", concept.heading, concept.text, visuals[1]),
  s("s3", "example", example.heading, example.text, visuals[2]),
  s("s4", "miniCheck", mini.heading, mini.text, visuals[3], checkId),
  s("s5", "recap", recap.heading, recap.text, visuals[4]),
];

const FRACTIONS = [
  lesson({
    id: "fractions_intro",
    module: "fractions",
    title: "Introducere in fractii",
    icon: "PieChart",
    gradeBand: "V-VI",
    estMinutes: 4,
    slides: pack({
      intro: { heading: "Ce este o fractie", text: ["Fractia arata o parte dintr-un intreg.", "Partile trebuie sa fie egale."] },
      concept: { heading: "Numarator si numitor", text: ["Numaratorul arata partile luate.", "Numitorul arata partile totale."] },
      example: { heading: "Exemplu", text: ["1/4 inseamna o parte din patru.", "Citim: un sfert."] },
      mini: { heading: "Mini-check", text: ["Raspunde clar.", "Un singur raspuns este corect."] },
      recap: { heading: "Recap", text: ["Fractie = parte din intreg.", "Intregul este impartit egal."] },
      visuals: [
        { type: "fractionCircle", numer: 1, denom: 4, label: "1/4" },
        { type: "fractionBar", numer: 2, denom: 5, label: "2/5" },
        { type: "fractionCircle", numer: 3, denom: 8, label: "3/8" },
        { type: "simpleSteps", current: 2, steps: ["Intreg", "Parti egale", "Fractie"] },
        { type: "fractionBar", numer: 4, denom: 6, label: "4/6" },
      ],
      checkId: "c1",
    }),
    miniChecks: [
      q("c1", "Daca numitorul este 6, cate parti are intregul?", ["6", "3", "1"], 0, ["Numitorul arata partile totale."]),
      q("c2", "In 2/7, cate parti avem?", ["7", "2", "9"], 1, ["Numaratorul arata cate parti avem."]),
    ],
  }),
  lesson({
    id: "fractions_drawings",
    module: "fractions",
    title: "Reprezentare pe desen",
    icon: "PieChart",
    gradeBand: "V-VI",
    estMinutes: 5,
    slides: pack({
      intro: { heading: "Desenul ajuta", text: ["Putem vedea fractia cu ochii.", "Folosim cerc si bara."] },
      concept: { heading: "Regula desenului", text: ["Partile trebuie sa fie egale.", "Coloram doar partile cerute."] },
      example: { heading: "Citire", text: ["3 parti colorate din 4.", "Scriem 3/4."] },
      mini: { heading: "Mini-check", text: ["Priveste modelul.", "Alege fractia corecta."] },
      recap: { heading: "Recap", text: ["Colorat / total.", "Mereu cu parti egale."] },
      visuals: [
        { type: "fractionCircle", numer: 1, denom: 3, label: "1/3" },
        { type: "fractionBar", numer: 4, denom: 6, label: "4/6" },
        { type: "fractionBar", numer: 3, denom: 4, label: "3/4" },
        { type: "fractionBar", numer: 2, denom: 5, label: "2/5" },
        { type: "fractionCircle", numer: 7, denom: 10, label: "7/10" },
      ],
      checkId: "c1",
    }),
    miniChecks: [
      q("c1", "3 parti colorate din 4 inseamna:", ["3/4", "4/3", "1/4"], 0, ["Numaratorul este 3, numitorul 4."]),
      q("c2", "Ce e corect pentru 1/2?", ["2 parti egale, 1 colorata", "3 parti egale, 1 colorata", "4 parti inegale"], 0, ["La 1/2 avem doua parti egale."]),
    ],
  }),
  lesson({
    id: "fractions_equivalent",
    module: "fractions",
    title: "Fractii echivalente",
    icon: "PieChart",
    gradeBand: "V-VI",
    estMinutes: 5,
    slides: pack({
      intro: { heading: "Aceeasi valoare", text: ["Fractii diferite pot avea aceeasi marime.", "Le numim echivalente."] },
      concept: { heading: "Regula", text: ["Inmultim sus si jos cu acelasi numar.", "Sau impartim sus si jos la acelasi numar."] },
      example: { heading: "Exemplu", text: ["1/2 = 2/4.", "Valoarea este aceeasi."] },
      mini: { heading: "Mini-check", text: ["Alege fractia echivalenta.", "Gandeste in simplificare."] },
      recap: { heading: "Recap", text: ["Operatia se face pe ambele linii.", "Valoarea ramane aceeasi."] },
      visuals: [
        { type: "fractionBar", numer: 1, denom: 2, label: "1/2" },
        { type: "simpleSteps", current: 2, steps: ["1/2", "2/4", "3/6"] },
        { type: "fractionCircle", numer: 2, denom: 6, label: "2/6" },
        { type: "fractionCircle", numer: 2, denom: 4, label: "2/4" },
        { type: "fractionBar", numer: 4, denom: 8, label: "4/8" },
      ],
      checkId: "c1",
    }),
    miniChecks: [
      q("c1", "Echivalenta cu 2/4 este:", ["1/2", "2/5", "3/4"], 0, ["2/4 se simplifica la 1/2."]),
      q("c2", "3/5 inmultit cu 2/2 devine:", ["6/10", "3/10", "5/7"], 0, ["3*2 sus si 5*2 jos."]),
    ],
  }),
  lesson({
    id: "fractions_simplify",
    module: "fractions",
    title: "Simplificarea fractiilor",
    icon: "PieChart",
    gradeBand: "VI-VII",
    estMinutes: 5,
    slides: pack({
      intro: { heading: "Forma simpla", text: ["Simplificam fractia fara sa schimbam valoarea.", "Cautam divizor comun."] },
      concept: { heading: "Pasii", text: ["Gasim un numar care imparte sus si jos.", "Impartim la acelasi numar."] },
      example: { heading: "Exemplu", text: ["12/18 se simplifica la 2/3.", "Impartim la 6."] },
      mini: { heading: "Mini-check", text: ["Simplifica fractia.", "Alege forma ireductibila."] },
      recap: { heading: "Recap", text: ["Simplificare = impartire sus/jos.", "Forma finala este cea mai scurta."] },
      visuals: [
        { type: "fractionBar", numer: 4, denom: 8, label: "4/8" },
        { type: "simpleSteps", current: 2, steps: ["12/18", "6/9", "2/3"] },
        { type: "fractionCircle", numer: 2, denom: 3, label: "2/3" },
        { type: "fractionBar", numer: 9, denom: 12, label: "9/12" },
        { type: "fractionBar", numer: 3, denom: 4, label: "3/4" },
      ],
      checkId: "c1",
    }),
    miniChecks: [
      q("c1", "Forma simplificata pentru 9/12 este:", ["3/4", "9/3", "6/8"], 0, ["9 si 12 se impart la 3."]),
      q("c2", "La 10/15, un divizor comun bun este:", ["5", "2", "7"], 0, ["10 si 15 se impart la 5."]),
    ],
  }),
  lesson({
    id: "fractions_compare",
    module: "fractions",
    title: "Compararea fractiilor",
    icon: "PieChart",
    gradeBand: "VI-VII",
    estMinutes: 6,
    slides: pack({
      intro: { heading: "Care este mai mare", text: ["Comparam dupa reguli.", "Vizualul ajuta."] },
      concept: { heading: "Acelasi numitor", text: ["Comparam numaratorii.", "Mai mare sus = mai mare fractia."] },
      example: { heading: "Numitor diferit", text: ["Aducem la acelasi numitor.", "Apoi comparam usor."] },
      mini: { heading: "Mini-check", text: ["Compara 3/8 si 5/8.", "Alege corect."] },
      recap: { heading: "Recap", text: ["Numitor egal: compari sus.", "Numitor diferit: numitor comun."] },
      visuals: [
        { type: "fractionBar", numer: 2, denom: 5, label: "2/5" },
        { type: "fractionBar", numer: 5, denom: 7, label: "5/7" },
        { type: "simpleSteps", current: 3, steps: ["1/2 ? 2/3", "3/6 ? 4/6", "2/3 mai mare"] },
        { type: "fractionCircle", numer: 5, denom: 8, label: "5/8" },
        { type: "fractionBar", numer: 4, denom: 6, label: "4/6" },
      ],
      checkId: "c1",
    }),
    miniChecks: [
      q("c1", "Mai mare este:", ["3/8", "5/8", "sunt egale"], 1, ["Numitor egal, compari numaratorul."]),
      q("c2", "La numitori diferiti, primul pas este:", ["numitor comun", "adunare directa", "rotunjire"], 0, ["Fara numitor comun nu comparam corect."]),
    ],
  }),
  lesson({
    id: "fractions_add_sub_same_denom",
    module: "fractions",
    title: "Adunare/scadere cu acelasi numitor",
    icon: "PieChart",
    gradeBand: "VI",
    estMinutes: 5,
    slides: pack({
      intro: { heading: "Regula", text: ["Numitorul ramane la fel.", "Operam doar numaratorii."] },
      concept: { heading: "Formule", text: ["a/c + b/c = (a+b)/c", "a/c - b/c = (a-b)/c"] },
      example: { heading: "Exemplu", text: ["1/4 + 2/4 = 3/4.", "Foarte direct."] },
      mini: { heading: "Mini-check", text: ["Calculeaza expresia.", "Alege raspunsul corect."] },
      recap: { heading: "Recap", text: ["Numitorul nu se schimba.", "Doar sus aduni/scazi."] },
      visuals: [
        { type: "fractionBar", numer: 2, denom: 9, label: "2/9" },
        { type: "simpleSteps", current: 2, steps: ["1/5+2/5", "(1+2)/5", "3/5"] },
        { type: "fractionCircle", numer: 3, denom: 4, label: "3/4" },
        { type: "fractionBar", numer: 3, denom: 7, label: "3/7" },
        { type: "fractionCircle", numer: 3, denom: 7, label: "3/7" },
      ],
      checkId: "c1",
    }),
    miniChecks: [
      q("c1", "5/7 - 2/7 =", ["3/7", "3/14", "7/3"], 0, ["Scadem doar numaratorul."]),
      q("c2", "2/9 + 4/9 =", ["6/9", "6/18", "2/13"], 0, ["Numitorul ramane 9."]),
    ],
  }),
  lesson({
    id: "fractions_add_sub_diff_denom",
    module: "fractions",
    title: "Adunare/scadere cu numitori diferiti",
    icon: "PieChart",
    gradeBand: "VI-VII",
    estMinutes: 6,
    slides: pack({
      intro: { heading: "Numitori diferiti", text: ["Nu operam direct.", "Gasim numitor comun."] },
      concept: { heading: "Pasii", text: ["Numitor comun, apoi transformare.", "Dupa aceea operam normal."] },
      example: { heading: "Exemplu", text: ["1/4 + 1/2 = 1/4 + 2/4 = 3/4.", "Acum numitorul este egal."] },
      mini: { heading: "Mini-check", text: ["Rezolva 1/3 + 1/6.", "Alege corect."] },
      recap: { heading: "Recap", text: ["Numitor comun inainte de operatie.", "Apoi aplici regula simpla."] },
      visuals: [
        { type: "fractionBar", numer: 1, denom: 3, label: "1/3" },
        { type: "simpleSteps", current: 2, steps: ["1/2+1/3", "3/6+2/6", "5/6"] },
        { type: "fractionBar", numer: 3, denom: 4, label: "3/4" },
        { type: "fractionBar", numer: 3, denom: 6, label: "3/6" },
        { type: "fractionCircle", numer: 3, denom: 6, label: "3/6" },
      ],
      checkId: "c1",
    }),
    miniChecks: [
      q("c1", "1/3 + 1/6 =", ["1/2", "2/9", "2/6"], 0, ["1/3 = 2/6, deci 3/6 = 1/2."]),
      q("c2", "La 1/5 + 2/3, primul pas este:", ["numitor comun", "adunare directa", "simplificam 2/3"], 0, ["Numitorul comun este obligatoriu."]),
    ],
  }),
  lesson({
    id: "fractions_mixed_improper",
    module: "fractions",
    title: "Mixt si impropriu",
    icon: "PieChart",
    gradeBand: "VII",
    estMinutes: 5,
    slides: pack({
      intro: { heading: "Numar mixt", text: ["Are parte intreaga si fractie.", "Exemplu: 2 1/3."] },
      concept: { heading: "Mixt -> impropriu", text: ["intreaga*numitor + numarator", "Rezultatul devine numarator nou."] },
      example: { heading: "Impropriu -> mixt", text: ["Impartim cu rest.", "11/4 = 2 3/4."] },
      mini: { heading: "Mini-check", text: ["Transforma 1 2/5.", "Alege raspunsul."] },
      recap: { heading: "Recap", text: ["Transformare in ambele sensuri.", "Verifica prin operatii simple."] },
      visuals: [
        { type: "fractionBar", numer: 1, denom: 3, label: "2 1/3" },
        { type: "simpleSteps", current: 2, steps: ["2 1/3", "2*3+1", "7/3"] },
        { type: "fractionCircle", numer: 3, denom: 4, label: "2 3/4" },
        { type: "simpleSteps", current: 1, steps: ["1 2/5", "1*5+2", "7/5"] },
        { type: "fractionBar", numer: 2, denom: 5, label: "1 2/5" },
      ],
      checkId: "c1",
    }),
    miniChecks: [
      q("c1", "1 2/5 devine:", ["7/5", "5/7", "3/5"], 0, ["1*5 + 2 = 7."]),
      q("c2", "9/4 ca mixt este:", ["2 1/4", "1 2/4", "2 2/4"], 0, ["9 = 2*4 + 1."]),
    ],
  }),
];
const PERCENTS = [
  lesson({
    id: "percents_intro",
    module: "percents",
    title: "Ce este procentul",
    icon: "Percent",
    gradeBand: "V-VI",
    estMinutes: 4,
    slides: pack({
      intro: { heading: "Din 100", text: ["Procentul inseamna la suta.", "1% = 1 din 100."] },
      concept: { heading: "Citire", text: ["25% se citeste 25 la suta.", "50% inseamna jumatate."] },
      example: { heading: "Exemplu", text: ["40 din 100 = 40%.", "Scriem cu simbolul %."] },
      mini: { heading: "Mini-check", text: ["Alege semnificatia lui 1%.", "Raspuns clar."] },
      recap: { heading: "Recap", text: ["% este raport la 100.", "Ajuta la comparatii rapide."] },
      visuals: [
        { type: "percentGrid", percent: 50, label: "50%" },
        { type: "percentGrid", percent: 25, label: "25%" },
        { type: "percentGrid", percent: 40, label: "40%" },
        { type: "percentGrid", percent: 1, label: "1%" },
        { type: "percentGrid", percent: 75, label: "75%" },
      ],
      checkId: "c1",
    }),
    miniChecks: [
      q("c1", "1% inseamna:", ["1 din 100", "1 din 10", "100 din 1"], 0, ["% inseamna intotdeauna din 100."]),
      q("c2", "50% inseamna:", ["jumatate", "dublu", "un sfert"], 0, ["50/100 = 1/2."]),
    ],
  }),
  lesson({
    id: "percents_fraction_decimal",
    module: "percents",
    title: "Procent, fractie, zecimal",
    icon: "Percent",
    gradeBand: "VI",
    estMinutes: 5,
    slides: pack({
      intro: { heading: "Forme ale aceleiasi valori", text: ["25% = 25/100 = 0,25.", "Putem converti usor."] },
      concept: { heading: "Procent -> fractie", text: ["p% = p/100.", "Apoi poti simplifica."] },
      example: { heading: "Procent -> zecimal", text: ["Imparti la 100.", "35% = 0,35."] },
      mini: { heading: "Mini-check", text: ["Converteste 10%.", "Alege forma zecimala."] },
      recap: { heading: "Recap", text: ["% = /100.", "Zecimalul vine din impartire la 100."] },
      visuals: [
        { type: "percentGrid", percent: 25, label: "25%" },
        { type: "simpleSteps", current: 2, steps: ["60%", "60/100", "3/5"] },
        { type: "percentGrid", percent: 35, label: "0,35" },
        { type: "percentGrid", percent: 10, label: "10%" },
        { type: "percentGrid", percent: 80, label: "80%" },
      ],
      checkId: "c1",
    }),
    miniChecks: [
      q("c1", "10% in zecimal este:", ["0,1", "1", "0,01"], 0, ["10/100 = 0,1."]),
      q("c2", "0,25 in procente este:", ["25%", "2,5%", "250%"], 0, ["0,25*100 = 25%."]),
    ],
  }),
  lesson({
    id: "percents_percent_of_number",
    module: "percents",
    title: "p% dintr-un numar",
    icon: "Percent",
    gradeBand: "VI-VII",
    estMinutes: 6,
    slides: pack({
      intro: { heading: "Ce cautam", text: ["Calculam o parte din N.", "Exemplu: 20% din 50."] },
      concept: { heading: "Metoda 10%", text: ["10% din 50 este 5.", "20% inseamna 2*5."] },
      example: { heading: "Metoda inmultire", text: ["20% = 0,2.", "0,2*50 = 10."] },
      mini: { heading: "Mini-check", text: ["Cat este 30% din 200?", "Alege rezultatul."] },
      recap: { heading: "Recap", text: ["Metoda mentala sau formula.", "p/100 * N."] },
      visuals: [
        { type: "percentGrid", percent: 20, label: "20%" },
        { type: "simpleSteps", current: 2, steps: ["10% din 50=5", "20%=2*5", "10"] },
        { type: "percentGrid", percent: 20, label: "10" },
        { type: "percentGrid", percent: 30, label: "din 200" },
        { type: "percentGrid", percent: 30, label: "60" },
      ],
      checkId: "c1",
    }),
    miniChecks: [
      q("c1", "30% din 200 este:", ["60", "30", "20"], 0, ["10% este 20, deci 30% este 60."]),
      q("c2", "15% din 100 este:", ["15", "1,5", "150"], 0, ["La 100, procentul este numarul insusi."]),
    ],
  }),
  lesson({
    id: "percents_part_of_whole",
    module: "percents",
    title: "Cat la suta este a din b",
    icon: "Percent",
    gradeBand: "VI-VII",
    estMinutes: 6,
    slides: pack({
      intro: { heading: "Ideea", text: ["Gasim procentul unei parti.", "Pornim de la raportul a/b."] },
      concept: { heading: "Formula", text: ["(a/b)*100%.", "Clar si direct."] },
      example: { heading: "Exemplu", text: ["15 din 60 = 25%.", "15/60 = 0,25."] },
      mini: { heading: "Mini-check", text: ["Cat la suta este 8 din 40?", "Alege corect."] },
      recap: { heading: "Recap", text: ["Raport, apoi inmultire cu 100.", "Scriem cu %."] },
      visuals: [
        { type: "percentGrid", percent: 0, label: "a din b" },
        { type: "simpleSteps", current: 2, steps: ["15/60", "0,25", "25%"] },
        { type: "percentGrid", percent: 25, label: "25%" },
        { type: "percentGrid", percent: 20, label: "20%" },
        { type: "percentGrid", percent: 20, label: "20%" },
      ],
      checkId: "c1",
    }),
    miniChecks: [
      q("c1", "8 din 40 reprezinta:", ["20%", "8%", "40%"], 0, ["8/40 = 0,2, adica 20%."]),
      q("c2", "Formula corecta este:", ["(a/b)*100", "(b/a)*100", "a+b"], 0, ["Partea se raporteaza la intreg."]),
    ],
  }),
  lesson({
    id: "percents_increase_decrease",
    module: "percents",
    title: "Crestere si scadere procentuala",
    icon: "Percent",
    gradeBand: "VII",
    estMinutes: 6,
    slides: pack({
      intro: { heading: "Cand folosim", text: ["La preturi, note, populatie.", "Valoare noua dupa +% sau -%."] },
      concept: { heading: "Pasii", text: ["Calculezi procentul din valoarea initiala.", "Apoi aduni sau scazi."] },
      example: { heading: "Exemplu", text: ["Reducere 25% la 200 inseamna 150.", "Crestere 10% la 80 inseamna 88."] },
      mini: { heading: "Mini-check", text: ["100 creste cu 20%.", "Cat obtinem?"] },
      recap: { heading: "Recap", text: ["Crestere: aduni procentul.", "Scadere: scazi procentul."] },
      visuals: [
        { type: "percentGrid", percent: 10, label: "+10%" },
        { type: "simpleSteps", current: 2, steps: ["10% din 80=8", "80+8", "88"] },
        { type: "percentGrid", percent: 25, label: "-25%" },
        { type: "simpleSteps", current: 1, steps: ["100", "+20%", "120"] },
        { type: "percentGrid", percent: 20, label: "100 -> 120" },
      ],
      checkId: "c1",
    }),
    miniChecks: [
      q("c1", "100 crescut cu 20% este:", ["120", "80", "20"], 0, ["20% din 100 este 20. Aduni 20."]),
      q("c2", "50 redus cu 10% este:", ["45", "55", "40"], 0, ["10% din 50 este 5. 50-5=45."]),
    ],
  }),
];
const INTEGERS = [
  lesson({
    id: "integers_number_line",
    module: "integers",
    title: "Axa numerelor: pozitiv, negativ, zero",
    icon: "ArrowLeftRight",
    gradeBand: "V-VI",
    estMinutes: 4,
    slides: pack({
      intro: { heading: "Axa numerelor", text: ["Zero este punctul de referinta.", "Stanga negativ, dreapta pozitiv."] },
      concept: { heading: "Pozitie", text: ["Numerele au ordine clara.", "Mai la dreapta inseamna mai mare."] },
      example: { heading: "Exemplu", text: ["-4 este stanga lui 0.", "+4 este dreapta lui 0."] },
      mini: { heading: "Mini-check", text: ["Unde este -3?", "Alege raspunsul corect."] },
      recap: { heading: "Recap", text: ["Zero la mijloc.", "Semnul arata directia."] },
      visuals: [
        { type: "numberLine", min: -6, max: 6, value: 0, highlights: [-3, 4] },
        { type: "numberLine", min: -6, max: 6, value: -2, highlights: [3] },
        { type: "numberLine", min: -6, max: 6, value: -4, highlights: [4] },
        { type: "numberLine", min: -5, max: 5, value: -3, highlights: [] },
        { type: "numberLine", min: -4, max: 4, value: 1, highlights: [-1] },
      ],
      checkId: "c1",
    }),
    miniChecks: [
      q("c1", "-3 este:", ["la stanga lui 0", "la dreapta lui 0", "egal cu 0"], 0, ["Numerele negative sunt in stanga."]),
      q("c2", "Care este pozitiv?", ["+5", "-5", "-1"], 0, ["Pozitivele au + sau nu au semn."]),
    ],
  }),
  lesson({
    id: "integers_compare",
    module: "integers",
    title: "Compararea intregilor",
    icon: "ArrowLeftRight",
    gradeBand: "V-VI",
    estMinutes: 4,
    slides: pack({
      intro: { heading: "Comparam pe axa", text: ["Mai la dreapta = mai mare.", "Mai la stanga = mai mic."] },
      concept: { heading: "Negativele", text: ["-2 este mai mare decat -5.", "Este mai aproape de zero."] },
      example: { heading: "Exemplu", text: ["4 > -1.", "Pozitivul este mai mare ca negativul."] },
      mini: { heading: "Mini-check", text: ["Care e mai mare: -7 sau -3?", "Alege corect."] },
      recap: { heading: "Recap", text: ["Priveste pozitia pe axa.", "Dreapta castiga."] },
      visuals: [
        { type: "numberLine", min: -8, max: 8, value: -1, highlights: [3] },
        { type: "numberLine", min: -8, max: 2, value: -2, highlights: [-5] },
        { type: "numberLine", min: -3, max: 5, value: 4, highlights: [-1] },
        { type: "numberLine", min: -8, max: 0, value: -3, highlights: [-7] },
        { type: "numberLine", min: -6, max: 6, value: 2, highlights: [-4] },
      ],
      checkId: "c1",
    }),
    miniChecks: [
      q("c1", "Mai mare este:", ["-3", "-7", "egale"], 0, ["-3 este mai aproape de 0."]),
      q("c2", "Relatie corecta:", ["5 > -2", "-2 > 5", "5 = -2"], 0, ["Pozitivele sunt la dreapta."]),
    ],
  }),
  lesson({
    id: "integers_addition",
    module: "integers",
    title: "Adunarea intregilor",
    icon: "ArrowLeftRight",
    gradeBand: "VI",
    estMinutes: 5,
    slides: pack({
      intro: { heading: "Adunare pe axa", text: ["Pornesti din primul termen.", "Te misti cu al doilea termen."] },
      concept: { heading: "Directie", text: ["+ inseamna dreapta.", "- inseamna stanga."] },
      example: { heading: "Exemplu", text: ["-2 + 5 = 3.", "5 pasi la dreapta din -2."] },
      mini: { heading: "Mini-check", text: ["4 + (-6) = ?", "Alege corect."] },
      recap: { heading: "Recap", text: ["Adunarea este deplasare.", "Sensul vine din semn."] },
      visuals: [
        { type: "numberLine", min: -8, max: 8, value: -2, highlights: [3] },
        { type: "simpleSteps", current: 2, steps: ["-2+5", "mers dreapta", "3"] },
        { type: "numberLine", min: -8, max: 8, value: 3, highlights: [-2] },
        { type: "numberLine", min: -8, max: 8, value: -2, highlights: [4] },
        { type: "numberLine", min: -6, max: 6, value: -1, highlights: [2] },
      ],
      checkId: "c1",
    }),
    miniChecks: [
      q("c1", "4 + (-6) =", ["-2", "2", "10"], 0, ["Din 4 mergi 6 la stanga."]),
      q("c2", "-3 + 7 =", ["4", "-4", "10"], 0, ["Din -3 mergi 7 la dreapta."]),
    ],
  }),
  lesson({
    id: "integers_subtraction",
    module: "integers",
    title: "Scaderea intregilor",
    icon: "ArrowLeftRight",
    gradeBand: "VI",
    estMinutes: 5,
    slides: pack({
      intro: { heading: "Scaderea", text: ["a-b devine a+(-b).", "Transformarea este cheia."] },
      concept: { heading: "Opusul", text: ["Scaderea se schimba in adunare.", "Schimbam semnul lui b."] },
      example: { heading: "Exemplu", text: ["3-(-5)=3+5=8.", "-1-4=-5."] },
      mini: { heading: "Mini-check", text: ["Calculeaza 3-(-5).", "Alege raspunsul."] },
      recap: { heading: "Recap", text: ["Scadere -> adunare cu opus.", "Apoi aplici regula adunarii."] },
      visuals: [
        { type: "simpleSteps", current: 2, steps: ["5-(-2)", "5+2", "7"] },
        { type: "numberLine", min: -6, max: 8, value: 7, highlights: [5] },
        { type: "numberLine", min: -8, max: 3, value: -5, highlights: [-1] },
        { type: "numberLine", min: -3, max: 10, value: 8, highlights: [3] },
        { type: "numberLine", min: -6, max: 8, value: 2, highlights: [6] },
      ],
      checkId: "c1",
    }),
    miniChecks: [
      q("c1", "3-(-5)=", ["8", "-2", "-8"], 0, ["Minus minus devine plus."]),
      q("c2", "-4-3=", ["-7", "1", "7"], 0, ["Este -4 + (-3)."]),
    ],
  }),
  lesson({
    id: "integers_mul_div",
    module: "integers",
    title: "Inmultire si impartire intregi",
    icon: "ArrowLeftRight",
    gradeBand: "VI-VII",
    estMinutes: 5,
    slides: pack({
      intro: { heading: "Semne", text: ["Semne egale dau plus.", "Semne diferite dau minus."] },
      concept: { heading: "Reguli", text: ["(+)*(+)=+ si (-)*(-)=+.", "(+)*(-)=-."] },
      example: { heading: "Exemple", text: ["(-4)*3=-12.", "(-12):(-3)=4."] },
      mini: { heading: "Mini-check", text: ["Cat este (-5)*(-2)?", "Alege raspunsul."] },
      recap: { heading: "Recap", text: ["Intai semnul, apoi modulul.", "Valabil si la impartire."] },
      visuals: [
        { type: "simpleSteps", current: 2, steps: ["(-3)*(-2)", "semne egale", "+6"] },
        { type: "simpleSteps", current: 3, steps: ["++ => +", "+- => -", "-- => +"] },
        { type: "numberLine", min: -12, max: 12, value: -12, highlights: [4] },
        { type: "simpleSteps", current: 1, steps: ["(-5)*(-2)", "semne egale", "10"] },
        { type: "numberLine", min: -10, max: 10, value: 10, highlights: [-10] },
      ],
      checkId: "c1",
    }),
    miniChecks: [
      q("c1", "(-5)*(-2)=", ["10", "-10", "-7"], 0, ["Semne egale => plus."]),
      q("c2", "18:(-3)=", ["-6", "6", "-15"], 0, ["Semne diferite => minus."]),
    ],
  }),
];
const EQUATIONS = [
  lesson({
    id: "equations_intro",
    module: "equations",
    title: "Ce este o ecuatie",
    icon: "Sigma",
    gradeBand: "VI",
    estMinutes: 4,
    slides: pack({
      intro: { heading: "Ecuatie", text: ["Ecuatia este o egalitate cu x.", "Cautam valoarea lui x."] },
      concept: { heading: "Balanta", text: ["Ce faci pe stanga, faci si pe dreapta.", "Egalitatea ramane valabila."] },
      example: { heading: "Exemplu", text: ["x+2=5.", "Scadem 2, obtinem x=3."] },
      mini: { heading: "Mini-check", text: ["Cum pastram ecuatia corecta?", "Alege regula."] },
      recap: { heading: "Recap", text: ["Model de balanta.", "x trebuie izolat."] },
      visuals: [
        { type: "balanceScale", left: "x+3", right: "8", tilt: "right" },
        { type: "balanceScale", left: "x+3", right: "8", tilt: "right" },
        { type: "balanceScale", left: "x", right: "3", tilt: "balanced" },
        { type: "simpleSteps", current: 2, steps: ["Egalitate", "aceeasi operatie", "solutie"] },
        { type: "balanceScale", left: "x", right: "3", tilt: "balanced" },
      ],
      checkId: "c1",
    }),
    miniChecks: [
      q("c1", "Pentru a pastra egalitatea:", ["aceeasi operatie in ambele parti", "operatie doar pe stanga", "schimbam x"], 0, ["Operatia trebuie aplicata simetric."]),
      q("c2", "In x+4=9, x este:", ["necunoscuta", "numitor", "rezultat final"], 0, ["x este valoarea cautata."]),
    ],
  }),
  lesson({
    id: "equations_additive",
    module: "equations",
    title: "Rezolvare x+a=b",
    icon: "Sigma",
    gradeBand: "VI",
    estMinutes: 5,
    slides: pack({
      intro: { heading: "Forma x+a=b", text: ["Vrem x singur.", "Scadem a din ambele parti."] },
      concept: { heading: "Pas standard", text: ["x+a=b", "x=b-a"] },
      example: { heading: "Exemplu", text: ["x+7=15.", "x=8."] },
      mini: { heading: "Mini-check", text: ["Rezolva x+4=11.", "Alege x."] },
      recap: { heading: "Recap", text: ["Mutam +a prin scadere.", "Verificam solutia."] },
      visuals: [
        { type: "balanceScale", left: "x+5", right: "12", tilt: "right" },
        { type: "simpleSteps", current: 2, steps: ["x+5=12", "-5", "x=7"] },
        { type: "balanceScale", left: "x", right: "8", tilt: "balanced" },
        { type: "balanceScale", left: "x+4", right: "11", tilt: "right" },
        { type: "simpleSteps", current: 3, steps: ["x+4=11", "x=7", "7+4=11"] },
      ],
      checkId: "c1",
    }),
    miniChecks: [
      q("c1", "x+4=11. x=", ["7", "15", "-7"], 0, ["Scadem 4 din ambele parti."]),
      q("c2", "La x+9=14 aplicam:", ["-9", "+9", "*9"], 0, ["Anulam +9 cu -9."]),
    ],
  }),
  lesson({
    id: "equations_subtractive",
    module: "equations",
    title: "Rezolvare x-a=b",
    icon: "Sigma",
    gradeBand: "VI",
    estMinutes: 5,
    slides: pack({
      intro: { heading: "Forma x-a=b", text: ["Anulam -a.", "Adunam a in ambele parti."] },
      concept: { heading: "Pas standard", text: ["x-a=b", "x=b+a"] },
      example: { heading: "Exemplu", text: ["x-5=2.", "x=7."] },
      mini: { heading: "Mini-check", text: ["Rezolva x-8=1.", "Alege x."] },
      recap: { heading: "Recap", text: ["Minus se anuleaza prin plus.", "Verificam prin inlocuire."] },
      visuals: [
        { type: "balanceScale", left: "x-3", right: "6", tilt: "left" },
        { type: "simpleSteps", current: 2, steps: ["x-3=6", "+3", "x=9"] },
        { type: "balanceScale", left: "x", right: "7", tilt: "balanced" },
        { type: "balanceScale", left: "x-8", right: "1", tilt: "left" },
        { type: "simpleSteps", current: 3, steps: ["x-8=1", "x=9", "9-8=1"] },
      ],
      checkId: "c1",
    }),
    miniChecks: [
      q("c1", "x-8=1. x=", ["9", "7", "-7"], 0, ["Aduni 8 pe ambele parti."]),
      q("c2", "La x-2=10 faci:", ["+2", "-2", "*2"], 0, ["Anulezi -2 cu +2."]),
    ],
  }),
  lesson({
    id: "equations_multiplication",
    module: "equations",
    title: "Rezolvare a*x=b",
    icon: "Sigma",
    gradeBand: "VI-VII",
    estMinutes: 5,
    slides: pack({
      intro: { heading: "Forma a*x=b", text: ["x este inmultit cu a.", "Impartim la a."] },
      concept: { heading: "Regula", text: ["a*x=b", "x=b/a"] },
      example: { heading: "Exemplu", text: ["5x=20.", "x=4."] },
      mini: { heading: "Mini-check", text: ["Rezolva 4x=28.", "Alege x."] },
      recap: { heading: "Recap", text: ["Inmultirea se inverseaza prin impartire.", "Imparti ambele parti."] },
      visuals: [
        { type: "balanceScale", left: "3x", right: "18", tilt: "right" },
        { type: "simpleSteps", current: 2, steps: ["3x=18", ":3", "x=6"] },
        { type: "balanceScale", left: "x", right: "4", tilt: "balanced" },
        { type: "balanceScale", left: "4x", right: "28", tilt: "right" },
        { type: "simpleSteps", current: 3, steps: ["4x=28", "x=7", "4*7=28"] },
      ],
      checkId: "c1",
    }),
    miniChecks: [
      q("c1", "4x=28. x=", ["7", "24", "8"], 0, ["Imparti la 4."]),
      q("c2", "2x=18. x=", ["9", "16", "20"], 0, ["18:2=9."]),
    ],
  }),
  lesson({
    id: "equations_division",
    module: "equations",
    title: "Rezolvare x/a=b",
    icon: "Sigma",
    gradeBand: "VI-VII",
    estMinutes: 5,
    slides: pack({
      intro: { heading: "Forma x/a=b", text: ["x este impartit la a.", "Inmultim cu a."] },
      concept: { heading: "Regula", text: ["x/a=b", "x=b*a"] },
      example: { heading: "Exemplu", text: ["x/4=6.", "x=24."] },
      mini: { heading: "Mini-check", text: ["Rezolva x/5=7.", "Alege x."] },
      recap: { heading: "Recap", text: ["Impartirea se inverseaza prin inmultire.", "Verificam solutia."] },
      visuals: [
        { type: "balanceScale", left: "x/3", right: "5", tilt: "right" },
        { type: "simpleSteps", current: 2, steps: ["x/3=5", "*3", "x=15"] },
        { type: "balanceScale", left: "x", right: "24", tilt: "balanced" },
        { type: "balanceScale", left: "x/5", right: "7", tilt: "right" },
        { type: "simpleSteps", current: 3, steps: ["x/5=7", "x=35", "35/5=7"] },
      ],
      checkId: "c1",
    }),
    miniChecks: [
      q("c1", "x/5=7. x=", ["35", "12", "2"], 0, ["Inmultesti cu 5."]),
      q("c2", "x/2=9. x=", ["18", "11", "7"], 0, ["9*2=18."]),
    ],
  }),
  lesson({
    id: "equations_parentheses",
    module: "equations",
    title: "Ecuatii cu paranteza simpla",
    icon: "Sigma",
    gradeBand: "VII",
    estMinutes: 6,
    slides: pack({
      intro: { heading: "Paranteza", text: ["Exemplu: 2(x+3)=14.", "Intai desfacem paranteza."] },
      concept: { heading: "Distributivitate", text: ["a(b+c)=ab+ac.", "Aplicam corect fiecare termen."] },
      example: { heading: "Exemplu complet", text: ["2x+6=14, 2x=8, x=4.", "Pas cu pas."] },
      mini: { heading: "Mini-check", text: ["3(x+2) devine?", "Alege expresia corecta."] },
      recap: { heading: "Recap", text: ["Desfacem, simplificam, izolam x.", "Verificam final."] },
      visuals: [
        { type: "balanceScale", left: "2(x+3)", right: "14", tilt: "right" },
        { type: "simpleSteps", current: 2, steps: ["2(x+3)=14", "2x+6=14", "2x=8"] },
        { type: "balanceScale", left: "x", right: "4", tilt: "balanced" },
        { type: "simpleSteps", current: 1, steps: ["3(x+2)", "distribuie 3", "3x+6"] },
        { type: "simpleSteps", current: 3, steps: ["2(x+3)=14", "2x+6=14", "x=4"] },
      ],
      checkId: "c1",
    }),
    miniChecks: [
      q("c1", "3(x+2) =", ["3x+6", "3x+2", "x+6"], 0, ["3 se inmulteste cu fiecare termen."]),
      q("c2", "Dupa distribuire in 2(x+3)=14 obtinem:", ["2x+6=14", "2x+3=14", "x+6=14"], 0, ["2*x + 2*3 = 2x+6."]),
    ],
  }),
];

const DEFAULT_LESSONS = {
  fractions: FRACTIONS,
  percents: PERCENTS,
  integers: INTEGERS,
  equations: EQUATIONS,
};

const CUSTOM_CONTENT = loadCustomContent();
const MERGED_LESSONS = mergeLessons(DEFAULT_LESSONS, CUSTOM_CONTENT);
const NORMALIZED_LESSONS = normalizeLessonsCollection(MERGED_LESSONS).lessonsByModule;

export const LESSONS = NORMALIZED_LESSONS;

export const ALL_LESSONS = Object.values(LESSONS).flatMap((items) => items);

export const LEVEL_LESSON_MAP = {
  "fractions:1": "fractions_intro",
  "fractions:2": "fractions_equivalent",
  "fractions:3": "fractions_add_sub_same_denom",
  "percents:1": "percents_intro",
  "percents:2": "percents_fraction_decimal",
  "percents:3": "percents_percent_of_number",
  "integers:1": "integers_number_line",
  "integers:2": "integers_addition",
  "integers:3": "integers_mul_div",
  "equations:1": "equations_additive",
  "equations:2": "equations_subtractive",
  "equations:3": "equations_parentheses",
};

export const MODULE_DEFAULT_LESSON = {
  fractions: "fractions_intro",
  percents: "percents_intro",
  integers: "integers_number_line",
  equations: "equations_intro",
};

export const MODULE_DEFAULT_SIMULATOR = {
  fractions: "fractions",
  percents: "percents",
  integers: "integers",
  equations: "equations",
};

export function getLessonsByModule(moduleId) {
  return LESSONS[moduleId] ?? [];
}

export function getLessonById(lessonId) {
  return ALL_LESSONS.find((item) => item.id === lessonId) ?? null;
}

export function getLessonIdForLevel(moduleId, levelId) {
  const key = `${String(moduleId)}:${String(levelId).toLowerCase()}`;
  return LEVEL_LESSON_MAP[key] ?? MODULE_DEFAULT_LESSON[moduleId] ?? null;
}
