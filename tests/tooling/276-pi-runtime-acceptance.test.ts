import { assert } from "chai";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createWorkflowArchiveApi } from "../../src/workflows/archive";
import {
  buildPiAcceptanceReport,
  requiredPiEvidence,
  renderPiAcceptanceMarkdown,
  compatibilityPiEvidence,
  performancePiEvidence,
  collectPiCandidate,
  type PiAcceptanceCandidate,
  type PiAcceptanceEvidence,
} from "../../scripts/check-pi-runtime-acceptance";
import {
  createCompatibilityReceipt,
  loadCompatibilityManifest,
} from "../../scripts/zotero-compatibility-fixture";

const candidate: PiAcceptanceCandidate = {
  sourceCommit: "a".repeat(40),
  dirty: false,
  xpiSha256: "b".repeat(64),
  version: "0.10.0",
  capacity: 12,
};
const loadManifest = () =>
  loadCompatibilityManifest("tests/zotero/compatibility-matrix.json");

describe("Pi runtime acceptance", () => {
  it("reads the packed candidate and rejects control or debug build provenance", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "pi-candidate-"));
    const xpi = path.join(root, "candidate.xpi");
    const identity = {
      schema: "zotero-agents.pi-runtime-build.v1",
      enabled: true,
      capacity: 12,
      measurementOnly: false,
      debug: false,
      buildTime: "2026-10-01T00:00:00Z",
      source: {
        commit: execFileSync("git", ["rev-parse", "HEAD"], {
          encoding: "utf8",
        }).trim(),
        clean: false,
      },
    };
    const write = (stamp: typeof identity) =>
      createWorkflowArchiveApi().writeZipAtomic({
        targetPath: xpi,
        entries: [
          {
            name: "manifest.json",
            content: {
              kind: "text",
              text: JSON.stringify({ version: "0.10.0" }),
            },
          },
          {
            name: "content/pi-runtime-build.json",
            content: { kind: "text", text: JSON.stringify(stamp) },
          },
        ],
      });
    try {
      await write(identity);
      const read = await collectPiCandidate(xpi);
      assert.equal(read.version, "0.10.0");
      assert.isTrue(read.dirty);
      assert.match(read.xpiSha256, /^[a-f\d]{64}$/);
      for (const changed of [
        { enabled: false, measurementOnly: true },
        { debug: true },
        { capacity: 4 },
        { source: { ...identity.source, commit: "c".repeat(40) } },
      ]) {
        await write({ ...identity, ...changed });
        let rejected = false;
        try {
          await collectPiCandidate(xpi);
        } catch {
          rejected = true;
        }
        assert.isTrue(
          rejected,
          "a mismatching packed candidate must be rejected",
        );
      }
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("requires all full behavior domains rather than certifying a core-only run", async () => {
    const target = (await loadManifest()).targets.find(
      (x) => x.policy.mainBehavior,
    )!;
    const receipt = createCompatibilityReceipt({
      runId: "controlled",
      source: { commit: candidate.sourceCommit, dirty: false },
      plugin: {
        version: candidate.version,
        artifactSha256: candidate.xpiSha256,
        artifactPath: "candidate.xpi",
        manifestMin: "7.0",
        manifestMax: "10.*",
      },
      host: {
        id: target.id,
        requestedVersion: target.version,
        platform: target.platform,
        archiveSha256: "c".repeat(64),
        downloadUrl: "https://example.invalid/host",
      },
      execution: { mode: "behavior", suite: "full", domain: "core" },
    });
    receipt.status = "passed";
    receipt.host.observedVersion = target.version;
    receipt.cleanup.complete = true;
    receipt.phases = [{ phase: "test-core", status: "passed", durationMs: 1 }];
    const full = () =>
      compatibilityPiEvidence(receipt, candidate, "receipts/full.json").find(
        (x) => x.id.endsWith(":full"),
      );
    assert.notEqual(full()?.status, "passed");
    receipt.execution.domain = "all";
    assert.equal(full()?.status, "failed");
    receipt.phases.push(
      ...["test-ui", "test-workflow"].map((phase) => ({
        phase,
        status: "passed" as const,
        durationMs: 1,
      })),
    );
    assert.equal(full()?.status, "passed");
  });

  it("maps probe platforms to the mandatory matrix evidence IDs", () => {
    for (const [platform, id] of [
      ["linux", "linux-x64"],
      ["windows", "windows-x64"],
    ] as const) {
      const record = {
        kind: "performance",
        probe: "pi-runtime-capacity",
        stage: "final",
        target: { platform, zoteroMajor: 10 },
        candidate: {
          commit: candidate.sourceCommit,
          xpiSha256: candidate.xpiSha256,
        },
        capacity: { total: 12, background: 10 },
        workload: { forcedGc: false, mixedForeground: 8, mixedBackground: 40 },
        phases: [
          { phase: "warmup", durationMs: 60000 },
          { phase: "idle", durationMs: 60000 },
          { phase: "mixed", durationMs: 900000 },
          { phase: "settle", durationMs: 120000 },
        ],
        measurements: {
          lag: { sampleCount: 120, p95Ms: 20, maxMs: 50 },
          rss: {
            supported: true,
            baselineBytes: 100000000,
            peakBytes: 120000000,
            settledBytes: 110000000,
            peakDeltaBytes: 20000000,
            settledDeltaBytes: 10000000,
          },
          load: { dispatched: 120, completed: 120, unexplainedFailures: 0 },
          admission: {
            sampleCount: 30,
            foregroundMaxMs: 250,
            overCapacityAdmissions: 0,
          },
          completeness: {
            expected: 120,
            observed: 120,
            missing: 0,
            starved: false,
          },
        },
        violations: [],
        passed: true,
      };
      for (const input of [record, { piCapacity: record }]) {
        const evidence = performancePiEvidence(
          input,
          candidate,
          "receipts/perf.json",
        );
        assert.equal(evidence.id, `performance:${id}`);
        assert.equal(evidence.candidate.xpiSha256, record.candidate.xpiSha256);
        assert.equal(evidence.performance?.eventLoopP95Ms, 20);
      }
    }
  });

  it("blocks missing mandatory evidence and keeps nonblocking cells visible", async () => {
    const report = buildPiAcceptanceReport(candidate, await loadManifest(), []);
    assert.isFalse(report.accepted);
    assert.isTrue(
      report.items.some((x) => x.blocking && x.status === "missing"),
    );
    assert.isTrue(report.items.some((x) => !x.blocking));
    assert.include(renderPiAcceptanceMarkdown(report), "missing");
  });

  it("preserves failed and mismatching reruns without certifying another candidate", async () => {
    const manifest = await loadManifest();
    const id = requiredPiEvidence(manifest)[0].id;
    const evidence: PiAcceptanceEvidence[] = [
      {
        id,
        candidate,
        status: "failed",
        recordedAt: "2026-10-01T00:00:00Z",
        environment: "controlled",
        artifact: "receipts/failed.json",
      },
      {
        id,
        candidate,
        status: "passed",
        recordedAt: "2026-10-01T00:01:00Z",
        environment: "controlled",
        artifact: "receipts/pass.json",
      },
      {
        id,
        candidate: { ...candidate, xpiSha256: "c".repeat(64) },
        status: "passed",
        recordedAt: "2026-10-01T00:02:00Z",
        environment: "controlled",
        artifact: "receipts/stale.json",
      },
    ];
    const item = buildPiAcceptanceReport(candidate, manifest, evidence)
      .items[0];
    assert.equal(item.status, "passed");
    assert.lengthOf(item.attempts, 3);
    assert.equal(item.attempts[2].valid, false);
    const dirty = buildPiAcceptanceReport(
      { ...candidate, dirty: true },
      manifest,
      evidence,
    );
    assert.isFalse(dirty.accepted);
  });

  it("projects only safe candidate identity fields from report inputs", async () => {
    const input = {
      ...candidate,
      secret: "private-token",
      version: "/home/private/profile",
    };
    const report = buildPiAcceptanceReport(input, await loadManifest(), [
      {
        id: "local:node-full",
        candidate: input,
        status: "passed",
        recordedAt: "2026-10-01T00:00:00Z",
        environment: "controlled",
        artifact: "receipts/node.json",
      },
    ]);
    const serialized = JSON.stringify(report);
    assert.notInclude(serialized, "private-token");
    assert.notInclude(serialized, "/home/private/profile");
    assert.isFalse(report.accepted);
  });

  it("enforces bundle budgets and requires matching approval only above them", async () => {
    const manifest = await loadManifest();
    for (const [metric, bytes, expected] of [
      ["rawBytes", 16_331_020, "passed"],
      ["rawBytes", 20 * 1024 ** 2, "passed"],
      ["rawBytes", 20 * 1024 ** 2 + 1, "failed"],
      ["gzipBytes", 1.5 * 1024 ** 2, "passed"],
      ["gzipBytes", 1.5 * 1024 ** 2 + 1, "failed"],
      ["xpiDeltaBytes", 2 * 1024 ** 2, "passed"],
      ["xpiDeltaBytes", 2 * 1024 ** 2 + 1, "failed"],
    ] as const) {
      const evidence: PiAcceptanceEvidence = {
        id: "bundle",
        candidate,
        status: "passed",
        recordedAt: "2026-10-01T00:00:00Z",
        environment: "same-source-control",
        artifact: "receipts/bundle.json",
        bundle: {
          rawBytes: 1,
          gzipBytes: 1,
          xpiDeltaBytes: 1,
          sameInputs: true,
          browserGuardPassed: true,
          excludedFully: true,
          [metric]: bytes,
        },
      };
      const item = () =>
        buildPiAcceptanceReport(candidate, manifest, [evidence]).items.find(
          (x) => x.id === "bundle",
        )!;
      assert.equal(item().status, expected, `${metric}: ${bytes}`);
      if (expected === "passed") continue;
      evidence.approval = {
        confirmer: "maintainer",
        candidateSha256: candidate.xpiSha256,
        recordedAt: "2026-10-01T00:01:00Z",
        artifact: "receipts/approval.json",
      };
      assert.equal(item().status, "passed");
      evidence.approval.candidateSha256 = "c".repeat(64);
      assert.equal(item().status, "failed");
    }
  });

  it("omits untrusted upgrade and approval identity text", async () => {
    const privateText = "/home/private/token-value";
    const report = buildPiAcceptanceReport(candidate, await loadManifest(), [
      {
        id: "compatibility:zotero-10-linux-x64:xpi-upgrade",
        candidate,
        status: "passed",
        recordedAt: "2026-10-01T00:00:00Z",
        environment: "controlled",
        artifact: "receipts/upgrade.json",
        upgrade: {
          baselineCommit: privateText,
          baselineVersion: privateText,
          baselineXpiSha256: privateText,
          seededWithInstalledBaseline: true,
          legacyPreserved: true,
        },
        approval: {
          confirmer: "maintainer",
          artifact: "receipts/approval.json",
          candidateSha256: privateText,
          recordedAt: privateText,
        },
      },
    ]);
    assert.notInclude(JSON.stringify(report), privateText);
    assert.equal(
      report.items.find((entry) =>
        entry.id.endsWith("zotero-10-linux-x64:xpi-upgrade"),
      )?.status,
      "failed",
    );
  });

  it("does not treat not-applicable, missing measurements or absent confirmer as passed", async () => {
    const manifest = await loadManifest();
    const ids = ["manual:api-key", "performance:linux-x64", "local:node-full"];
    const evidence = ids.map((id) => ({
      id,
      candidate,
      status: "passed" as const,
      recordedAt: "2026-10-01T00:00:00Z",
      environment: "controlled",
      artifact: "receipts/example.json",
    }));
    evidence[2].status = "not_applicable" as "passed";
    const report = buildPiAcceptanceReport(candidate, manifest, evidence);
    for (const id of ids)
      assert.notEqual(report.items.find((x) => x.id === id)!.status, "passed");
  });

  it("requires live smoke observations from the fixed Zotero 10 environment", async () => {
    const manifest = await loadManifest();
    const evidence: PiAcceptanceEvidence = {
      id: "manual:api-key",
      candidate,
      status: "passed",
      recordedAt: "2026-10-01T00:00:00Z",
      environment: "controlled",
      artifact: "receipts/api-key.json",
      confirmer: "maintainer",
      manual: {
        zoteroMajor: 9,
        observed: ["streaming"],
        sourceEvidence: ["receipts/stream.json"],
      },
    };
    const status = () =>
      buildPiAcceptanceReport(candidate, manifest, [evidence]).items.find(
        (x) => x.id === evidence.id,
      )!.status;
    assert.equal(status(), "failed");
    evidence.manual!.zoteroMajor = 10;
    assert.equal(status(), "passed");
    const roundTrip = JSON.parse(
      JSON.stringify(buildPiAcceptanceReport(candidate, manifest, [evidence])),
    );
    assert.equal(
      buildPiAcceptanceReport(
        candidate,
        manifest,
        roundTrip.items.flatMap(
          (x: { attempts: PiAcceptanceEvidence[] }) => x.attempts,
        ),
      ).items.find((x) => x.id === evidence.id)!.status,
      "passed",
    );
  });

  it("requires one exploration result for every platform and capacity", async () => {
    const manifest = await loadManifest();
    const selected = { ...candidate, capacity: 4 };
    const evidence: PiAcceptanceEvidence = {
      id: "capacity-selection",
      candidate: selected,
      status: "passed",
      recordedAt: "2026-10-01T00:00:00Z",
      environment: "controlled",
      artifact: "receipts/capacity.json",
      capacitySelection: {
        selected: 4,
        committedDefault: 4,
        exploration: [4, 6, 8, 12].flatMap((capacity) =>
          (["linux-x64", "windows-x64"] as const).map((platform) => ({
            platform,
            capacity,
            passed: capacity === 4,
            artifact: `receipts/${platform}-${capacity}.json`,
          })),
        ),
      },
    };
    const status = () =>
      buildPiAcceptanceReport(selected, manifest, [evidence]).items.find(
        (x) => x.id === evidence.id,
      )!.status;
    assert.equal(status(), "passed");
    evidence.capacitySelection!.exploration[7] =
      evidence.capacitySelection!.exploration[5];
    assert.equal(status(), "failed");
  });

  it("round trips structured measurements and rejects unproved capacity selection", async () => {
    const manifest = await loadManifest();
    const evidence: PiAcceptanceEvidence[] = [
      {
        id: "performance:linux-x64",
        candidate,
        status: "passed",
        recordedAt: "2026-10-01T00:00:00Z",
        environment: "zotero-10-linux-x64 10.0.1",
        artifact: "receipts/perf.json",
        performance: {
          finalCandidate: true,
          warmupMs: 60000,
          idleMs: 60000,
          loadMs: 900000,
          settleMs: 120000,
          forcedGc: false,
          eventLoopP95Ms: 20,
          maxStallMs: 50,
          foregroundAdmissionMs: 10,
          baselineRssBytes: 100000000,
          peakRssBytes: 120000000,
          settledRssBytes: 110000000,
          eventLoss: 0,
          starvation: 0,
          overCapacity: 0,
          unexplainedFailures: 0,
        },
      },
      {
        id: "capacity-selection",
        candidate,
        status: "passed",
        recordedAt: "2026-10-01T00:00:00Z",
        environment: "controlled",
        artifact: "receipts/selection.json",
      },
    ];
    const first = buildPiAcceptanceReport(candidate, manifest, evidence);
    const roundTrip = buildPiAcceptanceReport(
      candidate,
      manifest,
      JSON.parse(JSON.stringify(first)).items.flatMap(
        (x: { attempts: PiAcceptanceEvidence[] }) => x.attempts,
      ),
    );
    assert.equal(
      roundTrip.items.find((x) => x.id === evidence[0].id)!.status,
      "passed",
    );
    assert.equal(
      roundTrip.items.find((x) => x.id === evidence[1].id)!.status,
      "failed",
    );
    delete (
      evidence[0].performance as Partial<
        NonNullable<PiAcceptanceEvidence["performance"]>
      >
    ).eventLoopP95Ms;
    assert.equal(
      buildPiAcceptanceReport(candidate, manifest, evidence).items.find(
        (x) => x.id === evidence[0].id,
      )!.status,
      "failed",
    );
  });
});
