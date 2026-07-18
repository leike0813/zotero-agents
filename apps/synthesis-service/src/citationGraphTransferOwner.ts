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
  type SynthesisSidecarTransferExecutionFailureCode,
} from "../../../packages/synthesis-contracts/src/sidecarTransfer.js";
import {
  canonicalizeSynthesisEngineJson,
  encodeSynthesisEngineText,
  rebuildSynthesisCitationGraphBuildTransferManifest,
  rebuildSynthesisCitationGraphBuildTransferPageArtifact,
  sha256SynthesisEngineBytes,
  type SynthesisCitationGraphBuildTransferPageArtifact,
  type SynthesisCitationGraphBuildTransferPageKind,
} from "../../../packages/synthesis-engine/src/index.js";
import type { SynthesisSidecarErrorCode } from "../../../packages/synthesis-contracts/src/sidecarSystem.js";
import type { SynthesisSidecarGraphBuildTransferPageFrame } from "./computeProtocol.js";

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
  descriptor: SynthesisSidecarTransferPage["descriptor"];
  path: string;
  rowsOffset: number;
  rowsByteLength: number;
};

type Session = {
  sessionId: string;
  idempotencyKey: string;
  state: SynthesisSidecarTransferState;
  inputManifest: SynthesisSidecarTransferManifest;
  inputPages: Map<string, StoredPage>;
  outputManifest?: SynthesisSidecarTransferManifest;
  outputPages: Map<string, StoredPage>;
  attemptPages: Map<string, StoredPage>;
  attemptBytes: number;
  attempts: number;
  currentAttempt?: number;
  lastFailure?: {
    code: SynthesisSidecarTransferExecutionFailureCode;
    retryable: boolean;
    atMs: number;
  };
  stagedBytes: number;
  createdAtMs: number;
  lastActivityAtMs: number;
};

type OwnerOptions = {
  root: string;
  now?: () => number;
  reaperIntervalMs?: number;
};

export type CitationGraphTransferExecutionOwner = {
  queueExecution(sessionId: string): {
    attempt: number;
    status: SynthesisSidecarTransferStatus;
    admitted: boolean;
  };
  startExecution(
    sessionId: string,
    attempt: number,
  ): SynthesisSidecarTransferStatus;
  startOutput(
    sessionId: string,
    attempt: number,
  ): SynthesisSidecarTransferStatus;
  stageAttemptOutputFrame(
    sessionId: string,
    attempt: number,
    frame: SynthesisSidecarGraphBuildTransferPageFrame,
  ): SynthesisSidecarGraphBuildTransferPageFrame["descriptor"];
  commitOutput(
    sessionId: string,
    attempt: number,
    manifest: SynthesisSidecarTransferManifest,
  ): SynthesisSidecarTransferStatus;
  failExecution(
    sessionId: string,
    attempt: number,
    failure: {
      code: SynthesisSidecarTransferExecutionFailureCode;
      retryable: boolean;
    },
  ): SynthesisSidecarTransferStatus | undefined;
  inputManifest(sessionId: string): SynthesisSidecarTransferManifest;
  readInputFrame(
    sessionId: string,
    kind: string,
    pageIndex: number,
  ): SynthesisSidecarGraphBuildTransferPageFrame;
  status(sessionId: string): SynthesisSidecarTransferStatus;
};

export type CitationGraphTransferOwner = CitationGraphTransferExecutionOwner & {
  begin(
    idempotencyKey: string,
    manifest: SynthesisSidecarTransferManifest,
  ): SynthesisSidecarTransferStatus;
  putInputPage(
    sessionId: string,
    page: SynthesisSidecarTransferPage,
  ): SynthesisSidecarTransferStatus;
  sealInput(sessionId: string): SynthesisSidecarTransferStatus;
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
  directionRoot: string,
  artifact: SynthesisCitationGraphBuildTransferPageArtifact,
) {
  const page = artifact.page as unknown as SynthesisSidecarTransferPage;
  const directory = directionRoot;
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  const basename = `${page.descriptor.kind}-${page.descriptor.pageIndex}.json`;
  const pathname = path.join(directory, basename);
  const temporaryPath = path.join(directory, `.tmp-${randomUUID()}`);
  const prefix = encodeSynthesisEngineText(
    `{"descriptor":${canonicalizeSynthesisEngineJson(page.descriptor)},"rows":`,
  );
  const suffix = Uint8Array.of(0x7d, 0x0a);
  const contents = new Uint8Array(
    prefix.byteLength + artifact.bytes.byteLength + suffix.byteLength,
  );
  contents.set(prefix, 0);
  contents.set(artifact.bytes, prefix.byteLength);
  contents.set(suffix, prefix.byteLength + artifact.bytes.byteLength);
  fs.writeFileSync(temporaryPath, contents, {
    mode: 0o600,
    flag: "wx",
  });
  fs.renameSync(temporaryPath, pathname);
  if (process.platform !== "win32") {
    fs.chmodSync(pathname, 0o600);
  }
  return {
    descriptor: page.descriptor,
    path: pathname,
    rowsOffset: prefix.byteLength,
    rowsByteLength: artifact.bytes.byteLength,
  };
}

