import { ZodError, type ZodTypeAny } from "zod";
import {
    AvatarEditorRequestSchema,
    AvatarEditorResponseSchema,
    GenerateExercisesRequestSchema,
    GenerateExercisesResponseSchema,
    LessonTeachModeSchema,
    LearningPathRequestSchema,
    LearningPathResponseSchema,
    SolveStepByStepRequestSchema,
    SolveStepByStepResponseSchema,
    TeachLessonRequestSchema,
    TeachLessonResponseSchema,
    type AvatarEditorRequest,
    type AvatarEditorResponse,
    type GenerateExercisesRequest,
    type GenerateExercisesResponse,
    type LearningPathRequest,
    type LearningPathResponse,
    type SolveStepByStepRequest,
    type SolveStepByStepResponse,
    type TeachLessonRequest,
    type TeachLessonResponse,
} from "../../shared/aiSchemas.ts";
import {
    CURRICULUM_SOURCE,
    getGradeCurriculum,
    resolveUnitForTopic,
} from "../data/curriculumDb.js";
import {
    getManualByGrade,
    getManualLessonTitles,
    resolveManualUnit,
} from "../data/manualsDb.js";

export type EnvConfig = {
    GEMINI_API_KEY?: string;
    GEMINI_MODEL?: string;
};

const DEFAULT_MODEL_CANDIDATES = [
    "gemini-2.5-flash",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
];

class ApiError extends Error {
    status: number;
    code: string;
    details?: unknown;

    constructor(status: number, code: string, message: string, details?: unknown) {
        super(message);
        this.status = status;
        this.code = code;
        this.details = details;
    }
}

function toZodDetails(error: ZodError) {
    return error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
        code: issue.code,
    }));
}

function parseWithSchema<T>(schema: ZodTypeAny, value: unknown, label: string): T {
    const parsed = schema.safeParse(value);
    if (!parsed.success) {
        throw new ApiError(400, "VALIDATION_ERROR", `Date invalide pentru ${label}.`, {
            label,
            issues: toZodDetails(parsed.error),
        });
    }
    return parsed.data as T;
}

function extractJsonFromText(rawText: string): string | null {
    const trimmed = String(rawText ?? "").trim();
    if (!trimmed) return null;

    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) return fenced[1].trim();

    if (trimmed.startsWith("{") || trimmed.startsWith("[")) return trimmed;

    let start = -1;
    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let i = 0; i < trimmed.length; i += 1) {
        const char = trimmed[i];

        if (inString) {
            if (escaped) {
                escaped = false;
            } else if (char === "\\") {
                escaped = true;
            } else if (char === "\"") {
                inString = false;
            }
            continue;
        }

        if (char === "\"") {
            inString = true;
            continue;
        }

        if (char === "{" || char === "[") {
            if (depth === 0) start = i;
            depth += 1;
            continue;
        }

        if (char === "}" || char === "]") {
            depth -= 1;
            if (depth === 0 && start >= 0) {
                return trimmed.slice(start, i + 1).trim();
            }
        }
    }

    return null;
}

function safeJsonParse(rawText: string): unknown {
    const candidate = extractJsonFromText(rawText);
    if (!candidate) {
        throw new ApiError(
            502,
            "AI_JSON_EXTRACT_FAILED",
            "Modelul nu a returnat JSON valid.",
        );
    }
    try {
        return JSON.parse(candidate);
    } catch {
        throw new ApiError(
            502,
            "AI_JSON_PARSE_FAILED",
            "Raspuns AI invalid JSON dupa normalizare.",
        );
    }
}

function systemJsonGuard() {
    return [
        "Raspunde exclusiv JSON valid.",
        "Fara markdown, fara text explicativ in afara JSON.",
        "Raspunsul trebuie sa fie util pentru elevi clasele V-VIII si in romana.",
    ].join(" ");
}

async function callGemini(prompt: string, env: EnvConfig): Promise<unknown> {
    const apiKey = env.GEMINI_API_KEY?.trim() || "";
    if (!apiKey) {
        throw new ApiError(
            503,
            "AI_KEY_MISSING",
            "Lipseste GEMINI_API_KEY pe server.",
        );
    }

    const configuredModel = env.GEMINI_MODEL?.trim() || null;
    const orderedCandidates = [
        ...(configuredModel ? [configuredModel] : []),
        ...DEFAULT_MODEL_CANDIDATES,
    ];

    const attempted: string[] = [];
    const errorsByModel: Array<{ model: string; status: number; body: string }> = [];

    for (const model of orderedCandidates) {
        attempted.push(model);
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
        const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.35,
                    responseMimeType: "application/json",
                },
            }),
        });

        if (response.status === 404) {
            const text = await response.text();
            errorsByModel.push({ model, status: response.status, body: text.slice(0, 800) });
            continue;
        }

        if (!response.ok) {
            const text = await response.text();
            errorsByModel.push({ model, status: response.status, body: text.slice(0, 800) });
            continue;
        }

        const payload = await response.json() as any;
        const text = payload?.candidates?.[0]?.content?.parts
            ?.map((part: { text?: string }) => part?.text ?? "")
            .join("\n")
            .trim();

        if (!text) {
            throw new ApiError(502, "AI_EMPTY_RESPONSE", "Modelul nu a returnat continut.");
        }

        return safeJsonParse(text);
    }

    throw new ApiError(
        502,
        "AI_UPSTREAM_ERROR",
        "Eroare upstream Gemini.",
        { attempted, errorsByModel },
    );
}

