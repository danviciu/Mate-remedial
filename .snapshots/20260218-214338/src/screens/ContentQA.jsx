import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Copy, Filter, Search, Wrench } from "lucide-react";
import ContentManagerPanel from "../components/content/ContentManagerPanel.jsx";
import VisualRenderer from "../components/visuals/VisualRenderer.jsx";
import {
  AUTO_FIX_REPORT,
  CONTENT_MODULES,
  CONTENT_SOURCE_STATS,
  CONTENT_VALIDATION_RESULT,
  MERGED_RAW_CONTENT_MODULES,
  RAW_VALIDATION_RESULT,
} from "../content/index.js";
import { normalizeAllContentModules } from "../content/normalizeContent.js";
import { validateLessonsBundle, validateSimulationBundle, mergeQaErrors } from "../content/qaValidation.js";
import { LESSONS } from "../lessons/lessonsData.js";
import { SIMULATION_CONFIGS } from "../content/simulationConfigs.js";
import Badge from "../ui/Badge.jsx";
import Button from "../ui/Button.jsx";
import Card from "../ui/Card.jsx";
import SectionTitle from "../ui/SectionTitle.jsx";
import StatPill from "../ui/StatPill.jsx";

const PREVIEW_LIMIT = 20;
const MODULE_LABELS = {
  all: "Toate",
  fractions: "Fracții",
  percents: "Procente",
  integers: "Numere întregi",
  equations: "Ecuații",
  system: "Sistem",
  unknown: "Necunoscut",
};

function cloneData(value) {
  return JSON.parse(JSON.stringify(value));
}

function safeText(value) {
  return typeof value === "string" ? value : "";
}

function getSeverity(error) {
  const text = `${safeText(error?.message)} ${safeText(error?.path)}`.toLowerCase();
  if (text.includes("placeholder") || text.includes("duplicate") || text.includes("corect")) {
    return "critical";
  }
  if (text.includes("lips") || text.includes("invalid") || text.includes("necunoscut")) {
    return "warning";
  }
  return "info";
}

function getSuggestion(error) {
  const text = `${safeText(error?.message)} ${safeText(error?.path)}`.toLowerCase();
  if (text.includes("options")) return "Adaugă exact 3 opțiuni unice și marchează corect răspunsul.";
  if (text.includes("visual") || text.includes("vizual")) return "Completează `visualSpec` cu valori valide și coerente.";
  if (text.includes("slides")) return "Asigură minimum 5 pași în lecție.";
  if (text.includes("gradeband")) return "Folosește gradeBand valid: V, VI, VII, V-VI, V-VII.";
  return "Verifică schema și normalizează itemul înainte de import.";
}

function getKindLabel(kind) {
  if (kind === "exercise") return "Exercițiu";
  if (kind === "lesson") return "Lecție";
  if (kind === "simulation") return "Simulare";
  return "Necunoscut";
}