function readStoredRows(stored: StoredPage) {
  const contents = fs.readFileSync(stored.path);
  const end = stored.rowsOffset + stored.rowsByteLength;
  if (end > contents.byteLength) {
    throw new CitationGraphTransferError("transfer_conflict");
  }
  const rows = Uint8Array.from(contents.subarray(stored.rowsOffset, end));
  if (
    rows.byteLength !== stored.descriptor.byteLength ||
    sha256SynthesisEngineBytes(rows) !== stored.descriptor.sha256
  ) {
    throw new CitationGraphTransferError("transfer_conflict");
  }
  return rows;
}

function readStoredPage(stored: StoredPage) {
  const rows = JSON.parse(
    new TextDecoder().decode(readStoredRows(stored)),
  ) as unknown;
  const page = strictPage({
    descriptor: stored.descriptor,
    rows,
  } as SynthesisSidecarTransferPage);
  if (JSON.stringify(page.descriptor) !== JSON.stringify(stored.descriptor)) {
    throw new CitationGraphTransferError("transfer_conflict");
  }
  return page;
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

function strictPageArtifact(value: SynthesisSidecarTransferPage) {
  try {
    const generic = rebuildSynthesisSidecarTransferPage(value);
    return rebuildSynthesisCitationGraphBuildTransferPageArtifact(generic);
  } catch {
    throw new CitationGraphTransferError("transfer_conflict");
  }
}

function strictPage(value: SynthesisSidecarTransferPage) {
  return strictPageArtifact(value)
    .page as unknown as SynthesisSidecarTransferPage;
}

function strictFrameArtifact(
  frame: SynthesisSidecarGraphBuildTransferPageFrame,
) {
  try {
    const received = new Uint8Array(frame.bytes);
    const rows = JSON.parse(new TextDecoder().decode(received)) as unknown;
    const artifact = strictPageArtifact({
      descriptor: frame.descriptor,
      rows,
    } as SynthesisSidecarTransferPage);
    if (
      artifact.bytes.byteLength !== received.byteLength ||
      artifact.bytes.some((byte, index) => byte !== received[index])
    ) {
      throw new CitationGraphTransferError("transfer_conflict");
    }
    return artifact;
  } catch (error) {
    if (error instanceof CitationGraphTransferError) throw error;
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
      (sum, stored) => sum + stored.descriptor.byteLength,
      0,
    ),
  });

  const status = (session: Session): SynthesisSidecarTransferStatus => {
    const result: SynthesisSidecarTransferStatus = {
      sessionId: session.sessionId,
      state: session.state,
      input: progress(session.inputManifest, session.inputPages),
      execution: {
        attempts: session.attempts,
        ...(session.lastFailure
          ? { lastFailure: { ...session.lastFailure } }
          : {}),
      },
      stagedBytes: session.stagedBytes,
      createdAtMs: session.createdAtMs,
      lastActivityAtMs: session.lastActivityAtMs,
    };
    if (session.outputManifest) {
      result.output = progress(session.outputManifest, session.outputPages);
    } else if (
      session.state === "publishing_output" &&
      session.attemptPages.size > 0
    ) {
      result.output = {
        receivedPages: session.attemptPages.size,
        totalPages: session.attemptPages.size,
        stagedBytes: session.attemptBytes,
      };
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

  const storePageArtifact = (
    session: Session,
    directory: string,
    manifest: SynthesisSidecarTransferManifest | undefined,
    pages: Map<string, StoredPage>,
    artifact: SynthesisCitationGraphBuildTransferPageArtifact,
  ) => {
    const page = artifact.page as unknown as SynthesisSidecarTransferPage;
    if (manifest) {
      const expected = expectedDescriptor(manifest, page);
      if (
        !expected ||
        JSON.stringify(expected) !== JSON.stringify(page.descriptor)
      ) {
        throw new CitationGraphTransferError("transfer_conflict");
      }
    }
    const key = identity(page.descriptor.kind, page.descriptor.pageIndex);
    const existing = pages.get(key);
    if (existing) {
      if (existing.descriptor.sha256 !== page.descriptor.sha256) {
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
    const stored = writePageAtomically(directory, artifact);
    pages.set(key, stored);
    session.stagedBytes += page.descriptor.byteLength;
    stagedBytes += page.descriptor.byteLength;
    session.lastActivityAtMs = now();
    return status(session);
  };

  const storePage = (
    session: Session,
    directory: string,
    manifest: SynthesisSidecarTransferManifest | undefined,
    pages: Map<string, StoredPage>,
    pageInput: SynthesisSidecarTransferPage,
  ) =>
    storePageArtifact(
      session,
      directory,
      manifest,
      pages,
      strictPageArtifact(pageInput),
    );

  const complete = (
    manifest: SynthesisSidecarTransferManifest,
    pages: Map<string, StoredPage>,
  ) =>
    manifest.pages.every((descriptor) =>
      pages.has(identity(descriptor.kind, descriptor.pageIndex)),
    );

  const attemptRoot = (session: Session, attempt: number) =>
    path.join(root, session.sessionId, `.attempt-${attempt}`);

  const discardAttempt = (session: Session, attempt: number) => {
    if (session.currentAttempt !== attempt) {
      return;
    }
    session.stagedBytes -= session.attemptBytes;
    stagedBytes -= session.attemptBytes;
    session.attemptBytes = 0;
    session.attemptPages.clear();
    const pathname = attemptRoot(session, attempt);
    if (fs.existsSync(pathname)) {
      retirePath(path.join(root, session.sessionId), pathname);
    }
  };

  const requireAttemptWritable = (session: Session, attempt: number) => {
    if (
      session.state !== "publishing_output" ||
      session.currentAttempt !== attempt ||
      session.attemptPages.size >=
        SYNTHESIS_SIDECAR_TRANSFER_LIMITS.directionPages
    ) {
      throw new CitationGraphTransferError("transfer_conflict");
    }
  };

  const storeAttemptArtifact = (
    session: Session,
    attempt: number,
    artifact: SynthesisCitationGraphBuildTransferPageArtifact,
  ) => {
    requireAttemptWritable(session, attempt);
    const before = session.stagedBytes;
    storePageArtifact(
      session,
      path.join(attemptRoot(session, attempt), "output"),
      session.outputManifest,
      session.attemptPages,
      artifact,
    );
    session.attemptBytes += session.stagedBytes - before;
    if (
      session.attemptBytes > SYNTHESIS_SIDECAR_TRANSFER_LIMITS.directionBytes
    ) {
      discardAttempt(session, attempt);
      session.state = "input_sealed";
      throw new CitationGraphTransferError("transfer_limit_exceeded");
    }
  };

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
        attemptPages: new Map(),
        attemptBytes: 0,
        attempts: 0,
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
        path.join(root, session.sessionId, "input"),
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

    queueExecution(sessionId) {
      const session = requireSession(sessionId);
      if (
        session.state === "queued" ||
        session.state === "executing" ||
        session.state === "publishing_output" ||
        session.state === "completed"
      ) {
        return {
          attempt: session.currentAttempt ?? session.attempts,
          status: status(session),
          admitted: false,
        };
      }
      if (session.state !== "input_sealed") {
        throw new CitationGraphTransferError("transfer_conflict");
      }
      session.attempts += 1;
      session.currentAttempt = session.attempts;
      session.lastFailure = undefined;
      session.outputManifest = undefined;
      session.outputPages.clear();
      session.attemptPages.clear();
      session.attemptBytes = 0;
      session.state = "queued";
      session.lastActivityAtMs = now();
      fs.mkdirSync(attemptRoot(session, session.attempts), {
        recursive: true,
        mode: 0o700,
      });
      return {
        attempt: session.attempts,
        status: status(session),
        admitted: true,
      };
    },

    startExecution(sessionId, attempt) {
      const session = requireSession(sessionId);
      if (session.state !== "queued" || session.currentAttempt !== attempt) {
        throw new CitationGraphTransferError("transfer_conflict");
      }
      session.state = "executing";
      session.lastActivityAtMs = now();
      return status(session);
    },

    startOutput(sessionId, attempt) {
      const session = requireSession(sessionId);
      if (session.state !== "executing" || session.currentAttempt !== attempt) {
        throw new CitationGraphTransferError("transfer_conflict");
      }
      session.state = "publishing_output";
      session.lastActivityAtMs = now();
      fs.mkdirSync(path.join(attemptRoot(session, attempt), "output"), {
        recursive: true,
        mode: 0o700,
      });
      return status(session);
    },

    stageAttemptOutputFrame(sessionId, attempt, frame) {
      const session = requireSession(sessionId);
      requireAttemptWritable(session, attempt);
      const artifact = strictFrameArtifact(frame);
      storeAttemptArtifact(session, attempt, artifact);
      return artifact.page
        .descriptor as SynthesisSidecarGraphBuildTransferPageFrame["descriptor"];
    },

    commitOutput(sessionId, attempt, manifestInput) {
      const session = requireSession(sessionId);
      const manifest = strictManifest(manifestInput);
      if (
        session.state !== "publishing_output" ||
        session.currentAttempt !== attempt ||
        manifest.direction !== "output" ||
        manifest.pages.length !== session.attemptPages.size ||
        !complete(manifest, session.attemptPages)
      ) {
        throw new CitationGraphTransferError("transfer_incomplete");
      }
      for (const descriptor of manifest.pages) {
        const stored = session.attemptPages.get(
          identity(descriptor.kind, descriptor.pageIndex),
        );
        if (
          !stored ||
          JSON.stringify(stored.descriptor) !== JSON.stringify(descriptor)
        ) {
          throw new CitationGraphTransferError("transfer_conflict");
        }
      }
      const publishedRoot = path.join(root, session.sessionId, "output");
      const stagedRoot = path.join(attemptRoot(session, attempt), "output");
      if (fs.existsSync(publishedRoot)) {
        retirePath(path.join(root, session.sessionId), publishedRoot);
      }
      fs.renameSync(stagedRoot, publishedRoot);
      session.outputPages = new Map(
        [...session.attemptPages].map(([key, stored]) => [
          key,
          {
            descriptor: stored.descriptor,
            path: path.join(publishedRoot, path.basename(stored.path)),
            rowsOffset: stored.rowsOffset,
            rowsByteLength: stored.rowsByteLength,
          },
        ]),
      );
      session.attemptPages.clear();
      session.attemptBytes = 0;
      session.outputManifest = manifest;
      session.state = "completed";
      session.lastActivityAtMs = now();
      void fs.promises.rm(attemptRoot(session, attempt), {
        recursive: true,
        force: true,
      });
      return status(session);
    },

    failExecution(sessionId, attempt, failure) {
      const session = sessions.get(sessionId);
      if (!session || session.currentAttempt !== attempt) {
        return undefined;
      }
      if (session.state === "completed") {
        return status(session);
      }
      discardAttempt(session, attempt);
      session.state = "input_sealed";
      session.lastFailure = { ...failure, atMs: now() };
      session.lastActivityAtMs = now();
      return status(session);
    },

    inputManifest(sessionId) {
      return strictManifest(requireSession(sessionId).inputManifest);
    },

    readInputFrame(sessionId, kind, pageIndex) {
      const session = requireSession(sessionId);
      if (session.state === "receiving_input") {
        throw new CitationGraphTransferError("transfer_incomplete");
      }
      const stored = session.inputPages.get(identity(kind, pageIndex));
      if (!stored) {
        throw new CitationGraphTransferError("transfer_not_found");
      }
      const rows = readStoredRows(stored);
      return {
        descriptor:
          stored.descriptor as SynthesisSidecarGraphBuildTransferPageFrame["descriptor"],
        bytes: rows.buffer as ArrayBuffer,
      };
    },

    status(sessionId) {
      return status(requireSession(sessionId));
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
      return readStoredPage(stored);
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
