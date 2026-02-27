import {
  ArrowLeftRight,
  BookOpen,
  FlaskConical,
  Percent,
  PieChart,
  Settings2,
  Sigma,
  TestTubeDiagonal,
  Trophy,
} from "lucide-react";

const ICONS = {
  fractions: PieChart,
  percents: Percent,
  integers: ArrowLeftRight,
  equations: Sigma,
  lessons: BookOpen,
  simulations: FlaskConical,
  diagnostic: TestTubeDiagonal,
  reports: Trophy,
  settings: Settings2,
};

export default function Icon({ name, size = 18, ...props }) {
  const Component = ICONS[name] ?? BookOpen;
  return <Component size={size} {...props} />;
}
