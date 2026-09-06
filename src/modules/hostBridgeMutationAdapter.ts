import type {
  JsonObject,
  MutationExecuteRequest,
  MutationExecutionResult,
  MutationPreviewResult,
  WorkflowCallControl,
} from "../workflows/types";
import {
  assertWorkflowCallNotCanceled,
  createWorkflowHostError,
} from "../workflows/workflowHostErrorContract";
import {
  getZoteroHostCanonicalMutationControl,
  type BrokerTrustedMutationResources,
  type DeferredPreparedStoredAttachment,
  type ZoteroHostCanonicalMutationControl,
  type ZoteroHostCapabilityBroker,
} from "./zoteroHostCapabilityBroker";
import type { PreparedStoredAttachment } from "./zoteroHostPreparedFiles";

export const HOST_BRIDGE_MUTATION_CALLER_SCOPE = {
  ownerId: "host-bridge",
} as const;

export type HostBridgeCanonicalMutationApproval = (
  preview: MutationPreviewResult<JsonObject>,
) => Promise<void> | void;

function throwIfCanceled(control?: WorkflowCallControl) {
  assertWorkflowCallNotCanceled(control);
}

function cachePreparedMutationResources(
  resources?: BrokerTrustedMutationResources,
): BrokerTrustedMutationResources | undefined {
  const deferred = resources?.deferredStoredAttachment;
  const preparedFiles = resources?.preparedFiles;
  if (!deferred || !preparedFiles) return resources;

  let prepared: PreparedStoredAttachment | null = null;
  const cachedDeferred: DeferredPreparedStoredAttachment = {
    async prepare(control) {
      throwIfCanceled(control);
      if (!prepared) {
        prepared = await deferred.prepare(control);
        return prepared;
      }
      await preparedFiles.resolveStoredAttachment(prepared);
      throwIfCanceled(control);
      return prepared;
    },
  };
  return {
    ...resources,
    deferredStoredAttachment: cachedDeferred,
  };
}

export async function executeHostBridgeCanonicalMutation(args: {
  broker: ZoteroHostCapabilityBroker;
  request: MutationExecuteRequest;
  control?: WorkflowCallControl;
  resources?: BrokerTrustedMutationResources;
  approve?: HostBridgeCanonicalMutationApproval;
  mutationControl?: ZoteroHostCanonicalMutationControl;
}): Promise<MutationExecutionResult<JsonObject>> {
  const resources = cachePreparedMutationResources(args.resources);
  let result: MutationExecutionResult<JsonObject> | undefined;
  let primaryError: unknown;
  let hasPrimaryError = false;
  let cleanupError: unknown;
  // The Broker receives ownership before execute(), and must settle cleanup
  // before it persists the canonical terminal result.
  let adapterOwnsResources = true;
  try {
    result = await runCanonicalMutation({
      ...args,
      resources,
      mutationControl:
        args.mutationControl ||
        getZoteroHostCanonicalMutationControl(args.broker),
      fallbackTransferPreparedFileOwnership: Boolean(args.mutationControl),
      transferPreparedFileOwnership: () => {
        adapterOwnsResources = false;
      },
    });
  } catch (error) {
    hasPrimaryError = true;
    primaryError = error;
  } finally {
    if (adapterOwnsResources) {
      try {
        await args.resources?.preparedFiles?.dispose();
      } catch (error) {
        cleanupError = error;
      }
    }
  }

  if (hasPrimaryError) {
    throw primaryError;
  }
  if (cleanupError !== undefined) {
    throw createWorkflowHostError(
      "execution_failed",
      "Prepared Host Bridge resource cleanup failed",
      { phase: "cleanup", recovery: "retry_same_operation" },
    );
  }
  if (!result) {
    throw createWorkflowHostError(
      "execution_failed",
      "Host Bridge canonical mutation produced no result",
      { phase: "adapter", recovery: "reconcile" },
    );
  }
  return result;
}

async function runCanonicalMutation(args: {
  request: MutationExecuteRequest;
  control?: WorkflowCallControl;
  resources?: BrokerTrustedMutationResources;
  approve?: HostBridgeCanonicalMutationApproval;
  mutationControl: ZoteroHostCanonicalMutationControl;
  fallbackTransferPreparedFileOwnership: boolean;
  transferPreparedFileOwnership(): void;
}): Promise<MutationExecutionResult<JsonObject>> {
  const prepare = () =>
    args.mutationControl.prepare({
      input: args.request,
      scope: HOST_BRIDGE_MUTATION_CALLER_SCOPE,
      resources: args.resources,
      control: args.control,
    });
  throwIfCanceled(args.control);
  let prepared = await prepare();
  if (prepared.state === "settled") return prepared.result;
  if (!args.approve) {
    const execution = args.mutationControl.execute({
      input: args.request,
      scope: HOST_BRIDGE_MUTATION_CALLER_SCOPE,
      prepared: prepared.prepared,
      control: args.control,
      onPreparedFileOwnershipTransferred: args.transferPreparedFileOwnership,
    }) as Promise<MutationExecutionResult<JsonObject>>;
    if (args.fallbackTransferPreparedFileOwnership) {
      args.transferPreparedFileOwnership();
    }
    return await execution;
  }

  for (;;) {
    throwIfCanceled(args.control);
    await args.approve(prepared.preview as MutationPreviewResult<JsonObject>);
    throwIfCanceled(args.control);
    const revalidated = await prepare();
    if (revalidated.state === "settled") return revalidated.result;
    if (
      revalidated.preview.domainPlanDigest === prepared.preview.domainPlanDigest
    ) {
      const execution = args.mutationControl.execute({
        input: args.request,
        scope: HOST_BRIDGE_MUTATION_CALLER_SCOPE,
        prepared: revalidated.prepared,
        control: args.control,
        onPreparedFileOwnershipTransferred: args.transferPreparedFileOwnership,
      }) as Promise<MutationExecutionResult<JsonObject>>;
      if (args.fallbackTransferPreparedFileOwnership) {
        args.transferPreparedFileOwnership();
      }
      return await execution;
    }
    prepared = revalidated;
  }
}
