import { randomUUID } from "node:crypto";
import express from "express";
import dotenv from "dotenv";
import { ZodError, type ZodTypeAny } from "zod";
import {
  AvatarEditorRequestSchema,
  AvatarEditorResponseSchema,
  GenerateExercisesRequestSchema,
  GenerateExercisesResponseSchema,
  LearningPathRequestSchema,
  LearningPathResponseSchema,
  SolveStepByStepRequestSchema,
  SolveStepByStepResponseSchema,
  type AvatarEditorRequest,
  type AvatarEditorResponse,
  type GenerateExercisesRequest,
  type GenerateExercisesResponse,
  type LearningPathRequest,
  type LearningPathResponse,
  type SolveStepByStepRequest,
  type SolveStepByStepResponse,
} from "./shared/aiSchemas.ts";

dotenv.config({ path: ".env.local" });
dotenv.config();

const app = express();
app.use(express.json({ limit: "1mb" }));

const SERVER_PORT = Number(process.env.AI_SERVER_PORT ?? 8787);
const CONFIGURED_GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || null;
const DEFAULT_MODEL_CANDIDATES = [
  CONFIGURED_GEMINI_MODEL,
  "gemini-2.5-flash",
  "gemini-1.5-flash-latest",
  "gemini-1.5-pro-latest",
].filter(Boolean) as string[];
let ACTIVE_GEMINI_MODEL = DEFAULT_MODEL_CANDIDATES[0] ?? "gemini-2.5-flash";
const GEMINI_API_KEY =
  process.env.GEMINI_API_KEY ??
  process.env.GOOGLE_API_KEY ??
  process.env.GOOGLE_GENERATIVE_AI_API_KEY ??
  "";

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
    "Raspunsul trebuie sa fie util pentru elevi clasele V-VII si in romana.",
  ].join(" ");
}

async function callGemini(prompt: string): Promise<unknown> {
  if (!GEMINI_API_KEY) {
    throw new ApiError(
      503,
      "AI_KEY_MISSING",
      "Lipseste GEMINI_API_KEY in .env.local pe server.",
    );
  }

  const orderedCandidates = [
    ACTIVE_GEMINI_MODEL,
    ...DEFAULT_MODEL_CANDIDATES.filter((model) => model !== ACTIVE_GEMINI_MODEL),
  ];

  const attempted: string[] = [];
  let lastErrorDetails: unknown = null;

  for (const model of orderedCandidates) {
    attempted.push(model);
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;
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
      lastErrorDetails = { status: response.status, body: text.slice(0, 800), model };
      continue;
    }

    if (!response.ok) {
      const text = await response.text();
      throw new ApiError(502, "AI_UPSTREAM_ERROR", "Eroare upstream Gemini.", {
        status: response.status,
        body: text.slice(0, 800),
        model,
      });
    }

    const payload = await response.json();
    const text = payload?.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part?.text ?? "")
      .join("\n")
      .trim();

    if (!text) {
      throw new ApiError(502, "AI_EMPTY_RESPONSE", "Modelul nu a returnat continut.");
    }

    ACTIVE_GEMINI_MODEL = model;
    return safeJsonParse(text);
  }

  throw new ApiError(
    502,
    "AI_MODEL_UNAVAILABLE",
    "Nu am gasit un model Gemini disponibil. Seteaza GEMINI_MODEL in .env.local.",
    { attempted, lastErrorDetails },
  );
}

function topicFromInput(topic: string) {
  const normalized = String(topic ?? "").toLowerCase();
  if (normalized.includes("procent")) return "Procente";
  if (normalized.includes("fract")) return "Fractii";
  if (normalized.includes("ecuat")) return "Ecuatii";
  if (normalized.includes("intreg")) return "Numere intregi";
  return String(topic ?? "Matematica");
}

function buildLearningPathMock(input: LearningPathRequest): LearningPathResponse {
  const maxLevels = Math.max(1, Math.min(5, Number(input.constraints?.maxLevels ?? 5)));
  const safeTopic = topicFromInput(input.topic);
  const baseTitles = [
    "Procentul din 100",
    "Reduceri si cresteri procentuale",
    "Procente aplicate in probleme",
    "Compara procente in situatii reale",
    "Consolidare rapida pe procente",
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
    ],
  };
}

function buildExerciseMock(input: GenerateExercisesRequest): GenerateExercisesResponse {
  const count = Math.max(1, Math.min(20, Number(input.count ?? 10)));
  const safeTopic = topicFromInput(input.topic);
  const types = input.types.length ? input.types : ["mcq_single"];

  const items = Array.from({ length: count }).map((_, index) => {
    const type = types[index % types.length];
    if (type === "true_false") {
      const truthy = index % 2 === 0;
      return {
        id: `ai-${index + 1}`,
        type,
        prompt: `${safeTopic}: afirmatia ${index + 1} este corecta?`,
        options: ["Adevarat", "Fals"],
        answer: truthy ? 0 : 1,
        explanation: "Verifica datele din enunt si formula de baza.",
        steps: ["Citeste enuntul.", "Aplica regula potrivita.", "Alege varianta corecta."],
        hints: ["Porneste de la definitie.", "Verifica daca rezultatul e logic."],
      };
    }

    if (type === "fill_blank") {
      return {
        id: `ai-${index + 1}`,
        type,
        prompt: `${safeTopic}: completeaza raspunsul pentru itemul ${index + 1}.`,
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
        prompt: `${safeTopic}: problema aplicata ${index + 1}.`,
        options: [],
        answer: String((index + 3) * 5),
        explanation: "Identifica procentul, apoi calculeaza valoarea ceruta.",
        steps: [
          "Stabileste ce reprezinta 100%.",
          "Transforma procentul in fractie/zecimal.",
          "Calculeaza rezultatul final.",
        ],
        hints: ["Foloseste regula de trei simpla.", "Scrie toate etapele pe rand."],
      };
    }

    return {
      id: `ai-${index + 1}`,
      type: "mcq_single",
      prompt: `${safeTopic}: item grila ${index + 1}.`,
      options: ["12", "15", "18", "20"],
      answer: 1,
      explanation: "Compara fiecare varianta cu datele problemei.",
      steps: ["Alege metoda de calcul.", "Calculeaza.", "Verifica varianta corecta."],
      hints: ["Elimina variantele imposibile.", "Recalculeaza daca ai dubii."],
    };
  });

  return {
    exerciseSet: {
      id: `ai-set-${randomUUID()}`,
      title: `${safeTopic} - sesiune`,
      grade: input.grade,
      topic: safeTopic,
      difficulty: input.difficulty,
      items,
    },
  };
}

