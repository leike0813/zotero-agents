import input from "./piModelCatalogMigration.json";
import type {
  PiCatalogModel,
  PiProviderConfigurationState,
} from "../shared/piProviderContract";

/** Frozen original connection facts, read only for already saved configurations. */
export function configuredPiMigrationModels(
  state: PiProviderConfigurationState,
): PiCatalogModel[] {
  const selected = new Set(
    state.configurations
      .filter((config) => !config.binding)
      .map((config) => config.provider + "\n" + config.modelId),
  );
  for (const selection of Object.values(state.defaults)) {
    const config = state.configurations.find(
      (config) => config.id === selection?.configurationId,
    );
    if (config && !config.binding && selection?.modelId)
      selected.add(config.provider + "\n" + selection.modelId);
  }
  return input.rows
    .filter((row) => selected.has(String(row[0]) + "\n" + String(row[1])))
    .map((row) => ({
      provider: String(row[0]),
      id: String(row[1]),
      name: String(row[2]),
      api: String(row[3]),
      baseUrl: String(row[4]),
      contextWindow: Number(row[5]),
      maxTokens: Number(row[6]),
      input: row[7] as string[],
      supportsTools: row[8] === true,
      reasoning: row[9] as string[],
      source: "retained",
      provenance: {
        source: "retained",
        revision: input.source,
        schemaVersion: 1,
      },
    }));
}
