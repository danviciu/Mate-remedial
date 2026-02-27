import { useMemo, useState } from "react";
import { motion as Motion } from "framer-motion";
import {
  Brain,
  BookOpen,
  ChevronDown,
  ChevronUp,
  FileText,
  FlaskConical,
  GraduationCap,
  Route,
  Settings2,
  ShieldCheck,
  Sparkles,
  Target,
  TestTubeDiagonal,
  Trophy,
  Upload,
  Zap,
} from "lucide-react";
import MotionPage from "../components/ui/MotionPage.jsx";
import { CONTENT_SOURCE_STATS } from "../content/index.js";
import { useSettings } from "../context/AppSettingsContext.jsx";
import { MODULES, getModuleById, normalizeLevelId } from "../data/modulesConfig.js";
import { staggerContainer, staggerItem } from "../animation/motion.js";
import AIAssistantModal from "../components/ai/AIAssistantModal.tsx";
import { shouldReduceMotion } from "../lib/motion.js";
import { getLessonIdForLevel, MODULE_DEFAULT_LESSON } from "../lessons/lessonsData.js";
import { getLastPlayedEntry, getModuleCompletion, loadClassProgress } from "../utils/progressStore.js";
import { useProgress } from "../utils/useProgress.js";
import Badge from "../ui/Badge.jsx";
import Button from "../ui/Button.jsx";
import Card from "../ui/Card.jsx";
import Progress from "../ui/Progress.jsx";
import SectionTitle from "../ui/SectionTitle.jsx";
import AppLogo from "../ui/AppLogo.jsx";

const PRIMARY_ACTIONS = [
  {
    id: "diagnostic",
    title: "Diagnostic rapid",
    subtitle: "Aflam nivelul curent in 2-3 minute.",
    route: "diagnostic",
    icon: TestTubeDiagonal,
    tone: "from-indigo-500 to-violet-500",
  },
  {
    id: "paths",
    title: "Trasee de invatare",
    subtitle: "Exercitii clare, pas cu pas.",
    route: "paths",
    icon: Route,
    tone: "from-emerald-500 to-teal-500",
  },
];

const QUICK_TOOLS = [
  { id: "lessons", title: "Lectii animate", route: "lessons", icon: BookOpen },
  { id: "simulators", title: "Simulari interactive", route: "simulators", icon: FlaskConical },
  { id: "team", title: "Joc pe echipe", route: "team", icon: Target },
  { id: "reports", title: "Rapoarte", route: "reports", icon: FileText },
];

const ADMIN_TOOLS = [
  { id: "teacher", title: "Mod profesor", route: "teacher", icon: GraduationCap },
  { id: "admin", title: "Panou administrator", route: "admin", icon: Upload },
  { id: "settings", title: "Setari", route: "settings", icon: Settings2 },
  ...(import.meta.env.DEV
    ? [{ id: "qa", title: "Content QA", route: "qa", icon: ShieldCheck }]
    : []),
];

const AI_HOME_TABS = [
  { id: "path", title: "Traseu AI", icon: Sparkles },
  { id: "exercises", title: "Exercitii AI", icon: Zap },
  { id: "solve", title: "Rezolva", icon: Brain },
];

function getLevelText(score) {
  if (typeof score !== "number") return "Incepe cu Diagnostic pentru recomandare precisa.";
  if (score <= 3) return "Recomandare: consolidare de baza.";
  if (score <= 7) return "Recomandare: nivel mediu ghidat.";
  return "Recomandare: nivel avansat.";
}

function inferRecommendedModules(progress) {
  const diagnostic = progress?.diagnostic;
  const fromDiagnostic = Array.isArray(diagnostic?.recommendedModuleIds)
    ? diagnostic.recommendedModuleIds
    : [];
  if (fromDiagnostic.length > 0) return fromDiagnostic;

  const weakAreas = Array.isArray(diagnostic?.weakAreas) ? diagnostic.weakAreas : [];
  const mapped = weakAreas.filter((area) => MODULES.some((module) => module.id === area));
  return mapped.length > 0 ? mapped : ["fractions", "percents"];
}

