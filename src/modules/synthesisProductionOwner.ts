import type { SynthesisCutoverReceipt } from "../../packages/synthesis-contracts/src";
import { invalidateDefaultSynthesisClient } from "./synthesisClient/defaultClient";

type ReverseHostEndpoint = {
  start(): Promise<unknown>;
  stop(): Promise<void>;
};

type CutoverCoordinator = {
  run(): Promise<{
    status: "mutation_enabled";
    receipt: SynthesisCutoverReceipt;
  }>;
};

export type SynthesisProductionOwnerDeps = {
  createReverseHostEndpoint(): ReverseHostEndpoint;
  createCutoverCoordinator(endpoint: ReverseHostEndpoint): CutoverCoordinator;
  stopProductionSupervisor(): Promise<void>;
  invalidateClient?: () => void;
};

export function createSynthesisProductionOwner(
  deps: SynthesisProductionOwnerDeps,
) {
  let endpoint: ReverseHostEndpoint | null = null;
  let startTask: Promise<SynthesisCutoverReceipt> | null = null;
  let stopTask: Promise<void> | null = null;
  let stopped = false;

  function start() {
    if (stopped) {
      throw new Error("synthesis_production_owner_stopped");
    }
    startTask ||= (async () => {
      endpoint = deps.createReverseHostEndpoint();
      await endpoint.start();
      const result = await deps.createCutoverCoordinator(endpoint).run();
      return result.receipt;
    })();
    void startTask.catch(() => undefined);
    return startTask;
  }

  function shutdown() {
    if (stopTask) {
      return stopTask;
    }
    stopped = true;
    (deps.invalidateClient || invalidateDefaultSynthesisClient)();
    stopTask = (async () => {
      await endpoint?.stop();
      await deps.stopProductionSupervisor();
    })();
    return stopTask;
  }

  return {
    start,
    whenReady() {
      return start();
    },
    shutdown,
  };
}
