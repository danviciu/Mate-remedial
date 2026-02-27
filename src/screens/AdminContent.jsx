import { Database, Download, FileCode2, Settings2, Upload } from "lucide-react";
import ContentManagerPanel from "../components/content/ContentManagerPanel.jsx";
import { CONTENT_SOURCE_STATS } from "../content/index.js";
import { getCustomStorageKey } from "../content/customStore.js";
import MotionPage from "../components/ui/MotionPage.jsx";
import Badge from "../ui/Badge.jsx";
import Button from "../ui/Button.jsx";
import Card from "../ui/Card.jsx";
import SectionTitle from "../ui/SectionTitle.jsx";
import StatPill from "../ui/StatPill.jsx";

export default function AdminContent({ goHome }) {
  return (
    <MotionPage className="min-h-screen p-4 sm:p-6">
      <div className="mx-auto max-w-6xl">
        <Button variant="secondary" onClick={goHome}>
          ← Înapoi acasă
        </Button>

        <div className="mt-4">
          <SectionTitle
            title="Panou Administrator / Conținut"
            subtitle="Importă, exportă și validează conținut custom fără backend."
            icon={Settings2}
          />
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatPill
            label="Exerciții default"
            value={CONTENT_SOURCE_STATS.defaultExerciseCount}
            icon={FileCode2}
            tone="indigo"
          />
          <StatPill
            label="Exerciții custom"
            value={CONTENT_SOURCE_STATS.customExerciseCount}
            icon={Upload}
            tone="emerald"
          />
          <StatPill
            label="Lecții custom"
            value={CONTENT_SOURCE_STATS.customLessonCount}
            icon={Database}
            tone="amber"
          />
          <StatPill
            label="Simulări custom"
            value={CONTENT_SOURCE_STATS.customSimulationCount}
            icon={Download}
            tone="rose"
          />
        </div>

        <Card className="mt-3 p-4">
          <p className="text-sm text-slate-600">
            Întrebări TeamQuiz custom: {CONTENT_SOURCE_STATS.customTeamQuizCount ?? 0}
          </p>
        </Card>

        <Card className="mt-4 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={CONTENT_SOURCE_STATS.hasCustom ? "emerald" : "slate"}>
              {CONTENT_SOURCE_STATS.hasCustom ? "Sursă activă: custom + implicit" : "Sursă activă: implicit"}
            </Badge>
            <Badge variant="indigo">Cheie localStorage: {getCustomStorageKey()}</Badge>
          </div>
          <p className="mt-2 text-sm text-slate-600">
            Poți încărca JSON în formatul template. Dacă fișierul este valid, itemii acceptați se salvează
            local și suprascriu itemii impliciti după `id`.
          </p>
        </Card>

        <div className="mt-4">
          <ContentManagerPanel
            title="Gestionare conținut custom"
            onApplied={() => window.location.reload()}
          />
        </div>
      </div>
    </MotionPage>
  );
}
