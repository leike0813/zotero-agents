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
  requestAnimationFrame?: (callback: () => void) => number;
  cancelAnimationFrame?: (token: number) => void;
};

export type AcpRuntimeReplayPublicationInspection = {
  childWindow: AcpRuntimeReplayPublicationWindow | null;
  publisherWindow?: unknown;
  revision: number;
  detail?: string;
};

type PublicationResult = { ok: boolean; detail?: string };

const DEFAULT_TIMEOUT_MS = 10_000;
const INSPECTION_INTERVAL_MS = 16;
const PUBLICATION_RETRY_INTERVAL_MS = 100;

function snapshotMessageType(tab: AcpRuntimeReplayPublicationTab) {
  if (tab === "acp-chat") return "acp:snapshot";
  if (tab === "acp-skills") return "acp-skill-run:snapshot";
  return "skillrunner-sidebar:snapshot";
}

function snapshotRevision(data: unknown, tab: AcpRuntimeReplayPublicationTab) {
  if (!data || typeof data !== "object") return 0;
  const envelope = data as { type?: unknown; payload?: unknown };
  if (envelope.type !== snapshotMessageType(tab)) return 0;
  const payload =
    envelope.payload && typeof envelope.payload === "object"
      ? (envelope.payload as Record<string, unknown>)
      : null;
  const sidebar =
    payload?.sidebar && typeof payload.sidebar === "object"
      ? (payload.sidebar as Record<string, unknown>)
      : null;
  const panes =
    sidebar?.panes && typeof sidebar.panes === "object"
      ? (sidebar.panes as Record<string, unknown>)
      : null;
  const pane =
    panes?.[tab] && typeof panes[tab] === "object"
      ? (panes[tab] as Record<string, unknown>)
      : null;
  const revision = Number(pane?.revision || 0);
  return Number.isFinite(revision) ? Math.max(0, Math.floor(revision)) : 0;
}

function wrappedPublicationWindow(value: unknown) {
  if (!value || (typeof value !== "object" && typeof value !== "function")) {
    return undefined;
  }
  try {
    return (value as { wrappedJSObject?: unknown }).wrappedJSObject;
  } catch {
    return undefined;
  }
}

function isSamePublicationWindow(observed: unknown, expected: unknown) {
  if (observed === expected) return true;
  const observedWrapped = wrappedPublicationWindow(observed);
  const expectedWrapped = wrappedPublicationWindow(expected);
  return Boolean(
    (observedWrapped &&
      (observedWrapped === expected || observedWrapped === expectedWrapped)) ||
    (expectedWrapped && expectedWrapped === observed),
  );
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
  tab: AcpRuntimeReplayPublicationTab;
  signal?: AcpRuntimeReplayCancellationSignal;
  timeoutMs?: number;
  inspect: () => AcpRuntimeReplayPublicationInspection;
  forcePublish: () => Promise<void>;
}): Promise<PublicationResult> {
  const timeoutMs = Math.max(1, Number(args.timeoutMs) || DEFAULT_TIMEOUT_MS);
  const deadline = Date.now() + timeoutMs;

  return new Promise((resolve) => {
    let settled = false;
    let childWindow: AcpRuntimeReplayPublicationWindow | null = null;
    let publisherWindow: unknown;
    let baselineRevision = 0;
    let timeoutToken: ReturnType<typeof setTimeout> | null = null;
    let inspectionToken: ReturnType<typeof setTimeout> | null = null;
    let frameToken: number | null = null;
    let frameTimeoutToken: ReturnType<typeof setTimeout> | null = null;
    let lastReadinessDetail = "workspace-child-not-ready";
    let forcePublishInFlight = false;
    let nextForcePublishAt = 0;

    const cleanup = () => {
      if (timeoutToken) clearTimeout(timeoutToken);
      if (inspectionToken) clearTimeout(inspectionToken);
      if (frameToken !== null) childWindow?.cancelAnimationFrame?.(frameToken);
      if (frameTimeoutToken) clearTimeout(frameTimeoutToken);
      childWindow?.removeEventListener("message", onMessage);
      childWindow?.removeEventListener("unload", onUnload);
      args.signal?.removeEventListener("abort", onAbort);
      timeoutToken = null;
      inspectionToken = null;
      frameToken = null;
      frameTimeoutToken = null;
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
    const verifyWindow = () => {
      if (args.inspect().childWindow === childWindow) return true;
      settle({
        ok: false,
        detail: `workspace-child-frame-replaced:${args.tab}`,
      });
      return false;
    };
    const onMessage = (event: { data?: unknown; source?: unknown }) => {
      if (!verifyWindow()) return;
      if (
        event.source &&
        publisherWindow &&
        !isSamePublicationWindow(event.source, publisherWindow)
      ) {
        return;
      }
      const revision = snapshotRevision(event.data, args.tab);
      if (revision <= baselineRevision || frameToken !== null) return;
      const confirmRendered = () => {
        frameToken = null;
        frameTimeoutToken = null;
        if (!verifyWindow()) return;
        settle({ ok: true });
      };
      if (childWindow?.requestAnimationFrame) {
        frameToken = childWindow.requestAnimationFrame(confirmRendered);
      } else {
        frameTimeoutToken = setTimeout(confirmRendered, 0);
        frameToken = -1;
      }
    };
    const forcePublication = async () => {
      if (settled || forcePublishInFlight) return;
      forcePublishInFlight = true;
      try {
        await args.forcePublish();
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
          if (childWindow && !verifyWindow()) return;
          if (Date.now() >= nextForcePublishAt) {
            void forcePublication();
          }
          scheduleInspection();
        },
        Math.min(INSPECTION_INTERVAL_MS, Math.max(1, deadline - Date.now())),
      );
    };
    const beginPublication = async (
      inspection: AcpRuntimeReplayPublicationInspection,
    ) => {
      childWindow = inspection.childWindow;
      publisherWindow = inspection.publisherWindow;
      baselineRevision = inspection.revision;
      childWindow?.addEventListener("message", onMessage);
      childWindow?.addEventListener("unload", onUnload);
      scheduleInspection();
      await forcePublication();
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
        void beginPublication(inspection);
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
          ? `workspace-publication-timeout:${args.tab}`
          : readinessTimeoutDetail(lastReadinessDetail, args.tab),
      });
    }, timeoutMs);
    inspectReadiness();
  });
}