function buildModuleCounts(errors) {
  return errors.reduce((acc, error) => {
    const key = error?.module ?? "unknown";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

function buildKindCounts(errors) {
  return errors.reduce((acc, error) => {
    const key = error?.kind ?? "unknown";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

function buildSeverityCounts(errors) {
  return errors.reduce(
    (acc, error) => {
      const severity = getSeverity(error);
      acc[severity] += 1;
      return acc;
    },
    { critical: 0, warning: 0, info: 0 },
  );
}

function getSampleItems(modules) {
  return Object.entries(modules).flatMap(([moduleId, moduleContent]) => {
    const sample = moduleContent?.levels?.[0]?.practice?.[0] ?? null;
    if (!sample) return [];
    return [{ moduleId, moduleTitle: moduleContent?.title ?? moduleId, item: sample }];
  });
}

function downloadJson(name, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

function SeverityBadge({ severity }) {
  if (severity === "critical") return <Badge variant="rose">Critic</Badge>;
  if (severity === "warning") return <Badge variant="amber">Avertisment</Badge>;
  return <Badge variant="slate">Info</Badge>;
}

export default function ContentQA({ goHome }) {
  const [showAll, setShowAll] = useState(false);
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [kindFilter, setKindFilter] = useState("all");
  const [fixResult, setFixResult] = useState(null);
  const [managerRefreshTick, setManagerRefreshTick] = useState(0);

  const exerciseResult = fixResult ?? {
    modules: CONTENT_MODULES,
    validationErrors: CONTENT_VALIDATION_RESULT?.errors ?? [],
    report: AUTO_FIX_REPORT,
  };

  const lessonErrors = useMemo(() => validateLessonsBundle(LESSONS), []);
  const simulationErrors = useMemo(() => validateSimulationBundle(SIMULATION_CONFIGS), []);
  const allErrors = useMemo(
    () => mergeQaErrors(exerciseResult.validationErrors, lessonErrors, simulationErrors),
    [exerciseResult.validationErrors, lessonErrors, simulationErrors],
  );
  const rawErrors = RAW_VALIDATION_RESULT?.errors ?? [];

  const samples = useMemo(() => getSampleItems(exerciseResult.modules), [exerciseResult.modules]);
  const moduleCounts = useMemo(() => buildModuleCounts(allErrors), [allErrors]);
  const kindCounts = useMemo(() => buildKindCounts(allErrors), [allErrors]);
  const severityCounts = useMemo(() => buildSeverityCounts(allErrors), [allErrors]);

  const moduleChips = useMemo(() => {
    const base = ["all", "fractions", "percents", "integers", "equations", "system", "unknown"];
    return [...new Set([...base, ...Object.keys(moduleCounts)])];
  }, [moduleCounts]);

  const filteredErrors = useMemo(() => {
    const text = search.trim().toLowerCase();
    return allErrors.filter((error) => {
      const moduleValue = error?.module ?? "unknown";
      const moduleOk = moduleFilter === "all" || moduleValue === moduleFilter;
      if (!moduleOk) return false;

      const severity = getSeverity(error);
      const severityOk = severityFilter === "all" || severity === severityFilter;
      if (!severityOk) return false;

      const kind = error?.kind ?? "unknown";
      const kindOk = kindFilter === "all" || kind === kindFilter;
      if (!kindOk) return false;

      if (!text) return true;
      const haystack = `${safeText(error?.module)} ${safeText(error?.itemId)} ${safeText(error?.path)} ${safeText(error?.message)}`.toLowerCase();
      return haystack.includes(text);
    });
  }, [allErrors, kindFilter, moduleFilter, search, severityFilter]);

  const visibleErrors = showAll ? filteredErrors : filteredErrors.slice(0, PREVIEW_LIMIT);
  const stillInvalid = exerciseResult.report?.stillInvalidItems ?? [];

  const applyAutoFix = () => {
    const normalized = normalizeAllContentModules(cloneData(MERGED_RAW_CONTENT_MODULES), {
      regenerateInvalid: true,
      forceRegenerateAll: true,
    });
    setFixResult(normalized);
  };

  const copyErrors = async () => {
    const payload = {
      total: filteredErrors.length,
      moduleFilter,
      severityFilter,
      kindFilter,
      search,
      errors: filteredErrors,
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    } catch {
      // ignore
    }
  };

  const downloadPatchedModule = (moduleId) => {
    const moduleData = exerciseResult.modules?.[moduleId];
    if (!moduleData) return;
    const fileName = moduleId === "percents" ? "percentages.json" : `${moduleId}.json`;
    downloadJson(fileName, moduleData);
  };

  return (
    <div className="min-h-screen p-4 sm:p-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
        <Button variant="secondary" className="w-fit" onClick={goHome}>
          ← Înapoi acasă
        </Button>

        <SectionTitle
          title="Content QA"
          subtitle="Validare pentru exerciții, lecții și simulări. Erorile nu blochează aplicația."
          icon={Wrench}
        />

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatPill label="Erori brute" value={rawErrors.length} icon={AlertTriangle} tone="rose" />
          <StatPill
            label="Erori totale QA"
            value={allErrors.length}
            icon={CheckCircle2}
            tone={allErrors.length === 0 ? "emerald" : "amber"}
          />
          <StatPill
            label="Fixuri aplicate"
            value={exerciseResult.report?.fixedCount ?? AUTO_FIX_REPORT?.fixedCount ?? 0}
            tone="indigo"
          />
          <StatPill label="Conținut custom" value={CONTENT_SOURCE_STATS.customExerciseCount} tone="slate" />
        </div>

        <Card className="p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="rose">Critice: {severityCounts.critical}</Badge>
            <Badge variant="amber">Avertismente: {severityCounts.warning}</Badge>
            <Badge variant="slate">Info: {severityCounts.info}</Badge>
            <Badge variant="indigo">Exerciții: {kindCounts.exercise ?? 0}</Badge>
            <Badge variant="indigo">Lecții: {kindCounts.lesson ?? 0}</Badge>
            <Badge variant="indigo">Simulări: {kindCounts.simulation ?? 0}</Badge>
          </div>
          <p className="mt-2 text-sm text-slate-600">
            Default: {CONTENT_SOURCE_STATS.defaultExerciseCount} exerciții • Custom:{" "}
            {CONTENT_SOURCE_STATS.customExerciseCount} • Merged: {CONTENT_SOURCE_STATS.mergedExerciseCount}
          </p>
        </Card>

        <ContentManagerPanel
          key={`manager-${managerRefreshTick}`}
          title="Gestionare conținut"
          onApplied={() => {
            setManagerRefreshTick((prev) => prev + 1);
            window.location.reload();
          }}
        />

        {import.meta.env.DEV ? (
          <Card className="p-4">
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" onClick={applyAutoFix}>
                Aplică Auto-Fix (dev)
              </Button>
              {Object.keys(exerciseResult.modules ?? {}).map((moduleId) => (
                <Button
                  key={`download-${moduleId}`}
                  variant="secondary"
                  size="sm"
                  onClick={() => downloadPatchedModule(moduleId)}
                >
                  Descarcă {MODULE_LABELS[moduleId] ?? moduleId}
                </Button>
              ))}
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Pentru scriere automată în fișiere locale, rulează `npm run fix:content`.
            </p>
          </Card>
        ) : null}

        <Card className="p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Filter size={16} className="text-slate-600" />
            {moduleChips.map((moduleId) => (
              <Button
                key={moduleId}
                variant={moduleFilter === moduleId ? "primary" : "soft"}
                size="sm"
                onClick={() => setModuleFilter(moduleId)}
              >
                {MODULE_LABELS[moduleId] ?? moduleId}
              </Button>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button variant={kindFilter === "all" ? "primary" : "soft"} size="sm" onClick={() => setKindFilter("all")}>
              Toate categoriile
            </Button>
            <Button variant={kindFilter === "exercise" ? "secondary" : "soft"} size="sm" onClick={() => setKindFilter("exercise")}>
              Exerciții
            </Button>
            <Button variant={kindFilter === "lesson" ? "secondary" : "soft"} size="sm" onClick={() => setKindFilter("lesson")}>
              Lecții
            </Button>
            <Button variant={kindFilter === "simulation" ? "secondary" : "soft"} size="sm" onClick={() => setKindFilter("simulation")}>
              Simulări
            </Button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button variant={severityFilter === "all" ? "primary" : "soft"} size="sm" onClick={() => setSeverityFilter("all")}>
              Toate severitățile
            </Button>
            <Button variant={severityFilter === "critical" ? "danger" : "soft"} size="sm" onClick={() => setSeverityFilter("critical")}>
              Critice
            </Button>
            <Button variant={severityFilter === "warning" ? "secondary" : "soft"} size="sm" onClick={() => setSeverityFilter("warning")}>
              Avertismente
            </Button>
            <Button variant={severityFilter === "info" ? "secondary" : "soft"} size="sm" onClick={() => setSeverityFilter("info")}>
              Info
            </Button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <label className="relative min-w-[280px] flex-1">
              <Search size={16} className="pointer-events-none absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Caută după modul, path, itemId sau mesaj..."
                className="w-full rounded-2xl border border-slate-200 bg-white px-10 py-2.5"
              />
            </label>
            <Button variant="secondary" onClick={copyErrors}>
              <Copy size={16} /> Copiază erorile
            </Button>
            {filteredErrors.length > PREVIEW_LIMIT ? (
              <Button variant="soft" onClick={() => setShowAll((prev) => !prev)}>
                {showAll ? "Restrânge lista" : `Arată toate (${filteredErrors.length})`}
              </Button>
            ) : null}
          </div>

          <p className="mt-2 text-sm text-slate-600">
            Afișate: {visibleErrors.length} / {filteredErrors.length}
          </p>

          {visibleErrors.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {visibleErrors.map((error, index) => {
                const severity = getSeverity(error);
                return (
                  <li key={`${error.path}-${error.itemId ?? "none"}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <SeverityBadge severity={severity} />
                      <Badge variant="indigo">{getKindLabel(error.kind)}</Badge>
                      <p className="text-sm font-semibold text-slate-700">
                        {MODULE_LABELS[error.module] ?? error.module ?? "unknown"}
                      </p>
                      {error.itemId ? <Badge variant="slate">{error.itemId}</Badge> : null}
                    </div>
                    <p className="text-xs text-slate-500">Path: {error.path}</p>
                    <p className="mt-1 text-sm text-slate-700">{error.message}</p>
                    <p className="mt-1 text-xs text-slate-600">Sugestie: {getSuggestion(error)}</p>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-slate-600">Nu există erori pentru filtrul curent.</p>
          )}
        </Card>

        {stillInvalid.length > 0 ? (
          <Card className="border-amber-200 bg-amber-50 p-4">
            <h3 className="text-xl font-black text-amber-800">
              Itemi încă invalizi după Auto-Fix: {stillInvalid.length}
            </h3>
            <ul className="mt-2 space-y-1 text-sm text-amber-900">
              {stillInvalid.slice(0, 20).map((item) => (
                <li key={`${item.path}-${item.message}`}>
                  <span className="font-semibold">{item.path}</span> - {item.message}
                </li>
              ))}
            </ul>
          </Card>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-2">
          {samples.map((sample) => (
            <Card key={sample.moduleId} className="p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-indigo-600">{sample.moduleTitle}</p>
              <p className="mt-1 text-lg font-black text-slate-800">{sample.item.prompt}</p>
              <div className="mt-3">
                <VisualRenderer spec={sample.item.visualSpec} modalTitle={`Preview ${sample.moduleTitle}`} withModal />
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
