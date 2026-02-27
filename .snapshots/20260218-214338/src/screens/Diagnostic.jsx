import { useEffect, useMemo, useState } from "react";
import { motion as Motion } from "framer-motion";
import { CheckCircle2, TestTubeDiagonal } from "lucide-react";
import FeedbackPulse from "../components/ui/FeedbackPulse.jsx";
import MotionPage from "../components/ui/MotionPage.jsx";
import diagnosticQuestions from "../data/diagnostic.json";
import { burstConfetti } from "../lib/confetti.js";
import { fadeUp, shouldReduceMotion } from "../lib/motion.js";
import { setDiagnosticResult } from "../utils/progressStore.js";
import Badge from "../ui/Badge.jsx";
import Button from "../ui/Button.jsx";
import Card from "../ui/Card.jsx";
import ProgressBar from "../ui/ProgressBar.jsx";
import SectionTitle from "../ui/SectionTitle.jsx";

const CATEGORY_LABELS = {
  numbers: "Numere",
  integers: "Numere întregi",
  fractions: "Fracții",
  decimals: "Zecimale",
  percents: "Procente",
  equations: "Ecuații",
};

const CATEGORY_TO_MODULE = {
  integers: "integers",
  fractions: "fractions",
  percents: "percents",
  equations: "equations",
  numbers: "fractions",
  decimals: "percents",
};

function getScoreMessage(score) {
  if (score <= 3) return "Ai nevoie de consolidare de bază.";
  if (score <= 7) return "Baza este formată. Mai exersăm.";
  return "Foarte bine. Ești pregătit pentru nivelul următor.";
}

function getWeakAreas(answers) {
  const categoryStats = answers.reduce((acc, answer) => {
    if (!acc[answer.category]) acc[answer.category] = { total: 0, correct: 0 };
    acc[answer.category].total += 1;
    if (answer.isCorrect) acc[answer.category].correct += 1;
    return acc;
  }, {});

  return Object.entries(categoryStats)
    .filter(([, stats]) => stats.correct / stats.total < 0.75)
    .map(([category]) => category);
}

function mapRecommendedModules(weakAreas) {
  const modules = weakAreas.map((area) => CATEGORY_TO_MODULE[area]).filter(Boolean);
  const unique = [...new Set(modules)];
  return unique.length > 0 ? unique : ["fractions", "percents"];
}