function pickNextModule(progress) {
  const candidates = inferRecommendedModules(progress);
  const ranked = candidates
    .map((moduleId) => ({ moduleId, completion: getModuleCompletion(progress, moduleId) }))
    .sort((a, b) => a.completion - b.completion);
  return ranked[0]?.moduleId ?? MODULES[0].id;
}

function pickNextLevelId(progress, moduleId) {
  const module = MODULES.find((item) => item.id === moduleId);
  if (!module || module.levels.length === 0) return "1";
  const levelsProgress = progress?.modules?.[moduleId]?.levels ?? {};
  const nextLevel = module.levels.find((level) => {
    const key = normalizeLevelId(level.id ?? level.level);
    const stats = levelsProgress[key];
    if (!stats) return true;
    const completed = Number(stats.completedCount ?? 0);
    const total = Number(stats.totalCount ?? 0);
    return total <= 0 || completed < total;
  });
  return String(nextLevel?.id ?? nextLevel?.level ?? module.levels[0]?.id ?? "1");
}

function mapTopicToModuleId(topic) {
  const normalized = String(topic ?? "").trim().toLowerCase();
  if (!normalized) return null;
  if (normalized.includes("procent")) return "percents";
  if (normalized.includes("fract")) return "fractions";
  if (normalized.includes("ecuat")) return "equations";
  if (normalized.includes("intreg")) return "integers";
  return null;
}

function normalizeAiLevelId(module, aiLevel) {
  if (!module) return null;
  const wanted = String(aiLevel ?? "").trim();
  if (!wanted) return null;
  const found = module.levels.find(
    (level) => normalizeLevelId(level.id ?? level.level) === normalizeLevelId(wanted),
  );
  return found ? String(found.id ?? found.level) : null;
}

