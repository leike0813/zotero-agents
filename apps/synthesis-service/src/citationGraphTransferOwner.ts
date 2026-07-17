import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  SYNTHESIS_SIDECAR_TRANSFER_LIMITS,
  rebuildSynthesisSidecarTransferManifest,
  rebuildSynthesisSidecarTransferPage,
  type SynthesisSidecarTransferManifest,
  type SynthesisSidecarTransferPage,
  type SynthesisSidecarTransferSnapshot,
  type SynthesisSidecarTransferState,
  type SynthesisSidecarTransferStatus,
} from "../../../packages/synthesis-contracts/src/sidecarTransfer.js";
import {
  canonicalizeSynthesisEngineJson,
  rebuildSynthesisCitationGraphBuildTransferManifest,
  rebuildSynthesisCitationGraphBuildTransferPage,
  type SynthesisCitationGraphBuildTransferPageKind,
} from "../../../packages/synthesis-engine/src/index.js";
import type { SynthesisSidecarErrorCode } from "../../../packages/synthesis-contracts/src/sidecarSystem.js";

type TransferErrorCode = Extract<
  SynthesisSidecarErrorCode,
  | "transfer_busy"
  | "transfer_not_found"
  | "transfer_conflict"
  | "transfer_limit_exceeded"
  | "transfer_incomplete"
  | "transfer_output_not_ready"
  | "transfer_stopping"
>;

export class CitationGraphTransferError extends Error {
  constructor(
    readonly code: TransferErrorCode,
    readonly retryable = false,
  ) {
    super(code);
    this.name = "CitationGraphTransferError";
  }
}

type StoredPage = {
  page: SynthesisSidecarTransferPage;
  path: string;
};

type Session = {
  sessionId: string;
  idempotencyKey: string;
  state: SynthesisSidecarTransferState;
  inputManifest: SynthesisSidecarTransferManifest;
  inputPages: Map<string, StoredPage>;
  outputManifest?: SynthesisSidecarTransferManifest;
  outputPages: Map<string, StoredPage>;
  stagedBytes: number;
  createdAtMs: number;
  lastActivityAtMs: number;
};

type OwnerOptions = {
  root: string;
  now?: () => number;
  reaperIntervalMs?: number;
};

export type CitationGraphTransferOwner = {
  begin(
    idempotencyKey: string,
    manifest: SynthesisSidecarTransferManifest,
  ): SynthesisSidecarTransferStatus;
  putInputPage(
    sessionId: string,
    page: SynthesisSidecarTransferPage,
  ): SynthesisSidecarTransferStatus;
  sealInput(sessionId: string): SynthesisSidecarTransferStatus;
  status(sessionId: string): SynthesisSidecarTransferStatus;
  beginOutput(
    sessionId: string,
    manifest: SynthesisSidecarTransferManifest,
  ): SynthesisSidecarTransferStatus;
  putOutputPage(
    sessionId: string,
    page: SynthesisSidecarTransferPage,
  ): SynthesisSidecarTransferStatus;
  sealOutput(sessionId: string): SynthesisSidecarTransferStatus;
  getOutputManifest(sessionId: string): SynthesisSidecarTransferManifest;
  getOutputPage(
    sessionId: string,
    kind: string,
    pageIndex: number,
  ): SynthesisSidecarTransferPage;
  cancel(sessionId: string): { canceled: true };
  snapshot(): SynthesisSidecarTransferSnapshot;
  reapExpired(): void;
  shutdown(): Promise<void>;
};

function identity(kind: string, pageIndex: number) {
  return `${kind}:${pageIndex}`;
}

function manifestsEqual(
  left: SynthesisSidecarTransferManifest,
  right: SynthesisSidecarTransferManifest,
) {
  return left.rootSha256 === right.rootSha256;
}

function retirementName(root: string, basename: string) {
  return path.join(root, `.stale-${basename}-${process.pid}-${Date.now()}`);
}

