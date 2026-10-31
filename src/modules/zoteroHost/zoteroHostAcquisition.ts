import type { PortableItemRef } from "../../workflows/types";
import {
  createCancellationController,
  type CancellationController,
  type CancellationSignal,
} from "../../utils/wait";
import {
  AcquisitionError,
  acquisitionRef,
  onAcquisitionGrantRevoked,
  requireAcquisitionGrant,
  requireAcquisitionParent,
  type AcquisitionScope,
} from "./zoteroHostAcquisitionAuthority";
import {
  ACQUISITION_LIMITS as limits,
  ACQUISITION_REASONS,
  type AcquisitionDownload,
  type AcquisitionFile,
  type AcquisitionInputs,
  type AcquisitionObservation,
  type AcquisitionOutputs,
  type AcquisitionPage,
  type AcquisitionProfile,
  type AcquisitionReason,
} from "./zoteroHostAcquisitionTypes";

export type NativeAcquisitionObservation = {
  documentId: string;
  loading: boolean;
  closed: boolean;
  authentication: boolean;
  origin: string;
  title: string;
  text: string;
  targets: Array<{ label: string; url: string }>;
};
export type NativeAcquisitionFile = Omit<AcquisitionFile, "fileId"> & {
  path: string;
  dispose(): Promise<void>;
};
export type NativeAcquisitionPage = {
  onClose?(listener: () => void): () => void;
  observe(): Promise<NativeAcquisitionObservation>;
  navigate(url: string): Promise<void>;
  close(): Promise<void>;
  download(
    url: string,
    title: string,
    signal: CancellationSignal,
  ): Promise<NativeAcquisitionFile>;
};
export type AcquisitionDependencies = {
  profiles(): Promise<AcquisitionProfile[]>;
  resolveParent(ref: PortableItemRef): Promise<{ title: string; url: string }>;
  open(profileRef: string, url: string): Promise<NativeAcquisitionPage>;
  publishFile(
    file: NativeAcquisitionFile,
    owner: string,
    sessionRef: string,
    parentRef: PortableItemRef,
  ): Promise<string>;
  releaseFiles(owner: string, sessionRef: string): Promise<void>;
  clearProfile?(profileRef: string): Promise<void>;
  now?: () => number;
};
export type ZoteroHostAcquisition = {
  profiles(scope: AcquisitionScope): Promise<AcquisitionOutputs["profiles"]>;
  signOutProfile(profileRef: string): Promise<void>;
} & {
  [K in Exclude<keyof AcquisitionInputs, "profiles">]: (
    input: AcquisitionInputs[K],
    scope: AcquisitionScope,
  ) => Promise<AcquisitionOutputs[K]>;
};

type Session = {
  owner: string;
  parentRef: PortableItemRef;
  profileRef: string;
  opening?: Promise<void>;
  ending?: Promise<void>;
  cleanupDone?: boolean;
  view: AcquisitionPage;
  native?: NativeAcquisitionPage;
  title: string;
  revision: string;
  documentId: string;
  snapshot?: NativeAcquisitionObservation;
  targets: Map<string, { label: string; url: string }>;
  cursors: Map<string, number>;
  deadline: number | null;
  timer?: ReturnType<typeof setTimeout>;
  removeCloseListener?: () => void;
  reason: AcquisitionReason | null;
  ended: boolean;
};
type Task = {
  sessions: Set<string>;
  suppressAuthentication: boolean;
  unsubscribe(): void;
};
type Download = {
  owner: string;
  session: Session;
  input: AcquisitionInputs["download"];
  value: AcquisitionDownload;
  abort: CancellationController;
  completion?: Promise<void>;
};

