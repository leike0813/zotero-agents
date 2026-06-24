import { getPathSeparator, joinPath } from "../utils/path";
import type { SkillRunnerCtlCommandResult } from "./skillRunnerCtlBridge";

type DynamicImport = (specifier: string) => Promise<any>;

const dynamicImport: DynamicImport = new Function(
  "specifier",
  "return import(specifier)",
) as DynamicImport;

export type ReleaseInstallResult = {
  ok: boolean;
  stage: string;
  message: string;
  installDir?: string;
  artifactFile?: string;
  checksumFile?: string;
  artifactBytes?: number;
  expectedSha256?: string;
  actualSha256?: string;
  extractCommand?: string[];
  tempDir?: string;
  details?: Record<string, unknown>;
};

export type ReleaseInstallerArgs = {
  version: string;
  installRoot: string;
  repo: string;
  onProgress?: (progress: {
    stage: "download-checksum-complete" | "extract-complete";
    details?: Record<string, unknown>;
  }) => void;
  runCommand: (args: {
    command: string;
    args: string[];
    cwd?: string;
    timeoutMs?: number;
  }) => Promise<SkillRunnerCtlCommandResult>;
  keepTempOnSuccess?: boolean;
  keepTempOnFailure?: boolean;
};

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function detectWindows() {
  return getPathSeparator() === "\\";
}

function readDirectoryServicePath(key: string) {
  const runtime = globalThis as {
    Services?: {
      dirsvc?: {
        get?: (name: string, iface: unknown) => { path?: string };
      };
    };
    Ci?: { nsIFile?: unknown };
  };
  if (!runtime.Services?.dirsvc?.get || !runtime.Ci?.nsIFile) {
    return "";
  }
  try {
    const file = runtime.Services.dirsvc.get(key, runtime.Ci.nsIFile);
    return normalizeString(file?.path);
  } catch {
    return "";
  }
}

function resolveTempRoot() {
  const runtime = globalThis as {
    process?: { env?: Record<string, string | undefined> };
  };
  const env = runtime.process?.env || {};
  const value =
    normalizeString(env.TEMP) ||
    normalizeString(env.TMP) ||
    normalizeString(env.TMPDIR);
  if (value) {
    return value;
  }
  return (
    readDirectoryServicePath("TmpD") || readDirectoryServicePath("ProfD") || "."
  );
}

function getGlobalFetch() {
  const runtime = globalThis as {
    fetch?: (input: string, init?: RequestInit) => Promise<Response>;
  };
  return runtime.fetch;
}

async function ensureDirectory(pathValue: string) {
  const normalized = normalizeString(pathValue);
  if (!normalized) {
    return;
  }
  const runtime = globalThis as {
    IOUtils?: {
      makeDirectory?: (
        path: string,
        options?: { createAncestors?: boolean; ignoreExisting?: boolean },
      ) => Promise<void>;
    };
  };
  if (typeof runtime.IOUtils?.makeDirectory === "function") {
    await runtime.IOUtils.makeDirectory(normalized, {
      createAncestors: true,
      ignoreExisting: true,
    });
    return;
  }
  const fs = await dynamicImport("fs/promises");
  await fs.mkdir(normalized, { recursive: true });
}

async function pathExists(pathValue: string) {
  const normalized = normalizeString(pathValue);
  if (!normalized) {
    return false;
  }
  const runtime = globalThis as {
    IOUtils?: { exists?: (path: string) => Promise<boolean> };
  };
  if (typeof runtime.IOUtils?.exists === "function") {
    try {
      return !!(await runtime.IOUtils.exists(normalized));
    } catch {
      // continue to node fallback
    }
  }
  try {
    const fs = await dynamicImport("fs/promises");
    await fs.access(normalized);
    return true;
  } catch {
    return false;
  }
}

async function writeBytes(pathValue: string, bytes: Uint8Array) {
  const runtime = globalThis as {
    IOUtils?: {
      write?: (path: string, data: Uint8Array) => Promise<number | void>;
    };
  };
  if (typeof runtime.IOUtils?.write === "function") {
    await runtime.IOUtils.write(pathValue, bytes);
    return;
  }
  const fs = await dynamicImport("fs/promises");
  await fs.writeFile(pathValue, Buffer.from(bytes));
}

async function removePathIfExists(pathValue: string) {
  const normalized = normalizeString(pathValue);
  if (!normalized) {
    return;
  }
  const runtime = globalThis as {
    IOUtils?: {
      remove?: (
        path: string,
        options?: { ignoreAbsent?: boolean; recursive?: boolean },
      ) => Promise<void>;
    };
  };
  if (typeof runtime.IOUtils?.remove === "function") {
    try {
      await runtime.IOUtils.remove(normalized, {
        ignoreAbsent: true,
        recursive: true,
      });
      return;
    } catch {
      // continue to node fallback
    }
  }
  try {
    const fs = await dynamicImport("fs/promises");
    await fs.rm(normalized, {
      recursive: true,
      force: true,
    });
  } catch {
    // ignore cleanup failures
  }
}

