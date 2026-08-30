import { assert } from "chai";
import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { inspectSynthesisServiceBoundary } from "../../scripts/check-synthesis-service-boundary";

type InvariantContract = {
  schema: string;
  invariants: Array<{
    id: string;
    severity: string;
    statement: string;
    evidence: string;
    test_refs?: Array<{
      file: string;
      marker: string;
      kind: "behavior" | "static_guard";
    }>;
  }>;
};

const ROOT = process.cwd();
const CONTRACT_PATH = "doc/synthesis-layer/contracts/invariants.yaml";

function read(relativePath: string) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function contract() {
  return parseYaml(read(CONTRACT_PATH)) as InvariantContract;
}

describe("Synthesis invariant guards", function () {
  it("keeps one native production owner [inv.runtime.single_production_owner]", function () {
    const report = inspectSynthesisServiceBoundary();
    const owner = read("src/modules/synthesisProductionOwner.ts");
    const supervisor = read("src/modules/synthesisSidecarRuntimeSupervisor.ts");

    assert.deepEqual(report.legacyOwnerPathsPresent, []);
    assert.deepEqual(report.nodeSidecarPathsPresent, []);
    assert.include(owner, "startDefaultSynthesisProductionOwner");
    assert.include(owner, "startSynthesisProductionRuntimeSupervisor");
    assert.include(supervisor, "repositoryDbPath");
    assert.include(supervisor, "canonicalRoot");
    assert.notMatch(owner, /implementation|fallback|createSynthesisService/);
  });

  it("keeps the Rust sidecar runtime graph isolated [inv.runtime.sidecar_foundation_isolated]", function () {
    const main = read(
      "native/synthesis-sidecar/crates/synthesis-sidecar/src/main.rs",
    );
    const library = read(
      "native/synthesis-sidecar/crates/synthesis-sidecar/src/lib.rs",
    );
    const service = read(
      "native/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_service.rs",
    );
    const serverLoop = read(
      "native/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_server_loop.rs",
    );

    assert.include(main, "runtime_cli::run(synthesis_sidecar::worker");
    assert.notInclude(main, "mod runtime_service");
    assert.include(library, "pub use runtime_service::serve");
    assert.include(service, "publish_discovery");
    assert.include(service, "struct RunningRuntime");
    for (const authority of [
      "publish_discovery",
      "Repository::open_production",
      "CanonicalStore::open_production",
    ]) {
      assert.notInclude(serverLoop, authority);
    }
  });

  it("keeps supervision path-only and fail-closed [inv.runtime.sidecar_supervision_isolated]", function () {
    const supervisor = read("src/modules/synthesisSidecarRuntimeSupervisor.ts");
    const defaultClient = read("src/modules/synthesisClient/defaultClient.ts");

    assert.include(supervisor, "await controlClient.health(connection)");
    assert.include(supervisor, "await controlClient.handshake(connection)");
    assert.notMatch(supervisor, /resolveRuntimeCommand|pathSearch|\bnode\b/i);
    assert.include(
      defaultClient,
      "createReadyNativeSynthesisClientComposition",
    );
    assert.notMatch(defaultClient, /legacy|fallback|implementation selector/i);
  });

  it("declares executable references for every statically guarded invariant", function () {
    const parsed = contract();
    assert.equal(parsed.schema, "synthesis.invariants.v2");
    const ids = new Set<string>();
    for (const invariant of parsed.invariants) {
      assert.match(invariant.id, /^inv\.[a-z0-9_]+(?:\.[a-z0-9_]+)+$/);
      assert.isFalse(ids.has(invariant.id), invariant.id);
      ids.add(invariant.id);
      assert.match(invariant.severity, /^(fatal|high|medium|low)$/);
      assert.isNotEmpty(invariant.statement.trim());
      assert.isNotEmpty(invariant.evidence.trim());
      for (const ref of invariant.test_refs || []) {
        assert.isTrue(fs.existsSync(path.join(ROOT, ref.file)), ref.file);
        assert.include(read(ref.file), ref.marker, ref.marker);
        assert.match(ref.kind, /^(behavior|static_guard)$/);
      }
    }
  });
});
