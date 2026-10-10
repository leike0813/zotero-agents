import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { assert } from "chai";
import { DEFAULT_LOCAL_RUNTIME_VERSION } from "../../src/modules/skillRunner/runtime/skillRunnerLocalRuntimeManager";
import { installSkillRunnerRelease } from "../../src/modules/skillRunner/runtime/skillRunnerReleaseInstaller";

type FakeResponse = {
  ok: boolean;
  status: number;
  arrayBuffer: () => Promise<ArrayBuffer>;
};

function toResponse(bytes: Uint8Array, status = 200): FakeResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    arrayBuffer: async () =>
      bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength,
      ) as ArrayBuffer,
  };
}

const ARTIFACT_BYTES = new TextEncoder().encode("abc");
const ARTIFACT_SHA256 =
  "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";
const INSTALL_ROOT = "C:\\Users\\tester\\AppData\\Local\\SkillRunner\\releases";
const INSTALL_DIR = `${INSTALL_ROOT}\\${DEFAULT_LOCAL_RUNTIME_VERSION}`;
const CTL_PATH = `${INSTALL_DIR}\\scripts\\skill-runnerctl.ps1`;
const SERVER_FILE = `${INSTALL_DIR}\\server\\skill-runner`;
const STALE_FILE = `${INSTALL_DIR}\\server\\stale.bin`;

function separatorOf(path: string) {
  return path.includes("\\") && !path.includes("/") ? "\\" : "/";
}

function descendants(paths: Iterable<string>, root: string) {
  const separator = separatorOf(root);
  const prefix = root.endsWith(separator) ? root : `${root}${separator}`;
  return [...paths].filter((entry) => entry.startsWith(prefix));
}

function readText(files: Map<string, Uint8Array>, path: string) {
  return new TextDecoder().decode(files.get(path));
}

type MoveGuard = (source: string, target: string) => string | null;

function createFakeRuntimeFs() {
  const dirs = new Set<string>();
  const files = new Map<string, Uint8Array>();
  const removals: string[] = [];
  const prevIOUtils = (globalThis as { IOUtils?: unknown }).IOUtils;
  let moveGuard: MoveGuard | null = null;

  const addDirectory = (path: string) => {
    const separator = separatorOf(path);
    const segments = path.split(separator);
    let current = segments[0] === "" ? separator : segments[0];
    dirs.add(current);
    for (const segment of segments.slice(1)) {
      current = current.endsWith(separator)
        ? `${current}${segment}`
        : `${current}${separator}${segment}`;
      dirs.add(current);
    }
  };

  (globalThis as { IOUtils?: unknown }).IOUtils = {
    makeDirectory: async (path: string) => {
      addDirectory(path);
    },
    stat: async (path: string) =>
      dirs.has(path)
        ? { type: "directory" }
        : Promise.reject(new Error("missing")),
    write: async (path: string, data: Uint8Array) => {
      addDirectory(path.slice(0, path.lastIndexOf(separatorOf(path))));
      files.set(path, data);
    },
    exists: async (path: string) => dirs.has(path) || files.has(path),
    remove: async (path: string) => {
      removals.push(path);
      for (const entry of descendants(dirs, path)) {
        dirs.delete(entry);
      }
      for (const entry of descendants(files.keys(), path)) {
        files.delete(entry);
      }
      dirs.delete(path);
      files.delete(path);
    },
    move: async (
      source: string,
      target: string,
      options?: { noOverwrite?: boolean },
    ) => {
      const injected = moveGuard?.(source, target);
      if (injected) {
        throw new Error(injected);
      }
      if (options?.noOverwrite && (dirs.has(target) || files.has(target))) {
        throw new Error("move target already exists");
      }
      addDirectory(target);
      for (const entry of descendants(dirs, source)) {
        dirs.delete(entry);
        dirs.add(`${target}${entry.slice(source.length)}`);
      }
      for (const entry of descendants(files.keys(), source)) {
        const bytes = files.get(entry);
        files.delete(entry);
        if (bytes) {
          files.set(`${target}${entry.slice(source.length)}`, bytes);
        }
      }
      dirs.delete(source);
      files.delete(source);
    },
  };

  return {
    dirs,
    files,
    removals,
    restoreIOUtils: () => {
      if (typeof prevIOUtils === "undefined") {
        delete (globalThis as { IOUtils?: unknown }).IOUtils;
        return;
      }
      (globalThis as { IOUtils?: unknown }).IOUtils = prevIOUtils;
    },
    setMoveFailure: (guard: MoveGuard | null) => {
      moveGuard = guard;
    },
    seedDirectory: (path: string) => addDirectory(path),
    seedPreviousInstall: () => {
      addDirectory(`${INSTALL_DIR}\\scripts`);
      addDirectory(`${INSTALL_DIR}\\server`);
      files.set(CTL_PATH, new TextEncoder().encode("old ctl"));
      files.set(SERVER_FILE, new TextEncoder().encode("old server"));
      files.set(STALE_FILE, new TextEncoder().encode("old stale"));
    },
    seedNewInstallAt: (stagingDir: string) => {
      addDirectory(`${stagingDir}\\scripts`);
      addDirectory(`${stagingDir}\\server`);
      files.set(
        `${stagingDir}\\scripts\\skill-runnerctl.ps1`,
        new TextEncoder().encode("new ctl"),
      );
      files.set(
        `${stagingDir}\\server\\skill-runner`,
        new TextEncoder().encode("new server"),
      );
    },
  };
}

