import type { AcpRuntimeReplayCancellationSignal } from "./acpRuntimeReplayProfiler";

export type AcpRuntimeReplayPublicationTab =
  | "acp-chat"
  | "acp-skills"
  | "skillrunner";

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
  state: "pending" | "render-complete" | "rejected";
  reason?: string;
};

export type AcpRuntimeReplayPublicationInspection = {
  childWindow: AcpRuntimeReplayPublicationWindow | null;
  publications: readonly AcpRuntimeReplayPublicationLifecycle[];
  detail?: string;
};

export type AcpRuntimeReplayForcedPublication = {
  publicationId: string;
};

type PublicationResult = { ok: boolean; detail?: string };

const DEFAULT_TIMEOUT_MS = 10_000;
const INSPECTION_INTERVAL_MS = 16;
const PUBLICATION_RETRY_INTERVAL_MS = 100;

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
  tab: AcpRuntimeReplayPublicationTab;
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
      const pendingPublicationIds = inspection.publications
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
          targetPublicationId = "";
          nextForcePublishAt = 0;
          return;
        }
        settle({
          ok: false,
          detail: `workspace-publication-rejected:${args.tab}:${targetPublicationId}:${target.reason || "unknown"}`,
        });
        return;
      }
      const hasPendingPublication = inspection.publications.some(
        (entry) => entry.state === "pending",
      );
      if (target?.state === "render-complete" && !hasPendingPublication) {
        settle({ ok: true });
      }
    };
    const forcePublication = async () => {
      if (settled || forcePublishInFlight || targetPublicationId) return;
      forcePublishInFlight = true;
      try {
        const forced = await args.forcePublish();
        const publicationId = String(forced?.publicationId || "").trim();
        if (publicationId) targetPublicationId = publicationId;
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
      scheduleInspection();
      void forcePublication();
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
