import { loadCustomContent, mergeSimulationConfigs } from "./customStore.js";

const DEFAULT_SIMULATION_CONFIGS = {
  fractions: {
    type: "fractions",
    defaults: {
      mode: "add",
      denom: 4,
      leftNumerator: 1,
      rightNumerator: 2,
    },
    constraints: {
      denoms: [2, 3, 4, 5, 6, 8, 10, 12],
      minNumerator: 0,
    },
  },
  percents: {
    type: "percents",
    defaults: {
      percent: 25,
      base: 100,
      method: "ten",
    },
    constraints: {
      percentMin: 0,
      percentMax: 100,
      baseMin: 0,
      baseMax: 2000,
    },
  },
  integers: {
    type: "integers",
    defaults: {
      mode: "add",
      start: -2,
      delta: 5,
    },
    constraints: {
      min: -20,
      max: 20,
    },
  },
  equations: {
    type: "equations",
    defaults: {
      type: "x_plus_a",
      stepIndex: 0,
    },
    constraints: {
      allowedTypes: ["x_plus_a", "x_minus_a", "ax_b", "x_div_a", "paren"],
    },
  },
};

const CUSTOM_CONTENT = loadCustomContent();

export const SIMULATION_CONFIGS = mergeSimulationConfigs(
  DEFAULT_SIMULATION_CONFIGS,
  CUSTOM_CONTENT,
);

export const DEFAULT_SIMULATION_TEMPLATE = DEFAULT_SIMULATION_CONFIGS;
