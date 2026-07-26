import type { AcpRuntimeReplayCancellationSignal } from "./acpRuntimeReplayProfiler";

export type AcpRuntimeReplayPublicationTab =
  | "acp-chat"
  | "acp-skills"
  | "skillrunner";
type AcpRuntimeReplayPublicationSurface = Exclude<
  AcpRuntimeReplayPublicationTab,
  "skillrunner"
>;

export type AcpRuntimeReplayPublicationWindow = {
  addEventListener: (
    type: string,
    listener: (event: { data?: unknown; source?: unknown }) => void,
  ) => void;
  removeEventListener: (
    type: string,
    listener: (event: { data?: unknown; source?: unknown }) => void,
  ) => void;
};

export type AcpRuntimeReplayPublicationLifecycle = {
  publicationId: string;
  source: AcpRuntimeReplayPublicationSurface;
  deliverySequence: number;
  state: "pending" | "render-complete" | "rejected";
  reason?: string;
  failure?: {
    stage: string;
    code: string;
  };
};

export type AcpRuntimeReplayPublicationInspection = {
  childWindow: AcpRuntimeReplayPublicationWindow | null;
  publications: readonly AcpRuntimeReplayPublicationLifecycle[];
  detail?: string;
};

export type AcpRuntimeReplayForcedPublication = {
  source: AcpRuntimeReplayPublicationSurface;
  publicationId: string;
  deliverySequence: number;
};

type PublicationResult = { ok: boolean; detail?: string };
type PublicationEpochResult = PublicationResult & {
  watermarks?: {
    "acp-chat": number;
    "acp-skills": number;
  };
};

const DEFAULT_TIMEOUT_MS = 10_000;
const INSPECTION_INTERVAL_MS = 16;
const PUBLICATION_RETRY_INTERVAL_MS = 100;

export function drainAcpRuntimeReplayPublicationEpoch(args: {
  signal?: AcpRuntimeReplayCancellationSignal;
  timeoutMs?: number;
  inspect: () => AcpRuntimeReplayPublicationInspection;
}): Promise<PublicationEpochResult> {
  const timeoutMs = Math.max(1, Number(args.timeoutMs) || DEFAULT_TIMEOUT_MS);
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve) => {
    let settled = false;
    let inspectionToken: ReturnType<typeof setTimeout> | null = null;
    const cleanup = () => {
      if (inspectionToken) clearTimeout(inspectionToken);
      args.signal?.removeEventListener("abort", onAbort);
      inspectionToken = null;
    };
    const settle = (result: PublicationEpochResult) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(result);
    };
    const onAbort = () =>
      settle({ ok: false, detail: "workspace-publication-epoch-aborted" });
    const inspect = () => {
      if (settled) return;
      if (args.signal?.aborted) {
        onAbort();
        return;
      }
      const current = args.inspect();
      if (current.detail) {
        if (Date.now() >= deadline) {
          settle({
            ok: false,
            detail: `workspace-publication-epoch-timeout:${current.detail}`,
          });
          return;
        }
      } else {
        const pending = current.publications.filter(
          (entry) => entry.state === "pending",
        );
        if (pending.length === 0) {
          settle({
            ok: true,
            watermarks: {
              "acp-chat": current.publications
                .filter((entry) => entry.source === "acp-chat")
                .reduce(
                  (maximum, entry) => Math.max(maximum, entry.deliverySequence),
                  0,
                ),
              "acp-skills": current.publications
                .filter((entry) => entry.source === "acp-skills")
                .reduce(
                  (maximum, entry) => Math.max(maximum, entry.deliverySequence),
                  0,
                ),
            },
          });
          return;
        }
        if (Date.now() >= deadline) {
          settle({
            ok: false,
            detail: `workspace-publication-epoch-timeout:${
              pending
                .slice(0, 3)
                .map((entry) => entry.publicationId)
                .join(",") || "unknown"
            }`,
          });
          return;
        }
      }
      inspectionToken = setTimeout(
        inspect,
        Math.min(INSPECTION_INTERVAL_MS, Math.max(1, deadline - Date.now())),
      );
    };
    args.signal?.addEventListener("abort", onAbort, { once: true });
    inspect();
  });
}

