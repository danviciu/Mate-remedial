import { useState } from "react";
import { ArrowLeftRight, FlaskConical, Percent, PieChart, Sigma } from "lucide-react";
import SimulationModal from "../components/SimulationModal.jsx";
import MotionPage from "../components/ui/MotionPage.jsx";
import Button from "../ui/Button.jsx";
import Card from "../ui/Card.jsx";
import SectionTitle from "../ui/SectionTitle.jsx";

const ITEMS = [
  {
    id: "fractions",
    title: "Simulare fractii",
    icon: PieChart,
    desc: "Adunare, scadere si comparare vizuala.",
  },
  {
    id: "percents",
    title: "Simulare procente",
    icon: Percent,
    desc: "Grila 10x10 si procent dintr-un numar.",
  },
  {
    id: "integers",
    title: "Simulare numere intregi",
    icon: ArrowLeftRight,
    desc: "Miscare pe axa pentru adunare si scadere.",
  },
  {
    id: "equations",
    title: "Simulare ecuatii",
    icon: Sigma,
    desc: "Model de balanta si pasi de izolare a lui x.",
  },
];

export default function Simulators({ goHome, initialSimulator = "fractions" }) {
  const [active, setActive] = useState(() => initialSimulator || null);

  return (
    <MotionPage className="min-h-screen p-4 sm:p-6">
      <div className="mx-auto max-w-6xl">
        <Button variant="secondary" onClick={goHome}>
          Inapoi acasa
        </Button>

        <div className="mt-4">
          <SectionTitle
            title="Simulari interactive"
            subtitle="Manipuleaza valorile si urmareste schimbarea in timp real."
            icon={FlaskConical}
          />
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <Card
                key={item.id}
                as="button"
                type="button"
                interactive
                onClick={() => setActive(item.id)}
                className="w-full p-4 text-left"
              >
                <div className="inline-flex rounded-xl bg-cyan-100 p-2 text-cyan-700">
                  <Icon size={20} />
                </div>
                <p className="mt-2 text-lg font-black text-slate-800">{item.title}</p>
                <p className="mt-1 text-sm text-slate-600">{item.desc}</p>
              </Card>
            );
          })}
        </div>

        <SimulationModal open={Boolean(active)} moduleId={active} onClose={() => setActive(null)} />
      </div>
    </MotionPage>
  );
}

