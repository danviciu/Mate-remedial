import { motion as Motion } from "framer-motion";
import MotionCard from "../components/ui/MotionCard.jsx";
import MotionProgress from "../components/ui/MotionProgress.jsx";
import { normalizeLevelId } from "../data/modulesConfig.js";
import { shouldReduceMotion, staggerContainer, staggerItem } from "../lib/motion.js";

function getLevelStats(progress, moduleId, level) {
  return (
    progress?.modules?.[moduleId]?.levels?.[normalizeLevelId(level.id ?? level.level)] ?? {
      completedCount: 0,
      totalCount: 0,
      accuracyPct: 0,
      avgAttempts: 0,
      hintsUsed: 0,
      bestStreak: 0,
      stars: 0,
    }
  );
}

function isLevelUnlocked(levels, index, progress, moduleId, lockLevels) {
  if (!lockLevels || index === 0) return true;
  const previousLevel = levels[index - 1];
  const stats = getLevelStats(progress, moduleId, previousLevel);
  return stats.totalCount > 0 && stats.completedCount >= stats.totalCount;
}

export default function LevelSelect({
  module,
  progress,
  lockLevels,
  onBack,
  onStartLevel,
  onOpenLesson,
}) {
  const reducedMotion = shouldReduceMotion();

  return (
    <div className="bg-white/80 backdrop-blur rounded-2xl shadow-lg p-6 transition-all duration-300">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-indigo-700">{module.title}</h2>
          <p className="text-gray-600">{module.description}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onOpenLesson?.(module.levels[0]?.id)}
              className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-indigo-700"
            >
              Lectie animata
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 rounded-xl bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 transition"
        >
          &larr; Inapoi la module
        </button>
      </div>

      <Motion.div
        className="grid sm:grid-cols-2 gap-4"
        variants={staggerContainer}
        initial={reducedMotion ? false : "hidden"}
        animate="show"
      >
        {module.levels.map((level, index) => {
          const stats = getLevelStats(progress, module.id, level);
          const unlocked = isLevelUnlocked(module.levels, index, progress, module.id, lockLevels);
          const playable = level.playable !== false;
          const disabled = !playable || !unlocked;

          const completionPct =
            stats.totalCount > 0
              ? Math.round((stats.completedCount / stats.totalCount) * 100)
              : 0;

          const stars = Math.round(stats.stars || 0);

          return (
            <Motion.div key={`${module.id}-level-${level.level}`} variants={staggerItem}>
              <MotionCard
                as="button"
                type="button"
                disabled={disabled}
                onClick={() => onStartLevel(level)}
                className={`w-full text-left p-5 text-white shadow-lg min-h-36 ${
                  disabled
                    ? "bg-gradient-to-br from-slate-400 to-slate-500 opacity-70 cursor-not-allowed"
                    : "bg-gradient-to-br from-indigo-500 to-purple-500"
                }`}
              >
                <p className="text-sm opacity-90">Nivel {level.level}</p>
                <p className="text-lg font-semibold mt-1">{level.title}</p>

                <div className="mt-4">
                  <p className="text-xs opacity-90 mb-1">
                    Progres: {stats.completedCount}/{stats.totalCount || "?"} ({completionPct}%)
                  </p>
                  <MotionProgress
                    value={completionPct}
                    className="bg-white/30"
                    barClassName="bg-white"
                  />
                </div>

                <p className="mt-3 text-sm opacity-95">Acuratete: {stats.accuracyPct || 0}%</p>
                <p className="text-sm opacity-95">Stele: {"*".repeat(stars || 0)}</p>

                {!disabled ? (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onOpenLesson?.(level.id ?? level.level);
                    }}
                    className="mt-3 rounded-lg bg-white/20 px-3 py-2 text-xs font-semibold uppercase tracking-wide hover:bg-white/30"
                  >
                    Lectia nivelului
                  </button>
                ) : null}

                {!playable ? (
                  <p className="mt-2 text-xs font-semibold uppercase tracking-wide">In curand</p>
                ) : null}

                {playable && !unlocked ? (
                  <p className="mt-2 text-xs font-semibold uppercase tracking-wide">Blocat</p>
                ) : null}
              </MotionCard>
            </Motion.div>
          );
        })}
      </Motion.div>
    </div>
  );
}

