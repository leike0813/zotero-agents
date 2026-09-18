import { assert } from "chai";
import { mkdtemp, mkdir, readFile, writeFile } from "fs/promises";
import os from "os";
import path from "path";
import {
  buildMockSkillRunnerEndpointEnvironment,
  buildForwardedTestArgs,
  buildTestEnvironment,
  parseSystemE2ERestartRequest,
  parseWrappedTestInvocation,
  normalizeTestDomain,
  resolveMockSkillRunnerPort,
  waitForSystemE2EAdmissionCheckpoint,
} from "../../scripts/run-zotero-test-with-mock";
import { buildSynthesisCloseTestEnvironment } from "../../scripts/run-zotero-e2e-stress";
import {
  buildShardEnv,
  extractMochaFailureOutput,
} from "../../scripts/run-node-test-shards";
import { setDiagnosticVerboseOverrideForTests } from "../../src/modules/diagnosticVerbosity";
import { createZToolkit } from "../../src/utils/ztoolkit";
import {
  patchGeneratedZoteroTestRunner,
  patchZoteroTestRunnerHtml,
} from "../../scripts/patch-zotero-test-runner";
import {
  resolveTestEntries,
  resolveZoteroTestDisplayMode,
  ZOTERO_TEST_FIRST_RUN_PREFS,
  ZOTERO_TEST_HEADLESS_ENV,
  stageZoteroE2EFixture,
} from "../../zotero-plugin.config";
import {
  canRetireFixtureRevision,
  materializeCommittedSeed,
  validateCommittedSeed,
  validateFixturePrivacy,
  validateFixtureRegistry,
} from "../../scripts/system-e2e/fixture";
import {
  classifyArtifactReference,
  createRunManifestEventCollector,
  createRunManifest,
  persistRunManifest,
  startSystemE2EEventSink,
} from "../../scripts/system-e2e/manifest";
import {
  PHASE1_FAMILY_DECLARATIONS,
  resolvePhase1FamilySelection,
  runFamilyLifecycle,
  validateFamilyDeclarations,
} from "../../scripts/system-e2e/familyLifecycle";
import { shouldRunPerTestSharedTeardown } from "../zotero/diagnosticBridge";

const SAMPLE_HTML = `<!DOCTYPE html>
<html>
<body>
<div id="mocha"></div>
<script>
async function send(data) {
  const req = await Zotero.HTTP.request(
    "POST",
    "http://localhost:4967/update",
    {
      body: JSON.stringify(data),
    }
  );

  if (req.status !== 200) {
    dump("Error sending data to server" + req.responseText);
    return null;
  } else {
    const result = JSON.parse(req.responseText);
    return result;
  }
}

window.debug = function (data) {
  send({ type: "debug", data });
};

function Reporter(runner) {
  function dump(str) {
    document.querySelector("#mocha").innerText += str;
  }

  runner.on("start", async function () {
    console.log("start")
    await send({ type: "start", data: { indents } });
  });

  runner.on("suite", async function (suite) {
    console.log("suite", suite)
    await send({ type: "suite", data: { title: suite.title, root: suite.root, indents } });
  });

  runner.on("suite end", async function (suite) {
    console.log("suite end", suite)
    await send({ type: "suite end", data: { title: suite.title, root: suite.root, indents } });
  });

  runner.on("pending", async function (test) {
    console.log("pending", test)
    await send({ type: "pending", data: { title: test.title, fulltest: test.fullTitle(), duration: test.duration, indents: indents + 1 } });
  });

  runner.on("pass", async function (test) {
    console.log("pass", test)
    await send({ type: "pass", data: { title: test.title, fulltest: test.fullTitle(), duration: test.duration, indents: indents + 1 } });
  });

  runner.on("fail", async function (test, error) {
    console.log("fail", test, error)
    await send({ type: "fail", data: { title: test.title, fulltest: test.fullTitle(), duration: test.duration, error, indents: indents + 1 } });
  });

  runner.on("end", async function () {
    console.log("end")
    await send({
      type: "end",
      data: { passed: passed, failed: failed, aborted: aborted, str, indents },
    });
  });
}
</script>
</body>
</html>`;

