import { useEffect, useMemo, useState } from "react";
import { BookOpenCheck, Brain, Copy, ListChecks, Loader2, Sparkles } from "lucide-react";
import {
  generateExercises,
  learningPath,
  solveStepByStep,
  type GenerateExercisesResponse,
  type LearningPathResponse,
  type SolveStepByStepResponse,
} from "../../services/aiClient.ts";
import Button from "../../ui/Button.jsx";
import Card from "../../ui/Card.jsx";
import Modal from "../../ui/Modal.jsx";

type TabKey = "path" | "exercises" | "solve";

type AiState = {
  learningPath: LearningPathResponse | null;
  exerciseSet: GenerateExercisesResponse["exerciseSet"] | null;
  solution: SolveStepByStepResponse["solution"] | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  defaultTopic?: string;
  initialTab?: TabKey;
  aiState: AiState;
  onStateChange: (patch: Partial<AiState>) => void;
};

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function TabButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: typeof Sparkles;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "flex min-h-12 items-center justify-center gap-2 rounded-2xl px-3 py-3 text-sm font-black transition",
        active
          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200"
          : "bg-slate-100 text-slate-700 hover:bg-slate-200",
      )}
    >
      <Icon size={18} />
      {label}
    </button>
  );
}

function formatSolutionForClipboard(solution: SolveStepByStepResponse["solution"]) {
  const lines = [
    "Rezolvare pas cu pas",
    "",
    ...solution.steps.map((step) => `${step.title}: ${step.math}\n${step.explain}`),
    "",
    `Raspuns final: ${solution.finalAnswer}`,
    `Verificare: ${solution.check}`,
  ];
  if (solution.commonMistakes.length > 0) {
    lines.push("", "Greseli frecvente:");
    solution.commonMistakes.forEach((item) => lines.push(`- ${item}`));
  }
  return lines.join("\n");
}

