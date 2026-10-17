import { assert } from "chai";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { synthesisProtocolExecutionIdentity } from "../../scripts/synthesis/synthesisProtocolExecutionEvidence";

describe("Synthesis execution evidence freshness", function () {
  it("invalidates receipts when a contract, producer, rebuilder or executable changes", function () {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "synthesis-evidence-"));
    try {
      const sources = [
        "packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/registry.json",
        "packages/synthesis-contracts/contract-set/canonical-literature-artifacts-v1/schemas/literature-score-artifact.schema.json",
        "packages/synthesis-contracts/src/workflow.ts",
        "src/modules/synthesisClient/nativeComposition.ts",
        "src/modules/synthesis/sidecar/client.ts",
        "src/modules/synthesis/reverseHost/endpoint.ts",
        "workflows_builtin/package/hook.mjs",
        "src/modules/zoteroHost/adapter.ts",
        "src/modules/zoteroHostCapabilityBroker.ts",
        "rust/synthesis-sidecar/crates/runtime/src/lib.rs",
        "tests/helpers/harness.ts",
        "tests/synthesis/producer.test.ts",
        "tests/workflow-literature-analysis/producer.test.ts",
        "tests/workflow-literature-workbench-package/producer.test.ts",
        "scripts/synthesis/check-synthesis-native-worker-transfer-parity.ts",
        "scripts/synthesis/check-synthesis-cross-language-contracts.ts",
        "scripts/synthesis/synthesisProtocolStructureCoverage.ts",
        "scripts/synthesis/synthesisProtocolExecutionEvidence.ts",
        `rust/synthesis-sidecar/target/debug/synthesis-sidecar${process.platform === "win32" ? ".exe" : ""}`,
      ];
      assert.isUndefined(synthesisProtocolExecutionIdentity(root));
      for (const file of sources) {
        const fullPath = path.join(root, file);
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        fs.writeFileSync(fullPath, "initial");
      }
      const original = synthesisProtocolExecutionIdentity(root);
      assert.match(original!, /^[a-f0-9]{64}$/);
      for (const file of sources) {
        fs.writeFileSync(path.join(root, file), "changed");
        assert.notEqual(
          synthesisProtocolExecutionIdentity(root),
          original,
          file,
        );
        fs.writeFileSync(path.join(root, file), "initial");
      }
      assert.equal(synthesisProtocolExecutionIdentity(root), original);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
