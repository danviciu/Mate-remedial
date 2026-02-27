import { useMemo } from "react";
import { ArrowLeftRight, FlaskConical, Percent, PieChart, Sigma } from "lucide-react";
import EquationSimulator from "./simulators/EquationSimulator.jsx";
import FractionSimulator from "./simulators/FractionSimulator.jsx";
import IntegerSimulator from "./simulators/IntegerSimulator.jsx";
import PercentSimulator from "./simulators/PercentSimulator.jsx";
import Modal from "../ui/Modal.jsx";

const ICONS = {
  fractions: PieChart,
  percents: Percent,
  integers: ArrowLeftRight,
  equations: Sigma,
};

const TITLES = {
  fractions: "Simulare fractii",
  percents: "Simulare procente",
  integers: "Simulare numere intregi",
  equations: "Simulare ecuatii",
};

function renderSimulator(moduleId) {
  if (moduleId === "fractions") return <FractionSimulator />;
  if (moduleId === "percents") return <PercentSimulator />;
  if (moduleId === "integers") return <IntegerSimulator />;
  if (moduleId === "equations") return <EquationSimulator />;
  return null;
}

export default function SimulationModal({ open, moduleId, onClose }) {
  const Icon = useMemo(() => ICONS[moduleId] ?? FlaskConical, [moduleId]);
  const title = TITLES[moduleId] ?? "Simulare";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      maxWidth="max-w-6xl"
      panelClassName="bg-white/98"
      ariaLabel={title}
    >
      <div className="mb-4 flex items-center gap-2">
        <span className="rounded-xl bg-cyan-100 p-2 text-cyan-700" aria-hidden="true">
          <Icon size={20} />
        </span>
        <p className="text-sm font-semibold text-slate-600">
          Ajusteaza valorile si observa imediat efectul.
        </p>
      </div>
      {renderSimulator(moduleId)}
    </Modal>
  );
}

