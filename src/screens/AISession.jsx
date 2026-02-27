import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Lightbulb, XCircle } from "lucide-react";
import MotionPage from "../components/ui/MotionPage.jsx";
import Button from "../ui/Button.jsx";
import Card from "../ui/Card.jsx";
import SectionTitle from "../ui/SectionTitle.jsx";

const XP_PER_CORRECT = 12;

function normalizeText(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function evaluateAnswer(item, selectedOption, textAnswer) {
  const answer = item?.answer;

  if (item?.type === "mcq_single" || item?.type === "true_false") {
    if (!Number.isInteger(selectedOption)) return false;
    if (typeof answer === "number") return selectedOption === answer;
    if (typeof answer === "boolean") return (selectedOption === 0) === answer;
    if (typeof answer === "string") {
      const optionValue = item?.options?.[selectedOption];
      return normalizeText(optionValue) === normalizeText(answer);
    }
    return false;
  }

  const typed = normalizeText(textAnswer);
  if (!typed) return false;
  if (typeof answer === "number") return Number(typed.replace(",", ".")) === answer;
  if (typeof answer === "boolean") {
    if (typed === "adevarat" || typed === "true") return answer === true;
    if (typed === "fals" || typed === "false") return answer === false;
    return false;
  }
  return typed === normalizeText(answer);
}

export default function AISession({ goHome, exerciseSet, onSessionComplete }) {
  const items = useMemo(
    () => (Array.isArray(exerciseSet?.items) ? exerciseSet.items : []),
    [exerciseSet],
  );
  const [index, setIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [textAnswer, setTextAnswer] = useState("");
  const [revealedHint, setRevealedHint] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [wasCorrect, setWasCorrect] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const reportedSessionRef = useRef(null);

  const currentItem = items[index] ?? null;
  const finished = index >= items.length;
  const gainedXp = correctCount * XP_PER_CORRECT;

  useEffect(() => {
    if (!finished || items.length === 0) return;
    const sessionKey = exerciseSet?.id ?? `${exerciseSet?.topic ?? "ai"}-${items.length}`;
    if (reportedSessionRef.current === sessionKey) return;
    onSessionComplete?.({
      xpGained: gainedXp,
      score: correctCount,
      total: items.length,
      sessionId: exerciseSet?.id ?? null,
      topic: exerciseSet?.topic ?? "Matematica",
    });
    reportedSessionRef.current = sessionKey;
  }, [correctCount, exerciseSet, finished, gainedXp, items.length, onSessionComplete]);

  const resetForNext = () => {
    setSelectedOption(null);
    setTextAnswer("");
    setRevealedHint(false);
    setSubmitted(false);
    setWasCorrect(false);
  };

  const onSubmit = () => {
    if (!currentItem || submitted) return;
    const correct = evaluateAnswer(currentItem, selectedOption, textAnswer);
    setSubmitted(true);
    setWasCorrect(correct);
    if (correct) setCorrectCount((prev) => prev + 1);
  };

  const onNext = () => {
    if (!submitted) return;
    setIndex((prev) => prev + 1);
    resetForNext();
  };

  if (!exerciseSet || items.length === 0) {
    return (
      <MotionPage className="min-h-screen p-4 sm:p-6">
        <div className="mx-auto max-w-4xl">
          <Button variant="secondary" onClick={goHome}>
            &larr; Inapoi acasa
          </Button>
          <Card className="mt-4 p-5">
            <SectionTitle title="Sesiune AI" subtitle="Nu exista inca exercitii generate." />
            <p className="mt-2 text-sm text-slate-600">
              Deschide butonul ✨ AI din Home si genereaza mai intai o sesiune de exercitii.
            </p>
          </Card>
        </div>
      </MotionPage>
    );
  }

  if (finished) {
    return (
      <MotionPage className="min-h-screen p-4 sm:p-6">
        <div className="mx-auto max-w-4xl">
          <Button variant="secondary" onClick={goHome}>
            &larr; Inapoi acasa
          </Button>
          <Card className="mt-4 p-6">
            <SectionTitle
              title="Sesiune finalizata"
              subtitle={`${exerciseSet.topic} - ${exerciseSet.difficulty}`}
            />
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-emerald-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                  Scor
                </p>
                <p className="text-2xl font-black text-emerald-900">
                  {correctCount}/{items.length}
                </p>
              </div>
              <div className="rounded-2xl bg-indigo-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
                  XP castigat
                </p>
                <p className="text-2xl font-black text-indigo-900">{gainedXp}</p>
              </div>
              <div className="rounded-2xl bg-slate-100 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Topic
                </p>
                <p className="text-2xl font-black text-slate-800">{exerciseSet.topic}</p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button onClick={goHome}>Inapoi la Home</Button>
            </div>
          </Card>
        </div>
      </MotionPage>
    );
  }

  const needsTextInput =
    currentItem?.type === "fill_blank" || currentItem?.type === "problem";

  return (
    <MotionPage className="min-h-screen p-4 sm:p-6">
      <div className="mx-auto max-w-5xl">
        <Button variant="secondary" onClick={goHome}>
          &larr; Inapoi acasa
        </Button>

        <Card className="mt-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SectionTitle
              title={exerciseSet.title}
              subtitle={`Item ${index + 1} din ${items.length} • clasa ${exerciseSet.grade}`}
            />
            <div className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-black text-slate-700">
              XP: {correctCount * XP_PER_CORRECT}
            </div>
          </div>

          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full bg-indigo-600 transition-all duration-300"
              style={{ width: `${Math.round(((index + 1) / items.length) * 100)}%` }}
            />
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {currentItem.type}
            </p>
            <p className="mt-1 text-lg font-black text-slate-900">{currentItem.prompt}</p>
          </div>

          {needsTextInput ? (
            <div className="mt-4">
              <label className="text-sm font-semibold text-slate-700">
                Raspunsul tau
                <input
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
                  value={textAnswer}
                  onChange={(event) => setTextAnswer(event.target.value)}
                  disabled={submitted}
                />
              </label>
            </div>
          ) : (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {(currentItem.options ?? []).map((option, optionIndex) => (
                <button
                  key={`${currentItem.id}-${optionIndex}`}
                  type="button"
                  onClick={() => setSelectedOption(optionIndex)}
                  disabled={submitted}
                  className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
                    selectedOption === optionIndex
                      ? "border-indigo-400 bg-indigo-50 text-indigo-900"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={onSubmit} disabled={submitted}>
              Verifica raspunsul
            </Button>
            <Button
              variant="secondary"
              onClick={() => setRevealedHint((prev) => !prev)}
              disabled={!currentItem.hints?.length}
            >
              <Lightbulb size={16} />
              {revealedHint ? "Ascunde hint" : "Arata hint"}
            </Button>
            <Button variant="ghost" onClick={onNext} disabled={!submitted}>
              Item urmator
            </Button>
          </div>

          {revealedHint && currentItem.hints?.length ? (
            <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
              Hint: {currentItem.hints[0]}
            </div>
          ) : null}

          {submitted ? (
            <div
              className={`mt-3 rounded-2xl border px-4 py-3 text-sm font-semibold ${
                wasCorrect
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-rose-200 bg-rose-50 text-rose-800"
              }`}
            >
              <div className="flex items-center gap-2">
                {wasCorrect ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                {wasCorrect ? "Corect!" : "Incorect."}
              </div>
              {currentItem.explanation ? <p className="mt-1">{currentItem.explanation}</p> : null}
            </div>
          ) : null}
        </Card>
      </div>
    </MotionPage>
  );
}