function getLeaderboardRows() {
  const list = loadClassProgress();
  if (!Array.isArray(list) || list.length === 0) return [];
  return list
    .map((item) => ({
      name: item?.student?.name || "Elev",
      score: typeof item?.diagnostic?.score === "number" ? item.diagnostic.score : 0,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

function ActionCard({ action, onGo }) {
  const Icon = action.icon;
  return (
    <Card
      as="button"
      type="button"
      interactive
      onClick={() => onGo(action.route)}
      className={`w-full bg-gradient-to-br ${action.tone} p-5 text-left text-white`}
    >
      <div className="mb-3 inline-flex rounded-2xl bg-white/20 p-2">
        <Icon size={22} />
      </div>
      <h2 className="font-display text-2xl font-black">{action.title}</h2>
      <p className="mt-1 text-sm text-white/90">{action.subtitle}</p>
    </Card>
  );
}

function ToolGrid({ items, onGo }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((action) => {
        const Icon = action.icon;
        return (
          <Card
            key={action.id}
            as="button"
            type="button"
            interactive
            onClick={() => onGo(action.route)}
            className="w-full p-4 text-left"
          >
            <div className="mb-2 inline-flex rounded-xl bg-slate-100 p-2 text-slate-700">
              <Icon size={17} />
            </div>
            <p className="text-base font-black text-slate-800">{action.title}</p>
          </Card>
        );
      })}
    </div>
  );
}

export default function Home({ onGo, aiState, onAiStateChange }) {
  const progress = useProgress();
  const { settings } = useSettings();
  const reducedMotion = shouldReduceMotion();
  const [showDetails, setShowDetails] = useState(false);
  const [showAiAssistant, setShowAiAssistant] = useState(false);
  const [aiInitialTab, setAiInitialTab] = useState("path");
  const [showAiLevels, setShowAiLevels] = useState(false);

  const diagnosticScore = progress?.diagnostic?.score;
  const scoreLabel = typeof diagnosticScore === "number" ? `${diagnosticScore}/10` : "Nesustinut";
  const levelText = getLevelText(diagnosticScore);

  const aiRecommended = aiState?.learningPath?.recommended ?? null;
  const aiModuleId = mapTopicToModuleId(aiRecommended?.topic);
  const fallbackModuleId = pickNextModule(progress);
  const selectedModuleId = aiModuleId ?? fallbackModuleId;
  const nextModule = getModuleById(selectedModuleId);

  const aiLevelId = normalizeAiLevelId(nextModule, aiRecommended?.level);
  const recommendedLevelId =
    aiLevelId ?? pickNextLevelId(progress, nextModule?.id ?? MODULES[0].id);
  const recommendedLevel =
    nextModule?.levels?.find(
      (level) => normalizeLevelId(level.id ?? level.level) === normalizeLevelId(recommendedLevelId),
    ) ?? null;

  const hasCustomContent = CONTENT_SOURCE_STATS.hasCustom;
  const hasAiLevels = Array.isArray(aiState?.learningPath?.levels) && aiState.learningPath.levels.length > 0;
  const hasAiExerciseSet = Array.isArray(aiState?.exerciseSet?.items) && aiState.exerciseSet.items.length > 0;
  const hasAiSolution = Array.isArray(aiState?.solution?.steps) && aiState.solution.steps.length > 0;

  const moduleCompletions = useMemo(
    () =>
      MODULES.map((module) => ({
        id: module.id,
        title: module.title,
        completion: getModuleCompletion(progress, module.id),
      })),
    [progress],
  );

  const history = Array.isArray(progress?.history) ? progress.history : [];
  const baseXp = history.reduce(
    (sum, entry) => sum + Math.max(0, (entry?.scoreStepCorrect ?? 0) * 12 - (entry?.hintsUsed ?? 0) * 2),
    0,
  );
  const aiXp = Math.max(0, Number(aiState?.xpBonus ?? 0));
  const xp = baseXp + aiXp;

  const leaderboardRows = useMemo(() => getLeaderboardRows(), []);
  const lastEntry = getLastPlayedEntry(progress);
  const lastModule = lastEntry ? getModuleById(lastEntry.moduleId) : null;
  const lastLevel =
    lastModule?.levels.find(
      (level) => normalizeLevelId(level.id ?? level.level) === normalizeLevelId(lastEntry?.levelId),
    ) ?? null;

  const startRecommendedSession = () => {
    if (hasAiExerciseSet) {
      onGo("/ai-session");
      return;
    }

    const moduleId = nextModule?.id ?? "fractions";
    const levelId = recommendedLevelId;
    const lessonId = getLessonIdForLevel(moduleId, levelId) ?? MODULE_DEFAULT_LESSON[moduleId];
    onGo({
      path: "/lessons",
      state: {
        moduleId,
        lessonId,
        afterCompletePath: "/paths",
        afterCompleteState: {
          moduleId,
          levelId,
          autoStart: true,
          sessionMode: true,
        },
      },
    });
  };

  const openAiAssistant = (tab = "path") => {
    setAiInitialTab(tab);
    setShowAiAssistant(true);
  };

  const defaultAiTopic = aiRecommended?.topic ?? nextModule?.title ?? "Procente";

  return (
    <MotionPage className="relative min-h-screen overflow-hidden p-4 sm:p-6">
      <div className="home-orb home-orb-a" />
      <div className="home-orb home-orb-b" />
      <div className="home-orb home-orb-c" />

      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-5">
        <Card className="animated-gradient-card border-indigo-200/70 bg-gradient-to-r from-indigo-100/95 via-cyan-100/95 to-emerald-100/95 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge variant="indigo">Clasele V-VII</Badge>
                {hasCustomContent ? <Badge variant="emerald">Continut personalizat activ</Badge> : null}
                {settings.superSimpleMode ? <Badge variant="amber">Mod super simplu</Badge> : null}
              </div>
              <div className="mb-2 flex items-center gap-3">
                <AppLogo size="lg" />
                <h1 className="font-display text-4xl font-black text-indigo-900 sm:text-5xl">Mate Reset</h1>
              </div>
              <p className="mt-2 max-w-xl text-base text-slate-700">
                Invatare clara, pas cu pas. Fara aglomerare de informatii.
              </p>
            </div>
            <Motion.button
              type="button"
              onClick={() => openAiAssistant("path")}
              className="rounded-3xl border border-indigo-200 bg-white/90 p-4 text-left text-indigo-700 shadow-lg transition hover:bg-white"
              animate={reducedMotion ? undefined : { y: [0, -8, 0], rotate: [0, 2, -2, 0] }}
              transition={reducedMotion ? undefined : { duration: 3.8, repeat: Infinity }}
            >
              <div className="flex items-center gap-2">
                <Sparkles size={24} />
                <span className="rounded-full bg-indigo-100 px-2 py-1 text-sm font-black text-indigo-700">
                  ✨ AI
                </span>
              </div>
              <p className="mt-2 text-sm font-semibold text-indigo-700">Deschide Asistent AI</p>
            </Motion.button>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl bg-white/85 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Scor diagnostic</p>
              <p className="text-xl font-black text-indigo-800">{scoreLabel}</p>
            </div>
            <div className="rounded-2xl bg-white/85 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">XP total</p>
              <p className="text-xl font-black text-emerald-700">{xp}</p>
              {aiXp > 0 ? (
                <p className="text-xs font-semibold text-emerald-700">Include +{aiXp} XP din sesiuni AI</p>
              ) : null}
            </div>
            <div className="rounded-2xl bg-white/85 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recomandare</p>
              <p className="text-xl font-black text-rose-700">
                {aiRecommended?.title ?? nextModule?.title ?? "Fractii"}
              </p>
            </div>
          </div>

          <div className="mt-3 rounded-2xl bg-white/80 px-4 py-3">
            <p className="text-sm font-semibold text-slate-700">{levelText}</p>
          </div>
        </Card>

        <Card className="border-indigo-100 bg-white/85 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-black text-indigo-900">Asistent AI rapid</p>
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
              Tab nou pe Home: Rezolva
            </p>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {AI_HOME_TABS.map((tab) => {
              const Icon = tab.icon;
              const isSolve = tab.id === "solve";
              return (
                <button
                  key={`ai-home-tab-${tab.id}`}
                  type="button"
                  onClick={() => openAiAssistant(tab.id)}
                  className={`flex min-h-12 items-center justify-center gap-2 rounded-2xl px-3 py-3 text-sm font-black transition ${
                    isSolve
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  <Icon size={18} />
                  {tab.title}
                </button>
              );
            })}
          </div>
        </Card>

        <Card className="flex flex-wrap items-center justify-between gap-3 border-indigo-100 bg-indigo-50/70 p-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
              Start recomandat
            </p>
            <p className="text-lg font-black text-indigo-900">
              {nextModule?.title ?? "Fractii"} -{" "}
              {aiRecommended?.title ?? recommendedLevel?.title ?? `Nivel ${recommendedLevelId}`}
            </p>
            <p className="text-sm font-semibold text-indigo-700">
              {hasAiExerciseSet
                ? "Sesiune AI pregatita: incepe direct cele 10 itemi."
                : "Flux ghidat pentru remediere, cu un singur click."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="primary"
              onClick={startRecommendedSession}
            >
              {hasAiExerciseSet ? "Incepe sesiunea AI recomandata" : "Incepe sesiunea recomandata"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                if (hasAiLevels) {
                  setShowAiLevels((prev) => !prev);
                  return;
                }
                onGo({
                  path: "/paths",
                  state: { moduleId: nextModule?.id ?? "fractions", autoStart: false },
                });
              }}
            >
              {hasAiLevels ? "Vezi nivelurile AI" : "Vezi nivelurile"}
            </Button>
          </div>
        </Card>

        {showAiLevels && hasAiLevels ? (
          <Card className="border-cyan-100 bg-cyan-50/60 p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-base font-black text-cyan-900">Trasee de invatare generate de AI</p>
              <Button variant="ghost" size="sm" onClick={() => setShowAiLevels(false)}>
                Ascunde
              </Button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {aiState.learningPath.levels.map((level) => (
                <div key={`ai-level-${level.level}`} className="rounded-2xl border border-cyan-200 bg-white p-3">
                  <p className="text-sm font-black text-cyan-900">
                    Nivel {level.level}: {level.title}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-cyan-700">
                    {level.objectives.join(" • ")}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        ) : null}

        {hasAiSolution ? (
          <Card className="border-emerald-100 bg-emerald-50/70 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-base font-black text-emerald-900">Explicatie AI pas cu pas</p>
              <Button variant="secondary" size="sm" onClick={() => openAiAssistant("solve")}>
                Genereaza alta explicatie
              </Button>
            </div>
            <div className="mt-3 grid gap-2 lg:grid-cols-3">
              {aiState.solution.steps.map((step, index) => (
                <div key={`sol-step-${index}`} className="rounded-2xl border border-emerald-200 bg-white p-3">
                  <p className="text-sm font-black text-emerald-900">{step.title}</p>
                  <p className="mt-1 font-mono text-sm text-emerald-800">{step.math}</p>
                  <p className="mt-1 text-sm font-semibold text-emerald-700">{step.explain}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-sm font-black text-emerald-800">
              Raspuns final: {aiState.solution.finalAnswer}
            </p>
          </Card>
        ) : null}

        <section>
          <SectionTitle title="Ce faci acum" subtitle="Alege una dintre cele doua actiuni principale." icon={Route} />
          <Motion.div
            className="mt-3 grid gap-4 lg:grid-cols-2"
            variants={staggerContainer}
            initial={reducedMotion ? false : "hidden"}
            animate="show"
          >
            {PRIMARY_ACTIONS.map((action) => (
              <Motion.div key={action.id} variants={staggerItem}>
                <ActionCard action={action} onGo={onGo} />
              </Motion.div>
            ))}
          </Motion.div>
        </section>

        <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <p className="text-sm font-semibold text-slate-500">Continua de unde ai ramas</p>
            <p className="text-lg font-black text-indigo-800">
              {lastModule && lastLevel ? `${lastModule.title} - ${lastLevel.level}` : "Incepe un nivel nou"}
            </p>
          </div>
          <Button variant="primary" size="lg" onClick={() => onGo("paths")}>
            Mergi la trasee
          </Button>
        </Card>

        <section>
          <SectionTitle title="Instrumente utile" subtitle="Acces rapid la lectii si simulare." />
          <div className="mt-3">
            <ToolGrid items={QUICK_TOOLS} onGo={onGo} />
          </div>
        </section>

        <Card className="p-4">
          <button
            type="button"
            onClick={() => setShowDetails((prev) => !prev)}
            className="flex w-full items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-left"
          >
            <span className="text-sm font-bold text-slate-700">Detalii progres si administrare</span>
            {showDetails ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>

          {showDetails ? (
            <div className="mt-4 grid gap-4 xl:grid-cols-[2fr_1fr]">
              <div className="rounded-2xl border border-slate-100 bg-white p-4">
                <p className="text-sm font-black text-slate-800">Progres pe module</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {moduleCompletions.map((module) => (
                    <div key={module.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-sm font-bold text-slate-700">{module.title}</p>
                        <p className="text-sm font-black text-indigo-700">{module.completion}%</p>
                      </div>
                      <Progress value={module.completion} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-white p-4">
                <p className="text-sm font-black text-slate-800">Leaderboard</p>
                <div className="mt-3 space-y-2">
                  {leaderboardRows.length > 0 ? (
                    leaderboardRows.map((row, index) => (
                      <div key={`${row.name}-${index}`} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                        <p className="text-sm font-semibold text-slate-700">{index + 1}. {row.name}</p>
                        <Badge variant={index === 0 ? "emerald" : "slate"}>{row.score}/10</Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-600">Nu exista scoruri de clasa inca.</p>
                  )}
                </div>
              </div>

              <div className="xl:col-span-2">
                <ToolGrid items={ADMIN_TOOLS} onGo={onGo} />
              </div>
            </div>
          ) : null}
        </Card>
      </div>

      <AIAssistantModal
        open={showAiAssistant}
        onClose={() => setShowAiAssistant(false)}
        defaultTopic={defaultAiTopic}
        initialTab={aiInitialTab}
        aiState={{
          learningPath: aiState?.learningPath ?? null,
          exerciseSet: aiState?.exerciseSet ?? null,
          solution: aiState?.solution ?? null,
        }}
        onStateChange={(patch) => onAiStateChange?.(patch)}
      />
    </MotionPage>
  );
}
