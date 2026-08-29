import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { assert } from "chai";
import { WORKFLOW_HOST_API_VERSION } from "../../../src/workflows/workflowHostContract";
import { requireHostApi } from "../../../workflows_builtin/literature-workbench-package/lib/runtime.mjs";

describe("Workflow Host contract governance", function () {
  this.timeout(10_000);

  it("keeps the built-in package compatibility policy aligned with the current identity", function () {
    const cases = [
      { version: 1, accepted: false },
      { version: 2, accepted: true },
      { version: WORKFLOW_HOST_API_VERSION, accepted: true },
      { version: WORKFLOW_HOST_API_VERSION + 1, accepted: false },
    ];

    for (const testCase of cases) {
      const hostApi = {};
      const runtime = {
        hostApi,
        hostApiVersion: testCase.version,
      };
      if (testCase.accepted) {
        assert.strictEqual(requireHostApi(runtime), hostApi);
        continue;
      }
      try {
        requireHostApi(runtime);
        assert.fail(`expected version ${testCase.version} to be rejected`);
      } catch (error) {
        assert.strictEqual(
          (error as { hostApiVersion?: number }).hostApiVersion,
          testCase.version,
        );
      }
    }
  });

  it("keeps explicit versions in current contract documents aligned", async function () {
    const paths = [
      "doc/components/zotero-host-capability-broker-ssot.md",
      "openspec/specs/zotero-host-capability-broker/spec.md",
    ];

    for (const path of paths) {
      const text = await readFile(resolve(path), "utf8");
      const declarations = [...text.matchAll(/Workflow Host API v(\d+)/g)].map(
        (match) => Number(match[1]),
      );
      assert.isNotEmpty(declarations, path);
      assert.deepEqual(
        [...new Set(declarations)],
        [WORKFLOW_HOST_API_VERSION],
        path,
      );
    }
  });
});
