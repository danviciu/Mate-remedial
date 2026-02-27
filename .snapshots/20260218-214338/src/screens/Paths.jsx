import { useMemo, useState } from "react";
import { AnimatePresence, motion as Motion } from "framer-motion";
import { BookOpen, FlaskConical, Route } from "lucide-react";
import MotionPage from "../components/ui/MotionPage.jsx";
import { MODULES } from "../data/modulesConfig.js";
import { getLessonIdForLevel, MODULE_DEFAULT_LESSON } from "../lessons/lessonsData.js";
import {
  pageVariants,
  shouldReduceMotion,
  staggerContainer,
  staggerItem,
} from "../lib/motion.js";
import { getModuleCompletion } from "../utils/progressStore.js";
import { useProgress } from "../utils/useProgress.js";
import Button from "../ui/Button.jsx";
import Card from "../ui/Card.jsx";
import ProgressBar from "../ui/ProgressBar.jsx";
import SectionTitle from "../ui/SectionTitle.jsx";
import LevelSelect from "./LevelSelect.jsx";
import Player from "./Player.jsx";

const CARD_COLORS = {
  fractions: "from-blue-500 to-indigo-500",
  percents: "from-emerald-500 to-teal-500",
  integers: "from-orange-500 to-rose-500",
  equations: "from-cyan-500 to-sky-500",
};

export default function Paths({ goHome, onGo }) {
  const reducedMotion = shouldReduceMotion();
  const progress = useProgress();
  const [selectedModuleId, setSelectedModuleId] = useState(null);
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [lockLevels, setLockLevels] = useState(true);

  const selectedModule = useMemo(
    () => MODULES.find((item) => item.id === selectedModuleId) ?? null,
    [selectedModuleId],
  );

  const goToModules = () => {
    setSelectedLevel(null);
    setSelectedModuleId(null);
  };

  const goToLevels = () => {
    setSelectedLevel(null);
  };

  const launchLesson = (moduleId, levelId = null) => {
    const lessonId = levelId
      ? getLessonIdForLevel(moduleId, levelId)
      : MODULE_DEFAULT_LESSON[moduleId] ?? null;
    onGo({ path: "/lessons", state: { lessonId, moduleId } });
  };

  const launchSimulator = (moduleId) => {
    onGo({ path: "/simulators", state: { simulatorId: moduleId ?? "fractions" } });
  };

  return (
    <MotionPage className="min-h-screen p-4 sm:p-6">
      <div className="mx-auto max-w-6xl">
        <Button variant="secondary" onClick={goHome}>
          ← Înapoi acasă
        </Button>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <SectionTitle
            title="Trasee de învățare"
            subtitle="Alege un modul și parcurge nivelurile ghidate."
            icon={Route}
          />

          <label className="flex items-center gap-2 rounded-xl border border-indigo-200 bg-white/80 px-3 py-2 text-sm font-semibold text-indigo-700">
            <input
              type="checkbox"
              checked={lockLevels}
              onChange={(event) => setLockLevels(event.target.checked)}
            />
            Blochează nivelurile în ordine
          </label>
        </div>

        <Card className="mt-4 p-4">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => launchLesson(selectedModule?.id ?? "fractions")}
            >
              <BookOpen size={18} /> Lecție animată
            </Button>
            <Button
              variant="secondary"
              onClick={() => launchSimulator(selectedModule?.id ?? "fractions")}
            >
              <FlaskConical size={18} /> Simulare interactivă
            </Button>
          </div>
        </Card>

        <AnimatePresence mode="wait">
          {!selectedModule ? (
            <Motion.div
              key="modules-grid"
              className="mt-5 grid gap-4 md:grid-cols-2"
              variants={staggerContainer}
              initial={reducedMotion ? false : "hidden"}
              animate="show"
              exit={reducedMotion ? undefined : "hidden"}
            >
              {MODULES.map((module) => {
                const completionPct = getModuleCompletion(progress, module.id);
                return (
                  <Motion.div key={module.id} variants={staggerItem}>
                    <Card
                      as="button"
                      type="button"
                      interactive
                      onClick={() => setSelectedModuleId(module.id)}
                      className={`min-h-48 w-full bg-gradient-to-br ${CARD_COLORS[module.id] ?? "from-slate-600 to-slate-700"} p-6 text-left text-white`}
                    >
                      <h2 className="font-display text-3xl font-black">{module.title}</h2>
                      <p className="mt-2 text-base text-white/90">{module.description}</p>
                      <div className="mt-5">
                        <p className="mb-1 text-sm font-semibold">Progres: {completionPct}%</p>
                        <ProgressBar
                          value={completionPct}
                          trackClassName="bg-white/30"
                          fillClassName="from-white via-cyan-100 to-white"
                        />
                      </div>
                    </Card>
                  </Motion.div>
                );
              })}
            </Motion.div>
          ) : null}

          {selectedModule && !selectedLevel ? (
            <Motion.div
              key={`levels-${selectedModule.id}`}
              variants={pageVariants}
              initial={reducedMotion ? false : "hidden"}
              animate="show"
              exit={reducedMotion ? undefined : "exit"}
              className="mt-5"
            >
              <LevelSelect
                module={selectedModule}
                progress={progress}
                lockLevels={lockLevels}
                onBack={goToModules}
                onStartLevel={setSelectedLevel}
                onOpenLesson={(levelId) => launchLesson(selectedModule.id, levelId)}
                onOpenSimulator={() => launchSimulator(selectedModule.id)}
              />
            </Motion.div>
          ) : null}

          {selectedModule && selectedLevel ? (
            <Motion.div
              key={`player-${selectedModule.id}-${selectedLevel.id ?? selectedLevel.level}`}
              variants={pageVariants}
              initial={reducedMotion ? false : "hidden"}
              animate="show"
              exit={reducedMotion ? undefined : "exit"}
              className="mt-5"
            >
              <Player
                module={selectedModule}
                level={selectedLevel}
                onBack={goToLevels}
                onOpenLesson={() =>
                  launchLesson(selectedModule.id, selectedLevel.id ?? selectedLevel.level)
                }
                onOpenSimulator={() => launchSimulator(selectedModule.id)}
              />
            </Motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </MotionPage>
  );
}
