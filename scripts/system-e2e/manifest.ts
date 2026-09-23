import { writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import type { FixtureIdentity } from "./fixture";

export type ArtifactReference =
  | {
      status: "referenced";
      kind: string;
      producer: string;
      mediaType: string;
      relativePath: string;
    }
  | { status: "withheld"; reasonCode: string };

type EvidenceDescriptor = {
  kind: string;
  schemaVersion: string;
  terminalStatus: string;
  operationId?: string;
};

type FamilyResult = {
  familyId: string;
  caseId?: string;
  result: "passed" | "failed" | "aborted" | "skipped";
  publicOutcome?: string;
  failureCode?: string;
  typedEvidence: EvidenceDescriptor[];
  lifecycle: Array<{ checkpoint: string; outcome: string }>;
  cleanup: "passed" | "failed" | "indeterminate";
  health: "passed" | "failed" | "indeterminate";
  artifacts: ArtifactReference[];
};

export type RunIdentity = {
  runId: string;
  triggerLane: string;
  sourceCommit: string;
  pluginVersion: string;
  zoteroVersion: string;
  platform: string;
  architecture: string;
  sidecarBuildIdentity: string;
  fixture: FixtureIdentity;
  startedAt: string;
  predecessorRunId?: string;
};

export type RunManifest = RunIdentity & {
  schemaVersion: "system-e2e-run-manifest.v1";
  terminalState: "complete" | "aborted" | "incomplete";
  finishedAt: string;
  families: FamilyResult[];
  failurePhase?: string;
  abortCode?: string;
};

/**
 * Cross-process wire marker between the System E2E cell worker and the
 * compatibility matrix that binds the receipt to the cell's Run Manifest. The
 * worker publishes the reference as soon as the manifest exists, so a cell
 * that is terminated at its deadline still yields its evidence reference.
 */
export const RUN_MANIFEST_REFERENCE_PREFIX = "[system-e2e-manifest] ";

export function describeRunManifestReference(manifestPath: string) {
  return `${RUN_MANIFEST_REFERENCE_PREFIX}${manifestPath}`;
}

export function publishRunManifestReference(manifestPath: string) {
  process.stdout.write(`${describeRunManifestReference(manifestPath)}\n`);
}

const WITHHELD_REASON = {
  secret: "secret",
  "identifying-content": "identifying_content",
  "host-local-path": "host_local_path",
  "profile-identity": "profile_identity",
  "private-format": "private_format",
} as const;

function portableRelativePath(sourcePath: string) {
  const normalized = sourcePath.replace(/\\/g, "/");
  if (
    !normalized ||
    path.posix.isAbsolute(normalized) ||
    /^[A-Za-z]:\//.test(normalized) ||
    normalized.split("/").includes("..")
  ) {
    throw new Error("artifact_path_not_workspace_relative");
  }
  return normalized;
}

export function classifyArtifactReference(input: {
  kind: string;
  producer: string;
  mediaType: string;
  sourcePath: string;
  classification: "sanitized" | keyof typeof WITHHELD_REASON;
}): ArtifactReference {
  if (input.classification !== "sanitized") {
    return {
      status: "withheld",
      reasonCode: WITHHELD_REASON[input.classification],
    };
  }
  return {
    status: "referenced",
    kind: input.kind,
    producer: input.producer,
    mediaType: input.mediaType,
    relativePath: portableRelativePath(input.sourcePath),
  };
}

function hasRequiredEvidence(family: FamilyResult) {
  return (
    family.result !== "passed" ||
    (Boolean(family.publicOutcome) &&
      family.typedEvidence.length > 0 &&
      family.lifecycle.length > 0 &&
      family.cleanup === "passed" &&
      family.health === "passed")
  );
}

export function createRunManifest(identity: RunIdentity) {
  const families: FamilyResult[] = [];
  const finish = (
    terminalState: RunManifest["terminalState"],
    extra: Partial<Pick<RunManifest, "failurePhase" | "abortCode">> = {},
  ): RunManifest => ({
    schemaVersion: "system-e2e-run-manifest.v1",
    ...identity,
    terminalState,
    finishedAt: new Date().toISOString(),
    families: families.map((family) => ({ ...family })),
    ...extra,
  });
  return {
    recordFamily(family: FamilyResult) {
      const normalized: FamilyResult = {
        familyId: family.familyId,
        ...(family.caseId ? { caseId: family.caseId } : {}),
        result: family.result,
        ...(family.publicOutcome
          ? { publicOutcome: family.publicOutcome }
          : {}),
        ...(family.failureCode ? { failureCode: family.failureCode } : {}),
        typedEvidence: family.typedEvidence.map((entry) => ({
          kind: entry.kind,
          schemaVersion: entry.schemaVersion,
          terminalStatus: entry.terminalStatus,
          ...(entry.operationId ? { operationId: entry.operationId } : {}),
        })),
        lifecycle: family.lifecycle.map((entry) => ({
          checkpoint: entry.checkpoint,
          outcome: entry.outcome,
        })),
        cleanup: family.cleanup,
        health: family.health,
        artifacts: family.artifacts.map((entry) => ({ ...entry })),
      };
      families.push(
        hasRequiredEvidence(normalized)
          ? normalized
          : {
              ...normalized,
              result: "failed",
              failureCode: "required_evidence_missing",
            },
      );
    },
    recordArtifact(
      familyId: string,
      caseId: string,
      artifact: ArtifactReference,
    ) {
      let family = families.find(
        (entry) => entry.familyId === familyId && entry.caseId === caseId,
      );
      if (!family) {
        family = {
          familyId,
          caseId,
          result: "failed",
          failureCode: "runner_evidence_after_host_exit",
          typedEvidence: [],
          lifecycle: [],
          cleanup: "indeterminate",
          health: "indeterminate",
          artifacts: [],
        };
        families.push(family);
      }
      if (
        !family.artifacts.some(
          (entry) => JSON.stringify(entry) === JSON.stringify(artifact),
        )
      ) {
        family.artifacts.push({ ...artifact });
      }
    },
    complete: () => finish("complete"),
    abort: (failure: { failurePhase: string; abortCode: string }) =>
      finish("aborted", failure),
    incomplete: () => finish("incomplete"),
  };
}

export function createRunManifestEventCollector(identity: RunIdentity) {
  const currentIdentity = { ...identity };
  const manifest = createRunManifest(currentIdentity);
  let familyCount = 0;
  let sawEnd = false;
  let endFailed = false;
  let abort: { failurePhase: string; abortCode: string } | undefined;
  return {
    accept(payload: unknown) {
      if (!payload || typeof payload !== "object") return;
      const event = payload as { type?: unknown; data?: unknown };
      if (event.type === "end") {
        sawEnd = true;
        const data =
          event.data && typeof event.data === "object"
            ? (event.data as Record<string, unknown>)
            : {};
        endFailed =
          Number(data.failed || 0) > 0 ||
          data.aborted === true ||
          Number(data.aborted || 0) > 0;
        return;
      }
      if (
        event.type !== "debug" ||
        !event.data ||
        typeof event.data !== "object"
      ) {
        return;
      }
      const data = event.data as Record<string, unknown>;
      if (data.kind === "system-e2e-run-identity") {
        const zoteroVersion = String(data.zoteroVersion || "").trim();
        if (zoteroVersion) currentIdentity.zoteroVersion = zoteroVersion;
      } else if (
        data.kind === "system-e2e-family-result" &&
        data.family &&
        typeof data.family === "object"
      ) {
        manifest.recordFamily(data.family as FamilyResult);
        familyCount += 1;
      } else if (data.kind === "system-e2e-abort") {
        abort = {
          failurePhase: String(data.failurePhase || "runner"),
          abortCode: String(data.abortCode || "system_e2e_aborted"),
        };
      }
    },
    recordArtifact(
      familyId: string,
      caseId: string,
      artifact: ArtifactReference,
    ) {
      manifest.recordArtifact(familyId, caseId, artifact);
      familyCount = Math.max(familyCount, 1);
    },
    finalize(exitCode: number) {
      if (abort) return manifest.abort(abort);
      if (sawEnd && !endFailed && exitCode === 0 && familyCount > 0) {
        return manifest.complete();
      }
      return manifest.incomplete();
    },
    snapshot: () => manifest.incomplete(),
  };
}

export async function persistRunManifest(
  manifestPath: string,
  manifest: RunManifest,
  writer: typeof writeFile = writeFile,
) {
  try {
    await writer(
      manifestPath,
      `${JSON.stringify(manifest, null, 2)}\n`,
      "utf8",
    );
  } catch (error) {
    throw new Error("run_manifest_persist_failed", { cause: error });
  }
}

export async function startSystemE2EEventSink(
  accept: (event: unknown) => void | Promise<void>,
) {
  const server = createServer((request, response) => {
    if (request.method !== "POST" || request.url !== "/events") {
      response.writeHead(404).end();
      return;
    }
    const chunks: Buffer[] = [];
    let size = 0;
    request.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > 1_048_576) request.destroy();
      else chunks.push(chunk);
    });
    request.on("end", () => {
      void Promise.resolve()
        .then(() => accept(JSON.parse(Buffer.concat(chunks).toString("utf8"))))
        .then(() => response.writeHead(200).end())
        .catch(() => response.writeHead(400).end());
    });
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    server.close();
    throw new Error("system_e2e_event_sink_bind_failed");
  }
  return {
    url: `http://127.0.0.1:${address.port}/events`,
    close: () =>
      new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  };
}
