import { ZodError } from "zod";
import type {
  AvatarEditorRequest,
  AvatarEditorResponse,
  GenerateExercisesRequest,
  GenerateExercisesResponse,
  LearningPathRequest,
  LearningPathResponse,
  SolveStepByStepRequest,
  SolveStepByStepResponse,
  TeachLessonRequest,
  TeachLessonResponse,
} from "../../shared/aiSchemas.ts";

function formatValidationError(error: unknown) {
  if (error instanceof ZodError) {
    return error.issues.map((issue) => issue.message).join(" | ");
  }
  if (error instanceof Error) return error.message;
  return "Eroare necunoscuta.";
}

async function apiCall<T>(endpoint: string, payload: unknown, errorPrefix: string): Promise<T> {
  try {
    const baseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, "") || "/Mate-remedial";
    const res = await fetch(`${baseUrl}/api/ai/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      throw new Error(errorData?.error?.message || `HTTP Error ${res.status}`);
    }

    return await res.json() as T;
  } catch (error) {
    throw new Error(`${errorPrefix}: ${formatValidationError(error)}`);
  }
}

export async function learningPath(
  payload: LearningPathRequest,
): Promise<LearningPathResponse> {
  return apiCall<LearningPathResponse>("learning-path", payload, "Learning Path invalid");
}

export async function generateExercises(
  payload: GenerateExercisesRequest,
): Promise<GenerateExercisesResponse> {
  return apiCall<GenerateExercisesResponse>("generate-exercises", payload, "Exercitii invalide");
}

export async function solveStepByStep(
  payload: SolveStepByStepRequest,
): Promise<SolveStepByStepResponse> {
  return apiCall<SolveStepByStepResponse>("solve-step-by-step", payload, "Solutie invalida");
}

export async function teachLesson(
  payload: TeachLessonRequest,
): Promise<TeachLessonResponse> {
  return apiCall<TeachLessonResponse>("teach-lesson", payload, "Asistent lectie invalid");
}

export async function editStudentAvatar(
  payload: AvatarEditorRequest,
): Promise<AvatarEditorResponse> {
  return apiCall<AvatarEditorResponse>("avatar-editor", payload, "Avatar AI invalid");
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
  TeachLessonRequest,
  TeachLessonResponse,
};
