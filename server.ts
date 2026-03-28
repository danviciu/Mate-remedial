import { serve } from "@hono/node-server";
import { config } from "dotenv";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { fileURLToPath } from "node:url";
import {
  CURRICULUM_SOURCE,
  getGradeCurriculum,
  getGradesList,
} from "./src/data/curriculumDb.js";
import {
  MANUALS_SOURCE,
  getManualByGrade,
} from "./src/data/manualsDb.js";
import {
  handleLearningPath,
  handleGenerateExercises,
  handleSolveStepByStep,
  handleTeachLesson,
  handleAvatarEditor,
  ApiError,
  toZodDetails,
  type EnvConfig
} from "./src/services/ai.ts";
import { ZodError } from "zod";

type Bindings = {
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use('*', cors());

app.get("/api/curriculum", (c) => {
  return c.json({
    source: CURRICULUM_SOURCE,
    grades: getGradesList(),
  });
});

app.get("/api/curriculum/:grade", (c) => {
  const grade = Number(c.req.param("grade"));
  const data = getGradeCurriculum(grade);
  if (!data) {
    return c.json({ error: "Clasa invalida. Sunt disponibile clasele 5-8." }, 400);
  }
  return c.json({
    source: CURRICULUM_SOURCE,
    grade: data,
  });
});

app.get("/api/manuals", (c) => {
  return c.json({
    source: MANUALS_SOURCE,
    grades: getGradesList().map((gradeMeta) => {
      const manual = getManualByGrade(gradeMeta.grade);
      return {
        grade: gradeMeta.grade,
        gradeLabel: gradeMeta.gradeLabel,
        available: Boolean(manual),
        title: manual?.title ?? null,
        year: manual?.year ?? null,
        unitCount: manual?.unitCount ?? 0,
        lessonCount: manual?.lessonCount ?? 0,
      };
    }),
  });
});

app.get("/api/manuals/:grade", (c) => {
  const grade = Number(c.req.param("grade"));
  const manual = getManualByGrade(grade);
  if (!manual) {
    return c.json({ error: "Manual indisponibil pentru clasa ceruta. Sunt disponibile clasele 5-8." }, 400);
  }
  return c.json({
    source: MANUALS_SOURCE,
    manual,
  });
});

function getEnv(c: any): EnvConfig {
  if (typeof process !== "undefined" && process.env) {
    return {
      GEMINI_API_KEY: process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || c.env?.GEMINI_API_KEY,
      GEMINI_MODEL: process.env.GEMINI_MODEL || c.env?.GEMINI_MODEL,
    };
  }
  return {
    GEMINI_API_KEY: c.env?.GEMINI_API_KEY || c.env?.VITE_GEMINI_API_KEY,
    GEMINI_MODEL: c.env?.GEMINI_MODEL,
  };
}

app.get("/api/health", (c) => {
  const env = getEnv(c);
  return c.json({
    ok: true,
    service: "mate-reset-ai-server",
    keyConfigured: Boolean(env.GEMINI_API_KEY),
    model: env.GEMINI_MODEL || "default",
  });
});

app.post("/api/ai/learning-path", async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const data = await handleLearningPath(body, getEnv(c));
    return c.json(data);
  } catch (error) {
    return handleError(c, error);
  }
});

app.post("/api/ai/lesson-suggestions", async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const data = await handleLearningPath(body, getEnv(c));
    return c.json(data);
  } catch (error) {
    return handleError(c, error);
  }
});

app.post("/api/ai/generate-exercises", async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const data = await handleGenerateExercises(body, getEnv(c));
    return c.json(data);
  } catch (error) {
    return handleError(c, error);
  }
});

app.post("/api/ai/solve-step-by-step", async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const data = await handleSolveStepByStep(body, getEnv(c));
    return c.json(data);
  } catch (error) {
    return handleError(c, error);
  }
});

app.post("/api/ai/teach-lesson", async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const data = await handleTeachLesson(body, getEnv(c));
    return c.json(data);
  } catch (error) {
    return handleError(c, error);
  }
});

app.post("/api/ai/avatar-editor", async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const data = await handleAvatarEditor(body, getEnv(c));
    return c.json(data);
  } catch (error) {
    return handleError(c, error);
  }
});

function handleError(c: any, error: unknown) {
  if (error instanceof ApiError) {
    return c.json({
      error: {
        code: error.code,
        message: error.message,
        details: error.details ?? null,
      },
    }, error.status as any);
  }

  if (error instanceof ZodError) {
    return c.json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Payload invalid.",
        details: toZodDetails(error),
      },
    }, 400);
  }

  const message = error instanceof Error ? error.message : "Eroare necunoscuta";
  console.error("AI Server Error:", error);
  return c.json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message,
    },
  }, 500);
}

function shouldStartLocalServer() {
  if (typeof process === "undefined") return false;
  if (!Array.isArray(process.argv) || process.argv.length < 2) return false;
  try {
    return fileURLToPath(import.meta.url) === process.argv[1];
  } catch {
    return false;
  }
}

function startLocalServer() {
  config({ path: ".env.local" });
  config();

  const rawPort = Number(process.env.AI_SERVER_PORT ?? 8787);
  const port = Number.isFinite(rawPort) && rawPort > 0 ? rawPort : 8787;
  console.log(`[mate-reset-ai] Hono local server started on http://localhost:${port}`);

  serve({
    fetch: app.fetch,
    port,
  });
}

if (shouldStartLocalServer()) {
  startLocalServer();
}

export default app;
