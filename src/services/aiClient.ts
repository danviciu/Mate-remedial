import { ZodError, type ZodSchema } from "zod";
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
} from "../../shared/aiSchemas.ts";

async function readJsonSafe(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function isLikelyApiOffline(response: Response, rawBody: unknown) {
  return response.status === 500 && rawBody == null;
}

async function postJsonValidated<TRequest, TResponse>(
  path: string,
  payload: TRequest,
  requestSchema: ZodSchema<TRequest>,
  responseSchema: ZodSchema<TResponse>,
): Promise<TResponse> {
  const safePayload = requestSchema.parse(payload);

  let response: Response;
  try {
    response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safePayload),
    });
  } catch (error) {
    throw new Error(
      `Nu ma pot conecta la serverul AI pentru ${path}. Porneste API-ul cu \`npm run server\` sau \`npm run dev\`.`,
    );
  }

  const raw = await readJsonSafe(response);
  if (!response.ok) {
    if (isLikelyApiOffline(response, raw)) {
      throw new Error(
        `Serverul AI nu raspunde pentru ${path}. Porneste API-ul cu \`npm run server\` sau \`npm run dev\`.`,
      );
    }
    const message =
      raw?.error?.message ??
      `Cererea catre ${path} a esuat cu status ${response.status}.`;
    throw new Error(message);
  }

  return responseSchema.parse(raw);
}

function formatValidationError(error: unknown) {
  if (error instanceof ZodError) {
    return error.issues.map((issue) => issue.message).join(" | ");
  }
  if (error instanceof Error) return error.message;
  return "Eroare necunoscuta.";
}

export async function learningPath(
  payload: LearningPathRequest,
): Promise<LearningPathResponse> {
  try {
    return await postJsonValidated(
      "/api/ai/learning-path",
      payload,
      LearningPathRequestSchema,
      LearningPathResponseSchema,
    );
  } catch (error) {
    throw new Error(`Learning Path invalid: ${formatValidationError(error)}`);
  }
}

export async function generateExercises(
  payload: GenerateExercisesRequest,
): Promise<GenerateExercisesResponse> {
  try {
    return await postJsonValidated(
      "/api/ai/generate-exercises",
      payload,
      GenerateExercisesRequestSchema,
      GenerateExercisesResponseSchema,
    );
  } catch (error) {
    throw new Error(`Exercitii invalide: ${formatValidationError(error)}`);
  }
}

export async function solveStepByStep(
  payload: SolveStepByStepRequest,
): Promise<SolveStepByStepResponse> {
  try {
    return await postJsonValidated(
      "/api/ai/solve-step-by-step",
      payload,
      SolveStepByStepRequestSchema,
      SolveStepByStepResponseSchema,
    );
  } catch (error) {
    throw new Error(`Solutie invalida: ${formatValidationError(error)}`);
  }
}

export async function editStudentAvatar(
  payload: AvatarEditorRequest,
): Promise<AvatarEditorResponse> {
  try {
    return await postJsonValidated(
      "/api/ai/avatar-editor",
      payload,
      AvatarEditorRequestSchema,
      AvatarEditorResponseSchema,
    );
  } catch (error) {
    throw new Error(`Avatar AI invalid: ${formatValidationError(error)}`);
  }
}

export type {
  AvatarEditorRequest,
  AvatarEditorResponse,
  LearningPathRequest,
  LearningPathResponse,
  GenerateExercisesRequest,
  GenerateExercisesResponse,
  SolveStepByStepRequest,
  SolveStepByStepResponse,
};
