import { assert } from "chai";
import {
  buildAcpRuntimeDependencyPlan,
  defaultAcpRuntimeDependencyProbe,
} from "../../src/modules/acp/skillRun/acpRuntimeDependencyWrapper";
import { createCancellationController } from "../../src/utils/wait";
import {
  seedRuntimeCommandRegistryForTests,
  resetRuntimeCommandRegistryForTests,
} from "../../src/platform/command";

describe("ACP dependency probe coordination", function () {
  afterEach(() => resetRuntimeCommandRegistryForTests());

  it("keeps a nonzero-exit retry inside the original preparation budget", async function () {
    seedRuntimeCommandRegistryForTests({
      initialized: true,
      commands: {
        uv: {
          command: "uv",
          available: true,
          resolvedPath: "/uv",
          source: "path",
          checkedCandidates: [],
        },
      },
    });
    const previous = Object.getOwnPropertyDescriptor(globalThis, "ChromeUtils");
    let calls = 0;
    Object.defineProperty(globalThis, "ChromeUtils", {
      configurable: true,
      value: {
        importESModule: () => ({
          Subprocess: {
            call: async () => {
              const attempt = ++calls;
              let emitted = false;
              return {
                stdout: { readString: async () => "" },
                stderr: {
                  readString: async () => {
                    if (emitted) return "";
                    emitted = true;
                    return attempt === 1
                      ? "resolution failed"
                      : "retry download";
                  },
                },
                wait: () =>
                  attempt === 1
                    ? new Promise((resolve) =>
                        setTimeout(() => resolve({ exitCode: 1 }), 40),
                      )
                    : new Promise(() => undefined),
                kill() {},
              };
            },
          },
        }),
      },
    });
    try {
      const started = Date.now();
      const result = await defaultAcpRuntimeDependencyProbe({
        dependencies: ["jinja2"],
        cwd: "/retry",
        env: {},
        timeoutMs: 70,
      });
      assert.isFalse(result.ok);
      assert.equal(calls, 2);
      assert.isBelow(Date.now() - started, 500);
      const attempts = result.details?.probeAttempts as {
        stderrTail: string;
      }[];
      assert.lengthOf(attempts, 2);
      assert.include(attempts[0].stderrTail, "resolution failed");
      assert.include(attempts[1].stderrTail, "retry download");
    } finally {
      if (previous) Object.defineProperty(globalThis, "ChromeUtils", previous);
      else Reflect.deleteProperty(globalThis, "ChromeUtils");
    }
  });

  it("cancels a custom preparation without waiting for its unresolved result", async function () {
    const controller = createCancellationController();
    const plan = buildAcpRuntimeDependencyPlan({
      backend: { id: "test", type: "acp", baseUrl: "", command: "omp" },
      cwd: "/run",
      mode: "probe-and-wrap",
      runnerJson: { runtime: { dependencies: ["jinja2"] } },
      signal: controller.signal,
      probe: () => new Promise(() => undefined),
    }).catch((error) => error.kind);
    controller.abort();
    assert.equal(await plan, "canceled");
  });

  it("preserves partial stderr when a real Mozilla probe times out", async function () {
    seedRuntimeCommandRegistryForTests({
      initialized: true,
      commands: {
        uv: {
          command: "uv",
          available: true,
          resolvedPath: "/uv",
          source: "path",
          checkedCandidates: [],
        },
      },
    });
    const previous = Object.getOwnPropertyDescriptor(globalThis, "ChromeUtils");
    let killed = false;
    Object.defineProperty(globalThis, "ChromeUtils", {
      configurable: true,
      value: {
        importESModule: () => ({
          Subprocess: {
            call: async () => {
              let emitted = false;
              return {
                stdout: { readString: () => new Promise(() => undefined) },
                stderr: {
                  readString: () => {
                    if (!emitted) {
                      emitted = true;
                      return Promise.resolve(
                        "Downloading pymupdf-layout (40.9MiB)\n",
                      );
                    }
                    return new Promise(() => undefined);
                  },
                },
                wait: () => new Promise(() => undefined),
                kill: () => {
                  killed = true;
                },
              };
            },
          },
        }),
      },
    });
    try {
      const result = await defaultAcpRuntimeDependencyProbe({
        dependencies: ["jinja2"],
        cwd: "/run",
        env: {},
        timeoutMs: 30,
      });
      assert.isFalse(result.ok);
      assert.isTrue(killed);
      assert.include(
        JSON.stringify(result.details),
        "Downloading pymupdf-layout",
      );
    } finally {
      if (previous) Object.defineProperty(globalThis, "ChromeUtils", previous);
      else Reflect.deleteProperty(globalThis, "ChromeUtils");
    }
  });

  it("gives normal preparation a fifteen-minute total budget", async function () {
    let timeoutMs = 0;
    await buildAcpRuntimeDependencyPlan({
      backend: {
        id: "acp-test",
        type: "acp",
        baseUrl: "",
        command: "omp",
        acp: { agentFamily: "hermes" },
      },
      cwd: "/run",
      mode: "probe-and-wrap",
      runnerJson: { runtime: { dependencies: ["jinja2"] } },
      probe: async (args) => {
        timeoutMs = args.timeoutMs;
        return { ok: true };
      },
    });
    assert.equal(timeoutMs, 900000);
  });

  it("shares one actual execution for equivalent dependency sets and isolates warmup launch flags", async function () {
    seedRuntimeCommandRegistryForTests({
      initialized: true,
      commands: {
        uv: {
          command: "uv",
          available: true,
          resolvedPath: "/uv",
          source: "path",
          checkedCandidates: [],
        },
      },
    });
    const previous = Object.getOwnPropertyDescriptor(globalThis, "ChromeUtils");
    const launches: { arguments: string[] }[] = [];
    let finish!: (result: { exitCode: number }) => void;
    const pending = new Promise<{ exitCode: number }>((resolve) => {
      finish = resolve;
    });
    Object.defineProperty(globalThis, "ChromeUtils", {
      configurable: true,
      value: {
        importESModule: () => ({
          Subprocess: {
            call: async (request: { arguments: string[] }) => {
              launches.push(request);
              return {
                stdout: { readString: async () => "" },
                stderr: { readString: async () => "" },
                wait: () => pending,
                kill() {},
              };
            },
          },
        }),
      },
    });
    try {
      const args = { cwd: "/run", env: {}, timeoutMs: 1000 };
      const first = defaultAcpRuntimeDependencyProbe({
        ...args,
        dependencies: ["jinja2", "jsonschema", "jinja2"],
      });
      const second = defaultAcpRuntimeDependencyProbe({
        ...args,
        dependencies: ["jsonschema", "jinja2"],
      });
      await new Promise((resolve) => setTimeout(resolve, 10));
      assert.lengthOf(launches, 1);
      finish({ exitCode: 0 });
      assert.isTrue((await first).ok);
      assert.isTrue((await second).ok);
      await defaultAcpRuntimeDependencyProbe({
        ...args,
        dependencies: ["jinja2", "jsonschema"],
        background: true,
        noProject: true,
      });
      assert.lengthOf(launches, 2);
      assert.notInclude(launches[0].arguments, "--no-project");
      assert.include(launches[1].arguments, "--no-project");
    } finally {
      if (previous) Object.defineProperty(globalThis, "ChromeUtils", previous);
      else Reflect.deleteProperty(globalThis, "ChromeUtils");
    }
  });
});
