import { assert } from "chai";
import fs from "fs";
import path from "path";
import { parse as parseYaml } from "yaml";

const ROOT_DIR = process.cwd();
const INVENTORY_FILE = path.join(
  ROOT_DIR,
  "doc/synthesis-layer/contracts/service-api-migration.yaml",
);
const CHECKER_FILE = path.join(
  ROOT_DIR,
  "scripts/check-synthesis-service-boundary.ts",
);
const FIXTURE_ROOT = path.join(
  ROOT_DIR,
  "test/fixtures/synthesis-sidecar-migration",
);

async function loadBoundaryChecker() {
  assert.isTrue(
    fs.existsSync(INVENTORY_FILE),
    "the service API migration inventory must exist",
  );
  assert.isTrue(
    fs.existsSync(CHECKER_FILE),
    "the reusable synthesis boundary checker must exist",
  );
  return import("../../scripts/check-synthesis-service-boundary");
}

describe("Synthesis sidecar migration boundary", function () {
  it("keeps the service API inventory synchronized with the public return surface", async function () {
    const checker = await loadBoundaryChecker();
    const report = checker.inspectSynthesisServiceBoundary();

    assert.deepEqual(report.missingMethods, []);
    assert.deepEqual(report.unknownMethods, []);
    assert.lengthOf(report.publicMethods, 125);
    assert.equal(report.publicMethods.length, report.inventory.methods.length);
    assert.notInclude(report.publicMethods, "warmSynthesisWorkbenchSurfaces");
    assert.notInclude(
      report.inventory.methods.map((method) => method.name),
      "warmSynthesisWorkbenchSurfaces",
    );
    const rawInventory = parseYaml(fs.readFileSync(INVENTORY_FILE, "utf8")) as {
      method_groups: Array<{ id: string }>;
    };
    assert.notInclude(
      rawInventory.method_groups.map((group) => group.id),
      "workbench_warmup",
    );
  });

  it("assigns every public method a valid category, capability, and disposition", async function () {
    const checker = await loadBoundaryChecker();
    const report = checker.inspectSynthesisServiceBoundary();

    assert.deepEqual(report.invalidMethods, []);
    assert.deepEqual(report.contractViolations, []);
    for (const method of report.inventory.methods) {
      assert.match(method.name, /^[A-Za-z][A-Za-z0-9]*$/);
      assert.match(method.category, /^(query|command|host_effect|debug)$/);
      assert.match(
        method.disposition,
        /^(client_capability|host_capability|internal|remove)$/,
      );
      assert.isNotEmpty(method.target_capability);
    }
  });

  it("prevents direct full-service consumer growth outside migration composition", async function () {
    const checker = await loadBoundaryChecker();
    const report = checker.inspectSynthesisServiceBoundary();

    assert.deepEqual(report.missingConsumers, []);
    assert.deepEqual(report.unknownConsumers, []);
    assert.deepEqual(report.directConsumers, [
      "src/modules/hostBridgeCapabilityRegistry.ts",
      "src/modules/synthesisClient/legacyComposition.ts",
      "src/modules/synthesisWorkbenchTab.ts",
      "src/modules/zoteroMcpProtocol.ts",
    ]);
    assert.deepEqual(
      report.inventory.direct_consumers.map((consumer) => consumer.path).sort(),
      report.directConsumers,
    );

    const workbench = fs.readFileSync(
      path.join(ROOT_DIR, "src/modules/synthesisWorkbenchTab.ts"),
      "utf8",
    );
    assert.notInclude(workbench, ".getSynthesisWorkbenchChromeInput");
    assert.notInclude(workbench, ".getSynthesisWorkbenchSurfaceInput");
    assert.notInclude(workbench, ".resolveTopicPaperDigest");
    assert.match(workbench, /client\.workbench\s*\.readChrome/);
    assert.match(workbench, /client\.workbench\s*\.readSurface/);
    assert.match(workbench, /client\.workbench\s*\.readTopicDetail/);
    assert.match(workbench, /client\.workbench\s*\.readPaperDigest/);
    assert.match(workbench, /client\.workbench\s*\.readProgress/);
    assert.match(workbench, /client\.topics\s*\.getTopicReport/);
    assert.match(workbench, /client\.graph\s*\.recomputeCitationGraphLayout/);
    assert.match(workbench, /client\.graph\s*\.rebuildCitationGraphCacheNow/);
    assert.match(
      workbench,
      /client\.graph\s*\.refreshCitationGraphCacheIncrementalNow/,
    );
    assert.match(workbench, /client\.graph\s*\.retryCitationGraphCacheRebuild/);
    for (const method of [
      "recomputeCitationGraphLayout",
      "rebuildCitationGraphCacheNow",
      "refreshCitationGraphCacheIncrementalNow",
      "retryCitationGraphCacheRebuild",
    ]) {
      assert.notMatch(
        workbench,
        new RegExp(`getDefaultSynthesisService\\(\\)\\.${method}`),
      );
    }
    assert.notMatch(
      workbench,
      /getDefaultSynthesisService\(\)\.getTopicReport/,
    );
    assert.notInclude(workbench, ".warmSynthesisWorkbenchSurfaces");
    const progressRefreshBlock = workbench.slice(
      workbench.indexOf("async function refreshWorkbenchCommandProgress"),
      workbench.indexOf("function runWorkbenchCommandOnce"),
    );
    assert.notInclude(progressRefreshBlock, ".getSynthesisBackgroundJobRows");

    const clientContract = fs.readFileSync(
      path.join(ROOT_DIR, "packages/synthesis-contracts/src/client.ts"),
      "utf8",
    );
    const workbenchContract = fs.readFileSync(
      path.join(ROOT_DIR, "packages/synthesis-contracts/src/workbench.ts"),
      "utf8",
    );
    const graphContract = fs.readFileSync(
      path.join(ROOT_DIR, "packages/synthesis-contracts/src/graph.ts"),
      "utf8",
    );
    const topicsContract = fs.readFileSync(
      path.join(ROOT_DIR, "packages/synthesis-contracts/src/topics.ts"),
      "utf8",
    );
    assert.include(topicsContract, "getTopicReport(");
    assert.notInclude(workbenchContract, "getTopicReport(");
    assert.include(workbenchContract, "readProgress()");
    assert.include(clientContract, "graph: SynthesisGraphClient");
    assert.include(graphContract, "recomputeCitationGraphLayout(");
    assert.include(graphContract, "rebuildCitationGraphCacheNow()");
    assert.include(graphContract, "refreshCitationGraphCacheIncrementalNow()");
    assert.include(graphContract, "retryCitationGraphCacheRebuild()");
    assert.notMatch(
      graphContract,
      /onProgress|callback|stream|Workbench|SynthesisUi|progressOptions/,
    );
    assert.notMatch(
      `${clientContract}\n${workbenchContract}`,
      /prewarm|warmSynthesis|onPhase|fullSnapshot/,
    );
  });

  it("records reviewable schema, canonical ownership, and bounded DTO fixtures [inv.runtime.single_production_owner]", function () {
    const schemaPath = path.join(FIXTURE_ROOT, "schema-baseline.json");
    const canonicalPath = path.join(FIXTURE_ROOT, "canonical-topic-tree.json");
    const dtoPath = path.join(FIXTURE_ROOT, "bounded-dto-baseline.json");
    for (const fixturePath of [schemaPath, canonicalPath, dtoPath]) {
      assert.isTrue(fs.existsSync(fixturePath), `${fixturePath} must exist`);
    }

    const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
    const canonical = JSON.parse(fs.readFileSync(canonicalPath, "utf8"));
    const dto = JSON.parse(fs.readFileSync(dtoPath, "utf8"));
    assert.equal(schema.database, "state/synthesis.db");
    assert.includeMembers(schema.tables, [
      "synt_operation",
      "synt_cache_basis",
      "synt_canonical_reference",
    ]);
    assert.equal(canonical.canonical_source, "topic_current_files");
    assert.equal(canonical.zotero_note_role, "mirror");
    assert.isAtMost(dto.reference_artifact_page.items.length, 50);
    assert.equal(dto.reference_artifact_page.page.limit, 50);
  });

  it("keeps active docs explicit about current process and Topic ownership", function () {
    const readme = fs.readFileSync(
      path.join(ROOT_DIR, "doc/synthesis-layer/README.md"),
      "utf8",
    );
    const storage = fs.readFileSync(
      path.join(
        ROOT_DIR,
        "doc/synthesis-layer/library-ssot-and-sidecar-cache.md",
      ),
      "utf8",
    );
    const runtime = fs.readFileSync(
      path.join(ROOT_DIR, "doc/synthesis-layer/runtime-and-rebuild.md"),
      "utf8",
    );

    assert.include(readme, "Topic canonical current files are the SSOT");
    assert.include(
      storage,
      "| Topic canonical current files and source manifests |",
    );
    assert.include(storage, "| Zotero Topic note shards |");
    assert.notInclude(
      storage,
      "No external process requirement just to keep a local index current.",
    );
    assert.include(runtime, "The current implementation runs inside");
    assert.include(
      runtime,
      "synthesis_sidecar_service_stage1_refactor_plan_20260715.md",
    );
  });

  it("registers the migration-safe single-owner invariant", function () {
    const contract = parseYaml(
      fs.readFileSync(
        path.join(ROOT_DIR, "doc/synthesis-layer/contracts/invariants.yaml"),
        "utf8",
      ),
    ) as {
      invariants: Array<{
        id: string;
        test_refs?: Array<{ file: string; marker: string }>;
      }>;
    };
    const invariant = contract.invariants.find(
      (entry) => entry.id === "inv.runtime.single_production_owner",
    );
    assert.exists(invariant);
    assert.deepInclude(invariant?.test_refs || [], {
      file: "test/core/168-synthesis-sidecar-boundary.test.ts",
      marker: "[inv.runtime.single_production_owner]",
      kind: "static_guard",
    });
  });
});
