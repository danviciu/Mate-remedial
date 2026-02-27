import { useEffect, useState } from "react";
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
import Simulators from "./screens/Simulators.jsx";
import TeacherMode from "./screens/TeacherMode.jsx";
import TeamQuiz from "./screens/TeamQuiz.jsx";
import AppLogo from "./ui/AppLogo.jsx";

const ROUTE_ALIASES = {
  home: "/",
  diagnostic: "/diagnostic",
  paths: "/paths",
  lessons: "/lessons",
  simulators: "/simulators",
  team: "/team",
  teacher: "/teacher",
  admin: "/admin",
  reports: "/reports",
  settings: "/settings",
  qa: "/qa",
  aiSession: "/ai-session",
};

function normalizePath(value) {
  if (!value) return "/";
  if (ROUTE_ALIASES[value]) return ROUTE_ALIASES[value];
  if (Object.values(ROUTE_ALIASES).includes(value)) return value;
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
    if (window.location.pathname !== nextPath) {
      window.history.pushState({ appState: nextState }, "", nextPath);
    } else {
      window.history.replaceState({ appState: nextState }, "", nextPath);
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
    case "/simulators":
      page = (
        <Simulators
          key={`sim-${routeState?.simulatorId ?? "fractions"}`}
          goHome={goHome}
          initialSimulator={routeState?.simulatorId ?? "fractions"}
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

  return (
    <PageTransition routeKey={path}>
      <div className="pointer-events-none fixed right-3 top-3 z-[70] print:hidden sm:right-5 sm:top-5">
        <AppLogo size="sm" className="opacity-95" />
      </div>
      <ErrorBoundary>{page}</ErrorBoundary>
    </PageTransition>
  );
}
