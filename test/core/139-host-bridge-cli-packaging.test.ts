import { assert } from "chai";
import { execFile } from "child_process";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import { promisify } from "util";
import {
  resolveHostBridgeCliBinary,
  resolveHostBridgeCliPlatform,
  hostBridgeCliResolverInternalsForTests,
} from "../../src/modules/hostBridgeCliResolver";
import {
  installHostBridgeCli,
  resolveHostBridgeCliInstallTarget,
  hostBridgeCliInstallerInternalsForTests,
} from "../../src/modules/hostBridgeCliInstaller";
import { packagedAssetResolverInternalsForTests } from "../../src/modules/packagedAssetResolver";
import {
  resolveHostBridgeWellKnownProfilePath,
  writeHostBridgeWellKnownProfile,
} from "../../src/modules/hostBridgeProfileStore";

const execFileAsync = promisify(execFile);

describe("host bridge cli packaging and install", function () {
  it("documents resolve-resolver with the direct resolver payload contract", async function () {
    const cliArgs = await fs.readFile(
      path.join(process.cwd(), "cli/zotero-bridge/src/args.rs"),
      "utf8",
    );
    const wrapperSkill = await fs.readFile(
      path.join(process.cwd(), "skills_builtin/zotero-bridge-cli/SKILL.md"),
      "utf8",
    );
    const wrapperReference = await fs.readFile(
      path.join(
        process.cwd(),
        "skills_builtin/zotero-bridge-cli/references/host-bridge-cli.md",
      ),
      "utf8",
    );
    const docs = await fs.readFile(
      path.join(process.cwd(), "doc/host-bridge-cli.md"),
      "utf8",
    );

    for (const source of [wrapperReference, docs]) {
      assert.include(source, "collection_key");
      assert.include(source, "paper_refs");
      assert.include(source, "combine");
      assert.include(source, "intersection");
      assert.include(source, "topic_resolver");
    }
    assert.include(cliArgs, "paper_refs");
    assert.include(cliArgs, "combine");
    assert.include(cliArgs, "direct resolver fields");
    assert.include(cliArgs, "Do not pass a top-level resolver wrapper");
    assert.include(
      wrapperReference,
      "do not wrap them in a top-level `resolver` object",
    );
    assert.include(wrapperReference, "Legacy fields are rejected");
    assert.include(wrapperSkill, "references/host-bridge-cli.md");
    assert.notInclude(wrapperReference, 'top-level `"resolver"` field');
    assert.notInclude(docs, "带顶层 `resolver` 字段");
  });

  it("renders wrapper skill discovery from the current semantic CLI surface", async function () {
    const wrapperSkill = await fs.readFile(
      path.join(process.cwd(), "skills_builtin/zotero-bridge-cli/SKILL.md"),
      "utf8",
    );
    const wrapperReference = await fs.readFile(
      path.join(
        process.cwd(),
        "skills_builtin/zotero-bridge-cli/references/host-bridge-cli.md",
      ),
      "utf8",
    );

    for (const source of [wrapperSkill, wrapperReference]) {
      assert.include(source, ".\\.zotero-bridge\\bin\\zotero-bridge.cmd");
      assert.include(source, "./.zotero-bridge/bin/zotero-bridge");
      assert.include(source, "<zotero-bridge>");
      assert.include(source, "ZOTERO_BRIDGE_PROFILE");
    }

    for (const commandGroup of [
      "schemas",
      "concepts",
      "library-index",
      "resolvers",
      "reference-index",
    ]) {
      assert.include(wrapperReference, `zotero-bridge ${commandGroup} --help`);
    }
    assert.include(wrapperReference, "`library-index get`");
    assert.include(wrapperReference, "`reference-index get`");
    assert.include(wrapperReference, "`resolvers resolve`");
  });

  it("documents topic get-context views and file output across CLI and wrapper surfaces", async function () {
    const cliArgs = await fs.readFile(
      path.join(process.cwd(), "cli/zotero-bridge/src/args.rs"),
      "utf8",
    );
    const wrapperSkill = await fs.readFile(
      path.join(process.cwd(), "skills_builtin/zotero-bridge-cli/SKILL.md"),
      "utf8",
    );
    const wrapperReference = await fs.readFile(
      path.join(
        process.cwd(),
        "skills_builtin/zotero-bridge-cli/references/host-bridge-cli.md",
      ),
      "utf8",
    );
    const docs = await fs.readFile(
      path.join(process.cwd(), "doc/host-bridge-cli.md"),
      "utf8",
    );

    assert.include(cliArgs, "topics.get_context");
    assert.include(cliArgs, "get-context");
    for (const source of [wrapperSkill, wrapperReference, docs]) {
      assert.include(source, "topics get-context");
    }
    for (const source of [cliArgs, wrapperSkill, wrapperReference, docs]) {
      assert.include(source, "view");
      assert.include(source, "semantic");
      assert.include(source, "audit");
      assert.include(source, "outputPath");
    }
    assert.include(cliArgs, "legacy flat response");
    assert.include(wrapperSkill, "legacy flat topic context response");
    assert.include(wrapperReference, "compact file envelope");
    assert.include(docs, "omitted_inline_result");
  });

  it("declares remote Host Bridge profile and master token preference controls", async function () {
    const prefs = await fs.readFile(
      path.join(process.cwd(), "addon/content/preferences.xhtml"),
      "utf8",
    );
    const preferenceScript = await fs.readFile(
      path.join(process.cwd(), "src/modules/preferenceScript.ts"),
      "utf8",
    );
    const docs = await fs.readFile(
      path.join(process.cwd(), "doc/host-bridge-cli.md"),
      "utf8",
    );
    const zhPreferences = await fs.readFile(
      path.join(process.cwd(), "addon/locale/zh-CN/preferences.ftl"),
      "utf8",
    );

    assert.include(prefs, "host-bridge-advertised-host");
    assert.include(prefs, "pref-host-bridge-advertised-host-input");
    assert.include(prefs, "pref-host-bridge-advertised-host-help");
    assert.include(zhPreferences, "发送给远程主机的本机 IP");
    assert.include(zhPreferences, "留空时自动探测");
    assert.include(prefs, "host-bridge-rotate-master-token");
    assert.include(prefs, "host-bridge-copy-master-token");
    assert.include(prefs, "host-bridge-copy-remote-profile");
    assert.include(preferenceScript, "copyHostBridgeRemoteProfile");
    assert.include(preferenceScript, "copyHostBridgeMasterToken");
    assert.include(
      preferenceScript,
      "hostBridgePinPortCheckbox.disabled = lanEnabled",
    );
    assert.include(docs, "manual-remote");
    assert.include(docs, "master token");
  });

  it("uses stable bundled platform directory names", function () {
    const cases = [
      {
        input: { platform: "win32" },
        expected: { dir: "win32-x64", binary: "zotero-bridge.exe" },
      },
      {
        input: { platform: "darwin", arch: "x64" },
        expected: { dir: "darwin-x64", binary: "zotero-bridge" },
      },
      {
        input: { platform: "darwin", arch: "arm64" },
        expected: { dir: "darwin-arm64", binary: "zotero-bridge" },
      },
      {
        input: { platform: "linux", arch: "ia32" },
        expected: { dir: "linux-x86", binary: "zotero-bridge" },
      },
      {
        input: { platform: "linux", arch: "x86" },
        expected: { dir: "linux-x86", binary: "zotero-bridge" },
      },
      {
        input: { platform: "linux", arch: "x64" },
        expected: { dir: "linux-x64", binary: "zotero-bridge" },
      },
      {
        input: { platform: "linux", arch: "arm" },
        expected: { dir: "linux-arm", binary: "zotero-bridge" },
      },
      {
        input: { platform: "linux", arch: "arm64" },
        expected: { dir: "linux-arm64", binary: "zotero-bridge" },
      },
      {
        input: { platform: "linux" },
        expected: { dir: "linux-x64", binary: "zotero-bridge" },
      },
    ];
    for (const entry of cases) {
      assert.deepEqual(
        resolveHostBridgeCliPlatform(entry.input),
        entry.expected,
      );
    }
  });

  it("packages extensionless POSIX zotero-bridge binaries into the XPI", async function () {
    const configSource = await fs.readFile(
      path.join(process.cwd(), "zotero-plugin.config.ts"),
      "utf8",
    );

    assert.include(configSource, "addon/bin/**/zotero-bridge");
  });

  it("prefers ZOTERO_BRIDGE_CLI env override when available", async function () {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "zs-cli-resolver-"));
    const binary = path.join(root, "zotero-bridge.exe");
    await fs.writeFile(binary, "binary");
    const previous = process.env.ZOTERO_BRIDGE_CLI;
    process.env.ZOTERO_BRIDGE_CLI = binary;
    try {
      const resolved = await resolveHostBridgeCliBinary();
      assert.isTrue(resolved.available);
      if (resolved.available) {
        assert.strictEqual(resolved.binaryPath, binary);
        assert.strictEqual(resolved.source, "env");
      }
    } finally {
      if (typeof previous === "string") {
        process.env.ZOTERO_BRIDGE_CLI = previous;
      } else {
        delete process.env.ZOTERO_BRIDGE_CLI;
      }
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("resolves bundled CLI from plugin rootPath before process cwd", async function () {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "zs-cli-root-"));
    const platform = resolveHostBridgeCliPlatform({
      platform: process.platform,
      arch: process.arch,
    });
    const binaryDir = path.join(root, "bin", platform.dir);
    const binary = path.join(binaryDir, platform.binary);
    await fs.mkdir(binaryDir, { recursive: true });
    await fs.writeFile(binary, "binary");
    const previousCli = process.env.ZOTERO_BRIDGE_CLI;
    const previousRootPath = (globalThis as { rootPath?: string }).rootPath;
    delete process.env.ZOTERO_BRIDGE_CLI;
    (globalThis as { rootPath?: string }).rootPath = root;
    try {
      const resolved = await resolveHostBridgeCliBinary();
      assert.isTrue(resolved.available);
      if (resolved.available) {
        assert.strictEqual(path.normalize(resolved.binaryPath), binary);
        assert.strictEqual(resolved.source, "bundled");
      }
    } finally {
      if (typeof previousCli === "string") {
        process.env.ZOTERO_BRIDGE_CLI = previousCli;
      }
      if (typeof previousRootPath === "string") {
        (globalThis as { rootPath?: string }).rootPath = previousRootPath;
      } else {
        delete (globalThis as { rootPath?: string }).rootPath;
      }
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("resolves CLI from PATH when no env override or bundled binary is available", async function () {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "zs-cli-path-"));
    const pathDir = path.join(root, "path-bin");
    const workspace = path.join(root, "workspace");
    const platform = resolveHostBridgeCliPlatform({
      platform: process.platform,
      arch: process.arch,
    });
    const binary = path.join(pathDir, platform.binary);
    await fs.mkdir(pathDir, { recursive: true });
    await fs.mkdir(workspace, { recursive: true });
    await fs.writeFile(binary, "binary");

    const previousCli = process.env.ZOTERO_BRIDGE_CLI;
    const previousPath = process.env.PATH;
    const previousRootPath = (globalThis as { rootPath?: string }).rootPath;
    const previousCwd = process.cwd();
    delete process.env.ZOTERO_BRIDGE_CLI;
    process.env.PATH = pathDir;
    (globalThis as { rootPath?: string }).rootPath = workspace;
    process.chdir(workspace);
    try {
      const resolved = await resolveHostBridgeCliBinary();
      assert.isTrue(resolved.available);
      if (resolved.available) {
        assert.strictEqual(path.normalize(resolved.binaryPath), binary);
        assert.strictEqual(resolved.source, "path");
      }
    } finally {
      process.chdir(previousCwd);
      if (typeof previousCli === "string") {
        process.env.ZOTERO_BRIDGE_CLI = previousCli;
      } else {
        delete process.env.ZOTERO_BRIDGE_CLI;
      }
      if (typeof previousPath === "string") {
        process.env.PATH = previousPath;
      } else {
        delete process.env.PATH;
      }
      if (typeof previousRootPath === "string") {
        (globalThis as { rootPath?: string }).rootPath = previousRootPath;
      } else {
        delete (globalThis as { rootPath?: string }).rootPath;
      }
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("finds bundled CLI when runtime rootPath points at a nested addon directory", async function () {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "zs-cli-nested-"));
    const addonRoot = path.join(root, "build", "addon");
    const contentRoot = path.join(addonRoot, "content");
    const binaryDir = path.join(addonRoot, "bin", "win32-x64");
    const binary = path.join(binaryDir, "zotero-bridge.exe");
    await fs.mkdir(contentRoot, { recursive: true });
    await fs.mkdir(binaryDir, { recursive: true });
    await fs.writeFile(binary, "binary");
    const candidates =
      hostBridgeCliResolverInternalsForTests.buildBundledCandidates({
        roots: [contentRoot],
        platformDir: "win32-x64",
        binary: "zotero-bridge.exe",
      });
    assert.include(
      candidates.map((entry) => path.normalize(entry)),
      binary,
    );
    await fs.rm(root, { recursive: true, force: true });
  });

  it("builds packaged asset candidates from runtime URI and path roots", function () {
    const previousRootUri = (globalThis as { rootURI?: string }).rootURI;
    const previousResourceUri = (globalThis as { resourceURI?: string })
      .resourceURI;
    const previousRootPath = (globalThis as { rootPath?: string }).rootPath;
    (globalThis as { rootURI?: string }).rootURI =
      "https://example.test/addon/";
    (globalThis as { resourceURI?: string }).resourceURI =
      "resource://zotero-skills/";
    (globalThis as { rootPath?: string }).rootPath =
      "C:\\Users\\A\\Zotero\\Profiles\\p\\extensions\\zotero-skills";
    try {
      const candidates =
        packagedAssetResolverInternalsForTests.buildPackagedAssetCandidates(
          "bin/win32-x64/zotero-bridge.exe",
        );
      assert.include(
        candidates.checkedUris,
        "https://example.test/addon/bin/win32-x64/zotero-bridge.exe",
      );
      assert.include(
        candidates.checkedUris,
        "resource://zotero-skills/bin/win32-x64/zotero-bridge.exe",
      );
      assert.isAtLeast(candidates.checkedPaths.length, 2);
    } finally {
      if (typeof previousRootUri === "string") {
        (globalThis as { rootURI?: string }).rootURI = previousRootUri;
      } else {
        delete (globalThis as { rootURI?: string }).rootURI;
      }
      if (typeof previousResourceUri === "string") {
        (globalThis as { resourceURI?: string }).resourceURI =
          previousResourceUri;
      } else {
        delete (globalThis as { resourceURI?: string }).resourceURI;
      }
      if (typeof previousRootPath === "string") {
        (globalThis as { rootPath?: string }).rootPath = previousRootPath;
      } else {
        delete (globalThis as { rootPath?: string }).rootPath;
      }
    }
  });

  it("returns cli_binary_unavailable when no env or bundled binary exists", async function () {
    const previous = process.env.ZOTERO_BRIDGE_CLI;
    delete process.env.ZOTERO_BRIDGE_CLI;
    try {
      const resolved = await resolveHostBridgeCliBinary();
      if (resolved.available) {
        this.skip();
      }
      assert.isFalse(resolved.available);
      if (!resolved.available) {
        assert.strictEqual(resolved.code, "cli_binary_unavailable");
        assert.isAtLeast(resolved.checkedPaths.length, 1);
      }
    } finally {
      if (typeof previous === "string") {
        process.env.ZOTERO_BRIDGE_CLI = previous;
      }
    }
  });

  it("chooses user-level install targets per platform", function () {
    assert.include(
      resolveHostBridgeCliInstallTarget({
        platform: () => "win32",
        localAppDataDir: () => "C:\\Users\\A\\AppData\\Local",
      }).targetPath,
      "zotero-agents",
    );
    assert.strictEqual(
      resolveHostBridgeCliInstallTarget({
        platform: () => "darwin",
        homeDir: () => "/Users/a",
        pathEnv: () => "/opt/homebrew/bin:/usr/bin",
      }).targetPath,
      "/opt/homebrew/bin/zotero-bridge",
    );
    assert.strictEqual(
      resolveHostBridgeCliInstallTarget({
        platform: () => "darwin",
        homeDir: () => "/Users/a",
        pathEnv: () => "/usr/bin",
      }).targetPath,
      "/Users/a/bin/zotero-bridge",
    );
    assert.strictEqual(
      resolveHostBridgeCliInstallTarget({
        platform: () => "linux",
        homeDir: () => "/home/a",
        pathEnv: () => "/home/a/bin:/usr/bin",
      }).targetPath,
      "/home/a/bin/zotero-bridge",
    );
    assert.strictEqual(
      resolveHostBridgeCliInstallTarget({
        platform: () => "linux",
        homeDir: () => "/home/a",
        pathEnv: () => "/usr/bin",
      }).targetPath,
      "/home/a/.local/bin/zotero-bridge",
    );
  });

  it("installs an extensionless Windows shell shim beside the exe", async function () {
    const writes: Array<{ target: string; content: string }> = [];
    const result = await installHostBridgeCli({
      resolveCli: async () => ({
        available: true,
        binaryPath: "addon/bin/win32-x64/zotero-bridge.exe",
        cliDir: "addon/bin/win32-x64",
        source: "bundled",
      }),
      platform: () => "win32",
      localAppDataDir: () => "C:\\Users\\A\\AppData\\Local",
      pathIncludes: () => true,
      copyFile: async () => undefined,
      writeTextFile: async (target, content) => {
        writes.push({ target, content });
      },
      chmodExecutable: async () => undefined,
    });

    assert.isTrue(result.ok);
    assert.deepEqual(
      writes.map((entry) => entry.target),
      ["C:\\Users\\A\\AppData\\Local\\zotero-agents\\bin\\zotero-bridge"],
    );
    assert.include(writes[0]?.content || "", "zotero-bridge.exe");
    assert.include(writes[0]?.content || "", "#!/usr/bin/env sh");
    assert.strictEqual(
      hostBridgeCliInstallerInternalsForTests.resolveWindowsShellShimPath({
        platform: "linux",
        targetDir: "/home/a/.local/bin",
      }),
      "",
    );
  });

  it("writes a well-known local CLI profile with endpoint and token", async function () {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "zs-cli-profile-"));
    const previousLocalAppData = process.env.LOCALAPPDATA;
    const previousXdgDataHome = process.env.XDG_DATA_HOME;
    const previousHome = process.env.HOME;
    process.env.LOCALAPPDATA = root;
    process.env.XDG_DATA_HOME = root;
    process.env.HOME = root;
    try {
      const result = await writeHostBridgeWellKnownProfile({
        endpoint: "http://127.0.0.1:26570/bridge/v1",
        token: "well-known-token",
        updatedAt: "2026-05-20T00:00:00.000Z",
      });
      assert.isTrue(result.ok);
      const profilePath = resolveHostBridgeWellKnownProfilePath();
      assert.strictEqual(result.path, profilePath);
      const profile = JSON.parse(await fs.readFile(profilePath, "utf8"));
      assert.strictEqual(profile.schema, "zotero-bridge.profile.v1");
      assert.strictEqual(profile.endpoint, "http://127.0.0.1:26570/bridge/v1");
      assert.strictEqual(profile.connectionMode, "local");
      assert.deepInclude(profile.auth, {
        type: "bearer",
        token: "well-known-token",
      });
      assert.strictEqual(profile.source, "well-known");
    } finally {
      if (typeof previousLocalAppData === "string") {
        process.env.LOCALAPPDATA = previousLocalAppData;
      } else {
        delete process.env.LOCALAPPDATA;
      }
      if (typeof previousXdgDataHome === "string") {
        process.env.XDG_DATA_HOME = previousXdgDataHome;
      } else {
        delete process.env.XDG_DATA_HOME;
      }
      if (typeof previousHome === "string") {
        process.env.HOME = previousHome;
      } else {
        delete process.env.HOME;
      }
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("installs bundled CLI and does not modify PATH when already configured", async function () {
    const copied: Array<[string, string]> = [];
    const result = await installHostBridgeCli({
      resolveCli: async () => ({
        available: true,
        binaryPath: "addon/bin/linux-x64/zotero-bridge",
        cliDir: "addon/bin/linux-x64",
        source: "bundled",
      }),
      platform: () => "linux",
      homeDir: () => "/home/a",
      pathEnv: () => "",
      pathIncludes: () => true,
      copyFile: async (source, target) => {
        copied.push([source, target]);
      },
      chmodExecutable: async () => undefined,
    });

    assert.isTrue(result.ok);
    assert.deepEqual(copied[0], [
      "addon/bin/linux-x64/zotero-bridge",
      "/home/a/.local/bin/zotero-bridge",
    ]);
    if (result.ok) {
      assert.isTrue(result.pathAlreadyConfigured);
      assert.isFalse(result.pathUpdated);
      assert.include(result.message, "PATH is already configured");
    }
  });

  it("installs CLI from packaged asset URI when filesystem resolver misses", async function () {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "zs-cli-asset-"));
    const previousRootUri = (globalThis as { rootURI?: string }).rootURI;
    const previousFetch = globalThis.fetch;
    const platform = resolveHostBridgeCliPlatform({
      platform: process.platform,
      arch: process.arch,
    });
    (globalThis as { rootURI?: string }).rootURI =
      "https://example.test/addon/";
    globalThis.fetch = (async (input: string | URL | Request) => {
      const uri = String(input);
      if (!uri.endsWith(`bin/${platform.dir}/${platform.binary}`)) {
        return {
          ok: false,
          status: 404,
          arrayBuffer: async () => new ArrayBuffer(0),
        } as Response;
      }
      const bytes = new TextEncoder().encode("packaged-binary").buffer;
      return {
        ok: true,
        status: 200,
        arrayBuffer: async () => bytes,
      } as Response;
    }) as typeof fetch;
    try {
      const result = await installHostBridgeCli({
        resolveCli: async () => ({
          available: false,
          code: "cli_binary_unavailable",
          message: "missing filesystem binary",
          checkedPaths: ["missing"],
        }),
        platform: () => process.platform,
        homeDir: () => root,
        localAppDataDir: () => root,
        pathEnv: () => "",
        pathIncludes: () => true,
        chmodExecutable: async () => undefined,
      });
      assert.isTrue(result.ok);
      if (result.ok) {
        assert.include(result.sourcePath, "https://example.test/addon/");
        const written = await fs.readFile(result.targetPath, "utf8");
        assert.strictEqual(written, "packaged-binary");
      }
    } finally {
      if (typeof previousRootUri === "string") {
        (globalThis as { rootURI?: string }).rootURI = previousRootUri;
      } else {
        delete (globalThis as { rootURI?: string }).rootURI;
      }
      globalThis.fetch = previousFetch;
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("requires explicit Windows confirmation before user PATH update", async function () {
    let copyCount = 0;
    const declined = await installHostBridgeCli({
      resolveCli: async () => ({
        available: true,
        binaryPath: "addon/bin/win32-x64/zotero-bridge.exe",
        cliDir: "addon/bin/win32-x64",
        source: "bundled",
      }),
      platform: () => "win32",
      localAppDataDir: () => "C:\\Users\\A\\AppData\\Local",
      pathIncludes: () => false,
      copyFile: async () => {
        copyCount += 1;
      },
      writeTextFile: async () => undefined,
      chmodExecutable: async () => undefined,
      confirmAddToPath: () => false,
      setWindowsUserPath: async () => {
        throw new Error("must not update path without confirmation");
      },
    });

    assert.isFalse(declined.ok);
    if (!declined.ok) {
      assert.strictEqual(declined.code, "cli_path_update_declined");
    }
    assert.strictEqual(copyCount, 1);

    const accepted = await installHostBridgeCli({
      resolveCli: async () => ({
        available: true,
        binaryPath: "addon/bin/win32-x64/zotero-bridge.exe",
        cliDir: "addon/bin/win32-x64",
        source: "bundled",
      }),
      platform: () => "win32",
      localAppDataDir: () => "C:\\Users\\A\\AppData\\Local",
      pathIncludes: () => false,
      copyFile: async () => undefined,
      writeTextFile: async () => undefined,
      chmodExecutable: async () => undefined,
      confirmAddToPath: () => true,
      setWindowsUserPath: async () => true,
    });

    assert.isTrue(accepted.ok);
    if (accepted.ok) {
      assert.isTrue(accepted.pathUpdated);
      assert.isTrue(accepted.terminalRestartRequired);
      assert.include(accepted.message, "Restart terminals");
    }
  });

  it("updates Windows user PATH through Zotero subprocess when available", async function () {
    const runtime = globalThis as typeof globalThis & {
      Zotero: {
        Utilities?: {
          Internal?: {
            subprocess?: (command: string, args?: string[]) => Promise<string>;
          };
        };
      };
    };
    const previousUtilities = runtime.Zotero.Utilities;
    const previousInternal = runtime.Zotero.Utilities?.Internal;
    const previousSubprocess = runtime.Zotero.Utilities?.Internal?.subprocess;
    const calls: Array<{ command: string; args: string[] }> = [];
    runtime.Zotero.Utilities = runtime.Zotero.Utilities || {};
    runtime.Zotero.Utilities.Internal = runtime.Zotero.Utilities.Internal || {};
    runtime.Zotero.Utilities.Internal.subprocess = async (
      command: string,
      args: string[] = [],
    ) => {
      calls.push({ command, args });
      return "updated";
    };
    try {
      const result = await installHostBridgeCli({
        resolveCli: async () => ({
          available: true,
          binaryPath: "addon/bin/win32-x64/zotero-bridge.exe",
          cliDir: "addon/bin/win32-x64",
          source: "bundled",
        }),
        platform: () => "win32",
        localAppDataDir: () => "C:\\Users\\A\\AppData\\Local",
        pathIncludes: () => false,
        copyFile: async () => undefined,
        writeTextFile: async () => undefined,
        chmodExecutable: async () => undefined,
        confirmAddToPath: () => true,
      });

      assert.isTrue(result.ok);
      if (result.ok) {
        assert.isTrue(result.pathUpdated);
      }
      assert.isAtLeast(calls.length, 1);
      assert.match(calls[0].command, /powershell|pwsh/i);
      assert.include(calls[0].args.join(" "), "SetEnvironmentVariable");
      assert.include(calls[0].args.join(" "), "zotero-agents");
    } finally {
      if (previousInternal) {
        runtime.Zotero.Utilities = runtime.Zotero.Utilities || {};
        runtime.Zotero.Utilities.Internal = previousInternal;
        runtime.Zotero.Utilities.Internal.subprocess = previousSubprocess;
      } else if (runtime.Zotero.Utilities) {
        delete runtime.Zotero.Utilities.Internal;
      }
      if (previousUtilities) {
        runtime.Zotero.Utilities = previousUtilities;
      } else {
        delete runtime.Zotero.Utilities;
      }
    }
  });

  it("declares CLI release packaging workflow and addon bin directories", async function () {
    const workflow = await fs.readFile(
      ".github/workflows/build-zotero-bridge-cli.yml",
      "utf8",
    );
    for (const platform of [
      "win32-x64",
      "darwin-x64",
      "darwin-arm64",
      "linux-x86",
      "linux-x64",
      "linux-arm",
      "linux-arm64",
    ]) {
      assert.include(workflow, platform);
      const stat = await fs.stat(path.join("addon", "bin", platform));
      assert.isTrue(stat.isDirectory());
    }
    for (const rustTarget of [
      "i686-unknown-linux-gnu",
      "x86_64-unknown-linux-gnu",
      "armv7-unknown-linux-gnueabihf",
      "aarch64-unknown-linux-gnu",
      "x86_64-apple-darwin",
      "aarch64-apple-darwin",
    ]) {
      assert.include(workflow, rustTarget);
    }
    assert.include(workflow, "cargo install cargo-zigbuild --locked");
    assert.include(workflow, "mlugg/setup-zig@v2");
    const packageScript = await fs.readFile(
      "scripts/package-zotero-bridge-cli.mjs",
      "utf8",
    );
    assert.include(packageScript, "sha256");
    assert.include(packageScript, "ZOTERO_BRIDGE_TARGET");
    const buildScript = await fs.readFile(
      "scripts/build-zotero-bridge-cli.mjs",
      "utf8",
    );
    assert.include(buildScript, "cargo-zigbuild is required");
    assert.include(buildScript, "cargo");
    assert.include(buildScript, "zigbuild");
    const publishScript = await fs.readFile(
      "scripts/publish-host-bridge-cli-bundle.ps1",
      "utf8",
    );
    assert.include(publishScript, "assets/profile.template.json");
    assert.include(publishScript, "install.ps1");
    assert.include(publishScript, "install.sh");
    assert.include(publishScript, "installer");
    assert.include(publishScript, "zotero-agents");
    assert.include(publishScript, "ZOTERO_BRIDGE_CONNECTION_MODE");
    assert.include(publishScript, "profileTemplate");
    const profileTemplate = JSON.parse(
      await fs.readFile(
        "skills_builtin/zotero-bridge-cli/assets/profile.template.json",
        "utf8",
      ),
    );
    assert.strictEqual(profileTemplate.connectionMode, "local");
    assert.strictEqual(profileTemplate.auth.tokenEnv, "ZOTERO_BRIDGE_TOKEN");
  });

  it("documents agent-friendly bundle installers without platform override", async function () {
    const installPs1 = await fs.readFile(
      "cli/zotero-bridge/scripts/install.ps1",
      "utf8",
    );
    const installSh = await fs.readFile(
      "cli/zotero-bridge/scripts/install.sh",
      "utf8",
    );
    const wrapperSkill = await fs.readFile(
      "skills_builtin/zotero-bridge-cli/SKILL.md",
      "utf8",
    );
    const wrapperReference = await fs.readFile(
      "skills_builtin/zotero-bridge-cli/references/host-bridge-cli.md",
      "utf8",
    );
    const docs = await fs.readFile("doc/host-bridge-cli.md", "utf8");

    for (const source of [installPs1, installSh]) {
      assert.include(source, "zotero-agents");
      assert.include(source, "ZOTERO_BRIDGE_INSTALL_DIR");
      assert.include(source, "ZOTERO_BRIDGE_TOKEN");
      assert.include(source, "Platform override is not supported");
    }
    for (const source of [wrapperSkill, wrapperReference, docs]) {
      assert.include(source, "install.ps1");
      assert.include(source, "install.sh");
      assert.include(source, "--yes --json");
    }
    assert.include(docs, "zotero-agents");
    assert.notInclude(wrapperReference, "--platform");
  });

  it("packages a target-triple release binary into the requested platform directory", async function () {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "zs-cli-package-"));
    try {
      const binaryDir = path.join(
        root,
        "cli",
        "zotero-bridge",
        "target",
        "i686-unknown-linux-gnu",
        "release",
      );
      const binary = path.join(binaryDir, "zotero-bridge");
      await fs.mkdir(binaryDir, { recursive: true });
      await fs.writeFile(binary, "linux-x86-binary");
      await execFileAsync(
        process.execPath,
        [
          path.join(process.cwd(), "scripts/package-zotero-bridge-cli.mjs"),
          "--platform=linux-x86",
          "--target=i686-unknown-linux-gnu",
        ],
        { cwd: root },
      );
      const packaged = await fs.readFile(
        path.join(root, "addon", "bin", "linux-x86", "zotero-bridge"),
        "utf8",
      );
      const checksum = await fs.readFile(
        path.join(root, "addon", "bin", "linux-x86", "zotero-bridge.sha256"),
        "utf8",
      );
      assert.strictEqual(packaged, "linux-x86-binary");
      assert.match(checksum, /^[a-f0-9]{64} {2}zotero-bridge\n$/);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});
