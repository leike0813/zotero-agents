import {
  SynthesisClientError,
  type SynthesisClient,
  type SynthesisDatabaseResetRequest,
  type SynthesisDatabaseResetResult,
  type SynthesisRelatedItemsEchoRequest,
  type SynthesisStartupReconcileResult,
  type SynthesisWorkflowTopicOptionsRequest,
  type SynthesisWorkflowTopicOptionsResult,
} from "../../../packages/synthesis-contracts/src/index";

export interface LegacySynthesisTopicPort {
  listWorkflowTopicOptions(
    request?: SynthesisWorkflowTopicOptionsRequest,
  ): Promise<SynthesisWorkflowTopicOptionsResult>;
  reconcileSynthesisRuntimeWorkStateOnStartup?(): SynthesisStartupReconcileResult;
  resetSynthesisDatabase?(
    request: SynthesisDatabaseResetRequest,
  ): Promise<SynthesisDatabaseResetResult>;
  consumeRelatedItemsSyncEcho?(
    request: SynthesisRelatedItemsEchoRequest,
  ): Promise<unknown>;
}

function normalizeClientError(error: unknown): SynthesisClientError {
  if (error instanceof SynthesisClientError) {
    return error;
  }
  return new SynthesisClientError(
    "internal",
    error instanceof Error ? error.message : "Synthesis client request failed",
    {
      causeName: error instanceof Error ? error.name : typeof error,
    },
  );
}

export function createInProcessSynthesisClient(
  legacy: LegacySynthesisTopicPort,
): SynthesisClient {
  return {
    topics: {
      async listWorkflowOptions(request) {
        try {
          return await legacy.listWorkflowTopicOptions(request);
        } catch (error) {
          throw normalizeClientError(error);
        }
      },
    },
    system: {
      async reconcileRuntimeWorkOnStartup() {
        try {
          if (!legacy.reconcileSynthesisRuntimeWorkStateOnStartup) {
            throw new SynthesisClientError(
              "unavailable",
              "Synthesis startup reconciliation is unavailable",
            );
          }
          return legacy.reconcileSynthesisRuntimeWorkStateOnStartup();
        } catch (error) {
          throw normalizeClientError(error);
        }
      },
    },
    maintenance: {
      async resetDatabase(request) {
        try {
          if (!legacy.resetSynthesisDatabase) {
            throw new SynthesisClientError(
              "unavailable",
              "Synthesis database reset is unavailable",
            );
          }
          return await legacy.resetSynthesisDatabase(request);
        } catch (error) {
          throw normalizeClientError(error);
        }
      },
    },
    notifications: {
      async consumeRelatedItemsSyncEcho(request) {
        try {
          if (!legacy.consumeRelatedItemsSyncEcho) {
            throw new SynthesisClientError(
              "unavailable",
              "Synthesis notification handling is unavailable",
            );
          }
          return {
            consumed: Boolean(
              await legacy.consumeRelatedItemsSyncEcho(request),
            ),
          };
        } catch (error) {
          throw normalizeClientError(error);
        }
      },
    },
  };
}
