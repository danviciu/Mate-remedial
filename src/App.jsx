import { useEffect, useState } from "react";
import {
  BookOpen,
  FileText,
  Home as HomeIcon,
  Route,
  Settings as SettingsIcon,
} from "lucide-react";
import PageTransition from "./animation/PageTransition.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import AdminContent from "./screens/AdminContent.jsx";
import AISession from "./screens/AISession.jsx";
import ContentQA from "./screens/ContentQA.jsx";
import Diagnostic from "./screens/Diagnostic.jsx";
import Home from "./screens/Home.jsx";
import Lessons from "./screens/Lessons.jsx";
import Paths from "./screens/Paths.jsx";
import Reports from "./screens/Reports.jsx";
import Settings from "./screens/Settings.jsx";
import TeacherMode from "./screens/TeacherMode.jsx";
import TeamQuiz from "./screens/TeamQuiz.jsx";
import AppLogo from "./ui/AppLogo.jsx";

const BASE_PATH = String(import.meta.env.BASE_URL ?? "/").replace(/\/+$/, "");

const ROUTE_ALIASES = {
  home: "/",
  diagnostic: "/diagnostic",
  paths: "/paths",
  lessons: "/lessons",
  learn: "/learn",
  team: "/team",
  teacher: "/teacher",
  admin: "/admin",
  reports: "/reports",
  settings: "/settings",
  qa: "/qa",
  aiSession: "/ai-session",
};

const MAIN_TABS = [
  { id: "home", title: "Acasa", path: "/", icon: HomeIcon },
  { id: "lessons", title: "Lectii", path: "/lessons", icon: BookOpen },
  { id: "paths", title: "Exerseaza", path: "/paths", icon: Route },
  { id: "reports", title: "Rapoarte", path: "/reports", icon: FileText },
  { id: "settings", title: "Setari", path: "/settings", icon: SettingsIcon },
];

function withBasePath(pathname) {
  const safe = String(pathname ?? "").startsWith("/")
    ? String(pathname ?? "")
    : `/${String(pathname ?? "")}`;
  if (!BASE_PATH || BASE_PATH === "/") return safe;
  if (safe === "/") return `${BASE_PATH}/`;
  return `${BASE_PATH}${safe}`;
}

function stripBasePath(pathname) {
  const safe = String(pathname ?? "").trim() || "/";
  if (!BASE_PATH || BASE_PATH === "/") return safe;
  if (safe === BASE_PATH) return "/";
  if (safe.startsWith(`${BASE_PATH}/`)) {
    return safe.slice(BASE_PATH.length) || "/";
  }
  return safe;
}

function parseLearnRoute(pathname) {
  const safe = stripBasePath(pathname);
  if (!safe.startsWith("/learn")) return null;

  const cleanPath = safe.replace(/\/+$/, "") || "/learn";
  const parts = cleanPath.split("/").filter(Boolean);
  if (parts.length === 1) {
    return {
      path: "/learn",
      grade: null,
      unitId: null,
      lessonNo: null,
    };
  }
  if (parts.length >= 4) {
    const grade = Number(parts[1]);
    const unitId = decodeURIComponent(parts[2] ?? "");
    const lessonNo = Number(parts[3]);
    if (
      Number.isInteger(grade) &&
      grade >= 5 &&
      grade <= 8 &&
      unitId &&
      Number.isInteger(lessonNo) &&
      lessonNo > 0
    ) {
      return {
        path: `/learn/${grade}/${encodeURIComponent(unitId)}/${lessonNo}`,
        grade,
        unitId,
        lessonNo,
      };
    }
  }
  return {
    path: "/learn",
    grade: null,
    unitId: null,
    lessonNo: null,
  };
}

function normalizePath(value) {
  if (!value) return "/";
  const safe = stripBasePath(value);
  if (safe === "/simulators") return "/paths";
  if (ROUTE_ALIASES[safe]) return ROUTE_ALIASES[safe];
  const learnRoute = parseLearnRoute(safe);
  if (learnRoute) return learnRoute.path;
  if (Object.values(ROUTE_ALIASES).includes(safe)) return safe;
  return "/";
}

function resolveTarget(target, stateArg) {
  if (typeof target === "string") {
    return { path: normalizePath(target), state: stateArg ?? null };
  }
  if (target && typeof target === "object") {
    const path = normalizePath(target.path ?? target.route ?? target.to);
    return { path, state: target.state ?? null };
  }
  return { path: "/", state: null };
}

function normalizeTopTabPath(pathname) {
  if (pathname.startsWith("/learn")) return "/lessons";
  const exact = MAIN_TABS.find((tab) => tab.path === pathname);
  if (exact) return exact.path;
  if (pathname === "/ai-session") return "/paths";
  return "/";
}

