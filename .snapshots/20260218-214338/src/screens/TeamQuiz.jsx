import { useEffect, useMemo, useRef, useState } from "react";
import { motion as Motion } from "framer-motion";
import FractionVisual from "../components/FractionVisual.jsx";
import PercentBarVisual from "../components/PercentBarVisual.jsx";
import NumberLineVisual from "../components/NumberLineVisual.jsx";
import BalanceVisual from "../components/BalanceVisual.jsx";
import VisualRenderer from "../components/visuals/VisualRenderer.jsx";
import MotionPage from "../components/ui/MotionPage.jsx";
import FeedbackPulse from "../components/ui/FeedbackPulse.jsx";
import { MODULES } from "../data/modulesConfig.js";
import { TEAM_QUIZ_QUESTIONS } from "../data/teamQuizQuestions.js";
import { burstConfetti } from "../lib/confetti.js";
import { shouldReduceMotion, springFast } from "../lib/motion.js";

const SETTINGS_STORAGE_KEY = "mateResetTeamQuizSettings";
const LAST_GAME_STORAGE_KEY = "mateResetTeamQuizLastSummary";
const PHASES = { setup: "setup", teamSetup: "teamSetup", question: "question", feedback: "feedback", end: "end" };
const TIMER_OPTIONS = [0, 10, 15, 20, 30];
const AUTO_DELAY_OPTIONS = [900, 1100, 1400];
const QUIZ_MODULE_IDS = ["fractions", "percents", "integers", "equations"];
const NORMAL_CORRECT_POINTS = 2;
const STEAL_CORRECT_POINTS = 1;
const TEAM_ACCENTS = [
  { base: "border-blue-300 bg-blue-700", chip: "bg-blue-100 text-blue-900", ring: "ring-blue-300" },
  { base: "border-emerald-300 bg-emerald-700", chip: "bg-emerald-100 text-emerald-900", ring: "ring-emerald-300" },
  { base: "border-amber-300 bg-amber-600", chip: "bg-amber-100 text-amber-900", ring: "ring-amber-300" },
  { base: "border-fuchsia-300 bg-fuchsia-700", chip: "bg-fuchsia-100 text-fuchsia-900", ring: "ring-fuchsia-300" },
];
const DEFAULT_SETTINGS = {
  autoAdvanceDelayMs: 1100,
  timerSeconds: 0,
  animations: true,
  sounds: false,
  powerUps: false,
  spiceMode: "normal",
  stealMode: "off",
};

const shuffle = (items) => {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
};

const normalizeSettings = (raw) => ({
  autoAdvanceDelayMs: AUTO_DELAY_OPTIONS.includes(Number(raw?.autoAdvanceDelayMs))
    ? Number(raw?.autoAdvanceDelayMs)
    : DEFAULT_SETTINGS.autoAdvanceDelayMs,
  timerSeconds: TIMER_OPTIONS.includes(Number(raw?.timerSeconds))
    ? Number(raw?.timerSeconds)
    : DEFAULT_SETTINGS.timerSeconds,
  animations: Boolean(raw?.animations),
  sounds: Boolean(raw?.sounds),
  powerUps: Boolean(raw?.powerUps),
  spiceMode: raw?.spiceMode === "mixed" ? "mixed" : "normal",
  stealMode: raw?.stealMode === "on" ? "on" : "off",
});

const loadSettings = () => {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const stored = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    return stored ? normalizeSettings(JSON.parse(stored)) : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
};

const saveSettings = (settings) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
};

const createTeams = (count, powerUps) =>
  Array.from({ length: count }, (_, idx) => ({
    id: idx + 1,
    name: `Echipa ${idx + 1}`,
    score: 0,
    streak: 0,
    pendingPlusTwo: false,
    powerUps: powerUps ? { fiftyFifty: 1, plusTwo: 1, freeze: 1 } : { fiftyFifty: 0, plusTwo: 0, freeze: 0 },
  }));

const accentByIndex = (idx) => TEAM_ACCENTS[idx % TEAM_ACCENTS.length];

const buildQuestionQueue = ({ moduleId, difficulty, roundsTotal, teamCount, spiceMode }) => {
  const totalTurns = roundsTotal * teamCount;
  const pool = TEAM_QUIZ_QUESTIONS.filter((q) => q.module === moduleId);
  if (!pool.length) return [];
  let ordered = spiceMode === "mixed"
    ? [...shuffle(pool.filter((q) => q.difficulty === "easy")), ...shuffle(pool.filter((q) => q.difficulty === "medium"))]
    : shuffle(pool.filter((q) => q.difficulty === difficulty));
  if (!ordered.length) ordered = shuffle(pool);

  const queue = [];
  let cursor = 0;
  while (queue.length < totalTurns) {
    const source = ordered[cursor % ordered.length];
    const prev = queue[queue.length - 1];
    if (!prev || prev.id !== source.id || ordered.length === 1) {
      queue.push({ ...source, gameQuestionId: `${source.id}-${queue.length}` });
    }
    cursor += 1;
    if (cursor > totalTurns * 6) break;
  }
  while (queue.length < totalTurns) {
    const source = ordered[queue.length % ordered.length];
    queue.push({ ...source, gameQuestionId: `${source.id}-repeat-${queue.length}` });
  }
  return queue;
};