describe("skillrunner release installer", function () {
  let prevFetch: unknown;
  let prevIsWin: unknown;
  let runtimeFs: ReturnType<typeof createFakeRuntimeFs>;

  function stubRuntime() {
    const zoteroRuntime = (globalThis as { Zotero?: { isWin?: boolean } })
      .Zotero;
    if (!zoteroRuntime) {
      throw new Error("zotero runtime unavailable");
    }
    zoteroRuntime.isWin = true;
    runtimeFs = createFakeRuntimeFs();
  }

  function serveArtifact(checksumSha256 = ARTIFACT_SHA256, status = 200) {
    const checksumBytes = new TextEncoder().encode(
      `${checksumSha256}  skill-runner-${DEFAULT_LOCAL_RUNTIME_VERSION}.tar.gz\n`,
    );
    (globalThis as { fetch?: unknown }).fetch = async (input: unknown) => {
      const url = String(input || "");
      if (url.endsWith(".sha256")) {
        return toResponse(checksumBytes, status) as unknown as Response;
      }
      return toResponse(ARTIFACT_BYTES, status) as unknown as Response;
    };
  }

  function okCommand() {
    return async (args: { command: string; args: string[] }) => ({
      ok: true,
      exitCode: 0,
      message: "ok",
      stdout: "",
      stderr: "",
      command: args.command,
      args: args.args,
    });
  }

  beforeEach(function () {
    prevFetch = (globalThis as { fetch?: unknown }).fetch;
    prevIsWin = (globalThis as { Zotero?: { isWin?: unknown } }).Zotero?.isWin;
  });

  afterEach(function () {
    runtimeFs?.restoreIOUtils();
    if (typeof prevFetch === "undefined") {
      delete (globalThis as { fetch?: unknown }).fetch;
    } else {
      (globalThis as { fetch?: unknown }).fetch = prevFetch;
    }
    const zoteroRuntime = (globalThis as { Zotero?: { isWin?: unknown } })
      .Zotero;
    if (zoteroRuntime) {
      zoteroRuntime.isWin = prevIsWin;
    }
  });

  it("extracts into a task staging dir and promotes it over the previous install", async function () {
    stubRuntime();
    runtimeFs.seedPreviousInstall();
    serveArtifact();

    const commands: Array<{ command: string; args: string[] }> = [];
    let stagingDir = "";
    const result = await installSkillRunnerRelease({
      version: DEFAULT_LOCAL_RUNTIME_VERSION,
      installRoot: INSTALL_ROOT,
      repo: "leike0813/Skill-Runner",
      runCommand: async (args) => {
        commands.push({ command: args.command, args: args.args });
        stagingDir = args.args[args.args.length - 1];
        runtimeFs.seedNewInstallAt(stagingDir);
        return okCommand()(args);
      },
    });

    assert.isTrue(result.ok, JSON.stringify(result.details || {}));
    assert.equal(result.stage, "deploy-release-install");
    assert.equal(result.installDir, INSTALL_DIR);
    assert.equal(commands.length, 1);
    assert.equal(commands[0].command, "tar");
    assert.notEqual(stagingDir, INSTALL_DIR);
    assert.include(stagingDir, INSTALL_ROOT);
    assert.equal(readText(runtimeFs.files, CTL_PATH), "new ctl");
    assert.equal(readText(runtimeFs.files, SERVER_FILE), "new server");
    assert.isFalse(
      runtimeFs.files.has(STALE_FILE),
      "files from the replaced install must not survive",
    );
    for (const entry of descendants(runtimeFs.dirs, INSTALL_ROOT)) {
      assert.notInclude(
        entry,
        "backup",
        "successful install must not keep a backup",
      );
      assert.notInclude(
        entry,
        "staging",
        "successful install must not keep a staging dir",
      );
    }
  });

  it("keeps the previous install when extraction fails halfway", async function () {
    stubRuntime();
    runtimeFs.seedPreviousInstall();
    serveArtifact();

    const result = await installSkillRunnerRelease({
      version: DEFAULT_LOCAL_RUNTIME_VERSION,
      installRoot: INSTALL_ROOT,
      repo: "leike0813/Skill-Runner",
      runCommand: async (args) => {
        const stagingDir = args.args[args.args.length - 1];
        runtimeFs.seedDirectory(`${stagingDir}\\scripts`);
        runtimeFs.files.set(
          `${stagingDir}\\scripts\\skill-runnerctl.ps1`,
          new TextEncoder().encode("half extracted"),
        );
        return {
          ok: false,
          exitCode: 1,
          message: "tar failed",
          stdout: "",
          stderr: "archive error",
          command: args.command,
          args: args.args,
        };
      },
      keepTempOnFailure: true,
    });

    assert.isFalse(result.ok);
    assert.equal(result.stage, "deploy-release-extract");
    assert.equal(result.installDir, INSTALL_DIR);
    assert.equal(readText(runtimeFs.files, CTL_PATH), "old ctl");
    assert.equal(readText(runtimeFs.files, SERVER_FILE), "old server");
    assert.isNotEmpty(result.tempDir || "");
    for (const entry of descendants(runtimeFs.dirs, INSTALL_ROOT)) {
      assert.notInclude(
        entry,
        "staging",
        "failed extraction must clean its staging dir",
      );
      assert.notInclude(
        entry,
        "backup",
        "failed extraction must not create a backup",
      );
    }
  });

  it("keeps the previous install when extracted artifacts are missing", async function () {
    stubRuntime();
    runtimeFs.seedPreviousInstall();
    serveArtifact();

    const result = await installSkillRunnerRelease({
      version: DEFAULT_LOCAL_RUNTIME_VERSION,
      installRoot: INSTALL_ROOT,
      repo: "leike0813/Skill-Runner",
      runCommand: async (args) => {
        runtimeFs.seedDirectory(args.args[args.args.length - 1]);
        return okCommand()(args);
      },
    });

    assert.isFalse(result.ok);
    assert.equal(result.stage, "deploy-release-artifacts");
    assert.equal(readText(runtimeFs.files, CTL_PATH), "old ctl");
    assert.equal(readText(runtimeFs.files, SERVER_FILE), "old server");
    for (const entry of descendants(runtimeFs.dirs, INSTALL_ROOT)) {
      assert.notInclude(entry, "staging");
      assert.notInclude(entry, "backup");
    }
  });

  it("restores the previous install when promotion fails", async function () {
    stubRuntime();
    runtimeFs.seedPreviousInstall();
    serveArtifact();
    runtimeFs.setMoveFailure((source, target) =>
      source.includes("staging") && target === INSTALL_DIR
        ? "promotion move failed"
        : null,
    );

    const result = await installSkillRunnerRelease({
      version: DEFAULT_LOCAL_RUNTIME_VERSION,
      installRoot: INSTALL_ROOT,
      repo: "leike0813/Skill-Runner",
      runCommand: async (args) => {
        runtimeFs.seedNewInstallAt(args.args[args.args.length - 1]);
        return okCommand()(args);
      },
    });

    assert.isFalse(result.ok);
    assert.equal(result.stage, "deploy-release-promote");
    assert.include(String(result.message || ""), "promotion move failed");
    assert.equal(readText(runtimeFs.files, CTL_PATH), "old ctl");
    assert.equal(readText(runtimeFs.files, SERVER_FILE), "old server");
    for (const entry of descendants(runtimeFs.dirs, INSTALL_ROOT)) {
      assert.notInclude(
        entry,
        "backup",
        "a completed rollback must not keep a backup",
      );
    }
  });

  it("retains the backup when the install dir reappeared and blocks the rollback", async function () {
    stubRuntime();
    runtimeFs.seedPreviousInstall();
    serveArtifact();
    runtimeFs.setMoveFailure((source, target) => {
      if (source.includes("staging") && target === INSTALL_DIR) {
        // An external writer won the install dir while this promotion ran.
        runtimeFs.seedDirectory(target);
        return "promotion move failed";
      }
      return null;
    });

    const result = await installSkillRunnerRelease({
      version: DEFAULT_LOCAL_RUNTIME_VERSION,
      installRoot: INSTALL_ROOT,
      repo: "leike0813/Skill-Runner",
      runCommand: async (args) => {
        runtimeFs.seedNewInstallAt(args.args[args.args.length - 1]);
        return okCommand()(args);
      },
      keepTempOnFailure: true,
    });

    assert.isFalse(result.ok);
    assert.equal(result.stage, "deploy-release-promote");
    assert.include(String(result.message || ""), "promotion move failed");
    const details = (result.details || {}) as Record<string, unknown>;
    const backupDir = String(details.backupDir || "");
    assert.isNotEmpty(backupDir);
    assert.include(backupDir, INSTALL_ROOT);
    assert.include(String(details.rollbackFailure || ""), "already exists");
    assert.equal(
      readText(runtimeFs.files, `${backupDir}\\scripts\\skill-runnerctl.ps1`),
      "old ctl",
      "a retained backup must still hold the previous install",
    );
    assert.isFalse(
      runtimeFs.removals.includes(backupDir),
      "a backup that failed to restore must never be deleted",
    );
  });

  it("keeps the temp dir on early download failure only when keepTempOnFailure is set", async function () {
    stubRuntime();
    runtimeFs.seedPreviousInstall();
    (globalThis as { fetch?: unknown }).fetch = async () =>
      toResponse(new Uint8Array(), 404) as unknown as Response;

    const kept = await installSkillRunnerRelease({
      version: DEFAULT_LOCAL_RUNTIME_VERSION,
      installRoot: INSTALL_ROOT,
      repo: "leike0813/Skill-Runner",
      runCommand: okCommand(),
      keepTempOnFailure: true,
    });

    assert.isFalse(kept.ok);
    assert.equal(kept.stage, "deploy-release-download");
    assert.isNotEmpty(kept.tempDir || "");
    assert.isFalse(
      runtimeFs.removals.includes(kept.tempDir || ""),
      "keepTempOnFailure must keep the temp dir on early download failure",
    );

    const dropped = await installSkillRunnerRelease({
      version: DEFAULT_LOCAL_RUNTIME_VERSION,
      installRoot: INSTALL_ROOT,
      repo: "leike0813/Skill-Runner",
      runCommand: okCommand(),
      keepTempOnFailure: false,
    });

    assert.isFalse(dropped.ok);
    assert.notEqual(dropped.tempDir, kept.tempDir);
    assert.include(runtimeFs.removals, dropped.tempDir || "");
    assert.equal(readText(runtimeFs.files, CTL_PATH), "old ctl");
  });

  it("fails on checksum mismatch without extracting or touching the install", async function () {
    stubRuntime();
    runtimeFs.seedPreviousInstall();
    serveArtifact(
      "deadbeef8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );

    let tarCalled = false;
    const result = await installSkillRunnerRelease({
      version: DEFAULT_LOCAL_RUNTIME_VERSION,
      installRoot: INSTALL_ROOT,
      repo: "leike0813/Skill-Runner",
      runCommand: async (args) => {
        tarCalled = true;
        return okCommand()(args);
      },
    });

    assert.isFalse(result.ok);
    assert.equal(result.stage, "deploy-release-checksum");
    assert.isFalse(tarCalled);
    assert.equal(readText(runtimeFs.files, CTL_PATH), "old ctl");
  });

  it("promotes over a real directory tree through the runtime fs adapters", async function () {
    const zoteroRuntime = (globalThis as { Zotero?: { isWin?: boolean } })
      .Zotero;
    if (!zoteroRuntime) {
      throw new Error("zotero runtime unavailable");
    }
    zoteroRuntime.isWin = process.platform === "win32";
    const ctlFile = zoteroRuntime.isWin
      ? "skill-runnerctl.ps1"
      : "skill-runnerctl";
    const prevIOUtils = (globalThis as { IOUtils?: unknown }).IOUtils;
    delete (globalThis as { IOUtils?: unknown }).IOUtils;
    serveArtifact();

    const root = await fs.mkdtemp(
      path.join(os.tmpdir(), "zs-skillrunner-install-"),
    );
    const installRoot = path.join(root, "releases");
    const installDir = path.join(installRoot, DEFAULT_LOCAL_RUNTIME_VERSION);
    await fs.mkdir(path.join(installDir, "scripts"), { recursive: true });
    await fs.mkdir(path.join(installDir, "server"), { recursive: true });
    await fs.writeFile(path.join(installDir, "scripts", ctlFile), "old ctl");
    await fs.writeFile(
      path.join(installDir, "server", "skill-runner"),
      "old server",
    );
    await fs.writeFile(
      path.join(installDir, "server", "stale.bin"),
      "old stale",
    );

    try {
      const result = await installSkillRunnerRelease({
        version: DEFAULT_LOCAL_RUNTIME_VERSION,
        installRoot,
        repo: "leike0813/Skill-Runner",
        runCommand: async (args) => {
          const stagingDir = args.args[args.args.length - 1];
          await fs.mkdir(path.join(stagingDir, "scripts"), { recursive: true });
          await fs.mkdir(path.join(stagingDir, "server"), { recursive: true });
          await fs.writeFile(
            path.join(stagingDir, "scripts", ctlFile),
            "new ctl",
          );
          await fs.writeFile(
            path.join(stagingDir, "server", "skill-runner"),
            "new server",
          );
          return okCommand()(args);
        },
      });

      assert.isTrue(result.ok, JSON.stringify(result.details || {}));
      assert.equal(result.installDir, installDir);
      assert.equal(
        await fs.readFile(path.join(installDir, "scripts", ctlFile), "utf8"),
        "new ctl",
      );
      const staleSurvived = await fs
        .access(path.join(installDir, "server", "stale.bin"))
        .then(
          () => true,
          () => false,
        );
      assert.isFalse(
        staleSurvived,
        "replaced files must not survive promotion",
      );
      assert.deepEqual(await fs.readdir(installRoot), [
        DEFAULT_LOCAL_RUNTIME_VERSION,
      ]);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
      if (typeof prevIOUtils === "undefined") {
        delete (globalThis as { IOUtils?: unknown }).IOUtils;
      } else {
        (globalThis as { IOUtils?: unknown }).IOUtils = prevIOUtils;
      }
    }
  });
});