describe("zotero test infrastructure helpers", function () {
  describe("System E2E committed seed", function () {
    const registry = {
      schemaVersion: "system-e2e-fixture-registry.v1",
      fixtures: [
        {
          fixtureId: "foundation-v1",
          schemaVersion: "system-e2e-seed.v2",
          fixtureRevision: 2,
          references: ["local-e2e"],
        },
      ],
    };
    const seed = {
      schemaVersion: "system-e2e-seed.v2",
      fixtureId: "foundation-v1",
      fixtureRevision: 2,
      facts: { items: 1, attachments: 1 },
      structuralFacts: {
        referencePages: {
          itemCount: 101,
          pageSize: 100,
          titlePrefix: "Synthetic E2E Reference",
          year: "2026",
        },
        historicalTopic: {
          topicId: "synthetic-history",
          pathId: "topics/synthetic-history/current",
          provenance: "historical",
          readOnly: true,
        },
        artifactNeighbors: {
          valid: ["synthetic-topic-report", "synthetic-reference-index"],
          malformed: ["synthetic-malformed-neighbor"],
        },
        citationGraph: {
          nodes: ["synthetic-reference-a", "synthetic-reference-b"],
          edges: [["synthetic-reference-a", "synthetic-reference-b"]],
        },
        unicodeNote: {
          html: "<p>合成系统端到端注释 · Ω</p>",
        },
      },
      items: [
        {
          key: "SEED0001",
          itemType: "book",
          title: "Synthetic E2E Foundation Item",
          attachments: [
            {
              key: "SEEDATT1",
              path: "attachments/foundation.txt",
              contentType: "text/plain",
            },
          ],
        },
      ],
    };

    it("keeps fixture shape, lineage, and observable revision independent", function () {
      assert.deepEqual(validateFixtureRegistry(registry), registry);
      assert.deepEqual(validateCommittedSeed(seed, registry).identity, {
        schemaVersion: "system-e2e-seed.v2",
        fixtureId: "foundation-v1",
        fixtureRevision: 2,
      });
      assert.throws(
        () =>
          validateCommittedSeed(
            { ...seed, schemaVersion: "system-e2e-seed.v3" },
            registry,
          ),
        /fixture_registry_mismatch/,
      );
      assert.throws(
        () => validateCommittedSeed({ ...seed, fixtureRevision: 3 }, registry),
        /fixture_registry_mismatch/,
      );
    });

    it("does not retire a fixture revision while an active lane references it", function () {
      assert.isFalse(canRetireFixtureRevision(registry, "foundation-v1", 2));
      assert.isTrue(
        canRetireFixtureRevision(
          {
            ...registry,
            fixtures: [{ ...registry.fixtures[0], references: [] }],
          },
          "foundation-v1",
          2,
        ),
      );
    });

    it("requires every Phase 1 structural fact", function () {
      assert.deepEqual(validateCommittedSeed(seed, registry), {
        identity: {
          schemaVersion: "system-e2e-seed.v2",
          fixtureId: "foundation-v1",
          fixtureRevision: 2,
        },
        facts: seed.facts,
        structuralFacts: seed.structuralFacts,
      });

      for (const name of Object.keys(seed.structuralFacts)) {
        const structuralFacts = { ...seed.structuralFacts };
        delete structuralFacts[name as keyof typeof structuralFacts];
        assert.throws(
          () => validateCommittedSeed({ ...seed, structuralFacts }, registry),
          new RegExp(`fixture_structural_fact_invalid:${name}`),
        );
      }
    });

    it("materializes the same declared facts on repeated runs", async function () {
      const root = await mkdtemp(path.join(os.tmpdir(), "system-e2e-seed-"));
      const source = path.join(root, "source");
      const targetA = path.join(root, "a");
      const targetB = path.join(root, "b");
      await mkdir(path.join(source, "attachments"), { recursive: true });
      await writeFile(
        path.join(source, "seed.json"),
        JSON.stringify(seed),
        "utf8",
      );
      await writeFile(
        path.join(source, "attachments", "foundation.txt"),
        "Synthetic attachment for System E2E.\n",
        "utf8",
      );

      const first = await materializeCommittedSeed({
        sourceDir: source,
        targetDir: targetA,
        registry,
      });
      const second = await materializeCommittedSeed({
        sourceDir: source,
        targetDir: targetB,
        registry,
      });

      assert.deepEqual(first.facts, { items: 1, attachments: 1 });
      assert.deepEqual(second, first);
      assert.equal(
        await readFile(path.join(targetA, "seed.json"), "utf8"),
        await readFile(path.join(targetB, "seed.json"), "utf8"),
      );

      await writeFile(path.join(targetA, "stale-runtime-state"), "stale");
      await materializeCommittedSeed({
        sourceDir: source,
        targetDir: targetA,
        registry,
      });
      let staleStateExists = true;
      try {
        await readFile(path.join(targetA, "stale-runtime-state"), "utf8");
      } catch {
        staleStateExists = false;
      }
      assert.isFalse(staleStateExists);
    });

    it("materializes the committed seed by default and fails a selected gold lane without a source", async function () {
      const root = await mkdtemp(path.join(os.tmpdir(), "system-e2e-hook-"));
      const staged = await stageZoteroE2EFixture({
        domain: "e2e",
        env: {},
        testRoot: root,
      });
      assert.equal(staged?.kind, "committed-seed");
      assert.equal(staged?.fixture.fixtureId, "foundation-v1");
      assert.isString(
        await readFile(
          path.join(root, "data", "system-e2e", "seed.json"),
          "utf8",
        ),
      );

      let selectedGoldError: unknown;
      try {
        await stageZoteroE2EFixture({
          domain: "e2e",
          env: { ZOTERO_E2E_FIXTURE: "gold" },
          testRoot: root,
        });
      } catch (error) {
        selectedGoldError = error;
      }
      assert.match(String(selectedGoldError), /ZOTERO_E2E_GOLD_DATA_DIR/);
      let invalidGoldError: unknown;
      try {
        await stageZoteroE2EFixture({
          domain: "e2e",
          env: {
            ZOTERO_E2E_FIXTURE: "gold",
            ZOTERO_E2E_GOLD_DATA_DIR: path.join(root, "missing-gold"),
          },
          testRoot: root,
        });
      } catch (error) {
        invalidGoldError = error;
      }
      assert.match(String(invalidGoldError), /ENOENT|no such file/i);
      assert.isUndefined(
        await stageZoteroE2EFixture({
          domain: "core",
          env: { ZOTERO_E2E_FIXTURE: "gold" },
          testRoot: root,
        }),
      );
    });

    it("restores the same scaffold profile and data for a runner-owned restart", async function () {
      const root = await mkdtemp(path.join(os.tmpdir(), "system-e2e-resume-"));
      const resumeRoot = path.join(root, "resume");
      const testRoot = path.join(root, "test");
      await mkdir(path.join(resumeRoot, "data", "zotero-agents", "state"), {
        recursive: true,
      });
      await mkdir(path.join(resumeRoot, "profile"), { recursive: true });
      await writeFile(
        path.join(
          resumeRoot,
          "data",
          "zotero-agents",
          "state",
          "zotero-agents.db",
        ),
        "durable-state",
      );
      await writeFile(
        path.join(resumeRoot, "profile", "prefs.js"),
        "preserved-profile",
      );

      const staged = await stageZoteroE2EFixture({
        domain: "e2e",
        env: { ZOTERO_SYSTEM_E2E_RESUME_ROOT: resumeRoot },
        testRoot,
      });

      assert.equal(staged?.kind, "resume");
      assert.equal(
        await readFile(
          path.join(
            testRoot,
            "data",
            "zotero-agents",
            "state",
            "zotero-agents.db",
          ),
          "utf8",
        ),
        "durable-state",
      );
      assert.equal(
        await readFile(path.join(testRoot, "profile", "prefs.js"), "utf8"),
        "preserved-profile",
      );
    });

    it("arms an exact owner restart only after its post-admission checkpoint", async function () {
      assert.deepEqual(
        parseSystemE2ERestartRequest({
          type: "debug",
          data: {
            kind: "system-e2e-owner-restart-request",
            caseId: "HB-03",
            operationId: "system-e2e:hb:03",
            processId: 4242,
          },
        }),
        {
          caseId: "HB-03",
          operationId: "system-e2e:hb:03",
          processId: 4242,
        },
      );
      assert.isNull(
        parseSystemE2ERestartRequest({
          type: "debug",
          data: { kind: "unrelated", processId: 4242 },
        }),
      );

      const root = await mkdtemp(path.join(os.tmpdir(), "system-e2e-admit-"));
      const checkpointPath = path.join(
        root,
        "canonical-mutation-admission.held",
      );
      const admitted = waitForSystemE2EAdmissionCheckpoint({
        checkpointPath,
        operationId: "system-e2e:hb:03",
        timeoutMs: 1_000,
        pollIntervalMs: 1,
      });
      await writeFile(checkpointPath, "system-e2e:hb:03", "utf8");

      assert.equal(await admitted, "held");
    });

    it("rejects private database files and absolute paths", async function () {
      const root = await mkdtemp(path.join(os.tmpdir(), "system-e2e-private-"));
      await writeFile(path.join(root, "zotero.sqlite"), "private", "utf8");
      let fileError: unknown;
      try {
        await validateFixturePrivacy(root);
      } catch (error) {
        fileError = error;
      }
      assert.match(String(fileError), /fixture_privacy_forbidden_file/);
      assert.throws(
        () =>
          validateCommittedSeed(
            {
              ...seed,
              items: [{ ...seed.items[0], title: "/home/person/private.pdf" }],
            },
            registry,
          ),
        /fixture_privacy_absolute_path/,
      );
    });
  });

  describe("System E2E run manifest", function () {
    const identity = {
      runId: "run:fixture-1",
      triggerLane: "local",
      sourceCommit: "0123456789abcdef",
      pluginVersion: "1.0.0",
      zoteroVersion: "10",
      platform: "linux",
      architecture: "x64",
      sidecarBuildIdentity: "current-source:0123456789abcdef",
      fixture: {
        schemaVersion: "system-e2e-seed.v1",
        fixtureId: "foundation-v1",
        fixtureRevision: 1,
      },
      startedAt: "2026-09-17T00:00:00.000Z",
    };
    const evidence = {
      publicOutcome: "foundation_ready",
      typedEvidence: [
        {
          kind: "foundation",
          schemaVersion: "system-e2e-foundation.v1",
          terminalStatus: "ready",
        },
      ],
      lifecycle: [{ checkpoint: "baseline", outcome: "ready" }],
      cleanup: "passed" as const,
      health: "passed" as const,
      artifacts: [],
    };

    it("terminalizes only complete evidence as complete", function () {
      const manifest = createRunManifest(identity);
      manifest.recordFamily({ familyId: "SL", result: "passed", ...evidence });
      assert.equal(manifest.complete().terminalState, "complete");

      const missingEvidence = createRunManifest(identity);
      missingEvidence.recordFamily({
        familyId: "SL",
        result: "passed",
        ...evidence,
        typedEvidence: [],
      });
      assert.equal(missingEvidence.complete().families[0].result, "failed");
      assert.equal(
        missingEvidence.complete().families[0].failureCode,
        "required_evidence_missing",
      );
    });

    it("preserves completed evidence and lineage when aborted or incomplete", function () {
      const manifest = createRunManifest({
        ...identity,
        predecessorRunId: "run:fixture-0",
      });
      manifest.recordFamily({ familyId: "SL", result: "passed", ...evidence });
      const aborted = manifest.abort({
        failurePhase: "health-gate",
        abortCode: "suite_health_indeterminate",
      });
      assert.equal(aborted.terminalState, "aborted");
      assert.equal(aborted.predecessorRunId, "run:fixture-0");
      assert.equal(aborted.families[0].cleanup, "passed");
      assert.equal(aborted.failurePhase, "health-gate");

      assert.equal(
        createRunManifest(identity).incomplete().terminalState,
        "incomplete",
      );
    });

    it("withholds sensitive artifacts without retaining their source path", function () {
      assert.deepEqual(
        classifyArtifactReference({
          kind: "profile-database",
          producer: "zotero",
          mediaType: "application/x-sqlite3",
          sourcePath: "/home/person/Zotero/zotero.sqlite",
          classification: "private-format",
        }),
        { status: "withheld", reasonCode: "private_format" },
      );
      assert.deepEqual(
        classifyArtifactReference({
          kind: "leak-digest",
          producer: "zotero-test",
          mediaType: "application/json",
          sourcePath: "artifacts/test-diagnostics/leak.json",
          classification: "sanitized",
        }),
        {
          status: "referenced",
          kind: "leak-digest",
          producer: "zotero-test",
          mediaType: "application/json",
          relativePath: "artifacts/test-diagnostics/leak.json",
        },
      );
    });

    it("treats manifest persistence failure as invocation infrastructure failure", async function () {
      const manifest = createRunManifest(identity).incomplete();
      let writes = 0;
      await persistRunManifest("manifest.json", manifest, async () => {
        writes += 1;
      });
      assert.equal(writes, 1);
      let persistenceError: unknown;
      try {
        await persistRunManifest("manifest.json", manifest, async () => {
          throw new Error("disk full");
        });
      } catch (error) {
        persistenceError = error;
      }
      assert.match(String(persistenceError), /run_manifest_persist_failed/);
    });

    it("indexes structured reporter events without copying log text", function () {
      const collector = createRunManifestEventCollector(identity);
      collector.accept({
        type: "debug",
        data: {
          kind: "system-e2e-run-identity",
          zoteroVersion: "9.0.4",
        },
      });
      collector.accept({
        type: "debug",
        data: {
          kind: "system-e2e-family-result",
          family: { familyId: "SL", result: "passed", ...evidence },
          logText: "must not enter manifest",
        },
      });
      collector.accept({ type: "end", data: { failed: 0, aborted: 0 } });

      const manifest = collector.finalize(0);
      assert.equal(manifest.terminalState, "complete");
      assert.equal(manifest.zoteroVersion, "9.0.4");
      assert.equal(manifest.families[0].familyId, "SL");
      assert.notInclude(JSON.stringify(manifest), "must not enter manifest");
    });

    it("accepts reporter events through a loopback-only sink", async function () {
      const accepted: unknown[] = [];
      const sink = await startSystemE2EEventSink((event) => {
        accepted.push(event);
      });
      try {
        const response = await fetch(sink.url, {
          method: "POST",
          body: JSON.stringify({ type: "start", data: {} }),
        });
        assert.equal(response.status, 200);
        assert.deepEqual(accepted, [{ type: "start", data: {} }]);
        assert.match(sink.url, /^http:\/\/127\.0\.0\.1:\d+\/events$/);
      } finally {
        await sink.close();
      }
    });
  });

  describe("System E2E family lifecycle", function () {
    const family = PHASE1_FAMILY_DECLARATIONS.SL;

    it("declares all Phase 1 family-owned state and bounded carry-over", function () {
      assert.deepEqual(Object.keys(PHASE1_FAMILY_DECLARATIONS), [
        "SL",
        "RH",
        "PA",
        "PM",
        "CG",
        "HB",
      ]);
      assert.deepEqual(
        validateFamilyDeclarations(Object.values(PHASE1_FAMILY_DECLARATIONS)),
        Object.values(PHASE1_FAMILY_DECLARATIONS),
      );
      assert.deepEqual(PHASE1_FAMILY_DECLARATIONS.SL.carryOver, [
        "sidecar-ready-generation",
      ]);
      assert.deepEqual(PHASE1_FAMILY_DECLARATIONS.PM.carryOver, [
        "maintenance-operation",
      ]);
      assert.deepEqual(PHASE1_FAMILY_DECLARATIONS.HB.carryOver, [
        "canonical-mutation-operation",
      ]);
      assert.deepEqual(PHASE1_FAMILY_DECLARATIONS.RH.carryOver, []);
      assert.deepEqual(PHASE1_FAMILY_DECLARATIONS.PA.carryOver, []);
      assert.deepEqual(PHASE1_FAMILY_DECLARATIONS.CG.carryOver, []);
    });

    it("accepts carry-over only within its declaring family", function () {
      assert.deepEqual(validateFamilyDeclarations([family]), [family]);
      assert.throws(
        () =>
          validateFamilyDeclarations([
            family,
            {
              ...PHASE1_FAMILY_DECLARATIONS.PM,
              carryOver: ["sidecar-discovery"],
            },
          ]),
        /family_carry_over_not_owned/,
      );
    });

    it("selects complete Phase 1 families in catalog order", function () {
      assert.deepEqual(resolvePhase1FamilySelection(), [
        "SL",
        "RH",
        "PA",
        "PM",
        "CG",
        "HB",
      ]);
      assert.deepEqual(resolvePhase1FamilySelection("PM,SL,PM"), ["SL", "PM"]);
      assert.throws(
        () => resolvePhase1FamilySelection("SL,SL-01"),
        /family_selection_invalid/,
      );
    });

    it("runs cleanup and the health gate after an ordinary assertion failure", async function () {
      const events: string[] = [];
      const result = await runFamilyLifecycle({
        declaration: family,
        execute: async () => {
          events.push("execute");
          throw new Error("assertion failed");
        },
        cleanup: async () => {
          events.push("cleanup");
          return "passed";
        },
        healthGate: async () => {
          events.push("health");
          return {
            status: "passed",
            hostResponsive: true,
            pluginResponsive: true,
            sidecarReady: true,
            undeclaredOperations: 0,
            managedProcesses: 0,
            residualOwnedState: [],
          };
        },
      });
      assert.deepEqual(events, ["execute", "cleanup", "health"]);
      assert.equal(result.result, "failed");
      assert.isFalse(result.abort);
      assert.deepEqual(result.transitions, [
        "family-start",
        "family-cases",
        "family-cleanup",
        "health-gate",
        "family-end",
      ]);
    });

    it("fails closed when cleanup or health is indeterminate", async function () {
      const result = await runFamilyLifecycle({
        declaration: family,
        execute: async () => undefined,
        cleanup: async () => "indeterminate",
        healthGate: async () => ({
          status: "indeterminate",
          hostResponsive: true,
          pluginResponsive: true,
          sidecarReady: true,
          undeclaredOperations: 0,
          managedProcesses: 0,
          residualOwnedState: [],
        }),
      });
      assert.isTrue(result.abort);
      assert.equal(result.abortCode, "family_cleanup_indeterminate");
    });

    it("fails the Suite Health Gate on an undeclared leak", async function () {
      const result = await runFamilyLifecycle({
        declaration: family,
        execute: async () => undefined,
        cleanup: async () => "passed",
        healthGate: async () => ({
          status: "passed",
          hostResponsive: true,
          pluginResponsive: true,
          sidecarReady: true,
          undeclaredOperations: 1,
          managedProcesses: 0,
          residualOwnedState: [],
        }),
      });
      assert.isTrue(result.abort);
      assert.equal(result.abortCode, "suite_health_failed");
    });
  });

  it("allows a Zotero runtime stress test to load one test entry", function () {
    assert.deepEqual(
      resolveTestEntries(
        "ui",
        "full",
        "tests/zotero/ui/full/276-dashboard-synthesis-close.zotero.test.ts",
      ),
      ["tests/zotero/setup.test.ts", "tests/zotero/ui/full"],
    );
  });

  it("uses the existing close test for stress and the CG-02 catalog command", function () {
    const stress = buildSynthesisCloseTestEnvironment([], {});
    assert.equal(
      stress.ZOTERO_TEST_ENTRY,
      "tests/zotero/ui/full/276-dashboard-synthesis-close.zotero.test.ts",
    );
    assert.equal(stress.ZOTERO_SYNTHESIS_CLOSE_CYCLES, "100");
    assert.notProperty(stress, "ZOTERO_SYSTEM_E2E_CASE");

    const catalog = buildSynthesisCloseTestEnvironment(["--catalog"], {});
    assert.equal(catalog.ZOTERO_SYNTHESIS_CLOSE_CYCLES, "30");
    assert.equal(catalog.ZOTERO_SYSTEM_E2E_CASE, "CG-02");
    assert.equal(catalog.ZOTERO_E2E_TRIGGER_LANE, "cg-02-windows");
  });

  it("routes the full E2E domain without adding it to ordinary suites", function () {
    assert.equal(normalizeTestDomain("e2e"), "e2e");
    assert.deepEqual(resolveTestEntries("e2e", "full"), [
      "tests/zotero/setup.test.ts",
      "tests/zotero/e2e/full",
    ]);
    assert.notInclude(resolveTestEntries("all", "full") as string[], "e2e");
  });

  it("keeps the shared System E2E runtime alive until suite teardown", function () {
    assert.isFalse(shouldRunPerTestSharedTeardown("", "e2e"));
    assert.isFalse(
      shouldRunPerTestSharedTeardown(
        "tests/zotero/e2e/full/301-system-e2e-foundation.zotero.test.ts",
      ),
    );
    assert.isTrue(
      shouldRunPerTestSharedTeardown(
        "tests/zotero/core/example.zotero.test.ts",
      ),
    );
  });

  describe("Zotero display environment", function () {
    it("runs headless by default on every platform", function () {
      assert.isTrue(resolveZoteroTestDisplayMode("linux", {}).headless);
      assert.isTrue(resolveZoteroTestDisplayMode("win32", {}).headless);
      assert.isTrue(resolveZoteroTestDisplayMode("darwin", {}).headless);
    });

    it("lets the environment opt out of headless mode", function () {
      for (const value of ["0", "false", "no", "off"]) {
        const mode = resolveZoteroTestDisplayMode("win32", {
          [ZOTERO_TEST_HEADLESS_ENV]: value,
        });
        assert.isFalse(mode.headless, `expected ${value} to disable headless`);
        assert.isFalse(mode.needsXvfb);
      }
      assert.isTrue(
        resolveZoteroTestDisplayMode("win32", {
          [ZOTERO_TEST_HEADLESS_ENV]: "1",
        }).headless,
      );
    });

    it("only prepares Xvfb on a display-less Linux host", function () {
      assert.isTrue(resolveZoteroTestDisplayMode("linux", {}).needsXvfb);
      assert.isFalse(
        resolveZoteroTestDisplayMode("linux", { DISPLAY: ":0" }).needsXvfb,
      );
      assert.isFalse(
        resolveZoteroTestDisplayMode("linux", {
          WAYLAND_DISPLAY: "wayland-0",
        }).needsXvfb,
      );
      assert.isFalse(resolveZoteroTestDisplayMode("win32", {}).needsXvfb);
      assert.isFalse(resolveZoteroTestDisplayMode("darwin", {}).needsXvfb);
    });
  });

  describe("wrapper forwarded args", function () {
    it("injects --no-watch by default for zotero test targets", function () {
      assert.deepEqual(buildForwardedTestArgs("test:zotero:cli", []), [
        "--no-watch",
      ]);
    });

    it("does not inject --no-watch when --watch is explicitly requested", function () {
      assert.deepEqual(buildForwardedTestArgs("test:zotero:cli", ["--watch"]), [
        "--watch",
      ]);
    });

    it("does not duplicate explicit exit flags for zotero test targets", function () {
      assert.deepEqual(
        buildForwardedTestArgs("test:zotero:cli", ["--exit-on-finish"]),
        ["--exit-on-finish"],
      );
      assert.deepEqual(
        buildForwardedTestArgs("test:zotero:cli", ["--no-watch"]),
        ["--no-watch"],
      );
    });

    it("injects Mocha exit for node test targets so wrapper cleanup can run", function () {
      assert.deepEqual(buildForwardedTestArgs("test:node:raw", []), ["--exit"]);
      assert.deepEqual(buildForwardedTestArgs("test:node:raw:core", []), [
        "--exit",
      ]);
    });

    it("does not duplicate explicit Mocha exit flags for node test targets", function () {
      assert.deepEqual(buildForwardedTestArgs("test:node:raw", ["--exit"]), [
        "--exit",
      ]);
      assert.deepEqual(buildForwardedTestArgs("test:node:raw", ["--no-exit"]), [
        "--no-exit",
      ]);
    });

    it("does not inject node-only flags for arbitrary non-zotero targets", function () {
      assert.deepEqual(buildForwardedTestArgs("lint:check", []), []);
    });

    it("parses wrapper cli args without losing explicit test flags", function () {
      const invocation = parseWrappedTestInvocation(
        ["test:zotero:cli", "lite", "workflow", "--watch"],
        {},
      );
      assert.equal(invocation.targetScript, "test:zotero:cli");
      assert.equal(invocation.requestedMode, "lite");
      assert.equal(invocation.requestedDomain, "workflow");
      assert.deepEqual(invocation.targetTestArgs, ["--watch"]);
      assert.isFalse(invocation.verbose);
    });

    it("consumes wrapper verbose flags into the test environment", function () {
      const invocation = parseWrappedTestInvocation(
        ["test:node:raw:core", "lite", "core", "--verbose", "--grep", "demo"],
        {},
      );
      const env = buildTestEnvironment(invocation, {});

      assert.isTrue(invocation.verbose);
      assert.deepEqual(invocation.targetTestArgs, ["--grep", "demo"]);
      assert.equal(env.ZOTERO_TEST_VERBOSE, "1");
      assert.isFalse(
        buildForwardedTestArgs(
          invocation.targetScript,
          invocation.targetTestArgs,
        ).includes("--verbose"),
      );
    });

    it("provides a temp-scoped Zotero data dir without overriding runtime root", function () {
      const invocation = parseWrappedTestInvocation(
        ["test:node:raw:core", "lite", "core"],
        {},
      );
      const env = buildTestEnvironment(invocation, {});
      const dataDir = String(env.ZOTERO_TEST_DATA_DIR || "");

      assert.include(
        dataDir,
        path.join(os.tmpdir(), "zotero-agents-test-data-"),
      );
      assert.match(dataDir.replace(/\\/g, "/"), /\/Zotero_data$/);
      assert.equal(env.ZOTERO_SKILLS_RUNTIME_ROOT, undefined);
      assert.equal(env.ZOTERO_TEST_DATA_DIR_MANAGED, "1");
    });

    it("preserves caller-provided test data dir", function () {
      const invocation = parseWrappedTestInvocation(
        ["test:node:raw:core", "lite", "core"],
        {},
      );
      const provided = path.join(os.tmpdir(), "provided-zotero-data");
      const env = buildTestEnvironment(invocation, {
        ZOTERO_TEST_DATA_DIR: provided,
      });

      assert.equal(env.ZOTERO_TEST_DATA_DIR, provided);
      assert.equal(env.ZOTERO_TEST_DATA_DIR_MANAGED, undefined);
    });

    it("propagates headless mode into the spawned test environment", function () {
      const invocation = parseWrappedTestInvocation(
        ["test:node:raw:core", "lite", "core"],
        {},
      );
      const env = buildTestEnvironment(invocation, {});

      assert.equal(env.MOZ_HEADLESS, "1");
    });

    it("suppresses the Zotero first-run browser launch in test profiles", function () {
      assert.isFalse(
        ZOTERO_TEST_FIRST_RUN_PREFS["extensions.zotero.firstRun2"],
      );
      assert.isFalse(
        ZOTERO_TEST_FIRST_RUN_PREFS["extensions.zotero.firstRunGuidance"],
      );
      assert.isFalse(
        ZOTERO_TEST_FIRST_RUN_PREFS[
          "extensions.zotero.firstRunGuidanceShown.readAloud"
        ],
      );
    });

    it("strips headless mode from the spawned environment on opt out", function () {
      const invocation = parseWrappedTestInvocation(
        ["test:node:raw:core", "lite", "core"],
        {},
      );
      const env = buildTestEnvironment(invocation, {
        [ZOTERO_TEST_HEADLESS_ENV]: "0",
        MOZ_HEADLESS: "1",
      });

      assert.equal(env.MOZ_HEADLESS, undefined);
    });

    it("uses an OS-assigned mock SkillRunner port by default", function () {
      assert.equal(resolveMockSkillRunnerPort({}), "0");
    });

    it("allows callers to pin the mock SkillRunner port", function () {
      assert.equal(
        resolveMockSkillRunnerPort({ ZOTERO_MOCK_SKILLRUNNER_PORT: "18030" }),
        "18030",
      );
      assert.equal(
        resolveMockSkillRunnerPort({ ZOTERO_MOCK_SKILLRUNNER_PORT: "invalid" }),
        "0",
      );
    });

    it("injects the resolved mock SkillRunner endpoint into target tests", function () {
      const env = buildMockSkillRunnerEndpointEnvironment(
        { ZOTERO_TEST_MODE: "full" },
        "http://127.0.0.1:49152",
      );

      assert.equal(env.ZOTERO_TEST_MODE, "full");
      assert.equal(
        env.ZOTERO_TEST_SKILLRUNNER_ENDPOINT,
        "http://127.0.0.1:49152",
      );
    });

    it("projects only Mocha failure details while preserving all failures and ANSI", function () {
      const output = [
        "\u001b[32m  ✔ passing case\u001b[0m",
        "\u001b[31m  1) first failing case\u001b[0m",
        "\u001b[32m  ✔ another passing case\u001b[0m",
        "\u001b[31m  2) second failing case\u001b[0m",
        "",
        "\u001b[31m  2 failing\u001b[0m",
        "",
        "\u001b[0m  1) first failing case:",
        "     AssertionError: first failure",
        "      + expected - actual",
        "",
        "\u001b[0m  2) second failing case:",
        "     Error: second failure",
      ].join("\n");

      const projected = extractMochaFailureOutput(output);

      assert.include(projected, "2 failing");
      assert.include(projected, "first failing case:");
      assert.include(projected, "second failing case:");
      assert.include(projected, "AssertionError: first failure");
      assert.notInclude(projected, "passing case");
      assert.notInclude(projected, "another passing case");
      assert.include(projected, `${String.fromCharCode(27)}[`);
    });

    it("preserves child diagnostics when no Mocha failure epilogue exists", function () {
      const output = "Error: test child failed before Mocha started\n";

      assert.equal(extractMochaFailureOutput(output), output.trimEnd());
    });

    it("enables shard colors by default while preserving an explicit override", function () {
      const env = buildShardEnv("node-core", "/tmp/node-test-shards", {
        ZOTERO_TEST_MODE: "full",
      });
      const overridden = buildShardEnv("node-core", "/tmp/node-test-shards", {
        FORCE_COLOR: "0",
      });

      assert.equal(env.FORCE_COLOR, "1");
      assert.equal(
        env.ZOTERO_TEST_DATA_DIR,
        path.join("/tmp/node-test-shards", "node-core", "Zotero_data"),
      );
      assert.equal(overridden.FORCE_COLOR, "0");
    });
  });

  describe("mock Zotero data directory", function () {
    it("defaults DataDirectory to the temp-scoped test root", function () {
      const runtime = globalThis as {
        Zotero?: { DataDirectory?: { dir?: string } };
      };
      const dataDir = String(runtime.Zotero?.DataDirectory?.dir || "");

      assert.isNotEmpty(dataDir);
      assert.include(
        path.resolve(dataDir).toLowerCase(),
        path.resolve(os.tmpdir()).toLowerCase(),
      );
      assert.notEqual(
        path.basename(path.dirname(dataDir)).toLowerCase(),
        "zotero-agents",
      );
    });

    it("still allows tests to override DataDirectory and runtime root", function () {
      const runtime = globalThis as {
        Zotero?: { DataDirectory?: { dir?: string } };
      };
      const previousDataDirectory = runtime.Zotero?.DataDirectory;
      const previousRuntimeRoot = process.env.ZOTERO_SKILLS_RUNTIME_ROOT;
      const overrideDir = path.join(os.tmpdir(), "override-zotero-data");
      try {
        if (runtime.Zotero) {
          runtime.Zotero.DataDirectory = { dir: overrideDir };
        }
        process.env.ZOTERO_SKILLS_RUNTIME_ROOT = "D:\\ExplicitRuntime";

        assert.equal(runtime.Zotero?.DataDirectory?.dir, overrideDir);
        assert.equal(
          process.env.ZOTERO_SKILLS_RUNTIME_ROOT,
          "D:\\ExplicitRuntime",
        );
      } finally {
        if (runtime.Zotero) {
          runtime.Zotero.DataDirectory = previousDataDirectory;
        }
        if (typeof previousRuntimeRoot === "undefined") {
          delete process.env.ZOTERO_SKILLS_RUNTIME_ROOT;
        } else {
          process.env.ZOTERO_SKILLS_RUNTIME_ROOT = previousRuntimeRoot;
        }
      }
    });
  });

  describe("toolkit diagnostics", function () {
    it("suppresses third-party patch traces unless verbose diagnostics are enabled", function () {
      const originalGroup = console.group;
      const originalGroupCollapsed = console.groupCollapsed;
      const originalGroupEnd = console.groupEnd;
      const originalTrace = console.trace;
      const runtime = globalThis as {
        Zotero?: { Utilities?: { randomString?: () => string } };
      };
      const originalUtilities = runtime.Zotero?.Utilities;
      let groupCalls = 0;
      let traceCalls = 0;
      console.group = (() => {
        groupCalls += 1;
      }) as typeof console.group;
      console.groupCollapsed = (() => {
        groupCalls += 1;
      }) as typeof console.groupCollapsed;
      console.groupEnd = (() => undefined) as typeof console.groupEnd;
      console.trace = (() => {
        traceCalls += 1;
      }) as typeof console.trace;
      setDiagnosticVerboseOverrideForTests(false);
      if (runtime.Zotero) {
        runtime.Zotero.Utilities = {
          ...runtime.Zotero.Utilities,
          randomString: () => "mock-random-string",
        };
      }
      try {
        try {
          createZToolkit();
        } catch {
          // The node mock does not implement every window-manager API that the
          // full toolkit initializes; this test only covers constructor logging.
        }
      } finally {
        setDiagnosticVerboseOverrideForTests();
        if (runtime.Zotero) {
          runtime.Zotero.Utilities = originalUtilities;
        }
        console.group = originalGroup;
        console.groupCollapsed = originalGroupCollapsed;
        console.groupEnd = originalGroupEnd;
        console.trace = originalTrace;
      }

      assert.equal(groupCalls, 0);
      assert.equal(traceCalls, 0);
    });
  });

  describe("generated runner patch", function () {
    it("patches runner html with fail-detail diagnostics", function () {
      const patched = patchZoteroTestRunnerHtml(SAMPLE_HTML);
      assert.include(patched, "ZOTERO_SKILLS_DIAGNOSTIC_PATCH_V1");
      assert.include(patched, 'kind: "zotero-test-fail-detail"');
      assert.include(patched, 'kind: "zotero-test-console-error"');
      assert.include(patched, "window.onunhandledrejection");
      assert.include(patched, "__zsScheduleProgressEvent");
      assert.include(patched, "__zsAppendMochaOutput(str);");
      assert.notInclude(patched, "&&");
      assert.include(patched, "&amp;&amp;");
    });

    it("mirrors reporter events to the runner-owned manifest sink", function () {
      const patched = patchZoteroTestRunnerHtml(SAMPLE_HTML, {
        systemE2EEventUrl: "http://127.0.0.1:43210/events",
      });
      assert.include(patched, "http://127.0.0.1:43210/events");
      assert.include(
        patched,
        "extensions.zotero-agents.test.systemE2EEventUrl",
      );
      assert.include(patched, "Services.prefs.setStringPref");
      assert.include(patched, "__zsMirrorSystemE2EEvent(data)");
      assert.notInclude(patched, "runtimeLogTail:");
    });

    it("removes heavyweight console object logging and innerText rewrites", function () {
      const patched = patchZoteroTestRunnerHtml(SAMPLE_HTML);
      assert.notInclude(patched, 'console.log("suite", suite)');
      assert.notInclude(patched, 'console.log("pass", test)');
      assert.notInclude(patched, 'console.log("fail", test, error)');
      assert.notInclude(patched, "innerText +=");
      assert.include(patched, "appendData");
      assert.include(
        patched,
        '<div id="mocha" style="white-space: pre-wrap; overflow-wrap: anywhere;"></div>',
      );
    });

    it("keeps fail and end events blocking while lightening progress events", function () {
      const patched = patchZoteroTestRunnerHtml(SAMPLE_HTML);
      assert.include(
        patched,
        '__zsScheduleProgressEvent({ type: "pass", data: { title: test.title, fulltest: test.fullTitle(), duration: test.duration, indents: indents + 1 } });',
      );
      assert.include(patched, 'await sendBlocking({ type: "fail", data: {');
      assert.include(patched, 'await sendBlocking({\n      type: "end",');
    });

    it("is idempotent when patching the same html twice", function () {
      const once = patchZoteroTestRunnerHtml(SAMPLE_HTML);
      const twice = patchZoteroTestRunnerHtml(once);
      assert.equal(twice, once);
    });

    it("fails fast when patch anchors are missing", function () {
      assert.throws(
        () => patchZoteroTestRunnerHtml("<html><body></body></html>"),
        /anchor not found/,
      );
    });

    it("patches generated index.xhtml in place", async function () {
      const root = await mkdtemp(
        path.join(os.tmpdir(), "zotero-test-runner-patch-"),
      );
      const runnerPath = path.join(
        root,
        ".scaffold",
        "test",
        "resource",
        "content",
        "index.xhtml",
      );
      await mkdir(path.dirname(runnerPath), { recursive: true });
      await writeFile(runnerPath, SAMPLE_HTML, "utf8");

      const patchedPath = await patchGeneratedZoteroTestRunner(root);
      const patched = await readFile(patchedPath, "utf8");

      assert.equal(patchedPath, runnerPath);
      assert.include(patched, "ZOTERO_SKILLS_DIAGNOSTIC_PATCH_V1");
    });
  });
});
