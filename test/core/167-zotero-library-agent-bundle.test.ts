import { assert } from "chai";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

const HELPER = join(
  process.cwd(),
  "skills_builtin/zotero-library-agent/scripts/zotero_library_agent.py",
);

function writeJson(path: string, value: unknown) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function runHelper(args: string[]) {
  const stdout = execFileSync(
    process.env.PYTHON || "python3",
    [HELPER, ...args],
    {
      cwd: process.cwd(),
      encoding: "utf8",
    },
  );
  return JSON.parse(stdout);
}

describe("zotero library agent bundle", function () {
  it("renders its repository README from bounded-task semantic source", function () {
    const source = readFileSync(
      "skills_src/zotero-library-agent/semantic/README.md",
      "utf8",
    );
    const rendered = readFileSync(
      "skills_builtin/zotero-library-agent/README.md",
      "utf8",
    );
    assert.strictEqual(rendered, source);
    assert.include(rendered, "surface identity --json");
    assert.include(rendered, "bounded");
    assert.notMatch(rendered, /cron|SQLite|HERMES_HOME/);
  });

  it("documents only helper commands exposed by the packaged parser", function () {
    const skill = readFileSync(
      "skills_builtin/zotero-library-agent/SKILL.md",
      "utf8",
    );
    const contract = readFileSync(
      "skills_builtin/zotero-library-agent/references/helper-script-contract.md",
      "utf8",
    );
    const guidance = `${skill}\n${contract}`;
    assert.include(guidance, "zotero_library_agent.py evidence build");
    assert.include(guidance, "zotero_library_agent.py evidence validate");
    assert.notInclude(guidance, "zotero_library_agent.py validate-input");
    assert.notInclude(guidance, "zotero_library_agent.py render-evidence");
  });

  it("builds and validates hash-bound evidence without persistent state", async function () {
    const root = mkdtempSync(join(tmpdir(), "zla-evidence-"));
    try {
      const artifactPath = join(root, "digest.md");
      writeFileSync(artifactPath, "# Digest\n", "utf8");
      const inputPath = join(root, "input.json");
      const outputPath = join(root, "evidence.json");
      writeJson(inputPath, {
        producer: { surfaceVersion: "0.2.0", cliVersion: "0.2.1" },
        operation: {
          kind: "library-read",
          command: ["zotero-bridge", "library", "items", "list"],
        },
        subjects: [
          { kind: "zotero-item", ref: { libraryId: 1, key: "ABCD1234" } },
        ],
        artifacts: [
          { path: artifactPath, role: "result", mediaType: "text/markdown" },
        ],
        writeback: { state: "not-requested" },
      });

      const built = runHelper([
        "evidence",
        "build",
        "--input",
        inputPath,
        "--output",
        outputPath,
      ]);
      assert.isTrue(built.ok);
      const evidence = JSON.parse(readFileSync(outputPath, "utf8"));
      assert.strictEqual(
        evidence.schema,
        "zotero-library-agent.evidence-bundle.v1",
      );
      assert.strictEqual(
        evidence.artifacts[0].sha256,
        createHash("sha256").update("# Digest\n").digest("hex"),
      );
      const validated = runHelper([
        "evidence",
        "validate",
        "--input",
        outputPath,
      ]);
      assert.isTrue(validated.ok);
      assert.notProperty(evidence, "stateDir");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects evidence credential fields", async function () {
    const root = mkdtempSync(join(tmpdir(), "zla-secret-"));
    try {
      const inputPath = join(root, "input.json");
      const outputPath = join(root, "evidence.json");
      writeJson(inputPath, {
        producer: { surfaceVersion: "0.2.0", cliVersion: "0.2.1" },
        operation: { kind: "library-read", command: ["zotero-bridge"] },
        subjects: [],
        artifacts: [],
        writeback: { state: "not-requested" },
        token: "secret",
      });
      let stderr = "";
      try {
        execFileSync(
          process.env.PYTHON || "python3",
          [
            HELPER,
            "evidence",
            "build",
            "--input",
            inputPath,
            "--output",
            outputPath,
          ],
          {
            cwd: process.cwd(),
            encoding: "utf8",
            stdio: ["ignore", "pipe", "pipe"],
          },
        );
        assert.fail("credential-bearing evidence must be rejected");
      } catch (error) {
        stderr = String((error as { stderr?: string }).stderr || "");
      }
      assert.include(stderr, "sensitive_field");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("inspects prepared agent-run contracts and validates result bundles", async function () {
    const root = mkdtempSync(join(tmpdir(), "zla-workflow-"));
    try {
      const handoff = join(root, "handoff");
      const result = join(root, "result");
      writeJson(join(handoff, "agent-run/context.json"), {
        schema: "zotero-bridge.agent-run.context.v1",
        agentRunId: "agent-run-1",
      });
      const contract = {
        schema: "zotero-bridge.agent-run.output-contract.v1",
        agentRequestId: "request-1",
        namespace: "demo",
        resultJsonPath: "bundle/demo/result.json",
        expectedBundleManifestPath: "bundle/demo/manifest.json",
      };
      writeJson(
        join(handoff, "agent-run/requests/request-1/output-contract.json"),
        contract,
      );
      writeJson(join(result, "bundle/demo/result.json"), { ok: true });
      writeJson(join(result, "bundle/demo/manifest.json"), {
        namespace: "demo",
      });

      const inspected = runHelper(["workflow", "inspect", "--bundle", handoff]);
      assert.strictEqual(inspected.agentRunId, "agent-run-1");
      assert.deepEqual(inspected.agentRequestIds, ["request-1"]);
      const validated = runHelper([
        "workflow",
        "validate-result",
        "--contract",
        join(handoff, "agent-run/requests/request-1/output-contract.json"),
        "--result",
        result,
      ]);
      assert.isTrue(validated.ok);
      assert.strictEqual(validated.namespace, "demo");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