export function waitAcpRuntimeReplayWorkspaceReadiness(args: {
  tab: AcpRuntimeReplayPublicationTab;
  timeoutMs?: number;
  inspect: () => AcpRuntimeReplayPublicationInspection;
}): Promise<PublicationResult> {
  const timeoutMs = Math.max(1, Number(args.timeoutMs) || DEFAULT_TIMEOUT_MS);
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve) => {
    const inspect = () => {
      const current = args.inspect();
      const detail =
        current.detail ||
        (current.childWindow ? "" : "workspace-child-not-ready");
      if (!detail && current.childWindow) {
        resolve({ ok: true });
        return;
      }
      if (Date.now() >= deadline) {
        resolve({
          ok: false,
          detail: readinessTimeoutDetail(detail, args.tab),
        });
        return;
      }
      setTimeout(
        inspect,
        Math.min(INSPECTION_INTERVAL_MS, Math.max(1, deadline - Date.now())),
      );
    };
    inspect();
  });
}

function readinessTimeoutDetail(
  detail: string,
  tab: AcpRuntimeReplayPublicationTab,
) {
  if (detail === "workspace-shell-not-ready") {
    return "workspace-shell-ready-timeout";
  }
  if (detail === "workspace-child-not-ready") {
    return `workspace-child-ready-timeout:${tab}`;
  }
  if (detail === "workspace-owner-not-ready") {
    return `workspace-owner-ready-timeout:${tab}`;
  }
  if (detail === "workspace-tab-not-ready") {
    return `workspace-tab-ready-timeout:${tab}`;
  }
  return "workspace-target-ready-timeout";
}

