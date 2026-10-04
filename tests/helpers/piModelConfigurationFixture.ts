import {
  upsertPiModelConfiguration,
  upsertPiProviderConnection,
} from "../../src/modules/piProviderConfiguration";
import type { PiCatalogModel } from "../../src/shared/piProviderContract";
import type {
  PiProviderConnection,
  PiReasoningLevel,
} from "../../src/shared/piProviderContract";

type CatalogLike = { models: PiCatalogModel[] };

/**
 * Saves a connection and its single model card in one call.
 *
 * Domain regressions care about what a run selects, not about how a user
 * splits a provider into a connection and its cards. The card takes the same id
 * as the connection, so a selection written as one id keeps naming the same
 * thing after the split and the assertions stay about behavior.
 */
export function savePiModelFixture(
  raw: PiProviderConnection & {
    modelId: string;
    reasoning?: PiReasoningLevel;
  },
  catalog?: CatalogLike,
): void {
  const { modelId, reasoning, ...connection } = raw;
  upsertPiProviderConnection(connection);
  upsertPiModelConfiguration(
    {
      id: connection.id,
      connectionId: connection.id,
      modelId,
      enabled: connection.enabled,
      ...(reasoning ? { reasoning } : {}),
    },
    catalog,
  );
}