const renderQuestionVisual = (question) => {
  if (!question) return null;
  if (question.visualSpec) {
    return (
      <VisualRenderer
        spec={question.visualSpec}
        modalTitle="Vizual intrebare"
        withModal
      />
    );
  }
  const data = question.visualData ?? {};
  if (question.visualType === "fractionBar") return <FractionVisual totalParts={data.totalParts} takenParts={data.takenParts} />;
  if (question.visualType === "percentBar") return <PercentBarVisual percent={data.percent} blocks={data.blocks ?? 10} />;
  if (question.visualType === "numberLine") return <NumberLineVisual min={data.min} max={data.max} points={Array.isArray(data.points) ? data.points : []} />;
  if (question.visualType === "balance") return <BalanceVisual left={data.left ?? ""} right={data.right ?? ""} />;
  return null;
};

const winnerLabel = (teams) => {
  if (!teams.length) return "-";
  const best = Math.max(...teams.map((t) => t.score));
  const winners = teams.filter((t) => t.score === best);
  return winners.length === 1 ? `${winners[0].name} (${best} p)` : `${winners.map((t) => t.name).join(", ")} (${best} p, egalitate)`;
};

const downloadJson = (value) => {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `team-quiz-auto-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

function TqButton({ disabled, children, ...props }) {
  const reduced = shouldReduceMotion();
  return (
    <Motion.button
      disabled={disabled}
      whileHover={!reduced && !disabled ? { y: -2, scale: 1.01 } : undefined}
      whileTap={!reduced && !disabled ? { scale: 0.98 } : undefined}
      transition={springFast}
      {...props}
    >
      {children}
    </Motion.button>
  );
}

function CountdownRing({ totalSeconds, remainingSeconds, paused, motionEnabled }) {
  const safeTotal = Math.max(1, totalSeconds);
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(1, remainingSeconds / safeTotal));
  const urgent = remainingSeconds <= 3 && !paused;
  return (
    <Motion.div
      className="relative h-24 w-24"
      animate={motionEnabled && urgent ? { scale: [1, 1.05, 1] } : { scale: 1 }}
      transition={motionEnabled && urgent ? { duration: 0.9, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 }}
    >
      <svg className="h-24 w-24 -rotate-90" viewBox="0 0 128 128" aria-hidden="true">
        <circle cx="64" cy="64" r={radius} strokeWidth="10" className="fill-none stroke-indigo-100" />
        <circle cx="64" cy="64" r={radius} strokeWidth="10" strokeLinecap="round" className={`fill-none ${urgent ? "stroke-rose-500" : "stroke-indigo-600"}`} style={{ strokeDasharray: circumference, strokeDashoffset: circumference * (1 - progress) }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-3xl font-black text-indigo-900">{remainingSeconds}</p>
        <p className="text-[10px] font-bold uppercase text-indigo-700">{paused ? "Pauza" : "Sec"}</p>
      </div>
    </Motion.div>
  );
}

export default function TeamQuiz({ goHome }) {
  const reducedMotion = shouldReduceMotion();
  const moduleOptions = useMemo(() => MODULES.filter((m) => QUIZ_MODULE_IDS.includes(m.id)), []);

  const [moduleId, setModuleId] = useState(moduleOptions[0]?.id ?? "fractions");
  const [difficulty, setDifficulty] = useState("easy");
  const [teamCount, setTeamCount] = useState(2);
  const [roundsTotal, setRoundsTotal] = useState(5);
  const [settings, setSettings] = useState(() => loadSettings());

  const [phase, setPhase] = useState(PHASES.setup);
  const [teams, setTeams] = useState(() => createTeams(2, false));
  const [activeTeamIndex, setActiveTeamIndex] = useState(0);
  const [roundIndex, setRoundIndex] = useState(1);
  const [questionQueue, setQuestionQueue] = useState([]);
  const [questionPointer, setQuestionPointer] = useState(0);
  const [question, setQuestion] = useState(null);

  const [selectedIndex, setSelectedIndex] = useState(null);
  const [isCorrect, setIsCorrect] = useState(null);
  const [lockAnswers, setLockAnswers] = useState(false);
  const [stealActive, setStealActive] = useState(false);
  const [stealTeamIndex, setStealTeamIndex] = useState(null);
  const [removedChoiceIndexes, setRemovedChoiceIndexes] = useState([]);

  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackPoints, setFeedbackPoints] = useState(0);
  const [feedbackTeamIndex, setFeedbackTeamIndex] = useState(null);
  const [nextTurnText, setNextTurnText] = useState("");
  const [roundNotice, setRoundNotice] = useState("");
  const [setupError, setSetupError] = useState("");
  const [history, setHistory] = useState([]);

  const [timeLeft, setTimeLeft] = useState(0);
  const [timerPaused, setTimerPaused] = useState(false);
  const [freezeSeconds, setFreezeSeconds] = useState(0);

  const audioRefs = useRef({});
  const autoAdvanceRef = useRef(null);
  const summarySavedRef = useRef(false);
  const playSoundRef = useRef(() => {});
  const onTimeExpiredRef = useRef(() => {});

  const allowAnimations = settings.animations && !reducedMotion;
  const timerEnabled = settings.timerSeconds > 0;
  const totalQuestions = roundsTotal * teams.length;
  const questionNumber = (roundIndex - 1) * teams.length + activeTeamIndex + 1;
  const respondingTeamIndex = stealActive ? stealTeamIndex : activeTeamIndex;
  const respondingTeam = typeof respondingTeamIndex === "number" ? teams[respondingTeamIndex] : null;
  const turnBadgeText = stealActive ? `FURT: ${respondingTeam?.name ?? "Echipa"}` : `Randul: ${teams[activeTeamIndex]?.name ?? "Echipa"}`;

  useEffect(() => saveSettings(settings), [settings]);
  useEffect(() => () => autoAdvanceRef.current && window.clearTimeout(autoAdvanceRef.current), []);

  useEffect(() => {
    const mk = (src) => {
      try {
        const audio = new Audio(src);
        audio.preload = "auto";
        return audio;
      } catch {
        return null;
      }
    };
    audioRefs.current = { correct: mk("/sfx/correct.wav"), wrong: mk("/sfx/wrong.wav"), tick: mk("/sfx/tick.wav") };
    return () => Object.values(audioRefs.current).forEach((a) => a?.pause());
  }, []);

  const clearAutoAdvance = () => {
    if (!autoAdvanceRef.current) return;
    window.clearTimeout(autoAdvanceRef.current);
    autoAdvanceRef.current = null;
  };

  const playSound = (name) => {
    if (!settings.sounds) return;
    const audio = audioRefs.current[name];
    if (!audio) return;
    try {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    } catch {
      // ignore play errors
    }
  };
  useEffect(() => {
    playSoundRef.current = playSound;
  });

  const triggerConfetti = (durationMs) => allowAnimations && burstConfetti({ durationMs, particleCount: durationMs > 1500 ? 90 : 56 });

  const nextTurnMeta = (fromTeam = activeTeamIndex, fromRound = roundIndex) => {
    const nextActive = (fromTeam + 1) % teams.length;
    const nextRound = nextActive === 0 ? fromRound + 1 : fromRound;
    return { nextActive, nextRound, completed: nextRound > roundsTotal, nextName: teams[nextActive]?.name ?? `Echipa ${nextActive + 1}` };
  };

  const setTurn = (teamIdx, turnRound, pointer) => {
    const nextQuestion = questionQueue[pointer] ?? null;
    if (!nextQuestion || turnRound > roundsTotal) {
      setPhase(PHASES.end);
      setQuestion(null);
      setLockAnswers(true);
      triggerConfetti(1800);
      return;
    }
    clearAutoAdvance();
    setPhase(PHASES.question);
    setActiveTeamIndex(teamIdx);
    setRoundIndex(turnRound);
    setQuestionPointer(pointer);
    setQuestion(nextQuestion);
    setSelectedIndex(null);
    setIsCorrect(null);
    setLockAnswers(false);
    setStealActive(false);
    setStealTeamIndex(null);
    setRemovedChoiceIndexes([]);
    setFeedbackText("");
    setFeedbackPoints(0);
    setFeedbackTeamIndex(null);
    setNextTurnText("");
    setRoundNotice(`Randul: ${teams[teamIdx]?.name ?? `Echipa ${teamIdx + 1}`}`);
    setTimeLeft(settings.timerSeconds);
    setTimerPaused(false);
    setFreezeSeconds(0);
  };

  const startSetup = () => {
    clearAutoAdvance();
    setPhase(PHASES.setup);
    setQuestion(null);
    setSelectedIndex(null);
    setIsCorrect(null);
    setLockAnswers(false);
    setStealActive(false);
    setStealTeamIndex(null);
    setRemovedChoiceIndexes([]);
    setFeedbackText("");
    setFeedbackPoints(0);
    setFeedbackTeamIndex(null);
    setNextTurnText("");
    setRoundNotice("");
    setTimeLeft(0);
    setTimerPaused(false);
    setFreezeSeconds(0);
    setHistory([]);
    setSetupError("");
    summarySavedRef.current = false;
  };

  const startGame = () => {
    const queue = buildQuestionQueue({ moduleId, difficulty, roundsTotal, teamCount, spiceMode: settings.spiceMode });
    if (!queue.length) {
      setSetupError("Nu exista intrebari pentru setarile alese.");
      return;
    }
    setTeams(createTeams(teamCount, settings.powerUps));
    setQuestionQueue(queue);
    setActiveTeamIndex(0);
    setRoundIndex(1);
    setQuestionPointer(0);
    setHistory([]);
    setSetupError("");
    setPhase(PHASES.teamSetup);
    setTimeLeft(settings.timerSeconds);
    setTimerPaused(false);
    setFreezeSeconds(0);
    summarySavedRef.current = false;
  };

  const goNextTurn = () => {
    const { nextActive, nextRound, completed } = nextTurnMeta();
    if (completed) {
      setPhase(PHASES.end);
      setQuestion(null);
      setLockAnswers(true);
      triggerConfetti(2000);
      return;
    }
    setTurn(nextActive, nextRound, questionPointer + 1);
  };
  const pushHistory = (entry) => setHistory((prev) => [...prev, { timestampISO: new Date().toISOString(), questionId: question?.id, roundIndex, questionNumber, ...entry }]);

  const applyAttemptScore = (correct, targetTeamIndex) => {
    let pointsAwarded = 0;
    setTeams((prev) => prev.map((team, idx) => {
      if (idx !== targetTeamIndex) return team;
      if (!correct) return { ...team, streak: 0, pendingPlusTwo: false };
      const base = stealActive ? STEAL_CORRECT_POINTS : NORMAL_CORRECT_POINTS;
      const streak = team.streak + 1;
      const streakBonus = streak === 2 ? 1 : streak >= 3 ? 2 : 0;
      const plusBonus = team.pendingPlusTwo ? 2 : 0;
      pointsAwarded = base + streakBonus + plusBonus;
      return { ...team, score: team.score + pointsAwarded, streak, pendingPlusTwo: false };
    }));
    return pointsAwarded;
  };

  const enterSteal = (reason) => {
    const nextStealTeam = (activeTeamIndex + 1) % teams.length;
    setStealActive(true);
    setStealTeamIndex(nextStealTeam);
    setSelectedIndex(null);
    setIsCorrect(null);
    setLockAnswers(false);
    setRemovedChoiceIndexes([]);
    setFeedbackText("");
    setFeedbackPoints(0);
    setFeedbackTeamIndex(null);
    setNextTurnText("");
    setPhase(PHASES.question);
    setRoundNotice(`${reason} FURT: ${teams[nextStealTeam]?.name ?? "Echipa urmatoare"} raspunde acum.`);
    setTimeLeft(settings.timerSeconds);
    setTimerPaused(false);
    setFreezeSeconds(0);
  };

  const finishAttempt = ({ correct, targetTeamIndex, pointsAwarded, reason }) => {
    setPhase(PHASES.feedback);
    setFeedbackTeamIndex(targetTeamIndex);
    setFeedbackPoints(pointsAwarded);
    setFeedbackText(correct ? `Corect! +${pointsAwarded}` : "Gresit.");
    setRoundNotice(correct
      ? `${teams[targetTeamIndex]?.name ?? "Echipa"} a punctat.`
      : `${reason} Raspuns corect: ${String.fromCharCode(65 + (question?.correctIndex ?? 0))}. ${question?.choices?.[question?.correctIndex] ?? ""}`);
    const { nextName } = nextTurnMeta();
    setNextTurnText(`Urmeaza: ${nextName}`);
    clearAutoAdvance();
    autoAdvanceRef.current = window.setTimeout(goNextTurn, settings.autoAdvanceDelayMs);
  };

  const onSelectAnswer = (optionIndex) => {
    if (phase !== PHASES.question || lockAnswers || !question || removedChoiceIndexes.includes(optionIndex)) return;
    const targetTeamIndex = stealActive ? stealTeamIndex : activeTeamIndex;
    const correct = optionIndex === question.correctIndex;
    setSelectedIndex(optionIndex);
    setLockAnswers(true);
    setIsCorrect(correct);
    playSound(correct ? "correct" : "wrong");
    if (correct) triggerConfetti(650);
    const points = applyAttemptScore(correct, targetTeamIndex);
    pushHistory({ teamIndex: targetTeamIndex, teamName: teams[targetTeamIndex]?.name ?? "", isCorrect: correct, points, mode: stealActive ? "steal" : "normal", reason: correct ? "Raspuns corect" : "Raspuns gresit" });
    if (!correct && settings.stealMode === "on" && !stealActive) {
      enterSteal("Gresit.");
      return;
    }
    finishAttempt({ correct, targetTeamIndex, pointsAwarded: points, reason: "Gresit." });
  };

  const onTimeExpired = () => {
    if (phase !== PHASES.question || lockAnswers || !question) return;
    const targetTeamIndex = stealActive ? stealTeamIndex : activeTeamIndex;
    setSelectedIndex(null);
    setIsCorrect(false);
    setLockAnswers(true);
    playSound("wrong");
    applyAttemptScore(false, targetTeamIndex);
    pushHistory({ teamIndex: targetTeamIndex, teamName: teams[targetTeamIndex]?.name ?? "", isCorrect: false, points: 0, mode: stealActive ? "steal" : "normal", reason: "Timp expirat" });
    if (settings.stealMode === "on" && !stealActive) {
      enterSteal("Timp expirat.");
      return;
    }
    finishAttempt({ correct: false, targetTeamIndex, pointsAwarded: 0, reason: "Timp expirat." });
  };
  useEffect(() => {
    onTimeExpiredRef.current = onTimeExpired;
  });

  const applyPowerUp = (type, teamIndex) => {
    if (!settings.powerUps || phase !== PHASES.question || lockAnswers || !question || teamIndex !== respondingTeamIndex) return;
    const team = teams[teamIndex];
    if (!team) return;

    if (type === "fiftyFifty") {
      if (team.powerUps.fiftyFifty <= 0) return;
      const candidates = question.choices.map((_, idx) => idx).filter((idx) => idx !== question.correctIndex && !removedChoiceIndexes.includes(idx));
      if (candidates.length < 2) return;
      const toRemove = shuffle(candidates).slice(0, 2);
      setRemovedChoiceIndexes((prev) => [...new Set([...prev, ...toRemove])]);
      setTeams((prev) => prev.map((item, idx) => idx === teamIndex ? { ...item, powerUps: { ...item.powerUps, fiftyFifty: item.powerUps.fiftyFifty - 1 } } : item));
      setRoundNotice(`${team.name} activeaza 50/50.`);
      return;
    }

    if (type === "plusTwo") {
      if (team.powerUps.plusTwo <= 0 || team.pendingPlusTwo) return;
      setTeams((prev) => prev.map((item, idx) => idx === teamIndex ? { ...item, pendingPlusTwo: true, powerUps: { ...item.powerUps, plusTwo: item.powerUps.plusTwo - 1 } } : item));
      setRoundNotice(`${team.name} activeaza +2 pentru acest raspuns.`);
      return;
    }

    if (type === "freeze") {
      if (team.powerUps.freeze <= 0 || !timerEnabled) return;
      setTeams((prev) => prev.map((item, idx) => idx === teamIndex ? { ...item, powerUps: { ...item.powerUps, freeze: item.powerUps.freeze - 1 } } : item));
      setFreezeSeconds(5);
      setRoundNotice(`${team.name} activeaza Freeze 5s.`);
    }
  };

  useEffect(() => {
    if (phase !== PHASES.question || !timerEnabled || lockAnswers || timerPaused || freezeSeconds > 0) return;
    const timerId = window.setTimeout(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          window.setTimeout(() => onTimeExpiredRef.current(), 0);
          return 0;
        }
        const next = prev - 1;
        if (next <= 3) playSoundRef.current("tick");
        return next;
      });
    }, 1000);
    return () => window.clearTimeout(timerId);
  }, [phase, timerEnabled, lockAnswers, timerPaused, freezeSeconds]);

  useEffect(() => {
    if (phase !== PHASES.question || freezeSeconds <= 0) return;
    const id = window.setTimeout(() => setFreezeSeconds((prev) => Math.max(prev - 1, 0)), 1000);
    return () => window.clearTimeout(id);
  }, [phase, freezeSeconds]);

  useEffect(() => {
    if (phase !== PHASES.end || summarySavedRef.current) return;
    try {
      window.localStorage.setItem(LAST_GAME_STORAGE_KEY, JSON.stringify({
        dateISO: new Date().toISOString(),
        module: moduleId,
        difficulty,
        rounds: roundsTotal,
        settings,
        teams: teams.map((t) => ({ name: t.name, score: t.score })),
        winner: winnerLabel(teams),
      }));
    } catch {
      // ignore storage errors
    }
    summarySavedRef.current = true;
  }, [phase, moduleId, difficulty, roundsTotal, settings, teams]);

  return (
    <MotionPage className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <TqButton type="button" onClick={goHome} className="rounded-xl bg-white/90 px-4 py-2 text-base font-bold text-indigo-700 shadow hover:bg-white">&larr; Inapoi acasa</TqButton>
          {(phase === PHASES.question || phase === PHASES.feedback) ? (
            <div className="flex flex-wrap gap-2">
              <TqButton type="button" disabled={!timerEnabled} onClick={() => setTimerPaused((p) => !p)} className="rounded-xl border border-amber-300 bg-amber-100 px-4 py-2 text-sm font-bold text-amber-900 disabled:opacity-50">{timerPaused ? "Resume" : "Pause"}</TqButton>
              <TqButton type="button" onClick={() => window.confirm("Resetezi jocul curent?") && startSetup()} className="rounded-xl border border-rose-300 bg-rose-100 px-4 py-2 text-sm font-bold text-rose-900">Reset joc</TqButton>
              <TqButton type="button" onClick={startSetup} className="rounded-xl border border-indigo-200 bg-white px-4 py-2 text-sm font-bold text-indigo-700">Settings</TqButton>
            </div>
          ) : null}
        </div>

        {phase === PHASES.setup ? (
          <section className="rounded-3xl border border-indigo-100 bg-white/90 p-6 shadow-lg">
            <h1 className="text-3xl font-black text-indigo-700 sm:text-4xl">Team Quiz - Auto</h1>
            <p className="mt-2 text-base text-gray-700">Validare automata, turn-based strict, feedback instant.</p>
            <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <label className="text-sm font-bold text-indigo-700">Modul<select value={moduleId} onChange={(e) => setModuleId(e.target.value)} className="mt-2 w-full rounded-2xl border-2 border-indigo-200 px-4 py-3">{moduleOptions.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}</select></label>
              <label className="text-sm font-bold text-indigo-700">Dificultate<select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} disabled={settings.spiceMode === "mixed"} className="mt-2 w-full rounded-2xl border-2 border-indigo-200 px-4 py-3"><option value="easy">Usor</option><option value="medium">Mediu</option><option value="review">Recapitulare</option></select></label>
              <label className="text-sm font-bold text-indigo-700">Echipe<select value={teamCount} onChange={(e) => setTeamCount(Number(e.target.value))} className="mt-2 w-full rounded-2xl border-2 border-indigo-200 px-4 py-3">{[2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}</select></label>
              <label className="text-sm font-bold text-indigo-700">Runde<select value={roundsTotal} onChange={(e) => setRoundsTotal(Number(e.target.value))} className="mt-2 w-full rounded-2xl border-2 border-indigo-200 px-4 py-3">{[5, 6, 7, 8, 9, 10].map((n) => <option key={n} value={n}>{n}</option>)}</select></label>
            </div>
            <div className="mt-6 rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
              <p className="text-sm font-black uppercase tracking-wide text-indigo-700">Setari joc</p>
              <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                <label className="text-sm font-semibold text-indigo-700">Timer<select value={settings.timerSeconds} onChange={(e) => setSettings((p) => ({ ...p, timerSeconds: Number(e.target.value) }))} className="mt-1 w-full rounded-xl border border-indigo-200 px-3 py-2">{TIMER_OPTIONS.map((v) => <option key={v} value={v}>{v === 0 ? "OFF" : `${v}s`}</option>)}</select></label>
                <label className="text-sm font-semibold text-indigo-700">Auto advance<select value={settings.autoAdvanceDelayMs} onChange={(e) => setSettings((p) => ({ ...p, autoAdvanceDelayMs: Number(e.target.value) }))} className="mt-1 w-full rounded-xl border border-indigo-200 px-3 py-2">{AUTO_DELAY_OPTIONS.map((v) => <option key={v} value={v}>{v} ms</option>)}</select></label>
                <label className="text-sm font-semibold text-indigo-700">Steal mode<select value={settings.stealMode} onChange={(e) => setSettings((p) => ({ ...p, stealMode: e.target.value === "on" ? "on" : "off" }))} className="mt-1 w-full rounded-xl border border-indigo-200 px-3 py-2"><option value="off">OFF</option><option value="on">ON</option></select></label>
                <label className="text-sm font-semibold text-indigo-700">Difficulty spice<select value={settings.spiceMode} onChange={(e) => setSettings((p) => ({ ...p, spiceMode: e.target.value === "mixed" ? "mixed" : "normal" }))} className="mt-1 w-full rounded-xl border border-indigo-200 px-3 py-2"><option value="normal">Normal</option><option value="mixed">Mixed</option></select></label>
                <label className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-3 py-2 text-sm font-semibold text-indigo-700"><input type="checkbox" checked={settings.sounds} onChange={(e) => setSettings((p) => ({ ...p, sounds: e.target.checked }))} className="h-4 w-4" />Sounds</label>
                <label className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-3 py-2 text-sm font-semibold text-indigo-700"><input type="checkbox" checked={settings.animations} onChange={(e) => setSettings((p) => ({ ...p, animations: e.target.checked }))} className="h-4 w-4" />Animations</label>
                <label className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-3 py-2 text-sm font-semibold text-indigo-700"><input type="checkbox" checked={settings.powerUps} onChange={(e) => setSettings((p) => ({ ...p, powerUps: e.target.checked }))} className="h-4 w-4" />Power-ups</label>
              </div>
            </div>
            {setupError ? <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{setupError}</p> : null}
            <TqButton type="button" onClick={startGame} className="mt-6 rounded-2xl bg-indigo-600 px-6 py-4 text-lg font-black text-white shadow hover:bg-indigo-700">Start Game</TqButton>
          </section>
        ) : null}

        {phase === PHASES.teamSetup ? (
          <section className="rounded-3xl border border-indigo-100 bg-white/90 p-6 shadow-lg">
            <h2 className="text-3xl font-black text-indigo-800">Setup echipe</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">{teams.map((team, index) => (
              <label key={team.id} className="rounded-2xl border-2 border-indigo-200 bg-indigo-50 p-4"><span className="text-xs font-black uppercase tracking-wide text-indigo-500">Echipa {team.id}</span><input type="text" value={team.name} onChange={(e) => setTeams((prev) => prev.map((item, idx) => idx === index ? { ...item, name: e.target.value.trim().length > 0 ? e.target.value.slice(0, 24) : `Echipa ${item.id}` } : item))} className="mt-2 w-full rounded-xl border border-indigo-200 bg-white px-3 py-2 text-lg font-bold text-indigo-800" maxLength={24} /></label>
            ))}</div>
            <TqButton type="button" onClick={() => setTurn(0, 1, 0)} className="mt-6 rounded-2xl bg-emerald-600 px-6 py-4 text-lg font-black text-white shadow hover:bg-emerald-700">Start runda 1</TqButton>
          </section>
        ) : null}

        {(phase === PHASES.question || phase === PHASES.feedback) && question ? (
          <section className="relative overflow-hidden rounded-3xl border border-indigo-100 bg-white/95 p-4 shadow-lg sm:p-6">
            <div className="mb-4 flex flex-col items-center justify-between gap-3 rounded-2xl border border-indigo-200 bg-indigo-50 p-4 lg:flex-row">
              <p className="text-base font-black text-indigo-800">Intrebarea: {questionNumber} / {totalQuestions}</p>
              <div className={`rounded-full px-6 py-3 text-lg font-black text-white ${stealActive ? "bg-rose-600" : "bg-indigo-700"}`}>{turnBadgeText}</div>
              {timerEnabled ? <CountdownRing totalSeconds={settings.timerSeconds} remainingSeconds={timeLeft} paused={timerPaused || freezeSeconds > 0 || phase === PHASES.feedback} motionEnabled={allowAnimations} /> : <div className="rounded-full bg-indigo-100 px-5 py-2 text-sm font-bold text-indigo-700">Fara timer</div>}
            </div>

            <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {teams.map((team, index) => {
                const accent = accentByIndex(index);
                const active = index === respondingTeamIndex;
                const feedbackTarget = index === feedbackTeamIndex;
                return (
                  <Motion.div key={`team-card-${team.id}`} className={`relative rounded-2xl border-2 p-4 text-white shadow ${accent.base} ${active ? `ring-4 ${accent.ring}` : "opacity-65"}`} animate={active && allowAnimations && phase === PHASES.question ? { scale: [1, 1.02, 1], y: [0, -2, 0] } : { scale: 1, y: 0 }} transition={active && allowAnimations && phase === PHASES.question ? { duration: 1.1, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 }}>
                    <p className="text-xs font-black uppercase tracking-wide">{team.name}</p><p className="mt-1 text-4xl font-black leading-none">{team.score}</p><p className="mt-2 text-sm font-bold">Streak: x{team.streak}</p>{team.pendingPlusTwo ? <p className="text-xs font-black uppercase">+2 activ</p> : null}
                    <div className="mt-2 flex flex-wrap gap-1 text-xs font-black"><span className={`rounded-full px-2 py-1 ${accent.chip}`}>50/50 x{team.powerUps.fiftyFifty}</span><span className={`rounded-full px-2 py-1 ${accent.chip}`}>+2 x{team.powerUps.plusTwo}</span><span className={`rounded-full px-2 py-1 ${accent.chip}`}>Freeze x{team.powerUps.freeze}</span></div>
                    {settings.powerUps && active && phase === PHASES.question && !lockAnswers ? <div className="mt-3 grid grid-cols-3 gap-2"><TqButton type="button" onClick={() => applyPowerUp("fiftyFifty", index)} className="rounded-lg bg-white/20 px-2 py-2 text-xs font-black text-white hover:bg-white/30">50/50</TqButton><TqButton type="button" onClick={() => applyPowerUp("plusTwo", index)} className="rounded-lg bg-white/20 px-2 py-2 text-xs font-black text-white hover:bg-white/30">+2</TqButton><TqButton type="button" onClick={() => applyPowerUp("freeze", index)} className="rounded-lg bg-white/20 px-2 py-2 text-xs font-black text-white hover:bg-white/30">Freeze</TqButton></div> : null}
                    {feedbackTarget && feedbackPoints > 0 && allowAnimations ? <Motion.span key={`points-${team.id}-${feedbackPoints}-${questionNumber}`} className="absolute right-3 top-3 rounded-full bg-white px-3 py-1 text-sm font-black text-emerald-700" initial={{ opacity: 0, y: 10, scale: 0.9 }} animate={{ opacity: [0, 1, 1, 0], y: [10, -8, -18, -28], scale: [0.9, 1, 1, 0.96] }} transition={{ duration: 0.85, ease: "easeOut" }}>+{feedbackPoints}</Motion.span> : null}
                  </Motion.div>
                );
              })}
            </div>

            <h2 className="text-center text-3xl font-black leading-tight text-indigo-900 sm:text-4xl">{question.text}</h2>
            <div className="mx-auto mt-5 max-w-3xl">{renderQuestionVisual(question)}</div>

            <div className="mx-auto mt-6 grid max-w-5xl gap-3 md:grid-cols-3">
              {question.choices.map((choice, index) => {
                const removed = removedChoiceIndexes.includes(index);
                const disabled = phase !== PHASES.question || lockAnswers || removed;
                const selected = selectedIndex === index;
                const correctChoice = index === question.correctIndex;
                const pulseState = allowAnimations && selected ? (isCorrect ? "correct" : "wrong") : "idle";
                let cls = "min-h-16 w-full rounded-2xl border-2 px-4 py-4 text-left text-xl font-black transition";
                if (!lockAnswers) cls += " border-indigo-200 bg-white text-indigo-900";
                else if (correctChoice) cls += " border-emerald-500 bg-emerald-50 text-emerald-900";
                else if (selected && isCorrect === false) cls += " border-rose-400 bg-rose-50 text-rose-900";
                else cls += " border-indigo-100 bg-white text-indigo-900 opacity-70";
                if (!disabled && !lockAnswers) cls += " hover:border-indigo-400";
                if (removed) cls += " opacity-35";
                return <FeedbackPulse key={`${question.gameQuestionId}-${index}-${pulseState}`} state={pulseState}><TqButton type="button" disabled={disabled} onClick={() => onSelectAnswer(index)} className={cls}><span className="mr-2 inline-block rounded-lg bg-black/10 px-2 py-1 text-base">{String.fromCharCode(65 + index)}</span>{choice}</TqButton></FeedbackPulse>;
              })}
            </div>

            {phase === PHASES.feedback ? <div className={`mt-5 rounded-2xl border-2 p-4 ${isCorrect ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-rose-300 bg-rose-50 text-rose-900"}`}><p className="text-xl font-black">{feedbackText || (isCorrect ? "Corect" : "Gresit")}</p>{nextTurnText ? <p className="mt-1 text-sm font-semibold">{nextTurnText}</p> : null}</div> : null}
            {roundNotice ? <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-base font-semibold text-amber-800">{roundNotice}</p> : null}
            {freezeSeconds > 0 ? <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-sky-700/25"><div className="rounded-2xl border border-sky-300 bg-sky-50 px-6 py-4 text-center shadow-lg"><p className="text-lg font-black text-sky-800">Freeze activ</p><p className="text-3xl font-black text-sky-900">{freezeSeconds}s</p></div></div> : null}
          </section>
        ) : null}

        {phase === PHASES.end ? (
          <section className="rounded-3xl border border-indigo-100 bg-white/95 p-6 shadow-lg">
            <h2 className="text-4xl font-black text-indigo-800">Final joc</h2>
            <p className="mt-3 text-xl font-bold text-emerald-700">Castigator: {winnerLabel(teams)}</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">{teams.slice().sort((a, b) => b.score - a.score).map((team, index) => <div key={`final-${team.id}`} className="rounded-2xl border-2 border-indigo-100 bg-white p-4"><p className="text-sm font-black uppercase tracking-wide text-indigo-500">Locul {index + 1}</p><p className="text-lg font-black text-indigo-800">{team.name}</p><p className="text-4xl font-black text-gray-900">{team.score} p</p></div>)}</div>
            <div className="mt-6 flex flex-wrap gap-3">
              <TqButton type="button" onClick={startGame} className="rounded-2xl bg-indigo-600 px-6 py-4 text-lg font-black text-white hover:bg-indigo-700">Play again</TqButton>
              <TqButton type="button" onClick={() => downloadJson({ exportedAtISO: new Date().toISOString(), moduleId, difficulty, roundsTotal, settings, winner: winnerLabel(teams), teams, history })} className="rounded-2xl border-2 border-indigo-200 bg-white px-6 py-4 text-lg font-black text-indigo-700 hover:bg-indigo-50">Export results JSON</TqButton>
              <TqButton type="button" onClick={goHome} className="rounded-2xl border-2 border-slate-300 bg-slate-100 px-6 py-4 text-lg font-black text-slate-700 hover:bg-slate-200">Back home</TqButton>
            </div>
          </section>
        ) : null}
      </div>
    </MotionPage>
  );
}
