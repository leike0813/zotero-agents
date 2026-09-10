import { assert } from "chai";
import fs from "node:fs";
import path from "node:path";
import {
  findForbiddenSynthesisSourcePatterns,
  inspectSynthesisServiceBoundary,
} from "../../scripts/synthesis/check-synthesis-service-boundary";
import { inspectSynthesisNativeWorkerTransferOwnership } from "../../scripts/synthesis/check-synthesis-native-worker-transfer-parity";

const ROOT = process.cwd();

describe("Synthesis native-only production boundary", function () {
  it("has no constructible plugin or Node sidecar owner [inv.runtime.single_production_owner]", function () {
    const report = inspectSynthesisServiceBoundary();

    assert.deepEqual(report.legacyOwnerPathsPresent, []);
    assert.deepEqual(report.nodeSidecarPathsPresent, []);
    assert.deepEqual(report.productionBoundaryViolations, []);
    assert.deepEqual(report.contractViolations, []);
    assert.equal(report.productionClientAdapter, "clientPortAdapter.ts");
    assert.equal(report.productionRuntimeOwner, "runtime_service.rs");
  });

  it("keeps the Rust runtime graph ownership isolated [inv.runtime.sidecar_foundation_isolated]", function () {
    assert.deepEqual(inspectSynthesisNativeWorkerTransferOwnership(ROOT), []);
  });

  it("rejects every legacy construction and implementation-selection shape", function () {
    const fixtures = new Map<string, string>([
      ["static import", 'import { x } from "./synthesis/service";'],
      ["dynamic import", 'await import("./synthesis/repository");'],
      ["legacy composition", 'import "./legacyComposition";'],
      ["old adapter", 'import "./inProcessClient";'],
      ["factory", "createSynthesisService({ root });"],
      ["aliased factory", "const build = createSynthesisService; build({});"],
      ["test hook", "setDefaultLegacySynthesisServiceForTests(owner);"],
      ["preference selector", 'prefs.get("synthesis.runtimeImplementation");'],
      ["environment selector", "process.env.SYNTHESIS_RUNTIME_IMPLEMENTATION"],
      ["manifest selector", 'manifest.implementation === "node"'],
      ["backend registration", 'registerBackend("synthesis-node", owner)'],
    ]);

    for (const [name, source] of fixtures) {
      assert.isNotEmpty(
        findForbiddenSynthesisSourcePatterns(`fixture/${name}.ts`, source),
        name,
      );
    }
  });

  it("keeps the native supervisor as an opaque path handoff [inv.runtime.sidecar_supervision_isolated]", function () {
    const supervisor = fs.readFileSync(
      path.join(
        ROOT,
        "src/modules/synthesis/sidecar/synthesisSidecarRuntimeSupervisor.ts",
      ),
      "utf8",
    );
    assert.include(supervisor, "repositoryDbPath");
    assert.include(supervisor, "canonicalRoot");
    assert.notMatch(
      supervisor,
      /Repository::open_production|CanonicalStore::open_production|createSynthesisService/,
    );
  });
});
