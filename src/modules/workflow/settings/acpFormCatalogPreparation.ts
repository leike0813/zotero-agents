import type { BackendInstance } from "../../../backends/types";
import { computeAcpBackendConfigFingerprint } from "../../../backends/identity";
import { resolveAcpReasoningCatalog } from "../../acp/chat/acpReasoningCatalog";
import { probeAcpBackendRuntimeOptions } from "../../acp/transport/acpBackendProbe";
import { createCancellationController } from "../../../utils/wait";

export function createAcpFormCatalogPreparation(
  args: {
    probe?: typeof probeAcpBackendRuntimeOptions;
  } = {},
) {
  let generation = 0;
  let disposed = false;
  let tail: Promise<unknown> = Promise.resolve();
  let active: ReturnType<typeof createCancellationController> | undefined;
  let key = "";
  let state: "loading" | "ready" | "error" = "ready";
  let error = "";
  let pending:
    | Promise<Awaited<ReturnType<typeof probeAcpBackendRuntimeOptions>> | null>
    | undefined;

  const identity = (
    backend: BackendInstance,
    options: Record<string, unknown>,
  ) => {
    return JSON.stringify([
      backend.id,
      computeAcpBackendConfigFingerprint(backend),
      options.acpModeId || "",
      options.acpModelId || "",
    ]);
  };

  return {
    snapshot() {
      return { state, error };
    },
    matches(backend: BackendInstance, options: Record<string, unknown>) {
      return !disposed && key === identity(backend, options);
    },
    prepare(
      backend: BackendInstance,
      options: Record<string, unknown>,
      force = false,
    ) {
      if (disposed) return Promise.resolve(null);
      const nextKey = identity(backend, options);
      if (!force && nextKey === key && pending) return pending;
      active?.abort();
      const owner = ++generation;
      key = nextKey;
      error = "";
      const catalog = resolveAcpReasoningCatalog({ backend, options });
      if (!force && catalog.state === "ready") {
        state = "ready";
        pending = undefined;
        return Promise.resolve({ ok: true, backend, error: undefined });
      }
      state = "loading";
      const cancellation = createCancellationController();
      active = cancellation;
      const startedAt = Date.now();
      pending = tail
        .catch(() => undefined)
        .then(async () => {
          if (disposed || owner !== generation) return null;
          const remaining = 60_000 - (Date.now() - startedAt);
          const result =
            remaining > 0
              ? await (args.probe || probeAcpBackendRuntimeOptions)({
                  backend,
                  selectedOptions: {
                    ...(options.acpModeId
                      ? { acpModeId: String(options.acpModeId) }
                      : {}),
                    ...(options.acpModelId
                      ? { acpModelId: String(options.acpModelId) }
                      : {}),
                  },
                  signal: cancellation.signal,
                  timeoutMs: remaining,
                }).catch((failure: unknown) => ({
                  ok: false,
                  backend,
                  error:
                    failure instanceof Error
                      ? failure.message
                      : String(failure),
                }))
              : {
                  ok: false,
                  backend,
                  error: "ACP catalog preparation timed out.",
                };
          if (disposed || owner !== generation) return null;
          state = result.ok ? "ready" : "error";
          error = result.error || "";
          pending = undefined;
          return result;
        });
      tail = pending;
      return pending;
    },
    cancel() {
      generation += 1;
      active?.abort();
      key = "";
      pending = undefined;
      state = "ready";
      error = "";
    },
    dispose() {
      disposed = true;
      generation += 1;
      active?.abort();
    },
  };
}