export default function Diagnostic({ goHome }) {
  const reducedMotion = shouldReduceMotion();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [selectedChoice, setSelectedChoice] = useState(null);

  const totalQuestions = diagnosticQuestions.length;
  const isComplete = answers.length === totalQuestions;
  const activeQuestion = diagnosticQuestions[currentQuestion];

  const result = useMemo(() => {
    if (!isComplete) return null;
    const weakAreas = getWeakAreas(answers);
    const recommended =
      weakAreas.length > 0
        ? weakAreas.map((area) => CATEGORY_LABELS[area] ?? area)
        : ["Consolidare generală"];

    return {
      dateISO: new Date().toISOString(),
      score,
      message: getScoreMessage(score),
      weakAreas,
      recommended,
      recommendedModuleIds: mapRecommendedModules(weakAreas),
    };
  }, [answers, isComplete, score]);

  useEffect(() => {
    if (!result) return;
    setDiagnosticResult({
      dateISO: result.dateISO,
      score: result.score,
      weakAreas: result.weakAreas,
      recommended: result.recommended,
      recommendedModuleIds: result.recommendedModuleIds,
    });
  }, [result]);

  const handleChoice = (choiceIndex) => {
    if (selectedChoice !== null || !activeQuestion) return;
    const isCorrect = choiceIndex === activeQuestion.correct;
    setSelectedChoice(choiceIndex);
    if (isCorrect) burstConfetti({ particleCount: 34, durationMs: 520 });

    window.setTimeout(() => {
      setAnswers((prev) => [
        ...prev,
        {
          questionId: activeQuestion.id,
          category: activeQuestion.category,
          selected: choiceIndex,
          isCorrect,
        },
      ]);
      if (isCorrect) setScore((prev) => prev + 1);
      setCurrentQuestion((prev) => prev + 1);
      setSelectedChoice(null);
    }, 260);
  };

  const restartTest = () => {
    setCurrentQuestion(0);
    setScore(0);
    setAnswers([]);
    setSelectedChoice(null);
  };

  return (
    <MotionPage className="min-h-screen p-4 sm:p-6">
      <div className="mx-auto max-w-4xl">
        <Button variant="secondary" onClick={goHome}>
          ← Înapoi acasă
        </Button>

        <div className="mt-4">
          <SectionTitle
            title="Diagnostic rapid"
            subtitle="10 întrebări scurte pentru nivelul recomandat."
            icon={TestTubeDiagonal}
          />
        </div>

        {!isComplete && activeQuestion ? (
          <Motion.div variants={fadeUp} initial={reducedMotion ? false : "hidden"} animate="show">
            <Card className="mt-5 p-5 sm:p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <Badge variant="indigo">
                  Întrebarea {currentQuestion + 1} / {totalQuestions}
                </Badge>
                <Badge variant="emerald">
                  Scor curent: {score}
                </Badge>
              </div>

              <ProgressBar value={((currentQuestion + 1) / totalQuestions) * 100} />

              <h2 className="mt-5 text-2xl font-black text-slate-900 sm:text-3xl">
                {activeQuestion.question}
              </h2>

              <div className="mt-5 grid gap-3">
                {activeQuestion.choices.map((choice, index) => {
                  const isSelected = selectedChoice === index;
                  const isCorrectChoice = index === activeQuestion.correct;
                  const selectedCorrect = isSelected && isCorrectChoice;
                  const selectedWrong = isSelected && !isCorrectChoice;

                  let choiceClass =
                    "w-full rounded-2xl border-2 px-4 py-4 text-left text-lg font-semibold transition";
                  if (selectedChoice === null) {
                    choiceClass += " border-indigo-100 bg-white hover:border-indigo-300 hover:bg-indigo-50";
                  } else if (isCorrectChoice) {
                    choiceClass += " border-emerald-400 bg-emerald-50 text-emerald-900";
                  } else if (isSelected) {
                    choiceClass += " border-rose-400 bg-rose-50 text-rose-900";
                  } else {
                    choiceClass += " border-slate-100 bg-white opacity-70";
                  }

                  return (
                    <FeedbackPulse
                      key={`${activeQuestion.id}-${index}-${selectedChoice ?? "idle"}`}
                      state={selectedCorrect ? "correct" : selectedWrong ? "wrong" : "idle"}
                    >
                      <button
                        type="button"
                        disabled={selectedChoice !== null}
                        onClick={() => handleChoice(index)}
                        className={choiceClass}
                      >
                        {choice}
                      </button>
                    </FeedbackPulse>
                  );
                })}
              </div>

              {selectedChoice !== null ? (
                <p className="mt-4 text-sm font-semibold text-indigo-700">
                  {selectedChoice === activeQuestion.correct
                    ? "Corect. Mergem mai departe."
                    : "Bun efort. Continuăm."}
                </p>
              ) : null}
            </Card>
          </Motion.div>
        ) : null}

        {result ? (
          <Motion.div variants={fadeUp} initial={reducedMotion ? false : "hidden"} animate="show">
            <Card className="mt-5 p-5 sm:p-6">
              <div className="mb-3 flex items-center gap-2">
                <CheckCircle2 className="text-emerald-600" size={22} />
                <h2 className="text-3xl font-black text-indigo-800">Rezultatul tău</h2>
              </div>

              <p className="text-xl font-bold text-slate-800">
                Scor final: {result.score}/{totalQuestions}
              </p>
              <p className="mt-1 text-base text-slate-700">{result.message}</p>

              <div className="mt-4 rounded-2xl bg-indigo-50 p-4">
                <p className="text-sm font-semibold text-slate-600">Zone de consolidat</p>
                <p className="text-lg font-black text-indigo-700">{result.recommended.join(", ")}</p>
              </div>

              <div className="mt-3 rounded-2xl bg-emerald-50 p-4">
                <p className="text-sm font-semibold text-slate-600">Module recomandate</p>
                <p className="text-lg font-black text-emerald-700">
                  {result.recommendedModuleIds.join(", ")}
                </p>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <Button variant="primary" onClick={restartTest}>
                  Refa testul
                </Button>
                <Button variant="secondary" onClick={() => goHome()}>
                  Mergi acasă
                </Button>
              </div>
            </Card>
          </Motion.div>
        ) : null}
      </div>
    </MotionPage>
  );
}