async function computeSha256Hex(bytes: Uint8Array) {
  const runtime = globalThis as {
    crypto?: {
      subtle?: {
        digest?: (
          algorithm: string,
          data: ArrayBuffer | ArrayBufferView,
        ) => Promise<ArrayBuffer>;
      };
    };
  };
  if (typeof runtime.crypto?.subtle?.digest === "function") {
    const digest = await runtime.crypto.subtle.digest("SHA-256", bytes);
    const view = new Uint8Array(digest);
    return Array.from(view)
      .map((entry) => entry.toString(16).padStart(2, "0"))
      .join("");
  }
  const crypto = await dynamicImport("crypto");
  const hash = crypto.createHash("sha256");
  hash.update(Buffer.from(bytes));
  return String(hash.digest("hex")).toLowerCase();
}

function parseExpectedSha256(rawChecksum: string) {
  const token = normalizeString(rawChecksum).split(/\s+/)[0] || "";
  return token.toLowerCase();
}

function createFailure(args: {
  stage: string;
  message: string;
  tempDir?: string;
  details?: Record<string, unknown>;
  installDir?: string;
  artifactFile?: string;
  checksumFile?: string;
  artifactBytes?: number;
  expectedSha256?: string;
  actualSha256?: string;
  extractCommand?: string[];
}): ReleaseInstallResult {
  return {
    ok: false,
    stage: args.stage,
    message: args.message,
    ...(args.tempDir ? { tempDir: args.tempDir } : {}),
    ...(args.installDir ? { installDir: args.installDir } : {}),
    ...(args.artifactFile ? { artifactFile: args.artifactFile } : {}),
    ...(args.checksumFile ? { checksumFile: args.checksumFile } : {}),
    ...(typeof args.artifactBytes === "number"
      ? { artifactBytes: args.artifactBytes }
      : {}),
    ...(args.expectedSha256 ? { expectedSha256: args.expectedSha256 } : {}),
    ...(args.actualSha256 ? { actualSha256: args.actualSha256 } : {}),
    ...(args.extractCommand ? { extractCommand: args.extractCommand } : {}),
    ...(args.details ? { details: args.details } : {}),
  };
}