function TopTabs({ activePath, onNavigate }) {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
        <button
          type="button"
          onClick={() => onNavigate("/")}
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-3 py-2 text-cyan-100 transition hover:bg-slate-800"
          aria-label="Mergi la pagina principala"
        >
          <AppLogo size="sm" className="opacity-95" />
          <span className="font-display text-lg font-black">Mate Reset</span>
        </button>

        <nav className="min-w-0 flex-1">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {MAIN_TABS.map((tab) => {
              const Icon = tab.icon;
              const active = activePath === tab.path;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    if (tab.path === "/lessons") {
                      onNavigate({
                        path: "/lessons",
                        state: { moduleId: "manual" },
                      });
                      return;
                    }
                    onNavigate(tab.path);
                  }}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-black transition ${
                    active
                      ? "border-cyan-300 bg-cyan-500 text-slate-950"
                      : "border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
                  }`}
                >
                  <Icon size={16} />
                  {tab.title}
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </header>
  );
}

export default function App() {
  const [aiState, setAiState] = useState({
    learningPath: null,
    exerciseSet: null,
    solution: null,
    xpBonus: 0,
    lastSession: null,
    lastSessionKey: null,
  });
  const [path, setPath] = useState(() =>
    typeof window === "undefined" ? "/" : normalizePath(window.location.pathname),
  );
  const [routeState, setRouteState] = useState(() =>
    typeof window === "undefined" ? null : window.history.state?.appState ?? null,
  );

  useEffect(() => {
    const onPop = () => {
      setPath(normalizePath(window.location.pathname));
      setRouteState(window.history.state?.appState ?? null);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = (target, stateArg = null) => {
    const { path: nextPath, state: nextState } = resolveTarget(target, stateArg);
    const historyPath = withBasePath(nextPath);
    if (window.location.pathname !== historyPath) {
      window.history.pushState({ appState: nextState }, "", historyPath);
    } else {
      window.history.replaceState({ appState: nextState }, "", historyPath);
    }
    setPath(nextPath);
    setRouteState(nextState);
  };

  const goHome = () => navigate("/");
  const updateAiState = (patch) =>
    setAiState((prev) => ({
      ...prev,
      ...(typeof patch === "function" ? patch(prev) : patch),
    }));

  const handleAiSessionComplete = (result) => {
    if (!result) return;
    const sessionKey = result.sessionId ?? `${result.topic ?? "ai"}-${result.total ?? 0}-${result.score ?? 0}`;
    setAiState((prev) => {
      if (prev.lastSessionKey === sessionKey) return prev;
      return {
        ...prev,
        xpBonus: (prev.xpBonus ?? 0) + Math.max(0, Number(result.xpGained ?? 0)),
        lastSession: result,
        lastSessionKey: sessionKey,
      };
    });
  };

  let page = null;
  const learnRoute = parseLearnRoute(path);
  const activeTopTabPath = normalizeTopTabPath(path);

  if (learnRoute) {
    page = (
      <Lessons
        key={`learn-${learnRoute.grade ?? "all"}-${learnRoute.unitId ?? "none"}-${learnRoute.lessonNo ?? "none"}-${routeState?.lessonId ?? "none"}`}
        goHome={goHome}
        onGo={navigate}
        initialLessonId={routeState?.lessonId ?? null}
        initialModuleId="manual"
        initialManualGrade={learnRoute.grade}
        initialManualUnitId={learnRoute.unitId}
        initialManualLessonNo={learnRoute.lessonNo}
      />
    );
  } else {
    switch (path) {
      case "/diagnostic":
        page = <Diagnostic goHome={goHome} />;
        break;
      case "/paths":
        page = (
          <Paths
            key={`paths-${routeState?.moduleId ?? "none"}-${routeState?.levelId ?? "none"}-${routeState?.autoStart ? "auto" : "manual"}`}
            goHome={goHome}
            onGo={navigate}
            initialModuleId={routeState?.moduleId ?? null}
            initialLevelId={routeState?.levelId ?? null}
            autoStart={routeState?.autoStart === true}
          />
        );
        break;
      case "/lessons":
        page = (
          <Lessons
            key={`lessons-${routeState?.lessonId ?? "none"}-${routeState?.moduleId ?? "all"}-${routeState?.afterCompletePath ?? "none"}`}
            goHome={goHome}
            onGo={navigate}
            initialLessonId={routeState?.lessonId ?? null}
            initialModuleId={routeState?.moduleId ?? null}
            afterCompletePath={routeState?.afterCompletePath ?? null}
            afterCompleteState={routeState?.afterCompleteState ?? null}
          />
        );
        break;
      case "/team":
        page = <TeamQuiz goHome={goHome} />;
        break;
      case "/teacher":
        page = <TeacherMode goHome={goHome} onGo={navigate} />;
        break;
      case "/admin":
        page = <AdminContent goHome={goHome} />;
        break;
      case "/reports":
        page = <Reports goHome={goHome} />;
        break;
      case "/settings":
        page = <Settings goHome={goHome} />;
        break;
      case "/qa":
        page = <ContentQA goHome={goHome} />;
        break;
      case "/ai-session":
        page = (
          <AISession
            goHome={goHome}
            exerciseSet={aiState.exerciseSet}
            onSessionComplete={handleAiSessionComplete}
          />
        );
        break;
      case "/":
      default:
        page = <Home onGo={navigate} aiState={aiState} onAiStateChange={updateAiState} />;
        break;
    }
  }

  return (
    <>
      <TopTabs activePath={activeTopTabPath} onNavigate={navigate} />
      <div className="mx-auto w-full max-w-7xl px-2 pt-3 sm:px-4 sm:pt-4">
        <PageTransition routeKey={path}>
          <ErrorBoundary>{page}</ErrorBoundary>
        </PageTransition>
      </div>
    </>
  );
}
