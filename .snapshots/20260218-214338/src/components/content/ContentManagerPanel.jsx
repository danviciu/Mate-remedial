import { useRef, useState } from "react";
import { CONTENT_MODULES } from "../../content/index.js";
import {
  loadCustomContent,
  mergeCustomPayload,
  resetCustomContent,
  saveCustomContent,
} from "../../content/customStore.js";
import { SIMULATION_CONFIGS } from "../../content/simulationConfigs.js";
import { downloadTemplateJson } from "../../content/template.js";
import { LESSONS } from "../../lessons/lessonsData.js";
import { TEAM_QUIZ_QUESTIONS } from "../../data/teamQuizQuestions.js";
import {
  normalizeImportShape,
  parseJson,
  readFileAsText,
  validateAndFixAll,
} from "../../utils/fileImport.js";

function downloadJsonFile(fileName, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(href);
}

export default function ContentManagerPanel({
  title = "Gestionare continut",
  compact = false,
  onApplied,
}) {
  const inputRef = useRef(null);
  const [status, setStatus] = useState("");
  const [preview, setPreview] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const currentCustom = loadCustomContent();

  const openImport = () => {
    inputRef.current?.click();
  };

  const onFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const text = await readFileAsText(file);
      const parsed = parseJson(text);
      const normalized = normalizeImportShape(parsed);
      const result = validateAndFixAll(normalized);
      setPreview(result);
      setIsModalOpen(true);
      setStatus("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Fisier invalid JSON.");
    }
  };

  const applyImport = () => {
    if (!preview) return;
    const merged = mergeCustomPayload(loadCustomContent(), preview.accepted);
    saveCustomContent(merged);
    setStatus("Continut importat cu succes. Reincarca pagina pentru actualizare completa.");
    setIsModalOpen(false);
    onApplied?.("import");
  };

  const exportImported = () => {
    const payload = loadCustomContent();
    downloadJsonFile("mate-reset-custom-content.json", payload);
    setStatus("Continutul importat a fost exportat.");
  };

  const exportMerged = () => {
    downloadJsonFile("mate-reset-merged-content.json", {
      modules: CONTENT_MODULES,
      lessons: LESSONS,
      simulations: SIMULATION_CONFIGS,
      teamQuiz: TEAM_QUIZ_QUESTIONS,
    });
    setStatus("Continutul merged a fost exportat.");
  };

  const resetImported = () => {
    if (!window.confirm("Stergi tot continutul importat si revii la implicit?")) return;
    resetCustomContent();
    setStatus("Continutul importat a fost resetat.");
    onApplied?.("reset");
  };

  const hasImported =
    currentCustom.exercises.length > 0 ||
    currentCustom.lessons.length > 0 ||
    currentCustom.simulations.length > 0 ||
    (currentCustom.teamQuiz ?? []).length > 0;

  return (
    <div className={`rounded-2xl border border-indigo-200 bg-white/90 ${compact ? "p-4" : "p-5"}`}>
      <h3 className={`${compact ? "text-lg" : "text-xl"} font-black text-indigo-700`}>{title}</h3>
      <p className="mt-1 text-sm text-slate-600">
        Format acceptat: obiect JSON cu `exercises`, `lessons`, `simulations`, `teamQuiz` sau array simplu de
        exerciții.
      </p>
      <p className="mt-1 text-sm text-slate-600">
        Campuri recomandate: module, level, prompt, choices, correctAnswer, explanation,
        guidedSteps, visualSpec. Pentru TeamQuiz: `text`, `choices`, `correctIndex`.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={downloadTemplateJson}
          className="rounded-xl bg-indigo-100 px-3 py-2 text-sm font-semibold text-indigo-700"
        >
          Descarca Template JSON
        </button>
        <button
          type="button"
          onClick={openImport}
          className="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white"
        >
          Import continut (JSON)
        </button>
        <button
          type="button"
          onClick={exportImported}
          className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white"
        >
          Export continut importat
        </button>
        <button
          type="button"
          onClick={exportMerged}
          className="rounded-xl bg-emerald-100 px-3 py-2 text-sm font-semibold text-emerald-800"
        >
          Export continut (merged)
        </button>
        <button
          type="button"
          onClick={resetImported}
          className="rounded-xl bg-rose-600 px-3 py-2 text-sm font-semibold text-white"
        >
          Reset continut importat
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={onFileChange}
      />

      <p className="mt-3 text-sm text-slate-600">
        Importat local: {currentCustom.exercises.length} exercitii, {currentCustom.lessons.length}{" "}
        lectii, {currentCustom.simulations.length} simulari, {(currentCustom.teamQuiz ?? []).length} intrebari TeamQuiz.
      </p>
      {!hasImported ? (
        <p className="mt-1 text-xs text-slate-500">Nu exista continut importat inca.</p>
      ) : null}
      {status ? <p className="mt-2 text-sm font-semibold text-indigo-700">{status}</p> : null}

      {isModalOpen && preview ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-2xl">
            <h4 className="text-xl font-black text-indigo-700">Raport import</h4>
            <p className="mt-2 text-sm text-slate-700">
              Au fost acceptate {preview.summary.acceptedCount} itemi, respinse{" "}
              {preview.summary.rejectedCount}.
            </p>
            <p className="text-sm text-slate-700">
              Fixuri automate aplicate: {preview.summary.fixedCount}.
            </p>
            <p className="text-sm text-slate-600">
              Exercitii: {preview.summary.acceptedExercises}, Lectii:{" "}
              {preview.summary.acceptedLessons}, Simulari:{" "}
              {preview.summary.acceptedSimulations}, TeamQuiz: {preview.summary.acceptedTeamQuiz ?? 0}
            </p>

            {preview.rejected.length > 0 ? (
              <div className="mt-3 max-h-60 overflow-auto rounded-xl border border-rose-200 bg-rose-50 p-3">
                <p className="text-sm font-bold text-rose-800">Itemi respinsi</p>
                <ul className="mt-2 space-y-2 text-sm text-rose-900">
                  {preview.rejected.map((item) => (
                    <li
                      key={`${item.type}-${item.id}`}
                      className="rounded-lg border border-rose-200 bg-white p-2"
                    >
                      <p>
                        <span className="font-semibold">{item.type}</span> | {item.id}
                      </p>
                      <p className="text-xs text-rose-700">{item.reasons.join(" ")}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700"
              >
                Inchide
              </button>
              <button
                type="button"
                onClick={applyImport}
                disabled={preview.summary.acceptedCount === 0}
                className="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Aplica importul
              </button>
              <button
                type="button"
                onClick={() => downloadJsonFile("import-preview-accepted.json", preview.accepted)}
                className="rounded-xl bg-emerald-100 px-3 py-2 text-sm font-semibold text-emerald-700"
              >
                Descarca accepted
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
