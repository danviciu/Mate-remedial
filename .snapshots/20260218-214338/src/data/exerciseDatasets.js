import { CONTENT_DATASETS } from "../content/index.js";

export const DATASET_CONFIGS = CONTENT_DATASETS;

export function getDatasetByKey(datasetKey) {
  return DATASET_CONFIGS[datasetKey] ?? null;
}

export function getDatasetItems(datasetKey) {
  return DATASET_CONFIGS[datasetKey]?.items ?? [];
}
