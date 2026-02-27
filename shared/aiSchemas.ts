import { z } from "zod";

export const CurrentLevelSchema = z.enum(["unknown", "low", "medium", "high"]);
export const DifficultySchema = z.enum(["usor", "mediu", "greu"]);
export const ExerciseTypeSchema = z.enum([
  "mcq_single",
  "fill_blank",
  "true_false",
  "problem",
]);

const DiagnosticItemSchema = z.union([
  z.string(),
  z
    .object({
      prompt: z.string().min(1),
      answer: z.string().min(1).optional(),
      options: z.array(z.string().min(1)).optional(),
    })
    .passthrough(),
]);

export const LearningPathRequestSchema = z.object({
  gradeBand: z.string().min(1).default("V-VII"),
  topic: z.string().min(1),
  currentLevel: CurrentLevelSchema.default("unknown"),
  constraints: z
    .object({
      maxLevels: z.number().int().min(1).max(8).default(5),
      sessionMinutes: z.number().int().min(5).max(60).default(10),
    })
    .default({ maxLevels: 5, sessionMinutes: 10 }),
});

export const LearningPathResponseSchema = z.object({
  recommended: z.object({
    topic: z.string().min(1),
    level: z.number().int().min(1).max(10),
    title: z.string().min(1),
  }),
  levels: z
    .array(
      z.object({
        level: z.number().int().min(1).max(10),
        title: z.string().min(1),
        objectives: z.array(z.string().min(1)).min(1),
        diagnostic: z.object({
          items: z.array(DiagnosticItemSchema).min(1),
        }),
      }),
    )
    .min(1),
  notes: z.array(z.string().min(1)).default([]),
});

export const GenerateExercisesRequestSchema = z.object({
  topic: z.string().min(1),
  grade: z.number().int().min(1).max(12),
  difficulty: DifficultySchema.default("mediu"),
  count: z.number().int().min(1).max(20).default(10),
  types: z.array(ExerciseTypeSchema).min(1),
});

export const ExerciseItemSchema = z.object({
  id: z.string().min(1),
  type: ExerciseTypeSchema,
  prompt: z.string().min(1),
  options: z.array(z.string().min(1)).default([]),
  answer: z.union([z.number().int(), z.string(), z.boolean()]),
  explanation: z.string().default(""),
  steps: z.array(z.string()).default([]),
  hints: z.array(z.string()).default([]),
});

export const GenerateExercisesResponseSchema = z.object({
  exerciseSet: z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    grade: z.number().int().min(1).max(12),
    topic: z.string().min(1),
    difficulty: DifficultySchema,
    items: z.array(ExerciseItemSchema).min(1),
  }),
});

export const SolveStepByStepRequestSchema = z.object({
  grade: z.number().int().min(1).max(12),
  topic: z.string().min(1),
  problemText: z.string().min(3),
  outputStyle: z.string().default("clear_student_ro"),
});

export const SolveStepByStepResponseSchema = z.object({
  solution: z.object({
    finalAnswer: z.string().min(1),
    steps: z
      .array(
        z.object({
          title: z.string().min(1),
          math: z.string().min(1),
          explain: z.string().min(1),
        }),
      )
      .min(1),
    commonMistakes: z.array(z.string()).default([]),
    check: z.string().min(1),
  }),
});

const HexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export const AvatarEditorRequestSchema = z.object({
  studentName: z.string().min(1),
  grade: z.string().min(1),
  personality: z.string().default("curios si perseverent"),
  stylePrompt: z.string().default("friendly edu hero"),
  currentAvatar: z
    .object({
      emoji: z.string().default("🙂"),
      frame: z.string().default("circle"),
      palette: z
        .object({
          primary: HexColorSchema.default("#4f46e5"),
          secondary: HexColorSchema.default("#0ea5e9"),
          accent: HexColorSchema.default("#22c55e"),
        })
        .default({
          primary: "#4f46e5",
          secondary: "#0ea5e9",
          accent: "#22c55e",
        }),
      accessories: z.array(z.string()).default([]),
      tagline: z.string().default("Invat in fiecare zi."),
    })
    .partial()
    .optional(),
});

export const AvatarEditorResponseSchema = z.object({
  avatar: z.object({
    emoji: z.string().min(1),
    frame: z.enum(["circle", "hex", "star", "shield"]).default("circle"),
    palette: z.object({
      primary: HexColorSchema,
      secondary: HexColorSchema,
      accent: HexColorSchema,
    }),
    accessories: z.array(z.string()).default([]),
    tagline: z.string().min(1),
  }),
  notes: z.array(z.string()).default([]),
});

export type LearningPathRequest = z.infer<typeof LearningPathRequestSchema>;
export type LearningPathResponse = z.infer<typeof LearningPathResponseSchema>;
export type GenerateExercisesRequest = z.infer<typeof GenerateExercisesRequestSchema>;
export type GenerateExercisesResponse = z.infer<typeof GenerateExercisesResponseSchema>;
export type SolveStepByStepRequest = z.infer<typeof SolveStepByStepRequestSchema>;
export type SolveStepByStepResponse = z.infer<typeof SolveStepByStepResponseSchema>;
export type AvatarEditorRequest = z.infer<typeof AvatarEditorRequestSchema>;
export type AvatarEditorResponse = z.infer<typeof AvatarEditorResponseSchema>;
