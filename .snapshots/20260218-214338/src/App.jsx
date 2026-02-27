import { useEffect, useState } from "react";
import PageTransition from "./animation/PageTransition.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import AdminContent from "./screens/AdminContent.jsx";
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

  let page = null;
  switch (path) {
    case "/diagnostic":
      page = <Diagnostic goHome={goHome} />;
      break;
    case "/paths":
      page = <Paths goHome={goHome} onGo={navigate} />;
      break;
    case "/lessons":
      page = (
        <Lessons
          key={`lessons-${routeState?.lessonId ?? "none"}-${routeState?.moduleId ?? "all"}`}
          goHome={goHome}
          initialLessonId={routeState?.lessonId ?? null}
          initialModuleId={routeState?.moduleId ?? null}
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
    case "/":
    default:
      page = <Home onGo={navigate} />;
      break;
  }

  return (
    <PageTransition routeKey={path}>
      <ErrorBoundary>{page}</ErrorBoundary>
    </PageTransition>
  );
}