function retirePath(root: string, pathname: string) {
  try {
    const retired = retirementName(root, path.basename(pathname));
    fs.renameSync(pathname, retired);
    void fs.promises.rm(retired, { recursive: true, force: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
}

function prepareRoot(root: string) {
  fs.mkdirSync(root, { recursive: true, mode: 0o700 });
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const pathname = path.join(root, entry.name);
    if (entry.name.startsWith(".stale-")) {
      void fs.promises.rm(pathname, { recursive: true, force: true });
    } else {
      retirePath(root, pathname);
    }
  }
  if (process.platform !== "win32") {
    fs.chmodSync(root, 0o700);
  }
}

function writePageAtomically(
  sessionRoot: string,
  direction: "input" | "output",
  page: SynthesisSidecarTransferPage,
) {
  const directory = path.join(sessionRoot, direction);
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  const basename = `${page.descriptor.kind}-${page.descriptor.pageIndex}.json`;
  const pathname = path.join(directory, basename);
  const temporaryPath = path.join(directory, `.tmp-${randomUUID()}`);
  fs.writeFileSync(
    temporaryPath,
    `${canonicalizeSynthesisEngineJson(page)}\n`,
    { encoding: "utf8", mode: 0o600, flag: "wx" },
  );
  fs.renameSync(temporaryPath, pathname);
  if (process.platform !== "win32") {
    fs.chmodSync(pathname, 0o600);
  }
  return pathname;
}

function strictManifest(value: SynthesisSidecarTransferManifest) {
  try {
    const manifest = rebuildSynthesisSidecarTransferManifest(value);
    rebuildSynthesisCitationGraphBuildTransferManifest(manifest);
    return manifest;
  } catch {
    throw new CitationGraphTransferError("transfer_conflict");
  }
}

function strictPage(value: SynthesisSidecarTransferPage) {
  try {
    const generic = rebuildSynthesisSidecarTransferPage(value);
    return rebuildSynthesisCitationGraphBuildTransferPage(
      generic,
    ) as unknown as SynthesisSidecarTransferPage;
  } catch {
    throw new CitationGraphTransferError("transfer_conflict");
  }
}

export function createCitationGraphTransferOwner(
  options: OwnerOptions,
): CitationGraphTransferOwner {
  const now = options.now ?? Date.now;
  const root = path.resolve(options.root);
  prepareRoot(root);
  const sessions = new Map<string, Session>();
  const idempotency = new Map<string, string>();
  let stagedBytes = 0;
  let stopping = false;

  const requireReady = () => {
    if (stopping) {
      throw new CitationGraphTransferError("transfer_stopping", true);
    }
  };

  const requireSession = (sessionId: string) => {
    requireReady();
    const session = sessions.get(sessionId);
    if (!session) {
      throw new CitationGraphTransferError("transfer_not_found");
    }
    return session;
  };

  const progress = (
    manifest: SynthesisSidecarTransferManifest,
    pages: Map<string, StoredPage>,
  ) => ({
    receivedPages: pages.size,
    totalPages: manifest.pages.length,
    stagedBytes: [...pages.values()].reduce(
      (sum, stored) => sum + stored.page.descriptor.byteLength,
      0,
    ),
  });

  const status = (session: Session): SynthesisSidecarTransferStatus => {
    const result: SynthesisSidecarTransferStatus = {
      sessionId: session.sessionId,
      state: session.state,
      input: progress(session.inputManifest, session.inputPages),
      stagedBytes: session.stagedBytes,
      createdAtMs: session.createdAtMs,
      lastActivityAtMs: session.lastActivityAtMs,
    };
    if (session.outputManifest) {
      result.output = progress(session.outputManifest, session.outputPages);
    }
    return result;
  };

  const retire = (session: Session) => {
    sessions.delete(session.sessionId);
    idempotency.delete(session.idempotencyKey);
    stagedBytes -= session.stagedBytes;
    retirePath(root, path.join(root, session.sessionId));
  };

  const expectedDescriptor = (
    manifest: SynthesisSidecarTransferManifest,
    page: SynthesisSidecarTransferPage,
  ) =>
    manifest.pages.find(
      (entry) =>
        entry.kind === page.descriptor.kind &&
        entry.pageIndex === page.descriptor.pageIndex,
    );

  const storePage = (
    session: Session,
    direction: "input" | "output",
    manifest: SynthesisSidecarTransferManifest,
    pages: Map<string, StoredPage>,
    pageInput: SynthesisSidecarTransferPage,
  ) => {
    const page = strictPage(pageInput);
    const expected = expectedDescriptor(manifest, page);
    if (
      !expected ||
      JSON.stringify(expected) !== JSON.stringify(page.descriptor)
    ) {
      throw new CitationGraphTransferError("transfer_conflict");
    }
    const key = identity(page.descriptor.kind, page.descriptor.pageIndex);
    const existing = pages.get(key);
    if (existing) {
      if (existing.page.descriptor.sha256 !== page.descriptor.sha256) {
        throw new CitationGraphTransferError("transfer_conflict");
      }
      return status(session);
    }
    if (
      stagedBytes + page.descriptor.byteLength >
      SYNTHESIS_SIDECAR_TRANSFER_LIMITS.serviceBytes
    ) {
      throw new CitationGraphTransferError("transfer_limit_exceeded");
    }
    const pathname = writePageAtomically(
      path.join(root, session.sessionId),
      direction,
      page,
    );
    pages.set(key, { page, path: pathname });
    session.stagedBytes += page.descriptor.byteLength;
    stagedBytes += page.descriptor.byteLength;
    session.lastActivityAtMs = now();
    return status(session);
  };

  const complete = (
    manifest: SynthesisSidecarTransferManifest,
    pages: Map<string, StoredPage>,
  ) =>
    manifest.pages.every((descriptor) =>
      pages.has(identity(descriptor.kind, descriptor.pageIndex)),
    );

  const owner: CitationGraphTransferOwner = {
    begin(idempotencyKey, manifestInput) {
      requireReady();
      const manifest = strictManifest(manifestInput);
      if (manifest.direction !== "input") {
        throw new CitationGraphTransferError("transfer_conflict");
      }
      const existingId = idempotency.get(idempotencyKey);
      if (existingId) {
        const existing = sessions.get(existingId);
        if (!existing) {
          idempotency.delete(idempotencyKey);
        } else if (manifestsEqual(existing.inputManifest, manifest)) {
          return status(existing);
        } else {
          throw new CitationGraphTransferError("transfer_conflict");
        }
      }
      if (sessions.size >= SYNTHESIS_SIDECAR_TRANSFER_LIMITS.activeSessions) {
        throw new CitationGraphTransferError("transfer_busy", true);
      }
      const sessionId = randomUUID();
      const createdAtMs = now();
      const session: Session = {
        sessionId,
        idempotencyKey,
        state: "receiving_input",
        inputManifest: manifest,
        inputPages: new Map(),
        outputPages: new Map(),
        stagedBytes: 0,
        createdAtMs,
        lastActivityAtMs: createdAtMs,
      };
      fs.mkdirSync(path.join(root, sessionId), { mode: 0o700 });
      sessions.set(sessionId, session);
      idempotency.set(idempotencyKey, sessionId);
      return status(session);
    },

    putInputPage(sessionId, page) {
      const session = requireSession(sessionId);
      if (session.state !== "receiving_input") {
        throw new CitationGraphTransferError("transfer_conflict");
      }
      return storePage(
        session,
        "input",
        session.inputManifest,
        session.inputPages,
        page,
      );
    },

    sealInput(sessionId) {
      const session = requireSession(sessionId);
      if (session.state !== "receiving_input") {
        if (session.state === "input_sealed") {
          return status(session);
        }
        throw new CitationGraphTransferError("transfer_conflict");
      }
      if (!complete(session.inputManifest, session.inputPages)) {
        throw new CitationGraphTransferError("transfer_incomplete");
      }
      session.state = "input_sealed";
      session.lastActivityAtMs = now();
      return status(session);
    },

    status(sessionId) {
      return status(requireSession(sessionId));
    },

    beginOutput(sessionId, manifestInput) {
      const session = requireSession(sessionId);
      if (session.state !== "input_sealed") {
        throw new CitationGraphTransferError("transfer_conflict");
      }
      const manifest = strictManifest(manifestInput);
      if (manifest.direction !== "output") {
        throw new CitationGraphTransferError("transfer_conflict");
      }
      session.outputManifest = manifest;
      session.state = "publishing_output";
      session.lastActivityAtMs = now();
      return status(session);
    },

    putOutputPage(sessionId, page) {
      const session = requireSession(sessionId);
      if (session.state !== "publishing_output" || !session.outputManifest) {
        throw new CitationGraphTransferError("transfer_conflict");
      }
      return storePage(
        session,
        "output",
        session.outputManifest,
        session.outputPages,
        page,
      );
    },

    sealOutput(sessionId) {
      const session = requireSession(sessionId);
      if (session.state === "completed") {
        return status(session);
      }
      if (
        session.state !== "publishing_output" ||
        !session.outputManifest ||
        !complete(session.outputManifest, session.outputPages)
      ) {
        throw new CitationGraphTransferError("transfer_incomplete");
      }
      session.state = "completed";
      session.lastActivityAtMs = now();
      return status(session);
    },

    getOutputManifest(sessionId) {
      const session = requireSession(sessionId);
      if (session.state !== "completed" || !session.outputManifest) {
        throw new CitationGraphTransferError("transfer_output_not_ready", true);
      }
      return session.outputManifest;
    },

    getOutputPage(sessionId, kind, pageIndex) {
      const session = requireSession(sessionId);
      if (session.state !== "completed") {
        throw new CitationGraphTransferError("transfer_output_not_ready", true);
      }
      const stored = session.outputPages.get(identity(kind, pageIndex));
      if (!stored) {
        throw new CitationGraphTransferError("transfer_not_found");
      }
      return rebuildSynthesisCitationGraphBuildTransferPage(
        stored.page,
      ) as unknown as SynthesisSidecarTransferPage;
    },

    cancel(sessionId) {
      retire(requireSession(sessionId));
      return { canceled: true };
    },

    snapshot() {
      return {
        state: stopping ? "stopping" : sessions.size > 0 ? "active" : "idle",
        sessions: sessions.size,
        stagedBytes,
      };
    },

    reapExpired() {
      if (stopping) {
        return;
      }
      const current = now();
      for (const session of [...sessions.values()]) {
        if (
          current - session.lastActivityAtMs >
            SYNTHESIS_SIDECAR_TRANSFER_LIMITS.idleTtlMs ||
          current - session.createdAtMs >
            SYNTHESIS_SIDECAR_TRANSFER_LIMITS.absoluteTtlMs
        ) {
          retire(session);
        }
      }
    },

    async shutdown() {
      if (stopping) {
        return;
      }
      stopping = true;
      clearInterval(reaper);
      for (const session of [...sessions.values()]) {
        retire(session);
      }
      await Promise.race([
        fs.promises.readdir(root).then((entries) =>
          Promise.allSettled(
            entries
              .filter((entry) => entry.startsWith(".stale-"))
              .map((entry) =>
                fs.promises.rm(path.join(root, entry), {
                  recursive: true,
                  force: true,
                }),
              ),
          ),
        ),
        new Promise((resolve) =>
          setTimeout(
            resolve,
            SYNTHESIS_SIDECAR_TRANSFER_LIMITS.shutdownBudgetMs,
          ),
        ),
      ]);
    },
  };

  const reaper = setInterval(
    () => owner.reapExpired(),
    options.reaperIntervalMs ??
      SYNTHESIS_SIDECAR_TRANSFER_LIMITS.reaperIntervalMs,
  );
  reaper.unref();
  return owner;
}