export function drainAcpRuntimeReplayPublication(args: {
  tab: AcpRuntimeReplayPublicationSurface;
  signal?: AcpRuntimeReplayCancellationSignal;
  timeoutMs?: number;
  inspect: () => AcpRuntimeReplayPublicationInspection;
  forcePublish: () => Promise<AcpRuntimeReplayForcedPublication | undefined>;
}): Promise<PublicationResult> {
  const timeoutMs = Math.max(1, Number(args.timeoutMs) || DEFAULT_TIMEOUT_MS);
  const deadline = Date.now() + timeoutMs;

  return new Promise((resolve) => {
    let settled = false;
    let childWindow: AcpRuntimeReplayPublicationWindow | null = null;
    let targetPublicationId = "";
    let targetDeliverySequence = 0;
    let targetSource: AcpRuntimeReplayPublicationSurface | "" = "";
    let publicationEpochSequence = 0;
    let epochPendingPublicationIds: string[] = [];
    let timeoutToken: ReturnType<typeof setTimeout> | null = null;
    let inspectionToken: ReturnType<typeof setTimeout> | null = null;
    let lastReadinessDetail = "workspace-child-not-ready";
    let lastPublicationDetail = "target=unassigned,pending=none";
    let forcePublishInFlight = false;
    let nextForcePublishAt = 0;

    const cleanup = () => {
      if (timeoutToken) clearTimeout(timeoutToken);
      if (inspectionToken) clearTimeout(inspectionToken);
      childWindow?.removeEventListener("unload", onUnload);
      args.signal?.removeEventListener("abort", onAbort);
      timeoutToken = null;
      inspectionToken = null;
    };
    const settle = (result: PublicationResult) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(result);
    };
    const onAbort = () =>
      settle({ ok: false, detail: "workspace-publication-aborted" });
    const onUnload = () =>
      settle({ ok: false, detail: `workspace-child-unloaded:${args.tab}` });
    const inspectCurrent = () => {
      const inspection = args.inspect();
      if (inspection.childWindow !== childWindow) {
        settle({
          ok: false,
          detail: `workspace-child-frame-replaced:${args.tab}`,
        });
        return;
      }
      const source = targetSource || args.tab;
      const sourcePublications = inspection.publications.filter(
        (entry) => entry.source === source,
      );
      if (!targetPublicationId) {
        publicationEpochSequence = sourcePublications.reduce(
          (maximum, entry) =>
            Math.max(maximum, Number(entry.deliverySequence) || 0),
          publicationEpochSequence,
        );
        epochPendingPublicationIds = sourcePublications
          .filter(
            (entry) =>
              entry.deliverySequence <= publicationEpochSequence &&
              entry.state === "pending",
          )
          .map((entry) => entry.publicationId);
        lastPublicationDetail = `epoch=${publicationEpochSequence},pending=${
          epochPendingPublicationIds.slice(0, 3).join(",") || "none"
        },target=unassigned`;
        return;
      }
      const barrierPublications = targetPublicationId
        ? sourcePublications.filter(
            (entry) =>
              entry.deliverySequence > publicationEpochSequence &&
              entry.deliverySequence <= targetDeliverySequence,
          )
        : [];
      const pendingPublicationIds = barrierPublications
        .filter((entry) => entry.state === "pending")
        .map((entry) => entry.publicationId);
      if (!targetPublicationId) {
        lastPublicationDetail = `target=unassigned,pending=${
          pendingPublicationIds.slice(0, 3).join(",") || "none"
        }`;
        return;
      }
      const target = inspection.publications.find(
        (entry) => entry.publicationId === targetPublicationId,
      );
      lastPublicationDetail = `target=${targetPublicationId}:${
        target?.state || "missing"
      },pending=${pendingPublicationIds.slice(0, 3).join(",") || "none"}`;
      if (target?.state === "rejected") {
        if (target.reason === "superseded" || target.reason === "old-owner") {
          publicationEpochSequence = Math.max(
            publicationEpochSequence,
            targetDeliverySequence,
          );
          targetPublicationId = "";
          targetDeliverySequence = 0;
          targetSource = "";
          nextForcePublishAt = 0;
          return;
        }
        settle({
          ok: false,
          detail: `workspace-publication-rejected:${args.tab}:${targetPublicationId}:${target.reason || "unknown"}`,
        });
        return;
      }
      if (
        target?.state === "render-complete" &&
        pendingPublicationIds.length === 0
      ) {
        settle({ ok: true });
      }
    };
    const forcePublication = async () => {
      if (settled || forcePublishInFlight || targetPublicationId) return;
      inspectCurrent();
      if (settled || epochPendingPublicationIds.length > 0) return;
      forcePublishInFlight = true;
      try {
        const forced = await args.forcePublish();
        const publicationId = String(forced?.publicationId || "").trim();
        if (publicationId && forced) {
          const deliverySequence = Number(forced.deliverySequence);
          if (
            forced.source !== args.tab ||
            !Number.isInteger(deliverySequence) ||
            deliverySequence <= publicationEpochSequence
          ) {
            settle({
              ok: false,
              detail: `workspace-publication-invalid-barrier:${args.tab}`,
            });
            return;
          }
          targetPublicationId = publicationId;
          targetDeliverySequence = deliverySequence;
          targetSource = forced.source;
        }
        inspectCurrent();
      } catch (error) {
        settle({
          ok: false,
          detail: `workspace-publication-failed:${
            error instanceof Error ? error.message : String(error)
          }`,
        });
      } finally {
        forcePublishInFlight = false;
        nextForcePublishAt = Date.now() + PUBLICATION_RETRY_INTERVAL_MS;
      }
    };
    const scheduleInspection = () => {
      if (settled) return;
      inspectionToken = setTimeout(
        () => {
          inspectionToken = null;
          inspectCurrent();
          if (settled) return;
          if (!targetPublicationId && Date.now() >= nextForcePublishAt) {
            void forcePublication();
          }
          scheduleInspection();
        },
        Math.min(INSPECTION_INTERVAL_MS, Math.max(1, deadline - Date.now())),
      );
    };
    const beginPublication = (
      inspection: AcpRuntimeReplayPublicationInspection,
    ) => {
      childWindow = inspection.childWindow;
      childWindow?.addEventListener("unload", onUnload);
      inspectCurrent();
      scheduleInspection();
      if (epochPendingPublicationIds.length === 0) void forcePublication();
    };
    const inspectReadiness = () => {
      if (settled) return;
      if (args.signal?.aborted) {
        onAbort();
        return;
      }
      const inspection = args.inspect();
      lastReadinessDetail =
        inspection.detail ||
        (inspection.childWindow ? "" : "workspace-child-not-ready");
      if (!lastReadinessDetail && inspection.childWindow) {
        beginPublication(inspection);
        return;
      }
      if (Date.now() >= deadline) {
        settle({
          ok: false,
          detail: readinessTimeoutDetail(lastReadinessDetail, args.tab),
        });
        return;
      }
      inspectionToken = setTimeout(
        inspectReadiness,
        Math.min(INSPECTION_INTERVAL_MS, Math.max(1, deadline - Date.now())),
      );
    };

    args.signal?.addEventListener("abort", onAbort, { once: true });
    timeoutToken = setTimeout(() => {
      settle({
        ok: false,
        detail: childWindow
          ? `workspace-publication-timeout:${args.tab}:${lastPublicationDetail}`
          : readinessTimeoutDetail(lastReadinessDetail, args.tab),
      });
    }, timeoutMs);
    inspectReadiness();
  });
}