function buildSolutionMock(input: SolveStepByStepRequest): SolveStepByStepResponse {
  const safeTopic = topicFromInput(input.topic);
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
  return [
    systemJsonGuard(),
    "Genereaza un traseu de invatare pentru matematica.",
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
  ].join("\n\n");
}

function buildExercisesPrompt(input: GenerateExercisesRequest) {
  return [
    systemJsonGuard(),
    "Genereaza o sesiune de exercitii.",
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
  ].join("\n\n");
}

function buildSolvePrompt(input: SolveStepByStepRequest) {
  return [
    systemJsonGuard(),
    "Rezolva problema pas cu pas pentru elev.",
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
}: {
  prompt: string;
  outputSchema: ZodTypeAny;
  mockFactory: () => T;
  modeLabel: string;
}): Promise<T> {
  let raw: unknown;
  try {
    raw = GEMINI_API_KEY ? await callGemini(prompt) : mockFactory();
  } catch (error) {
    if (error instanceof ApiError && !GEMINI_API_KEY) {
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
    });
  }

  return {
    exerciseSet: {
      ...response.exerciseSet,
      id: response.exerciseSet.id || `ai-set-${randomUUID()}`,
      items: currentItems.slice(0, target),
    },
  };
}

async function handleLearningPath(
  reqBody: unknown,
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
  });
}

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "mate-reset-ai-server",
    port: SERVER_PORT,
    model: ACTIVE_GEMINI_MODEL,
    configuredModel: CONFIGURED_GEMINI_MODEL,
    keyConfigured: Boolean(GEMINI_API_KEY),
  });
});

app.post("/api/ai/learning-path", async (req, res, next) => {
  try {
    const data = await handleLearningPath(req.body);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

app.post("/api/ai/lesson-suggestions", async (req, res, next) => {
  try {
    const data = await handleLearningPath(req.body);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

app.post("/api/ai/generate-exercises", async (req, res, next) => {
  try {
    const input = parseWithSchema<GenerateExercisesRequest>(
      GenerateExercisesRequestSchema,
      req.body,
      "generate-exercises request",
    );

    const rawResult = await generateOrMock<GenerateExercisesResponse>({
      prompt: buildExercisesPrompt(input),
      outputSchema: GenerateExercisesResponseSchema,
      mockFactory: () => buildExerciseMock(input),
      modeLabel: "generate-exercises",
    });

    const adjusted = adjustExerciseCount(rawResult, input);
    const finalResult = parseWithSchema<GenerateExercisesResponse>(
      GenerateExercisesResponseSchema,
      adjusted,
      "generate-exercises response",
    );
    res.json(finalResult);
  } catch (error) {
    next(error);
  }
});

app.post("/api/ai/solve-step-by-step", async (req, res, next) => {
  try {
    const input = parseWithSchema<SolveStepByStepRequest>(
      SolveStepByStepRequestSchema,
      req.body,
      "solve-step-by-step request",
    );

    const result = await generateOrMock<SolveStepByStepResponse>({
      prompt: buildSolvePrompt(input),
      outputSchema: SolveStepByStepResponseSchema,
      mockFactory: () => buildSolutionMock(input),
      modeLabel: "solve-step-by-step",
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.post("/api/ai/avatar-editor", async (req, res, next) => {
  try {
    const input = parseWithSchema<AvatarEditorRequest>(
      AvatarEditorRequestSchema,
      req.body,
      "avatar-editor request",
    );

    const result = await generateOrMock<AvatarEditorResponse>({
      prompt: buildAvatarPrompt(input),
      outputSchema: AvatarEditorResponseSchema,
      mockFactory: () => buildAvatarMock(input),
      modeLabel: "avatar-editor",
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof ApiError) {
    res.status(error.status).json({
      error: {
        code: error.code,
        message: error.message,
        details: error.details ?? null,
      },
    });
    return;
  }

  if (error instanceof ZodError) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Payload invalid.",
        details: toZodDetails(error),
      },
    });
    return;
  }

  const message = error instanceof Error ? error.message : "Eroare necunoscuta";
  res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message,
    },
  });
});

app.listen(SERVER_PORT, () => {
  const keyStatus = GEMINI_API_KEY ? "configured" : "missing (mock mode)";
  console.log(`[mate-reset-ai] running on http://localhost:${SERVER_PORT} | model=${ACTIVE_GEMINI_MODEL} | key=${keyStatus}`);
});