export default function AIAssistantModal({
  open,
  onClose,
  defaultTopic = "Procente",
  initialTab = "path",
  aiState,
  onStateChange,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copyStatus, setCopyStatus] = useState("");

  const [pathTopic, setPathTopic] = useState(defaultTopic);
  const [pathCurrentLevel, setPathCurrentLevel] = useState<"unknown" | "low" | "medium" | "high">(
    "unknown",
  );

  const [exerciseTopic, setExerciseTopic] = useState(defaultTopic);
  const [exerciseGrade, setExerciseGrade] = useState(5);
  const [exerciseDifficulty, setExerciseDifficulty] = useState<"usor" | "mediu" | "greu">("mediu");

  const [solveTopic, setSolveTopic] = useState(defaultTopic);
  const [solveGrade, setSolveGrade] = useState(5);
  const [problemText, setProblemText] = useState("");

  const tabs = useMemo(
    () => [
      { key: "path" as const, label: "Traseu", icon: RouteIcon },
      { key: "exercises" as const, label: "Exercitii", icon: ListChecks },
      { key: "solve" as const, label: "Rezolva", icon: Brain },
    ],
    [],
  );

  useEffect(() => {
    setPathTopic((prev) => prev || defaultTopic);
    setExerciseTopic((prev) => prev || defaultTopic);
    setSolveTopic((prev) => prev || defaultTopic);
  }, [defaultTopic]);

  useEffect(() => {
    if (!open) return;
    setActiveTab(initialTab);
  }, [open, initialTab]);

  const runLearningPath = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await learningPath({
        gradeBand: "V-VII",
        topic: pathTopic.trim(),
        currentLevel: pathCurrentLevel,
        constraints: { maxLevels: 5, sessionMinutes: 10 },
      });
      onStateChange({ learningPath: result });
      setPathTopic(result.recommended.topic || pathTopic);
      setExerciseTopic(result.recommended.topic || exerciseTopic);
      setSolveTopic(result.recommended.topic || solveTopic);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nu am putut genera traseul.");
    } finally {
      setLoading(false);
    }
  };

  const runExercises = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await generateExercises({
        topic: exerciseTopic.trim(),
        grade: Number(exerciseGrade) || 5,
        difficulty: exerciseDifficulty,
        count: 10,
        types: ["mcq_single", "fill_blank", "true_false", "problem"],
      });
      onStateChange({ exerciseSet: result.exerciseSet });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nu am putut genera exercitiile.");
    } finally {
      setLoading(false);
    }
  };

  const runSolve = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await solveStepByStep({
        grade: Number(solveGrade) || 5,
        topic: solveTopic.trim(),
        problemText: problemText.trim(),
        outputStyle: "clear_student_ro",
      });
      onStateChange({ solution: result.solution });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nu am putut rezolva problema.");
    } finally {
      setLoading(false);
    }
  };

  const copySolution = async () => {
    if (!aiState.solution) return;
    try {
      await navigator.clipboard.writeText(formatSolutionForClipboard(aiState.solution));
      setCopyStatus("Copiat.");
      window.setTimeout(() => setCopyStatus(""), 1400);
    } catch {
      setCopyStatus("Nu s-a putut copia.");
      window.setTimeout(() => setCopyStatus(""), 1800);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Asistent AI"
      maxWidth="max-w-5xl"
      ariaLabel="Asistent AI"
    >
      <div className="grid gap-3 sm:grid-cols-3">
        {tabs.map((tab) => (
          <TabButton
            key={tab.key}
            active={activeTab === tab.key}
            icon={tab.icon}
            label={tab.label}
            onClick={() => setActiveTab(tab.key)}
          />
        ))}
      </div>

      {error ? (
        <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </div>
      ) : null}

      {activeTab === "path" ? (
        <div className="mt-4 grid gap-4 xl:grid-cols-[1.1fr_1.2fr]">
          <Card className="p-4">
            <p className="text-xs font-black uppercase tracking-wide text-indigo-600">
              Genereaza traseu
            </p>
            <div className="mt-3 space-y-3">
              <label className="block text-sm font-semibold text-slate-700">
                Subiect
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                  value={pathTopic}
                  onChange={(event) => setPathTopic(event.target.value)}
                  placeholder="Procente"
                />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Nivel curent
                <select
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                  value={pathCurrentLevel}
                  onChange={(event) =>
                    setPathCurrentLevel(
                      event.target.value as "unknown" | "low" | "medium" | "high",
                    )
                  }
                >
                  <option value="unknown">Necunoscut</option>
                  <option value="low">Scazut</option>
                  <option value="medium">Mediu</option>
                  <option value="high">Ridicat</option>
                </select>
              </label>
            </div>
            <Button
              className="mt-4 w-full"
              disabled={loading || pathTopic.trim().length < 2}
              onClick={runLearningPath}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <BookOpenCheck size={16} />}
              Genereaza traseu de invatare
            </Button>
          </Card>

          <Card className="p-4">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">Rezultat</p>
            {aiState.learningPath ? (
              <div className="mt-2 space-y-3">
                <div className="rounded-2xl bg-indigo-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                    Start recomandat
                  </p>
                  <p className="text-lg font-black text-indigo-900">
                    Nivel {aiState.learningPath.recommended.level}: {aiState.learningPath.recommended.title}
                  </p>
                </div>
                <div className="space-y-2">
                  {aiState.learningPath.levels.map((level) => (
                    <div key={`path-level-${level.level}`} className="rounded-2xl border border-slate-200 p-3">
                      <p className="text-sm font-black text-slate-800">
                        Nivel {level.level}: {level.title}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        Obiective: {level.objectives.join(" • ")}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-600">
                Completeaza formularul si apasa butonul de generare.
              </p>
            )}
          </Card>
        </div>
      ) : null}

      {activeTab === "exercises" ? (
        <div className="mt-4 grid gap-4 xl:grid-cols-[1.1fr_1.2fr]">
          <Card className="p-4">
            <p className="text-xs font-black uppercase tracking-wide text-indigo-600">
              Genereaza sesiune
            </p>
            <div className="mt-3 space-y-3">
              <label className="block text-sm font-semibold text-slate-700">
                Subiect
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                  value={exerciseTopic}
                  onChange={(event) => setExerciseTopic(event.target.value)}
                  placeholder="Procente"
                />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Clasa
                <input
                  type="number"
                  min={5}
                  max={7}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                  value={exerciseGrade}
                  onChange={(event) => setExerciseGrade(Number(event.target.value) || 5)}
                />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Dificultate
                <select
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                  value={exerciseDifficulty}
                  onChange={(event) =>
                    setExerciseDifficulty(event.target.value as "usor" | "mediu" | "greu")
                  }
                >
                  <option value="usor">Usor</option>
                  <option value="mediu">Mediu</option>
                  <option value="greu">Greu</option>
                </select>
              </label>
            </div>
            <Button
              className="mt-4 w-full"
              disabled={loading || exerciseTopic.trim().length < 2}
              onClick={runExercises}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <ListChecks size={16} />}
              Genereaza 10 exercitii
            </Button>
          </Card>

          <Card className="p-4">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">Rezultat</p>
            {aiState.exerciseSet ? (
              <div className="mt-2 space-y-3">
                <div className="rounded-2xl bg-emerald-50 p-3">
                  <p className="text-lg font-black text-emerald-900">{aiState.exerciseSet.title}</p>
                  <p className="text-sm font-semibold text-emerald-700">
                    {aiState.exerciseSet.topic} • clasa {aiState.exerciseSet.grade} •{" "}
                    {aiState.exerciseSet.items.length} itemi
                  </p>
                </div>
                <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                  {aiState.exerciseSet.items.map((item, index) => (
                    <div key={item.id} className="rounded-2xl border border-slate-200 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {index + 1}. {item.type}
                      </p>
                      <p className="text-sm font-bold text-slate-800">{item.prompt}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs font-semibold text-indigo-700">
                  Foloseste butonul „Incepe sesiunea recomandata” din Home pentru rulare cu scoring + XP.
                </p>
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-600">
                Sesiunea va aparea aici dupa generare.
              </p>
            )}
          </Card>
        </div>
      ) : null}

      {activeTab === "solve" ? (
        <div className="mt-4 grid gap-4 xl:grid-cols-[1.1fr_1.2fr]">
          <Card className="p-4">
            <p className="text-xs font-black uppercase tracking-wide text-indigo-600">
              Explica pas cu pas
            </p>
            <div className="mt-3 space-y-3">
              <label className="block text-sm font-semibold text-slate-700">
                Subiect
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                  value={solveTopic}
                  onChange={(event) => setSolveTopic(event.target.value)}
                  placeholder="Procente"
                />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Clasa
                <input
                  type="number"
                  min={5}
                  max={7}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                  value={solveGrade}
                  onChange={(event) => setSolveGrade(Number(event.target.value) || 5)}
                />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Problema
                <textarea
                  rows={5}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                  value={problemText}
                  onChange={(event) => setProblemText(event.target.value)}
                  placeholder="Scrie problema aici..."
                />
              </label>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <Button
                disabled={loading || problemText.trim().length < 6}
                onClick={runSolve}
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                Genereaza explicatia
              </Button>
              <Button
                variant="secondary"
                disabled={loading || problemText.trim().length < 6}
                onClick={runSolve}
              >
                Genereaza alta explicatie
              </Button>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-black uppercase tracking-wide text-slate-500">Rezultat</p>
              <Button
                variant="secondary"
                size="sm"
                disabled={!aiState.solution}
                onClick={copySolution}
              >
                <Copy size={14} />
                Copiaza
              </Button>
            </div>
            {copyStatus ? <p className="mt-1 text-xs font-semibold text-emerald-700">{copyStatus}</p> : null}
            {aiState.solution ? (
              <div className="mt-2 space-y-3">
                {aiState.solution.steps.map((step, index) => (
                  <div
                    key={`${step.title}-${index}`}
                    className="rounded-2xl border border-cyan-200 bg-cyan-50/60 p-3"
                  >
                    <p className="text-sm font-black text-cyan-900">{step.title}</p>
                    <p className="mt-1 font-mono text-sm text-cyan-900">{step.math}</p>
                    <p className="mt-1 text-sm font-semibold text-cyan-800">{step.explain}</p>
                  </div>
                ))}
                <div className="rounded-2xl bg-emerald-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                    Raspuns final
                  </p>
                  <p className="text-base font-black text-emerald-900">{aiState.solution.finalAnswer}</p>
                  <p className="mt-1 text-sm font-semibold text-emerald-800">{aiState.solution.check}</p>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-600">
                Solutia pas cu pas va aparea aici dupa generare.
              </p>
            )}
          </Card>
        </div>
      ) : null}
    </Modal>
  );
}

function RouteIcon(props: { size?: number }) {
  return <Sparkles {...props} />;
}