export function createZoteroHostAcquisition(
  deps: AcquisitionDependencies,
): ZoteroHostAcquisition {
  const sessions = new Map<string, Session>();
  const pages = new Map<string, Session>();
  const tasks = new Map<string, Task>();
  const downloads = new Map<string, Download>();
  const clearingProfiles = new Set<string>();
  let activeDownloads = 0;
  const now = deps.now || Date.now;
  const pageView = (s: Session) => ({ ...s.view });
  const downloadView = (value: AcquisitionDownload): AcquisitionDownload =>
    value.state === "ready"
      ? { ...value, file: { ...value.file } }
      : { ...value };
  const clearTargets = (s: Session) => {
    s.revision = acquisitionRef();
    s.documentId = "";
    s.snapshot = undefined;
    s.targets.clear();
    s.cursors.clear();
  };
  const cancel = (d: Download) => {
    if (d.value.state !== "pending" && d.value.state !== "running") return;
    d.value = {
      downloadRef: d.value.downloadRef,
      state: "canceled",
      reason: "canceled",
      file: null,
      pollAfterMs: 0,
    };
    d.abort.abort();
  };
  const end = (s: Session, reason: AcquisitionReason): Promise<void> => {
    if (s.ending) return s.ending;
    s.ended = true;
    s.reason = reason;
    clearTargets(s);
    s.removeCloseListener?.();
    if (s.timer) clearTimeout(s.timer);
    s.view.state =
      reason === "authentication_timeout"
        ? "timed_out"
        : reason === "window_closed"
          ? "closed"
          : "released";
    const draining: Promise<void>[] = [];
    for (const d of downloads.values())
      if (d.session === s) {
        cancel(d);
        if (d.completion) draining.push(d.completion);
        if (d.value.state === "ready")
          d.value = {
            downloadRef: d.value.downloadRef,
            state: "canceled",
            reason,
            file: null,
            pollAfterMs: 0,
          };
      }
    s.ending = (async () => {
      await s.opening;
      try {
        await s.native?.close();
      } finally {
        await Promise.allSettled(draining);
        await deps.releaseFiles(s.owner, s.view.sessionRef);
      }
      s.cleanupDone = true;
    })();
    return s.ending;
  };
  const task = (scope: AcquisitionScope) => {
    const owner = requireAcquisitionGrant(scope);
    let t = tasks.get(owner);
    if (!t) {
      t = {
        sessions: new Set(),
        suppressAuthentication: false,
        unsubscribe: () => {},
      };
      tasks.set(owner, t);
      t.unsubscribe = onAcquisitionGrantRevoked(scope, () => {
        const closing: Promise<void>[] = [];
        for (const id of t!.sessions) {
          const s = sessions.get(id);
          if (s)
            closing.push(
              end(s, "canceled").then(() => {
                sessions.delete(id);
              }),
            );
          if (s) pages.delete(s.view.pageRef);
        }
        for (const [id, d] of downloads)
          if (d.owner === owner) downloads.delete(id);
        tasks.delete(owner);
        return Promise.allSettled(closing).then(() => {});
      });
    }
    return { owner, task: t };
  };
  const session = (pageRef: string, scope: AcquisitionScope) => {
    const { owner } = task(scope);
    const s = pages.get(pageRef);
    if (!s || s.owner !== owner)
      throw new AcquisitionError("permission_denied", "page_owner_mismatch");
    return s;
  };
  const waitForUser = (s: Session) => {
    const t = tasks.get(s.owner)!;
    if (t.suppressAuthentication) {
      void end(s, "canceled").catch(() => {});
      return;
    }
    if (s.deadline === null) {
      s.deadline = now() + limits.authenticationMs;
      s.timer = setTimeout(() => {
        t.suppressAuthentication = true;
        void end(s, "authentication_timeout").catch(() => {});
      }, limits.authenticationMs);
    }
    s.view.state = "awaiting_user";
  };
  const refresh = async (s: Session) => {
    if (s.ended || !s.native) return;
    if (
      s.deadline !== null &&
      s.view.state === "awaiting_user" &&
      now() >= s.deadline
    ) {
      tasks.get(s.owner)!.suppressAuthentication = true;
      void end(s, "authentication_timeout").catch(() => {});
      return;
    }
    const revision = s.revision;
    const observation = await s.native.observe();
    if (s.ended || s.revision !== revision) return;
    if (observation.closed) {
      if (s.deadline !== null)
        tasks.get(s.owner)!.suppressAuthentication = true;
      void end(s, "window_closed").catch(() => {});
      return;
    }
    if (observation.documentId !== s.documentId) {
      clearTargets(s);
      s.documentId = observation.documentId;
      if (!observation.authentication)
        for (const target of observation.targets.slice(
          0,
          limits.targetsPerDocument,
        )) {
          s.targets.set(acquisitionRef(), target);
        }
    }
    s.snapshot = observation;
    if (observation.authentication) waitForUser(s);
    else {
      s.view.state = observation.loading ? "loading" : "ready";
      if (!observation.loading) {
        if (s.timer) clearTimeout(s.timer);
        s.timer = undefined;
        s.deadline = null;
      }
    }
  };
  const resolveTarget = async (
    input: AcquisitionInputs["activate"],
    scope: AcquisitionScope,
  ) => {
    const s = session(input.pageRef, scope);
    await refresh(s);
    requireAcquisitionGrant(scope);
    const target = s.targets.get(input.targetRef);
    if (
      s.ended ||
      s.view.state !== "ready" ||
      input.revision !== s.revision ||
      !target
    )
      throw new AcquisitionError("conflict", "stale_target");
    return { s, target };
  };
  const getDownload = (ref: string, scope: AcquisitionScope) => {
    const { owner } = task(scope);
    const d = downloads.get(ref);
    if (!d || d.owner !== owner)
      throw new AcquisitionError(
        "permission_denied",
        "download_owner_mismatch",
      );
    return d;
  };
  const replayDownload = (
    input: AcquisitionInputs["download"],
    owner: string,
  ) => {
    for (const d of downloads.values())
      if (
        d.owner === owner &&
        d.input.idempotencyKey === input.idempotencyKey
      ) {
        if (
          d.input.pageRef !== input.pageRef ||
          d.input.revision !== input.revision ||
          d.input.targetRef !== input.targetRef
        )
          throw new AcquisitionError("conflict", "idempotency_conflict");
        return downloadView(d.value);
      }
    if (
      [...downloads.values()].filter((d) => d.owner === owner).length >=
      limits.downloadsPerTask
    )
      throw new AcquisitionError("unavailable", "resource_limit");
    return undefined;
  };
  return {
    async signOutProfile(profileRef) {
      if (!deps.clearProfile)
        throw new AcquisitionError("unavailable", "runtime_unavailable");
      if (clearingProfiles.has(profileRef))
        throw new AcquisitionError("conflict", "profile_busy");
      clearingProfiles.add(profileRef);
      try {
        const closing = [];
        for (const s of sessions.values())
          if (s.profileRef === profileRef) {
            const t = tasks.get(s.owner);
            if (t) t.suppressAuthentication = true;
            closing.push(end(s, "profile_signed_out"));
          }
        const results = await Promise.allSettled(closing);
        const failed = results.find((result) => result.status === "rejected");
        if (failed?.status === "rejected") throw failed.reason;
        await deps.clearProfile(profileRef);
      } finally {
        clearingProfiles.delete(profileRef);
      }
    },
    async profiles(scope) {
      task(scope);
      return { profiles: await deps.profiles() };
    },
    async open(input, scope) {
      const { owner, task: t } = task(scope);
      if (t.suppressAuthentication)
        throw new AcquisitionError("unavailable", "authentication_suppressed");
      const parent = requireAcquisitionParent(scope, input.parentRef);
      const currentParent = await deps.resolveParent(input.parentRef);
      if (currentParent.title !== parent.title)
        throw new AcquisitionError("conflict", "parent_changed");
      const profiles = await deps.profiles();
      requireAcquisitionGrant(scope);
      if (t.suppressAuthentication)
        throw new AcquisitionError("unavailable", "authentication_suppressed");
      if (
        [...t.sessions].filter((id) => !sessions.get(id)?.cleanupDone).length >=
        limits.pagesPerTask
      )
        throw new AcquisitionError("unavailable", "resource_limit");
      // Retain only a bounded tail of released page receipts; downloads keep their own evidence.
      for (const id of t.sessions) {
        if (t.sessions.size < limits.pagesPerTask * 2) break;
        const old = sessions.get(id);
        if (old?.cleanupDone) {
          pages.delete(old.view.pageRef);
          sessions.delete(id);
          t.sessions.delete(id);
        }
      }
      const profile = input.authProfileRef
        ? profiles.find((p) => p.authProfileRef === input.authProfileRef)
        : profiles[0];
      if (!profile)
        throw new AcquisitionError("invalid_request", "profile_not_found");
      if (clearingProfiles.has(profile.authProfileRef))
        throw new AcquisitionError("conflict", "profile_busy");
      const s: Session = {
        owner,
        parentRef: { ...input.parentRef },
        profileRef: profile.authProfileRef,
        view: {
          sessionRef: acquisitionRef(),
          pageRef: acquisitionRef(),
          state: "loading",
        },
        title: parent.title,
        revision: acquisitionRef(),
        documentId: "",
        targets: new Map(),
        cursors: new Map(),
        deadline: null,
        reason: null,
        ended: false,
      };
      sessions.set(s.view.sessionRef, s);
      pages.set(s.view.pageRef, s);
      t.sessions.add(s.view.sessionRef);
      s.opening = deps
        .open(profile.authProfileRef, parent.url)
        .then(async (native) => {
          if (s.ended) {
            await native.close();
            return;
          }
          try {
            requireAcquisitionGrant(scope);
          } catch {
            await native.close();
            return;
          }
          s.native = native;
          s.removeCloseListener = native.onClose?.(() => {
            if (s.ended) return;
            if (s.view.state === "awaiting_user")
              t.suppressAuthentication = true;
            void end(s, "window_closed").catch(() => {});
          });
        })
        .catch((error) => {
          if (s.ended) throw error;
          s.ended = true;
          s.cleanupDone = true;
          s.view.state = "failed";
          s.reason = "runtime_unavailable";
        });
      void s.opening.catch(() => {});
      return pageView(s);
    },
    async observe(input, scope) {
      const s = session(input.pageRef, scope);
      await refresh(s);
      requireAcquisitionGrant(scope);
      let offset = 0;
      if (input.cursor) {
        const value = s.cursors.get(input.cursor);
        if (value === undefined)
          throw new AcquisitionError("conflict", "stale_cursor");
        offset = value;
      }
      const safe = s.view.state === "ready" && s.snapshot;
      const targets = safe
        ? [...s.targets]
            .slice(offset, offset + limits.targetsPerPage)
            .map(([targetRef, t]) => ({
              targetRef,
              label: t.label.slice(0, limits.labelChars),
              kind: "link" as const,
            }))
        : [];
      let nextCursor: string | null = null;
      if (safe && offset + targets.length < s.targets.size) {
        const next = offset + targets.length;
        nextCursor =
          [...s.cursors].find(([, o]) => o === next)?.[0] || acquisitionRef();
        s.cursors.set(nextCursor, next);
      }
      return {
        ...pageView(s),
        revision: s.revision,
        origin: s.snapshot?.origin || "",
        title: safe ? s.snapshot!.title.slice(0, limits.titleChars) : "",
        text: safe ? s.snapshot!.text.slice(0, limits.textChars) : "",
        targets,
        nextCursor,
        pollAfterMs: s.ended ? 0 : limits.pollAfterMs,
        authDeadline: s.deadline,
        reason: s.reason,
      };
    },
    async navigate(input, scope) {
      const s = session(input.pageRef, scope);
      if (s.ended || !s.native)
        throw new AcquisitionError("unavailable", "page_unavailable");
      let url: URL;
      try {
        url = new URL(input.url);
      } catch {
        throw new AcquisitionError("invalid_request", "invalid_url");
      }
      if (
        !["https:", "http:"].includes(url.protocol) ||
        url.username ||
        url.password
      )
        throw new AcquisitionError("invalid_request", "invalid_url");
      if (input.authentication) waitForUser(s);
      if (s.ended) return pageView(s);
      clearTargets(s);
      s.view.state = input.authentication ? "awaiting_user" : "loading";
      await s.native.navigate(url.href);
      return pageView(s);
    },
    async activate(input, scope) {
      const { s, target } = await resolveTarget(input, scope);
      clearTargets(s);
      s.view.state = "loading";
      await s.native!.navigate(target.url);
      return pageView(s);
    },
    async download(input, scope) {
      const { owner } = task(scope);
      const existing = replayDownload(input, owner);
      if (existing) return existing;
      const { s, target } = await resolveTarget(input, scope);
      requireAcquisitionGrant(scope);
      // Observation yields; another caller can admit the same operation meanwhile.
      const admitted = replayDownload(input, owner);
      if (admitted) return admitted;
      if (activeDownloads >= limits.activeDownloads)
        throw new AcquisitionError("unavailable", "resource_limit");
      activeDownloads++;
      const d: Download = {
        owner,
        session: s,
        input: { ...input },
        value: {
          downloadRef: acquisitionRef(),
          state: "pending",
          file: null,
          reason: null,
          pollAfterMs: limits.pollAfterMs,
        },
        abort: createCancellationController(),
      };
      downloads.set(d.value.downloadRef, d);
      d.completion = (async () => {
        let file: NativeAcquisitionFile | undefined;
        try {
          d.value = { ...d.value, state: "running", reason: null, file: null };
          file = await s.native!.download(target.url, s.title, d.abort.signal);
          if (s.ended || d.abort.signal.aborted) {
            await file.dispose();
            return;
          }
          requireAcquisitionGrant(scope);
          const fileId = await deps.publishFile(
            file,
            owner,
            s.view.sessionRef,
            s.parentRef,
          );
          if (s.ended || d.abort.signal.aborted) {
            await deps.releaseFiles(owner, s.view.sessionRef);
            return;
          }
          const {
            contentType,
            size,
            pages: count,
            readable,
            title,
            identityMatched,
          } = file;
          d.value = {
            downloadRef: d.value.downloadRef,
            state: "ready",
            reason: null,
            pollAfterMs: 0,
            file: {
              fileId,
              contentType,
              size,
              pages: count,
              readable,
              title,
              identityMatched,
            },
          };
        } catch (error) {
          await file?.dispose().catch(() => {});
          if (d.abort.signal.aborted || s.ended) return;
          const reason =
            error instanceof AcquisitionError &&
            ACQUISITION_REASONS.includes(error.reason as AcquisitionReason)
              ? (error.reason as AcquisitionReason)
              : "network_failure";
          d.value = {
            downloadRef: d.value.downloadRef,
            state: "failed",
            reason,
            file: null,
            pollAfterMs: 0,
          };
        } finally {
          activeDownloads--;
        }
      })();
      return downloadView(d.value);
    },
    async get_download(input, scope) {
      return downloadView(getDownload(input.downloadRef, scope).value);
    },
    async cancel_download(input, scope) {
      const d = getDownload(input.downloadRef, scope);
      cancel(d);
      return downloadView(d.value);
    },
    async release(input, scope) {
      const { owner } = task(scope);
      const s = sessions.get(input.sessionRef);
      if (!s || s.owner !== owner)
        throw new AcquisitionError(
          "permission_denied",
          "session_owner_mismatch",
        );
      if (s.view.state === "awaiting_user")
        tasks.get(owner)!.suppressAuthentication = true;
      // Revoke ingress now; sign-out and shutdown still await the native drain.
      void end(s, "released").catch(() => {});
      await deps.releaseFiles(s.owner, s.view.sessionRef);
      return { sessionRef: input.sessionRef, state: "released" };
    },
  };
}
