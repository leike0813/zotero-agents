import { assert } from "chai";
import { DEFAULT_LOCAL_RUNTIME_VERSION } from "../../src/modules/skillRunnerLocalRuntimeManager";
import { installSkillRunnerRelease } from "../../src/modules/skillRunnerReleaseInstaller";

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

describe("skillrunner release installer", function () {
  let prevFetch: unknown;
  let prevIOUtils: unknown;
  let prevIsWin: unknown;

  beforeEach(function () {
    prevFetch = (globalThis as { fetch?: unknown }).fetch;
    prevIOUtils = (globalThis as { IOUtils?: unknown }).IOUtils;
    prevIsWin = (globalThis as { Zotero?: { isWin?: unknown } }).Zotero?.isWin;
  });

  afterEach(function () {
    if (typeof prevFetch === "undefined") {
      delete (globalThis as { fetch?: unknown }).fetch;
    } else {
      (globalThis as { fetch?: unknown }).fetch = prevFetch;
    }
    if (typeof prevIOUtils === "undefined") {
      delete (globalThis as { IOUtils?: unknown }).IOUtils;
    } else {
      (globalThis as { IOUtils?: unknown }).IOUtils = prevIOUtils;
    }
    const zoteroRuntime = (globalThis as { Zotero?: { isWin?: unknown } })
      .Zotero;
    if (zoteroRuntime) {
      zoteroRuntime.isWin = prevIsWin;
    }
  });

  it("downloads, verifies, extracts and returns install proofs", async function () {
    const files = new Map<string, Uint8Array>();
    const dirs = new Set<string>();
    const removedPaths: string[] = [];
    const zoteroRuntime = (globalThis as { Zotero?: { isWin?: boolean } })
      .Zotero;
    if (!zoteroRuntime) {
      throw new Error("zotero runtime unavailable");
    }
    zoteroRuntime.isWin = true;
    (globalThis as { IOUtils?: unknown }).IOUtils = {
      makeDirectory: async (path: string) => {
        dirs.add(path);
      },
      write: async (path: string, data: Uint8Array) => {
        files.set(path, data);
      },
      exists: async (path: string) => dirs.has(path) || files.has(path),
      remove: async (path: string) => {
        removedPaths.push(path);
      },
    };
    const artifactBytes = new TextEncoder().encode("abc");
    const checksumBytes = new TextEncoder().encode(
      `ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad  skill-runner-${DEFAULT_LOCAL_RUNTIME_VERSION}.tar.gz\n`,
    );
    (globalThis as { fetch?: unknown }).fetch = async (input: unknown) => {
      const url = String(input || "");
      if (url.endsWith(".sha256")) {
        return toResponse(checksumBytes) as unknown as Response;
      }
      return toResponse(artifactBytes) as unknown as Response;
    };

    const commands: Array<{ command: string; args: string[] }> = [];
    const result = await installSkillRunnerRelease({
      version: DEFAULT_LOCAL_RUNTIME_VERSION,
      installRoot: "C:\\Users\\tester\\AppData\\Local\\SkillRunner\\releases",
      repo: "leike0813/Skill-Runner",
      runCommand: async (args) => {
        commands.push({
          command: args.command,
          args: args.args,
        });
        const installDir = args.args[args.args.length - 1];
        dirs.add(installDir);
        dirs.add(`${installDir}\\server`);
        files.set(
          `${installDir}\\scripts\\skill-runnerctl.ps1`,
          new TextEncoder().encode("echo ctl"),
        );
        return {
          ok: true,
          exitCode: 0,
          message: "ok",
          stdout: "",
          stderr: "",
          command: args.command,
          args: args.args,
        };
      },
    });

    assert.isTrue(result.ok);
    assert.equal(result.stage, "deploy-release-install");
    assert.include(result.installDir || "", DEFAULT_LOCAL_RUNTIME_VERSION);
    assert.equal(commands.length, 1);
    assert.equal(commands[0].command, "tar");
    assert.include(commands[0].args.join(" "), "-xzf");
    assert.isAtLeast(removedPaths.length, 1);
  });

  it("fails when checksum does not match artifact hash", async function () {
    const dirs = new Set<string>();
    const zoteroRuntime = (globalThis as { Zotero?: { isWin?: boolean } })
      .Zotero;
    if (!zoteroRuntime) {
      throw new Error("zotero runtime unavailable");
    }
    zoteroRuntime.isWin = true;
    (globalThis as { IOUtils?: unknown }).IOUtils = {
      makeDirectory: async (path: string) => {
        dirs.add(path);
      },
      write: async () => {},
      exists: async (path: string) => dirs.has(path),
      remove: async () => {},
    };
    const artifactBytes = new TextEncoder().encode("abc");
    const checksumBytes = new TextEncoder().encode(
      `deadbeef8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad  skill-runner-${DEFAULT_LOCAL_RUNTIME_VERSION}.tar.gz\n`,
    );
    (globalThis as { fetch?: unknown }).fetch = async (input: unknown) => {
      const url = String(input || "");
      if (url.endsWith(".sha256")) {
        return toResponse(checksumBytes) as unknown as Response;
      }
      return toResponse(artifactBytes) as unknown as Response;
    };

    let tarCalled = false;
    const result = await installSkillRunnerRelease({
      version: DEFAULT_LOCAL_RUNTIME_VERSION,
      installRoot: "C:\\Users\\tester\\AppData\\Local\\SkillRunner\\releases",
      repo: "leike0813/Skill-Runner",
      runCommand: async () => {
        tarCalled = true;
        return {
          ok: true,
          exitCode: 0,
          message: "ok",
          stdout: "",
          stderr: "",
          command: "tar",
          args: [],
        };
      },
    });

    assert.isFalse(result.ok);
    assert.equal(result.stage, "deploy-release-checksum");
    assert.isFalse(tarCalled);
  });

  it("fails when tar extraction exits non-zero", async function () {
    const zoteroRuntime = (globalThis as { Zotero?: { isWin?: boolean } })
      .Zotero;
    if (!zoteroRuntime) {
      throw new Error("zotero runtime unavailable");
    }
    zoteroRuntime.isWin = true;
    (globalThis as { IOUtils?: unknown }).IOUtils = {
      makeDirectory: async () => {},
      write: async () => {},
      exists: async () => true,
      remove: async () => {},
    };
    const artifactBytes = new TextEncoder().encode("abc");
    const checksumBytes = new TextEncoder().encode(
      `ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad  skill-runner-${DEFAULT_LOCAL_RUNTIME_VERSION}.tar.gz\n`,
    );
    (globalThis as { fetch?: unknown }).fetch = async (input: unknown) => {
      const url = String(input || "");
      if (url.endsWith(".sha256")) {
        return toResponse(checksumBytes) as unknown as Response;
      }
      return toResponse(artifactBytes) as unknown as Response;
    };

    const result = await installSkillRunnerRelease({
      version: DEFAULT_LOCAL_RUNTIME_VERSION,
      installRoot: "C:\\Users\\tester\\AppData\\Local\\SkillRunner\\releases",
      repo: "leike0813/Skill-Runner",
      runCommand: async (args) => ({
        ok: false,
        exitCode: 1,
        message: "tar failed",
        stdout: "",
        stderr: "archive error",
        command: args.command,
        args: args.args,
      }),
      keepTempOnFailure: true,
    });

    assert.isFalse(result.ok);
    assert.equal(result.stage, "deploy-release-extract");
    assert.include(String(result.message || ""), "extract failed");
    assert.isString(result.tempDir);
    assert.isNotEmpty(result.tempDir || "");
  });
});
