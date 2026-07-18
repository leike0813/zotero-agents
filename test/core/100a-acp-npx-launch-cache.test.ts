import { assert } from "chai";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  acquireAcpNpxLaunchCacheLease,
  buildAcpNpxLaunchCacheKey,
  classifyAcpNpxCacheRenameConflict,
  resetAcpNpxLaunchCacheForTests,
  resolveAcpNpxLaunchSpec,
} from "../../src/modules/acpNpxLaunchCache";

describe("ACP npx launch cache", function () {
  afterEach(function () {
    resetAcpNpxLaunchCacheForTests();
  });

  it("recognizes direct and uv-wrapped npx package launches", function () {
    assert.deepEqual(
      resolveAcpNpxLaunchSpec({
        command: "/usr/local/bin/npx",
        args: ["--yes", "@kilocode/cli@7.4.7", "acp"],
      }),
      {
        executable: "/usr/local/bin/npx",
        packageSpec: "@kilocode/cli@7.4.7",
      },
    );
    assert.deepEqual(
      resolveAcpNpxLaunchSpec({
        command: "uv",
        args: [
          "run",
          "--isolated",
          "--",
          "C:\\Program Files\\nodejs\\npx.cmd",
          "-y",
          "opencode-ai@latest",
          "acp",
        ],
      }),
      {
        executable: "C:\\Program Files\\nodejs\\npx.cmd",
        packageSpec: "opencode-ai@latest",
      },
    );
    assert.isNull(
      resolveAcpNpxLaunchSpec({ command: "opencode", args: ["acp"] }),
    );
  });

  it("builds a stable bounded key without exposing launch inputs", function () {
    const first = buildAcpNpxLaunchCacheKey({
      backendId: " ACP-Kilo-NPX ",
      executable: "/usr/local/bin/NPX",
      packageSpec: " @kilocode/cli@7.4.7 ",
    });
    const second = buildAcpNpxLaunchCacheKey({
      backendId: "acp-kilo-npx",
      executable: "/usr/local/bin/npx",
      packageSpec: "@kilocode/cli@7.4.7",
    });
    assert.equal(first, second);
    assert.match(first, /^npx-[a-f0-9]{16}$/);
    assert.notInclude(first, "kilo");
    assert.notInclude(first, "7.4.7");
  });

  it("preserves explicit backend npm cache authority and ignores non-npx commands", async function () {
    assert.isNull(
      await acquireAcpNpxLaunchCacheLease({
        backendId: "explicit-cache",
        command: "npx",
        args: ["agent-package", "acp"],
        env: { NPM_CONFIG_CACHE: "/user/cache" },
        cacheRoot: "/plugin/cache",
      }),
    );
    assert.isNull(
      await acquireAcpNpxLaunchCacheLease({
        backendId: "bare-opencode",
        command: "opencode",
        args: ["acp"],
        cacheRoot: "/plugin/cache",
      }),
    );
  });

  it("persists a rotated generation without deleting the old generation", async function () {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "acp-npx-cache-"));
    try {
      const first = await acquireAcpNpxLaunchCacheLease({
        backendId: "acp-kilo-npx",
        command: "npx",
        args: ["@kilocode/cli@7.4.7", "acp"],
        cacheRoot: root,
      });
      assert.isNotNull(first);
      assert.equal(first?.generation, 0);
      assert.equal(first?.environment.npm_config_cache, first?.cachePath);
      await first?.rotate();
      assert.equal(first?.generation, 1);
      const priorPath = path.join(
        root,
        "acp-npx",
        first!.cacheKey,
        "generation-0",
      );
      await fs.mkdir(priorPath, { recursive: true });
      first?.release();

      const second = await acquireAcpNpxLaunchCacheLease({
        backendId: "acp-kilo-npx",
        command: "npx",
        args: ["@kilocode/cli@7.4.7", "acp"],
        cacheRoot: root,
      });
      assert.equal(second?.generation, 1);
      assert.isTrue((await fs.stat(priorPath)).isDirectory());
      second?.release();
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("serializes leases and lets waiters observe the final active generation", async function () {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "acp-npx-flight-"));
    try {
      const input = {
        backendId: "shared",
        command: "npx",
        args: ["agent-package", "acp"],
        cacheRoot: root,
      };
      const first = await acquireAcpNpxLaunchCacheLease(input);
      let secondSettled = false;
      const secondPromise = acquireAcpNpxLaunchCacheLease(input).then(
        (lease) => {
          secondSettled = true;
          return lease;
        },
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
      assert.isFalse(secondSettled);
      await first?.rotate();
      first?.release();
      const second = await secondPromise;
      assert.equal(second?.generation, 1);
      second?.release();
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("classifies only npm _npx rename ENOTEMPTY or EEXIST conflicts", function () {
    assert.equal(
      classifyAcpNpxCacheRenameConflict(
        "npm error code ENOTEMPTY\nnpm error syscall rename\nnpm error path /cache/_npx/a",
      ),
      "ENOTEMPTY",
    );
    assert.equal(
      classifyAcpNpxCacheRenameConflict(
        "EEXIST: file already exists, rename '/cache/_npx/a' -> '/cache/_npx/b'",
      ),
      "EEXIST",
    );
    assert.isNull(
      classifyAcpNpxCacheRenameConflict(
        "npm error code E401 authentication required for _npx package",
      ),
    );
    assert.isNull(
      classifyAcpNpxCacheRenameConflict(
        "ENOTEMPTY while creating an unrelated application directory",
      ),
    );
  });
});