function shouldFallbackToMock(error: unknown) {
    if (!(error instanceof ApiError)) return false;
    const fallbackCodes = new Set([
        "AI_UPSTREAM_ERROR",
        "AI_MODEL_UNAVAILABLE",
        "AI_EMPTY_RESPONSE",
        "AI_JSON_EXTRACT_FAILED",
        "AI_JSON_PARSE_FAILED",
    ]);
    return fallbackCodes.has(error.code);
}

function topicFromInput(topic: string) {
    const normalized = String(topic ?? "").toLowerCase();
    if (normalized.includes("procent")) return "Procente";
    if (normalized.includes("fract")) return "Fractii";
    if (normalized.includes("ecuat")) return "Ecuatii";
    if (normalized.includes("intreg")) return "Numere intregi";
    return String(topic ?? "Matematica");
}

function normalizeSearchText(value: string | null | undefined) {
    return String(value ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

function normalizeGrade(value: unknown, fallback = 5) {
    const grade = Number(value);
    if (Number.isInteger(grade) && grade >= 5 && grade <= 8) {
        return grade;
    }
    return fallback;
}

function gradeFromBand(gradeBand: string | null | undefined) {
    const normalized = normalizeSearchText(gradeBand);
    if (normalized.includes("8")) return 8;
    if (normalized.includes("7")) return 7;
    if (normalized.includes("6")) return 6;
    if (normalized.includes("5")) return 5;
    if (normalized.includes("viii")) return 8;
    if (normalized.includes("vii")) return 7;
    if (normalized.includes("vi")) return 6;
    if (normalized.includes("v")) return 5;
    return null;
}

function buildCurriculumContext(input: {
    grade?: number | null;
    gradeBand?: string | null;
    topic?: string | null;
    unitId?: string | null;
}) {
    const guessedGrade = input.grade ?? gradeFromBand(input.gradeBand);
    const grade = normalizeGrade(guessedGrade, 5);
    const gradeData = getGradeCurriculum(grade);
    const units = Array.isArray(gradeData?.units) ? gradeData.units : [];

    const safeUnitId = String(input.unitId ?? "").trim();
    let selectedUnit =
        units.find((unit: { id: string }) => unit.id === safeUnitId) ??
        null;
    if (!selectedUnit) {
        selectedUnit = resolveUnitForTopic(grade, String(input.topic ?? "")) ?? null;
    }

    const manual = getManualByGrade(grade);
    const manualUnit = resolveManualUnit(grade, {
        curriculumUnitId: selectedUnit?.id ?? null,
        topic: input.topic ?? null,
    });
    const manualLessons = getManualLessonTitles(grade, {
        curriculumUnitId: selectedUnit?.id ?? null,
        topic: input.topic ?? null,
    }).slice(0, 14);

    return {
        grade,
        gradeLabel: gradeData?.gradeLabel ?? `Clasa a ${grade}-a`,
        units,
        selectedUnit,
        manual,
        manualUnit,
        manualLessons,
    };
}

function curriculumPromptLines(context: ReturnType<typeof buildCurriculumContext>) {
    const allowedUnits = context.units
        .map((unit: { title: string }) => unit.title)
        .join(" | ");
    const selectedTopics = Array.isArray(context.selectedUnit?.topics)
        ? context.selectedUnit.topics.join("; ")
        : "";
    return [
        `Programa obligatorie: ${CURRICULUM_SOURCE.code} - ${CURRICULUM_SOURCE.title}.`,
        `Clasa tinta: ${context.gradeLabel}.`,
        `Unitati permise pentru clasa: ${allowedUnits}.`,
        context.manual
            ? `Manual de referinta: ${context.manual.title} (${context.manual.year}).`
            : "Manual de referinta: indisponibil.",
        context.selectedUnit
            ? `Unitatea selectata: ${context.selectedUnit.title}.`
            : "Nu este selectata explicit o unitate; alege unitatea cea mai potrivita din lista.",
        context.manualUnit
            ? `Capitol manual asociat: ${context.manualUnit.title}.`
            : "Capitol manual asociat: foloseste cel mai apropiat capitol dupa unitatea din programa.",
        context.manualLessons.length
            ? `Lectii manual disponibile: ${context.manualLessons.join(" | ")}.`
            : "Lectii manual disponibile: extrage un parcurs realist din capitolul asociat.",
        context.selectedUnit
            ? `Continut tinta (sumar): ${selectedTopics}.`
            : "Nu iesi in afara programei pentru clasa selectata.",
    ];
}

function buildLearningPathMock(input: LearningPathRequest): LearningPathResponse {
    const maxLevels = Math.max(1, Math.min(5, Number(input.constraints?.maxLevels ?? 5)));
    const curriculumContext = buildCurriculumContext({
        grade: input.grade,
        gradeBand: input.gradeBand,
        topic: input.topic,
        unitId: input.unitId,
    });
    const safeTopic = curriculumContext.selectedUnit?.title ?? topicFromInput(input.topic);
    const baseTitles = curriculumContext.manualLessons.length
        ? curriculumContext.manualLessons
        : Array.isArray(curriculumContext.selectedUnit?.topics)
        ? curriculumContext.selectedUnit.topics
        : [
            "Introducere si recapitulare ghidata",
            "Aplicatii directe",
            "Exercitii de consolidare",
            "Aplicatii in probleme",
            "Verificare finala",
        ];

    const levels = Array.from({ length: maxLevels }).map((_, index) => ({
        level: index + 1,
        title: baseTitles[index] ?? `${safeTopic} - nivel ${index + 1}`,
        objectives: [
            `Intelege conceptul cheie pentru ${safeTopic.toLowerCase()}.`,
            "Rezolva exercitii scurte cu verificare.",
            "Evita greselile frecvente de calcul.",
        ],
        diagnostic: {
            items: [
                `Intrebare rapida nivel ${index + 1} (1).`,
                `Intrebare rapida nivel ${index + 1} (2).`,
            ],
        },
    }));

    return {
        recommended: {
            topic: safeTopic,
            level: levels[0]?.level ?? 1,
            title: levels[0]?.title ?? `${safeTopic} - nivel 1`,
        },
        levels,
        notes: [
            "Mock local: configureaza GEMINI_API_KEY pentru raspunsuri AI reale.",
            "Sesiuni recomandate de 10 minute, cu recap la final.",
            `${curriculumContext.gradeLabel}: focus pe continuturile din programa oficiala.`,
            curriculumContext.manual
                ? `Referinta de manual: ${curriculumContext.manual.title} (${curriculumContext.manual.year}).`
                : "Referinta de manual indisponibila.",
        ],
    };
}

function hashSeed(value: string) {
    let hash = 2166136261;
    const text = String(value ?? "");
    for (let i = 0; i < text.length; i += 1) {
        hash ^= text.charCodeAt(i);
        hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return hash >>> 0;
}

function shuffleWithSeed<T>(values: T[], seedText: string): T[] {
    const list = [...values];
    let seed = hashSeed(seedText);
    for (let i = list.length - 1; i > 0; i -= 1) {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        const j = seed % (i + 1);
        [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
}

function uniqueStrings(values: string[]) {
    const out: string[] = [];
    values.forEach((item) => {
        const text = String(item ?? "").trim();
        if (text && !out.includes(text)) out.push(text);
    });
    return out;
}

function buildMcqOptions(correct: string, distractors: string[], seedText: string) {
    const pool = uniqueStrings([correct, ...distractors]);
    const options = shuffleWithSeed(pool.slice(0, 4), seedText);
    const answer = Math.max(0, options.findIndex((item) => item === correct));
    return { options, answer };
}

function buildExerciseMock(input: GenerateExercisesRequest): GenerateExercisesResponse {
    const count = Math.max(1, Math.min(20, Number(input.count ?? 10)));
    const curriculumContext = buildCurriculumContext({
        grade: input.grade,
        topic: input.topic,
        unitId: input.unitId,
    });
    const safeTopic = curriculumContext.selectedUnit?.title ?? topicFromInput(input.topic);
    const normalizedTopic = normalizeSearchText(safeTopic);
    const isFractionsTopic = normalizedTopic.includes("fract");
    const isPercentTopic = normalizedTopic.includes("procent");
    const types = input.types.length ? input.types : ["mcq_single"];

    const items = Array.from({ length: count }).map((_, index) => {
        const type = types[index % types.length];
        const manualLesson =
            curriculumContext.manualLessons[index % Math.max(1, curriculumContext.manualLessons.length)] ??
            null;
        const lessonHint = manualLesson ? ` (${manualLesson})` : "";

        if (type === "true_false") {
            const truthy = index % 2 === 0;
            const statement = isFractionsTopic
                ? truthy
                    ? "Daca fractiile au acelasi numitor, adunam/scadem doar numaratorii."
                    : "La adunarea fractiilor cu acelasi numitor, adunam si numitorii."
                : isPercentTopic
                ? truthy
                    ? "Procentul inseamna raport la 100."
                    : "30% inseamna 30 din 10."
                : `Afirmatie de verificare pentru ${safeTopic.toLowerCase()}.`;
            return {
                id: `ai-${index + 1}`,
                type,
                prompt: `${safeTopic}${lessonHint}: ${statement}`,
                options: ["Adevarat", "Fals"],
                answer: truthy ? 0 : 1,
                explanation: "Verifica regula de baza din lectia curenta.",
                steps: ["Citeste enuntul.", "Aplica regula potrivita.", "Alege varianta corecta."],
                hints: ["Porneste de la definitie.", "Verifica daca rezultatul e logic."],
            };
        }

        if (type === "fill_blank") {
            if (isFractionsTopic) {
                const denominatorPool =
                    input.difficulty === "usor" ? [4, 5, 6] : input.difficulty === "mediu" ? [6, 8, 10] : [8, 10, 12];
                const denominator = denominatorPool[index % denominatorPool.length];
                const a = (index % (denominator - 1)) + 1;
                const b = ((index + 2) % (denominator - 1)) + 1;
                const sum = a + b;
                return {
                    id: `ai-${index + 1}`,
                    type,
                    prompt: `${safeTopic}${lessonHint}: completeaza rezultatul pentru ${a}/${denominator} + ${b}/${denominator}`,
                    options: [],
                    answer: `${sum}/${denominator}`,
                    explanation: "Numitorul ramane acelasi; adunam doar numaratorii.",
                    steps: ["Observa ca numitorii sunt egali.", "Aduna numaratorii.", "Pastreaza numitorul."],
                    hints: ["Nu aduna numitorii.", "Rezultatul are acelasi numitor ca termenii."],
                };
            }
            return {
                id: `ai-${index + 1}`,
                type,
                prompt: `${safeTopic}${lessonHint}: completeaza raspunsul pentru itemul ${index + 1}.`,
                options: [],
                answer: String((index + 1) * 2),
                explanation: "Rezolva pas cu pas si completeaza valoarea finala.",
                steps: ["Identifica datele.", "Calculeaza rezultatul.", "Scrie raspunsul."],
                hints: ["Lucreaza cu numerele din enunt.", "Fa un control rapid la final."],
            };
        }

        if (type === "problem") {
            return {
                id: `ai-${index + 1}`,
                type,
                prompt: `${safeTopic}${lessonHint}: problema aplicata ${index + 1}.`,
                options: [],
                answer: isFractionsTopic ? `${index + 5}/${index + 8}` : String((index + 3) * 5),
                explanation: isFractionsTopic
                    ? "Foloseste regula operatiilor cu fractii din lectia asociata."
                    : "Identifica procentul, apoi calculeaza valoarea ceruta.",
                steps: [
                    isFractionsTopic ? "Adu fractiile la forma potrivita." : "Stabileste ce reprezinta 100%.",
                    isFractionsTopic ? "Aplica operatia ceruta." : "Transforma procentul in fractie/zecimal.",
                    "Calculeaza rezultatul final.",
                ],
                hints: isFractionsTopic
                    ? ["Verifica numitorii.", "Simplifica la final daca este posibil."]
                    : ["Foloseste regula de trei simpla.", "Scrie toate etapele pe rand."],
            };
        }

        if (isFractionsTopic) {
            const denominatorPool =
                input.difficulty === "usor" ? [4, 5, 6] : input.difficulty === "mediu" ? [6, 8, 10] : [8, 10, 12];
            const denominator = denominatorPool[index % denominatorPool.length];
            const firstNumerator = (index % (denominator - 1)) + 1;
            const secondNumerator = ((index + 3) % (denominator - 1)) + 1;
            const isSubtraction = index % 2 === 1;
            const topA = isSubtraction
                ? Math.max(firstNumerator, secondNumerator)
                : firstNumerator;
            const topB = isSubtraction
                ? Math.min(firstNumerator, secondNumerator)
                : secondNumerator;
            const resultNumerator = isSubtraction ? topA - topB : topA + topB;
            const correct = `${resultNumerator}/${denominator}`;
            const wrong1 = `${resultNumerator}/${denominator + 2}`;
            const wrong2 = `${Math.max(resultNumerator + 1, 1)}/${denominator}`;
            const wrong3 = `${topA + topB}/${denominator + 1}`;
            const mcq = buildMcqOptions(
                correct,
                [wrong1, wrong2, wrong3],
                `${safeTopic}|${index}|${input.difficulty}|fraction`,
            );
            return {
                id: `ai-${index + 1}`,
                type: "mcq_single" as const,
                prompt: `${safeTopic}${lessonHint}: calculeaza ${topA}/${denominator} ${isSubtraction ? "-" : "+"} ${topB}/${denominator}`,
                options: mcq.options,
                answer: mcq.answer,
                explanation: "Cand numitorii sunt egali, operam doar numaratorii, apoi pastram numitorul.",
                steps: ["Verifica numitorii.", "Calculeaza numaratorul.", "Pastreaza numitorul comun."],
                hints: ["Nu modifica numitorul.", "Reciteste regula pentru fractii cu acelasi numitor."],
            };
        }

        if (isPercentTopic) {
            const basePool = input.difficulty === "greu" ? [120, 160, 240] : [50, 80, 100];
            const percentPool = input.difficulty === "usor" ? [10, 20, 25] : [15, 30, 40];
            const base = basePool[index % basePool.length];
            const percent = percentPool[index % percentPool.length];
            const correct = String(Math.round((base * percent) / 100));
            const mcq = buildMcqOptions(
                correct,
                [String(Number(correct) + 10), String(Math.max(Number(correct) - 10, 0)), String(percent)],
                `${safeTopic}|${index}|${input.difficulty}|percent`,
            );
            return {
                id: `ai-${index + 1}`,
                type: "mcq_single" as const,
                prompt: `${safeTopic}${lessonHint}: cat este ${percent}% din ${base}?`,
                options: mcq.options,
                answer: mcq.answer,
                explanation: "Transforma procentul in fractie din 100 si inmulteste cu baza.",
                steps: ["Scrie procentul ca p/100.", "Inmulteste cu baza.", "Simplifica rezultatul."],
                hints: ["10% din baza se afla rapid.", "Construieste procentul cerut din 10%."],
            };
        }

        const base = (index + 2) * 3;
        const correct = String(base + 4);
        const mcq = buildMcqOptions(
            correct,
            [String(base), String(base + 2), String(base + 6)],
            `${safeTopic}|${index}|${input.difficulty}|generic`,
        );
        return {
            id: `ai-${index + 1}`,
            type: "mcq_single" as const,
            prompt: `${safeTopic}${lessonHint}: item grila ${index + 1}.`,
            options: mcq.options,
            answer: mcq.answer,
            explanation: "Compara fiecare varianta cu datele problemei si cu lectia de referinta.",
            steps: ["Alege metoda de calcul.", "Calculeaza.", "Verifica varianta corecta."],
            hints: ["Elimina variantele imposibile.", "Recalculeaza daca ai dubii."],
        };
    });

    return {
        exerciseSet: {
            id: `ai-set-${Math.random().toString(36).substring(2)}`,
            title: `${safeTopic} - sesiune (${curriculumContext.gradeLabel})`,
            grade: input.grade,
            topic: safeTopic,
            difficulty: input.difficulty,
            items: items as any,
        }
    };
}

function buildSolutionMock(input: SolveStepByStepRequest): SolveStepByStepResponse {
    const curriculumContext = buildCurriculumContext({
        grade: input.grade,
        topic: input.topic,
        unitId: input.unitId,
    });
    const safeTopic = curriculumContext.selectedUnit?.title ?? topicFromInput(input.topic);
    return {
        solution: {
            finalAnswer: "Raspunsul final este 25%.",
            steps: [
                {
                    title: "Pas 1",
                    math: "Identificam totalul (100%).",
                    explain: `Scriem datele din problema de ${safeTopic.toLowerCase()} intr-un format clar.`,
                },
                {
                    title: "Pas 2",
                    math: "Aplicam formula procent = parte / total * 100.",
                    explain: "Inlocuim valorile din enunt si calculam.",
                },
                {
                    title: "Pas 3",
                    math: "Verificam rezultatul prin estimare.",
                    explain: "Daca rezultatul este realist, il notam ca raspuns final.",
                },
            ],
            commonMistakes: [
                "Confuzia intre procent si valoarea absoluta.",
                "Omiterea inmultirii cu 100 la final.",
            ],
            check: "Inlocuieste raspunsul in enunt si verifica daca datele raman coerente.",
        },
    };
}

function buildTeachLessonMock(input: TeachLessonRequest): TeachLessonResponse {
    const lessonTopic = String(input.topic ?? input.lessonTitle).trim() || "Matematica";
    const curriculumContext = buildCurriculumContext({
        grade: input.grade ?? null,
        gradeBand: input.gradeBand ?? null,
        topic: lessonTopic,
        unitId: input.unitId ?? null,
    });
    const lessonTitle = String(input.lessonTitle ?? "Lectie").trim();
    const manualRef = curriculumContext.manualUnit?.title ?? "capitolul curent din manual";

    if (input.mode === "example") {
        return {
            lessonAssist: {
                mode: "example",
                title: `Exemplu ghidat - ${lessonTitle}`,
                explanation: `Lucram un exemplu pentru ${lessonTitle}, conform ${manualRef}.`,
                steps: [
                    "Identificam datele din enunt si ce trebuie aflat.",
                    "Alegem regula potrivita din lectie.",
                    "Aplicam regula pas cu pas, fara salturi.",
                    "Verificam rezultatul printr-o metoda rapida.",
                ],
                checks: [
                    "Poti explica de ce ai ales aceasta regula?",
                    "Care pas iti pare cel mai dificil?",
                ],
                miniPractice: [
                    { prompt: "Construieste un exemplu similar si rezolva-l.", hint: "Pastreaza aceeasi regula." },
                ],
                source: "manual+curriculum",
            },
        };
    }

    if (input.mode === "practice") {
        return {
            lessonAssist: {
                mode: "practice",
                title: `Antrenament pe lectie - ${lessonTitle}`,
                explanation: `Iti dau exercitii scurte pe ${lessonTitle}, in linie cu ${manualRef}.`,
                steps: [
                    "Rezolva fiecare item pe caiet, apoi verifica metoda.",
                    "Foloseste hint-ul doar daca te blochezi.",
                    "Revino la regula din lectie daca faci o eroare.",
                ],
                checks: [
                    "Ai pastrat ordinea corecta a calculelor?",
                    "Rezultatul final este coerent cu enuntul?",
                ],
                miniPractice: [
                    { prompt: `Exercitiul 1 (${lessonTitle}): rezolva un item de baza.`, hint: "Porneste de la definitie." },
                    { prompt: `Exercitiul 2 (${lessonTitle}): rezolva un item mediu.`, hint: "Scrie toti pasii." },
                    { prompt: `Exercitiul 3 (${lessonTitle}): rezolva un item de consolidare.`, hint: "Verifica la final prin estimare." },
                ],
                source: "manual+curriculum",
            },
        };
    }

    if (input.mode === "qa") {
        const studentPrompt = String(input.prompt ?? "").trim();
        return {
            lessonAssist: {
                mode: "qa",
                title: `Raspuns la intrebare - ${lessonTitle}`,
                explanation: studentPrompt
                    ? `Intrebarea ta: "${studentPrompt}". Iti raspund pe baza lectiei ${lessonTitle}.`
                    : `Iti raspund punctual pe baza lectiei ${lessonTitle}.`,
                steps: [
                    "Clarific termenii din intrebare.",
                    "Leg explicatia de regula din lectie.",
                    "Arat un mini-exemplu de verificare.",
                ],
                checks: ["Doresti o varianta si mai simpla a explicatiei?"],
                miniPractice: [
                    { prompt: "Reformuleaza cu cuvintele tale regula invatata.", hint: "Foloseste 1-2 propozitii scurte." },
                ],
                source: "manual+curriculum",
            },
        };
    }

    return {
        lessonAssist: {
            mode: "explain",
            title: `Explicatie ghidata - ${lessonTitle}`,
            explanation: `Explic lectia ${lessonTitle} pentru ${curriculumContext.gradeLabel}, dupa ${manualRef}.`,
            steps: [
                "Definim clar notiunile principale.",
                "Conectam notiunile cu regula de calcul sau teorema folosita.",
                "Aplicam regula pe un exemplu scurt.",
                "Recapitulam greseala cea mai frecventa si cum o eviti.",
            ],
            checks: [
                "Care este regula-cheie a lectiei?",
                "Poti spune cand folosesti aceasta regula?",
            ],
            miniPractice: [
                { prompt: "Da un exemplu propriu care respecta regula lectiei.", hint: "Alege numere mici pentru inceput." },
            ],
            source: "manual+curriculum",
        },
    };
}

function buildAvatarMock(input: AvatarEditorRequest): AvatarEditorResponse {
    const pool = ["🧠", "🚀", "📘", "🧩", "✨", "🎯", "🛡️"];
    const emoji = pool[Math.floor(Math.random() * pool.length)];
    return {
        avatar: {
            emoji,
            frame: "circle",
            palette: {
                primary: "#4f46e5",
                secondary: "#06b6d4",
                accent: "#22c55e",
            },
            accessories: ["badge_mate", "spark"],
            tagline: `${input.studentName} invata cu incredere.`,
        },
        notes: ["Mock local activ pentru avatar AI."],
    };
}

function buildLearningPathPrompt(input: LearningPathRequest) {
    const curriculumContext = buildCurriculumContext({
        grade: input.grade,
        gradeBand: input.gradeBand,
        topic: input.topic,
        unitId: input.unitId,
    });
    return [
        systemJsonGuard(),
        "Genereaza un traseu de invatare pentru matematica.",
        ...curriculumPromptLines(curriculumContext),
        "Schema JSON obligatorie:",
        JSON.stringify(
            {
                recommended: { topic: "string", level: 1, title: "string" },
                levels: [
                    {
                        level: 1,
                        title: "string",
                        objectives: ["string"],
                        diagnostic: { items: ["string"] },
                    },
                ],
                notes: ["string"],
            },
            null,
            2,
        ),
        `Date intrare: ${JSON.stringify(input)}`,
        "Constrangeri: raspuns scurt, clar, maximum 5 niveluri daca maxLevels nu cere altfel.",
        "Nu include notiuni in afara continutului oficial pentru clasa selectata.",
    ].join("\n\n");
}

function buildExercisesPrompt(input: GenerateExercisesRequest) {
    const curriculumContext = buildCurriculumContext({
        grade: input.grade,
        topic: input.topic,
        unitId: input.unitId,
    });
    return [
        systemJsonGuard(),
        "Genereaza o sesiune de exercitii.",
        ...curriculumPromptLines(curriculumContext),
        "Schema JSON obligatorie:",
        JSON.stringify(
            {
                exerciseSet: {
                    id: "string",
                    title: "string",
                    grade: 5,
                    topic: "string",
                    difficulty: "usor|mediu|greu",
                    items: [
                        {
                            id: "string",
                            type: "mcq_single|fill_blank|true_false|problem",
                            prompt: "string",
                            options: ["string"],
                            answer: 1,
                            explanation: "string",
                            steps: ["string"],
                            hints: ["string"],
                        },
                    ],
                },
            },
            null,
            2,
        ),
        `Date intrare: ${JSON.stringify(input)}`,
        `Reguli: exact ${input.count} itemi, limba romana, text clar pentru elevi.`,
        "Nu genera itemi din alte clase sau din unitati diferite de unitatea selectata.",
    ].join("\n\n");
}

function buildSolvePrompt(input: SolveStepByStepRequest) {
    const curriculumContext = buildCurriculumContext({
        grade: input.grade,
        topic: input.topic,
        unitId: input.unitId,
    });
    return [
        systemJsonGuard(),
        "Rezolva problema pas cu pas pentru elev.",
        ...curriculumPromptLines(curriculumContext),
        "Schema JSON obligatorie:",
        JSON.stringify(
            {
                solution: {
                    finalAnswer: "string",
                    steps: [{ title: "Pas 1", math: "string", explain: "string" }],
                    commonMistakes: ["string"],
                    check: "string",
                },
            },
            null,
            2,
        ),
        `Date intrare: ${JSON.stringify(input)}`,
        "Stil: simplu, clar, fara jargon avansat.",
        "Daca problema depaseste programa clasei, explica limita si ofera varianta adaptata.",
    ].join("\n\n");
}

function buildTeachLessonPrompt(input: TeachLessonRequest) {
    const lessonTopic = String(input.topic ?? input.lessonTitle).trim() || "Matematica";
    const curriculumContext = buildCurriculumContext({
        grade: input.grade ?? null,
        gradeBand: input.gradeBand ?? null,
        topic: lessonTopic,
        unitId: input.unitId ?? null,
    });

    return [
        systemJsonGuard(),
        "Actioneaza ca profesor meditator de matematica pentru gimnaziu (Romania).",
        ...curriculumPromptLines(curriculumContext),
        `Lectia curenta: ${input.lessonTitle}.`,
        `Mod curent: ${input.mode}. Moduri permise: ${LessonTeachModeSchema.options.join(", ")}.`,
        input.prompt ? `Intrebarea elevului: ${input.prompt}` : "Nu exista intrebare libera; ofera ghidaj proactiv.",
        "Schema JSON obligatorie:",
        JSON.stringify(
            {
                lessonAssist: {
                    mode: "explain|example|practice|qa",
                    title: "string",
                    explanation: "string",
                    steps: ["string"],
                    checks: ["string"],
                    miniPractice: [{ prompt: "string", hint: "string" }],
                    source: "manual+curriculum",
                },
            },
            null,
            2,
        ),
        `Date intrare: ${JSON.stringify(input)}`,
        "Reguli de stil: limbaj simplu, clar, pedagogic, fara jargon inutil.",
        "Daca mode=practice, nu da solutia completa direct; ofera itemi de antrenament si hint-uri.",
        "Ramai strict in tema lectiei curente.",
    ].join("\n\n");
}

function buildAvatarPrompt(input: AvatarEditorRequest) {
    return [
        systemJsonGuard(),
        "Editeaza avatarul unui elev pentru aplicatie educationala.",
        "Schema JSON obligatorie:",
        JSON.stringify(
            {
                avatar: {
                    emoji: "string",
                    frame: "circle|hex|star|shield",
                    palette: {
                        primary: "#000000",
                        secondary: "#000000",
                        accent: "#000000",
                    },
                    accessories: ["string"],
                    tagline: "string",
                },
                notes: ["string"],
            },
            null,
            2,
        ),
        `Date elev: ${JSON.stringify(input)}`,
        "Reguli: paleta hex valida, mesaj pozitiv, fara limbaj ofensator.",
    ].join("\n\n");
}

async function generateOrMock<T>({
    prompt,
    outputSchema,
    mockFactory,
    modeLabel,
    env,
}: {
    prompt: string;
    outputSchema: ZodTypeAny;
    mockFactory: () => T;
    modeLabel: string;
    env: EnvConfig;
}): Promise<T> {
    let raw: unknown;
    const apiKey = env.GEMINI_API_KEY?.trim() || "";
    try {
        raw = apiKey ? await callGemini(prompt, env) : mockFactory();
    } catch (error) {
        if (!apiKey || shouldFallbackToMock(error)) {
            if (error instanceof Error) {
                console.warn(`[ai] fallback mock for ${modeLabel}: ${error.message}`);
            }
            raw = mockFactory();
        } else {
            throw error;
        }
    }

    const parsed = outputSchema.safeParse(raw);
    if (!parsed.success) {
        throw new ApiError(502, "AI_SCHEMA_INVALID", `Schema invalida pentru ${modeLabel}.`, {
            issues: toZodDetails(parsed.error),
            raw,
        });
    }
    return parsed.data as T;
}

function adjustExerciseCount(
    response: GenerateExercisesResponse,
    input: GenerateExercisesRequest,
): GenerateExercisesResponse {
    const target = input.count;
    const currentItems = Array.isArray(response.exerciseSet.items)
        ? [...response.exerciseSet.items]
        : [];

    while (currentItems.length < target) {
        const sample = currentItems[currentItems.length - 1] ?? {
            id: `ai-fallback-${currentItems.length + 1}`,
            type: "mcq_single",
            prompt: "Item de consolidare",
            options: ["1", "2", "3"],
            answer: 0,
            explanation: "Repeta regula de baza.",
            steps: ["Citeste cerinta.", "Calculeaza.", "Verifica."],
            hints: ["Incepe cu datele sigure."],
        };
        currentItems.push({
            ...sample,
            id: `${sample.id}-dup-${currentItems.length + 1}`,
        } as any);
    }

    return {
        exerciseSet: {
            ...response.exerciseSet,
            id: response.exerciseSet.id || `ai-set-${Math.random().toString(36).substring(2)}`,
            items: currentItems.slice(0, target) as any,
        }
    };
}

export async function handleLearningPath(
    reqBody: unknown,
    env: EnvConfig
): Promise<LearningPathResponse> {
    const input = parseWithSchema<LearningPathRequest>(
        LearningPathRequestSchema,
        reqBody,
        "learning-path request",
    );
    return generateOrMock<LearningPathResponse>({
        prompt: buildLearningPathPrompt(input),
        outputSchema: LearningPathResponseSchema,
        mockFactory: () => buildLearningPathMock(input),
        modeLabel: "learning-path",
        env
    });
}

export async function handleGenerateExercises(
    reqBody: unknown,
    env: EnvConfig
): Promise<GenerateExercisesResponse> {
    const input = parseWithSchema<GenerateExercisesRequest>(
        GenerateExercisesRequestSchema,
        reqBody,
        "generate-exercises request",
    );

    const rawResult = await generateOrMock<GenerateExercisesResponse>({
        prompt: buildExercisesPrompt(input),
        outputSchema: GenerateExercisesResponseSchema,
        mockFactory: () => buildExerciseMock(input),
        modeLabel: "generate-exercises",
        env
    });

    const adjusted = adjustExerciseCount(rawResult, input);
    return parseWithSchema<GenerateExercisesResponse>(
        GenerateExercisesResponseSchema,
        adjusted,
        "generate-exercises response",
    );
}

export async function handleSolveStepByStep(
    reqBody: unknown,
    env: EnvConfig
): Promise<SolveStepByStepResponse> {
    const input = parseWithSchema<SolveStepByStepRequest>(
        SolveStepByStepRequestSchema,
        reqBody,
        "solve-step-by-step request",
    );

    return generateOrMock<SolveStepByStepResponse>({
        prompt: buildSolvePrompt(input),
        outputSchema: SolveStepByStepResponseSchema,
        mockFactory: () => buildSolutionMock(input),
        modeLabel: "solve-step-by-step",
        env
    });
}

export async function handleTeachLesson(
    reqBody: unknown,
    env: EnvConfig
): Promise<TeachLessonResponse> {
    const input = parseWithSchema<TeachLessonRequest>(
        TeachLessonRequestSchema,
        reqBody,
        "teach-lesson request",
    );

    return generateOrMock<TeachLessonResponse>({
        prompt: buildTeachLessonPrompt(input),
        outputSchema: TeachLessonResponseSchema,
        mockFactory: () => buildTeachLessonMock(input),
        modeLabel: "teach-lesson",
        env
    });
}

export async function handleAvatarEditor(
    reqBody: unknown,
    env: EnvConfig
): Promise<AvatarEditorResponse> {
    const input = parseWithSchema<AvatarEditorRequest>(
        AvatarEditorRequestSchema,
        reqBody,
        "avatar-editor request",
    );

    return generateOrMock<AvatarEditorResponse>({
        prompt: buildAvatarPrompt(input),
        outputSchema: AvatarEditorResponseSchema,
        mockFactory: () => buildAvatarMock(input),
        modeLabel: "avatar-editor",
        env
    });
}

export { ApiError, toZodDetails };