export async function installSkillRunnerRelease(
  args: ReleaseInstallerArgs,
): Promise<ReleaseInstallResult> {
  const version = normalizeString(args.version);
  const installRoot = normalizeString(args.installRoot);
  const repo = normalizeString(args.repo);
  if (!version || !installRoot || !repo) {
    return createFailure({
      stage: "deploy-release-install",
      message: "version/installRoot/repo is required for release install",
    });
  }
  const fetchImpl = getGlobalFetch();
  if (typeof fetchImpl !== "function") {
    return createFailure({
      stage: "deploy-release-install",
      message: "fetch API unavailable in current runtime",
    });
  }

  const artifactName = `skill-runner-${version}.tar.gz`;
  const checksumName = `${artifactName}.sha256`;
  const baseUrl = `https://github.com/${repo}/releases/download/${version}`;
  const artifactUrl = `${baseUrl}/${artifactName}`;
  const checksumUrl = `${baseUrl}/${checksumName}`;
  const tempDir = joinPath(
    resolveTempRoot(),
    `zotero-skills-release-install-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
  );
  const artifactFile = joinPath(tempDir, artifactName);
  const checksumFile = joinPath(tempDir, checksumName);
  const installDir = joinPath(installRoot, version);
  const ctlPath = joinPath(
    installDir,
    "scripts",
    detectWindows() ? "skill-runnerctl.ps1" : "skill-runnerctl",
  );
  const serverDir = joinPath(installDir, "server");
  const extractCommand = ["-xzf", artifactFile, "-C", installDir];
  const keepTempOnSuccess = args.keepTempOnSuccess === true;
  const keepTempOnFailure = args.keepTempOnFailure !== false;

  let downloadedArtifact: Uint8Array | null = null;
  let downloadedChecksum: Uint8Array | null = null;
  let expectedSha256 = "";
  let actualSha256 = "";
  let failure: ReleaseInstallResult | null = null;

  try {
    await ensureDirectory(tempDir);
    await ensureDirectory(installDir);

    const artifactResponse = await fetchImpl(artifactUrl, {
      method: "GET",
    });
    if (!artifactResponse.ok) {
      return createFailure({
        stage: "deploy-release-download",
        message: `artifact download failed: ${artifactResponse.status}`,
        tempDir,
        details: {
          artifactUrl,
          status: artifactResponse.status,
        },
      });
    }
    downloadedArtifact = new Uint8Array(await artifactResponse.arrayBuffer());
    await writeBytes(artifactFile, downloadedArtifact);

    const checksumResponse = await fetchImpl(checksumUrl, {
      method: "GET",
    });
    if (!checksumResponse.ok) {
      return createFailure({
        stage: "deploy-release-download",
        message: `checksum download failed: ${checksumResponse.status}`,
        tempDir,
        artifactFile,
        artifactBytes: downloadedArtifact.byteLength,
        details: {
          checksumUrl,
          status: checksumResponse.status,
        },
      });
    }
    downloadedChecksum = new Uint8Array(await checksumResponse.arrayBuffer());
    await writeBytes(checksumFile, downloadedChecksum);

    expectedSha256 = parseExpectedSha256(
      new TextDecoder("utf-8").decode(downloadedChecksum),
    );
    if (!expectedSha256) {
      return createFailure({
        stage: "deploy-release-checksum",
        message: "checksum file does not contain a valid SHA256 token",
        tempDir,
        artifactFile,
        checksumFile,
        artifactBytes: downloadedArtifact.byteLength,
      });
    }
    actualSha256 = await computeSha256Hex(downloadedArtifact);
    if (actualSha256 !== expectedSha256) {
      return createFailure({
        stage: "deploy-release-checksum",
        message: "artifact SHA256 mismatch",
        tempDir,
        artifactFile,
        checksumFile,
        artifactBytes: downloadedArtifact.byteLength,
        expectedSha256,
        actualSha256,
      });
    }
    args.onProgress?.({
      stage: "download-checksum-complete",
      details: {
        artifactFile,
        checksumFile,
        artifactBytes: downloadedArtifact.byteLength,
        expectedSha256,
        actualSha256,
      },
    });

    const extractResult = await args.runCommand({
      command: "tar",
      args: extractCommand,
      timeoutMs: 10 * 60 * 1000,
    });
    if (!extractResult.ok) {
      return createFailure({
        stage: "deploy-release-extract",
        message: `extract failed: ${extractResult.message}`,
        tempDir,
        installDir,
        artifactFile,
        checksumFile,
        artifactBytes: downloadedArtifact.byteLength,
        expectedSha256,
        actualSha256,
        extractCommand: ["tar", ...extractCommand],
        details: {
          exitCode: extractResult.exitCode,
          stdout: extractResult.stdout,
          stderr: extractResult.stderr,
        },
      });
    }
    args.onProgress?.({
      stage: "extract-complete",
      details: {
        installDir,
        ctlPath,
        serverDir,
        command: ["tar", ...extractCommand],
      },
    });

    const [installDirExists, ctlPathExists, serverDirExists] =
      await Promise.all([
        pathExists(installDir),
        pathExists(ctlPath),
        pathExists(serverDir),
      ]);
    if (!installDirExists || !ctlPathExists || !serverDirExists) {
      return createFailure({
        stage: "deploy-release-artifacts",
        message:
          "expected extracted artifacts are missing (installDir/ctl/server)",
        tempDir,
        installDir,
        artifactFile,
        checksumFile,
        artifactBytes: downloadedArtifact.byteLength,
        expectedSha256,
        actualSha256,
        extractCommand: ["tar", ...extractCommand],
        details: {
          installDirExists,
          ctlPath,
          ctlPathExists,
          serverDir,
          serverDirExists,
        },
      });
    }

    return {
      ok: true,
      stage: "deploy-release-install",
      message: "release download/checksum/extract succeeded",
      installDir,
      artifactFile,
      checksumFile,
      artifactBytes: downloadedArtifact.byteLength,
      expectedSha256,
      actualSha256,
      extractCommand: ["tar", ...extractCommand],
      ...(keepTempOnSuccess ? { tempDir } : {}),
      details: {
        downloadProof: {
          artifactUrl,
          checksumUrl,
          artifactFile,
          checksumFile,
          artifactBytes: downloadedArtifact.byteLength,
          checksumBytes: downloadedChecksum.byteLength,
        },
        checksumProof: {
          expectedSha256,
          actualSha256,
          matched: true,
        },
        extractProof: {
          installDir,
          ctlPath,
          serverDir,
          command: ["tar", ...extractCommand],
        },
        tempDir,
      },
    };
  } catch (error) {
    failure = createFailure({
      stage: "deploy-release-install",
      message:
        normalizeString(
          error && typeof error === "object" && "message" in error
            ? (error as { message?: unknown }).message
            : error,
        ) || "release install failed",
      tempDir,
      installDir,
      artifactFile,
      checksumFile,
      artifactBytes: downloadedArtifact?.byteLength,
      expectedSha256,
      actualSha256,
      extractCommand: ["tar", ...extractCommand],
    });
    return failure;
  } finally {
    const shouldKeepTemp = keepTempOnSuccess
      ? true
      : !!failure && keepTempOnFailure;
    if (!shouldKeepTemp) {
      await removePathIfExists(tempDir);
    }
  }
}
