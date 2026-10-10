import { assert } from "chai";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  SynthesisClientError,
  hashSynthesisContractCanonicalJson,
} from "../../packages/synthesis-contracts/src";
import {
  startSynthesisProductionRouteHarness,
  waitForSynthesisProductionRouteReceipt,
  type SynthesisProductionRouteHarness,
} from "../helpers/synthesisProductionRouteHarness";

const REGULATED = "TAGREG1";
const REGULATED_PEER = "TAGREG2";
const COMPLIANT = "TAGOK01";

type CoverageRow = {
  libraryId: number;
  key: string;
  revision: string;
  tagDigest: string;
};

type HostState = { revision: string; tagDigest: string };

const sha256Hex = (text: string) =>
  createHash("sha256").update(text, "utf8").digest("hex");
const hostTagDigest = (tags: string[]) => sha256Hex(JSON.stringify(tags));
const hostCoverageDigest = (rows: CoverageRow[]) =>
  sha256Hex(
    [...rows]
      .sort(
        (left, right) =>
          left.libraryId - right.libraryId ||
          (left.key < right.key ? -1 : left.key > right.key ? 1 : 0),
      )
      .map(
        (row) =>
          JSON.stringify([
            { libraryId: row.libraryId, key: row.key },
            row.revision,
            row.tagDigest,
          ]) + "\n",
      )
      .join(""),
  );

function auditStateHostFixture(states: Map<string, HostState>) {
  return {
    handle({ capability, payload }: { capability: string; payload: any }) {
      if (capability !== "library.items.get_audit_state") {
        return { status: "unavailable", diagnostics: [] };
      }
      const targets = (payload.targets || []) as Array<{
        libraryId: number;
        itemKey: string;
      }>;
      return {
        states: targets.map((target) => {
          const state = states.get(target.itemKey);
          return state
            ? { target, revision: state.revision, tagDigest: state.tagDigest }
            : { target, revision: "missing", tagDigest: "" };
        }),
      };
    },
  };
}

async function startTagHarness(args: {
  id: string;
  root: string;
  states: Map<string, HostState>;
}) {
  return startSynthesisProductionRouteHarness({
    id: args.id,
    root: args.root,
    hostFixture: auditStateHostFixture(args.states),
  });
}

async function seedVocabulary(harness: SynthesisProductionRouteHarness) {
  await harness.client.tags.initializeBuiltinTagPolicy();
  const initial = await harness.client.tags.loadTagVocabulary();
  const saved = await harness.client.tags.saveTagVocabulary({
    entries: [
      ...((initial.entries as unknown[]) || []),
      { tag: "topic:agents", facet: "topic", source: "manual" },
    ],
    aliases: initial.aliases,
    abbrev: initial.abbrev,
    protocol: initial.protocol,
  });
  const vocabularyHash = saved.vocabularyHash;
  assert.isString(vocabularyHash);
  assert.isNotEmpty(vocabularyHash);
  return vocabularyHash as string;
}

const auditIdentity = {
  hostInstanceId: "tag-audit-host",
  principal: {
    packageId: "zotero-agents",
    workflowId: "tag-auditor",
    contentDigest: "sha256:" + "7".repeat(64),
  },
};

async function beginAuditRun(
  harness: SynthesisProductionRouteHarness,
  vocabularyHash: string,
) {
  const begun = await harness.client.tags.beginTagAuditRun({
    libraryId: 1,
    vocabularyHash,
    executionIdentity: auditIdentity,
  });
  assert.equal(begun.outcome, "ready");
  assert.isNotEmpty(begun.run.auditRunId);
  assert.isNotEmpty(begun.run.leaseToken);
  return begun.run;
}

function stagingEntry(args: {
  key: string;
  revision: string;
  tags: string[];
  nonCompliantTags?: string[];
}) {
  return {
    target: { libraryId: 1, itemKey: args.key },
    auditedRevision: args.revision,
    auditedTagDigest: hostTagDigest(args.tags),
    auditedTags: args.tags,
    evaluation: args.nonCompliantTags?.length
      ? ({
          state: "needs_regulation",
          nonCompliantTags: args.nonCompliantTags,
        } as const)
      : ({ state: "compliant" } as const),
  };
}

const REGULATED_ENTRY = stagingEntry({
  key: REGULATED,
  revision: "revision-1",
  tags: ["topic:agents", "topic:legacy"],
  nonCompliantTags: ["topic:legacy"],
});
const REGULATED_PEER_ENTRY = stagingEntry({
  key: REGULATED_PEER,
  revision: "revision-1",
  tags: ["topic:agents", "topic:legacy"],
  nonCompliantTags: ["topic:legacy"],
});
const COMPLIANT_ENTRY = stagingEntry({
  key: COMPLIANT,
  revision: "revision-1",
  tags: ["topic:agents"],
});
const FULL_ENTRIES = [REGULATED_ENTRY, REGULATED_PEER_ENTRY, COMPLIANT_ENTRY];
const fullCoverageDigest = hostCoverageDigest(
  FULL_ENTRIES.map((entry) => ({
    libraryId: entry.target.libraryId,
    key: entry.target.itemKey,
    revision: entry.auditedRevision,
    tagDigest: entry.auditedTagDigest,
  })),
);

const seededHostStates = () =>
  new Map<string, HostState>([
    [
      REGULATED,
      {
        revision: "revision-1",
        tagDigest: hostTagDigest(REGULATED_ENTRY.auditedTags),
      },
    ],
    [
      REGULATED_PEER,
      {
        revision: "revision-1",
        tagDigest: hostTagDigest(REGULATED_PEER_ENTRY.auditedTags),
      },
    ],
    [
      COMPLIANT,
      {
        revision: "revision-1",
        tagDigest: hostTagDigest(COMPLIANT_ENTRY.auditedTags),
      },
    ],
  ]);

async function clientError(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    if (error instanceof SynthesisClientError) {
      return {
        code: error.code,
        sidecarReason: error.details?.sidecarReason,
      };
    }
    throw error;
  }
  throw new Error("expected a SynthesisClientError");
}

type AuditRow = {
  libraryId: number;
  itemKey: string;
  needsTagRegulation: number;
};

type TagIndexState = {
  vocabularyHash: string;
  indexHash: string;
  indexBasisHash: string;
  indexStale: number;
  indexTags: string[];
};

// The legacy durable Tag audit ledger has no public read operation, so the
// readback is taken from the SQLite the real sidecar process wrote.
function readTagAuditRows(root: string): AuditRow[] {
  const database = new DatabaseSync(path.join(root, "state", "synthesis.db"));
  try {
    return (
      database
        .prepare(
          "SELECT library_id,item_key,needs_tag_regulation FROM synt_tag_audit ORDER BY library_id,item_key",
        )
        .all() as Array<{
        library_id: number;
        item_key: string;
        needs_tag_regulation: number;
      }>
    ).map((row) => ({
      libraryId: row.library_id,
      itemKey: row.item_key,
      needsTagRegulation: row.needs_tag_regulation,
    }));
  } finally {
    database.close();
  }
}

// The rebuilt Tag index has no public read operation, so its content is read
// from the state row the real sidecar process wrote, like the durable audit
// ledger above.
function readTagIndexState(root: string): TagIndexState {
  const database = new DatabaseSync(path.join(root, "state", "synthesis.db"));
  try {
    const row = database
      .prepare(
        "SELECT vocabulary_hash,index_hash,index_basis_hash,index_json,index_stale FROM synt_tag_application_state WHERE singleton_id=1",
      )
      .get() as {
      vocabulary_hash: string;
      index_hash: string;
      index_basis_hash: string;
      index_json: string;
      index_stale: number;
    };
    return {
      vocabularyHash: row.vocabulary_hash,
      indexHash: row.index_hash,
      indexBasisHash: row.index_basis_hash,
      indexStale: row.index_stale,
      indexTags: JSON.parse(row.index_json || "{}").tags ?? [],
    };
  } finally {
    database.close();
  }
}

describe("Synthesis Tag audit behavior", function () {
  this.timeout(120000);

  it("publishes a complete traversal and republishes it on replay and reopen", async function () {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "zs-tag-audit-chain-"));
    const states = seededHostStates();
    let harness = await startTagHarness({ id: "audit-chain", root, states });
    let run: { auditRunId: string; leaseToken: string };
    let snapshotRevision = "";
    let acknowledgedSnapshotRevision = "";
    try {
      const vocabularyHash = await seedVocabulary(harness);
      run = await beginAuditRun(harness, vocabularyHash);

      const batchDigest = hashSynthesisContractCanonicalJson(FULL_ENTRIES);
      assert.deepEqual(
        await harness.client.tags.appendTagAuditRun({
          run,
          sequence: 0,
          batchDigest,
          entries: FULL_ENTRIES,
        }),
        { outcome: "appended", stagedItems: 3 },
      );
      assert.deepEqual(
        await harness.client.tags.appendTagAuditRun({
          run,
          sequence: 0,
          batchDigest,
          entries: FULL_ENTRIES,
        }),
        { outcome: "already_appended", stagedItems: 3 },
      );

      const published = await harness.client.tags.promoteTagAuditRun({
        run,
        visitedItems: FULL_ENTRIES.length,
        coverageDigest: fullCoverageDigest,
        evidenceId: "evidence-complete-traversal",
      });
      assert.equal(published.outcome, "published");
      if (published.outcome !== "published") throw new Error("unreachable");
      snapshotRevision = published.snapshot.snapshotRevision;
      assert.equal(
        published.snapshot.schema,
        "zotero-agents.tag-audit-snapshot.v1",
      );
      assert.equal(published.snapshot.libraryId, 1);
      assert.equal(published.snapshot.auditedItems, 3);
      assert.equal(published.snapshot.needsRegulation, 2);
      assert.equal(published.snapshot.vocabularyHash, vocabularyHash);
      assert.equal(published.snapshot.coverageDigest, fullCoverageDigest);
      assert.isNotEmpty(published.snapshot.basisDigest);
      assert.isTrue(
        harness.recorder.hostCalls.some(
          (call) => call.capability === "library.items.get_audit_state",
        ),
        "promotion must read current Host audit state",
      );

      const replayed = await harness.client.tags.promoteTagAuditRun({
        run,
        visitedItems: FULL_ENTRIES.length,
        coverageDigest: published.snapshot.coverageDigest,
        evidenceId: "evidence-complete-traversal",
      });
      assert.equal(replayed.outcome, "published");
      if (replayed.outcome !== "published") throw new Error("unreachable");
      assert.equal(replayed.snapshot.snapshotRevision, snapshotRevision);
      assert.equal(replayed.snapshot.auditedItems, 3);

      assert.deepEqual(
        await harness.client.tags.prepareTagRegulationAcknowledgement({
          target: { libraryId: 1, itemKey: "MISSING1" },
          receiptId: "receipt-missing",
        }),
        { outcome: "not_found" },
      );
      const verifiedCommit = {
        schema: "zotero-agents.tag-regulation-verified-commit.v1" as const,
        target: { libraryId: 1, itemKey: REGULATED },
        receiptId: "receipt-1",
        expectedSnapshotRevision: snapshotRevision,
        auditedRevision: "revision-1",
        currentRevision: "revision-2",
        finalTags: ["topic:agents"],
        finalTagDigest: hostTagDigest(["topic:agents"]),
        vocabularyHash,
      };
      const refusals = [
        {
          label: "Host tag digest mismatch",
          request: {
            ...verifiedCommit,
            finalTagDigest: hostTagDigest(["topic:legacy"]),
          },
          expected: { outcome: "stale", reason: "final_tags_changed" },
        },
        {
          label: "still non-compliant final tag",
          request: {
            ...verifiedCommit,
            finalTags: ["topic:legacy"],
            finalTagDigest: hostTagDigest(["topic:legacy"]),
          },
          expected: { outcome: "stale", reason: "still_noncompliant" },
        },
        {
          label: "superseded snapshot",
          request: {
            ...verifiedCommit,
            expectedSnapshotRevision: "superseded-snapshot",
          },
          expected: { outcome: "stale", reason: "audit_snapshot_changed" },
        },
        {
          label: "audited revision mismatch",
          request: { ...verifiedCommit, auditedRevision: "revision-0" },
          expected: {
            outcome: "conflict",
            reason: "audited_revision_mismatch",
          },
        },
      ];
      for (const refusal of refusals) {
        assert.deepEqual(
          await harness.client.tags.commitTagRegulationAcknowledgement(
            refusal.request,
          ),
          refusal.expected,
          refusal.label,
        );
        const unchanged = await harness.client.tags.promoteTagAuditRun({
          run,
          visitedItems: FULL_ENTRIES.length,
          coverageDigest: fullCoverageDigest,
          evidenceId: "evidence-complete-traversal",
        });
        assert.equal(unchanged.outcome, "published");
        if (unchanged.outcome !== "published") throw new Error("unreachable");
        assert.equal(
          unchanged.snapshot.snapshotRevision,
          snapshotRevision,
          refusal.label + " must not replace the active snapshot",
        );
      }

      const prepared =
        await harness.client.tags.prepareTagRegulationAcknowledgement({
          target: { libraryId: 1, itemKey: REGULATED },
          receiptId: "receipt-1",
        });
      assert.equal(prepared.outcome, "ready");
      if (prepared.outcome !== "ready") throw new Error("unreachable");
      assert.deepEqual(prepared.target, { libraryId: 1, itemKey: REGULATED });
      assert.equal(prepared.snapshotRevision, snapshotRevision);
      assert.equal(prepared.auditedRevision, "revision-1");
      assert.equal(prepared.vocabularyHash, vocabularyHash);
      assert.deepEqual(prepared.nonCompliantTags, ["topic:legacy"]);

      const acknowledged =
        await harness.client.tags.commitTagRegulationAcknowledgement(
          verifiedCommit,
        );
      assert.equal(acknowledged.outcome, "acknowledged");
      if (acknowledged.outcome !== "acknowledged")
        throw new Error("unreachable");
      const acknowledgedSnapshot = acknowledged.snapshotRevision;
      acknowledgedSnapshotRevision = acknowledgedSnapshot;
      assert.notEqual(acknowledgedSnapshot, snapshotRevision);
      // Only needs_regulation rows enter the active snapshot: the compliant
      // item never becomes auditable backlog.
      assert.equal(acknowledged.remainingNeedsRegulation, 1);
      assert.deepEqual(
        await harness.client.tags.commitTagRegulationAcknowledgement(
          verifiedCommit,
        ),
        {
          outcome: "already_acknowledged",
          snapshotRevision: acknowledgedSnapshot,
        },
      );
      assert.deepEqual(
        await harness.client.tags.prepareTagRegulationAcknowledgement({
          target: { libraryId: 1, itemKey: REGULATED },
          receiptId: "receipt-1",
        }),
        {
          outcome: "already_acknowledged",
          snapshotRevision: acknowledgedSnapshot,
        },
      );
      const survivor =
        await harness.client.tags.prepareTagRegulationAcknowledgement({
          target: { libraryId: 1, itemKey: REGULATED_PEER },
          receiptId: "receipt-2",
        });
      assert.equal(survivor.outcome, "ready");
      if (survivor.outcome !== "ready") throw new Error("unreachable");
      assert.equal(survivor.snapshotRevision, acknowledgedSnapshot);
      assert.deepEqual(survivor.nonCompliantTags, ["topic:legacy"]);
      assert.deepEqual(
        await harness.client.tags.prepareTagRegulationAcknowledgement({
          target: { libraryId: 1, itemKey: COMPLIANT },
          receiptId: "receipt-compliant",
        }),
        { outcome: "not_found" },
      );
    } finally {
      await harness.stop();
    }

    harness = await startTagHarness({ id: "audit-chain-reopen", root, states });
    try {
      const reopened = await harness.client.tags.promoteTagAuditRun({
        run,
        visitedItems: FULL_ENTRIES.length,
        coverageDigest: fullCoverageDigest,
        evidenceId: "evidence-complete-traversal",
      });
      assert.equal(reopened.outcome, "published");
      if (reopened.outcome !== "published") throw new Error("unreachable");
      // The traversal replay resolves to the snapshot the acknowledgement CAS
      // installed before the restart.
      assert.equal(
        reopened.snapshot.snapshotRevision,
        acknowledgedSnapshotRevision,
      );
      assert.equal(reopened.snapshot.auditedItems, 3);
      assert.equal(reopened.snapshot.needsRegulation, 1);
      const reopenedAck =
        await harness.client.tags.prepareTagRegulationAcknowledgement({
          target: { libraryId: 1, itemKey: REGULATED },
          receiptId: "receipt-1",
        });
      assert.deepEqual(reopenedAck, {
        outcome: "already_acknowledged",
        snapshotRevision: acknowledgedSnapshotRevision,
      });
    } finally {
      await harness.stop();
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("refuses a drifted traversal without replacing the published snapshot", async function () {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "zs-tag-audit-drift-"));
    const states = seededHostStates();
    const harness = await startTagHarness({ id: "audit-drift", root, states });
    try {
      const vocabularyHash = await seedVocabulary(harness);
      const run = await beginAuditRun(harness, vocabularyHash);
      await harness.client.tags.appendTagAuditRun({
        run,
        sequence: 0,
        batchDigest: hashSynthesisContractCanonicalJson(FULL_ENTRIES),
        entries: FULL_ENTRIES,
      });
      const published = await harness.client.tags.promoteTagAuditRun({
        run,
        visitedItems: FULL_ENTRIES.length,
        coverageDigest: fullCoverageDigest,
        evidenceId: "evidence-first-run",
      });
      assert.equal(published.outcome, "published");
      if (published.outcome !== "published") throw new Error("unreachable");
      const firstSnapshot = published.snapshot.snapshotRevision;

      // The Host item changes after the traversal read it.
      states.set(COMPLIANT, {
        revision: "revision-9",
        tagDigest: hostTagDigest(COMPLIANT_ENTRY.auditedTags),
      });
      const driftedRun = await beginAuditRun(harness, vocabularyHash);
      await harness.client.tags.appendTagAuditRun({
        run: driftedRun,
        sequence: 0,
        batchDigest: hashSynthesisContractCanonicalJson([COMPLIANT_ENTRY]),
        entries: [COMPLIANT_ENTRY],
      });
      const conflicted = await harness.client.tags.promoteTagAuditRun({
        run: driftedRun,
        visitedItems: 1,
        coverageDigest: hostCoverageDigest([
          {
            libraryId: 1,
            key: COMPLIANT,
            revision: COMPLIANT_ENTRY.auditedRevision,
            tagDigest: COMPLIANT_ENTRY.auditedTagDigest,
          },
        ]),
        evidenceId: "evidence-drifted-run",
      });
      assert.equal(conflicted.outcome, "conflicted");
      if (conflicted.outcome !== "conflicted") throw new Error("unreachable");
      assert.equal(conflicted.auditedItems, 1);
      assert.equal(conflicted.conflictCount, 1);
      assert.isTrue(conflicted.retryable);
      assert.deepEqual(conflicted.conflicts, [
        {
          target: { libraryId: 1, itemKey: COMPLIANT },
          auditedRevision: "revision-1",
          currentRevision: "revision-9",
        },
      ]);

      // The refused run published nothing: the first snapshot still owns the
      // active row, so a commit against it reaches the audited-revision guard.
      assert.deepEqual(
        await harness.client.tags.commitTagRegulationAcknowledgement({
          schema: "zotero-agents.tag-regulation-verified-commit.v1",
          target: { libraryId: 1, itemKey: REGULATED },
          receiptId: "receipt-drift-probe",
          expectedSnapshotRevision: firstSnapshot,
          auditedRevision: "revision-0",
          currentRevision: "revision-2",
          finalTags: ["topic:agents"],
          finalTagDigest: hostTagDigest(["topic:agents"]),
          vocabularyHash,
        }),
        { outcome: "conflict", reason: "audited_revision_mismatch" },
      );
      const stillPublished = await harness.client.tags.promoteTagAuditRun({
        run,
        visitedItems: FULL_ENTRIES.length,
        coverageDigest: fullCoverageDigest,
        evidenceId: "evidence-first-run",
      });
      assert.equal(stillPublished.outcome, "published");
      if (stillPublished.outcome !== "published")
        throw new Error("unreachable");
      assert.equal(stillPublished.snapshot.snapshotRevision, firstSnapshot);
    } finally {
      await harness.stop();
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("aborts an open run, fences it, and lets a new run publish", async function () {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "zs-tag-audit-abort-"));
    const harness = await startTagHarness({
      id: "audit-abort",
      root,
      states: seededHostStates(),
    });
    try {
      const vocabularyHash = await seedVocabulary(harness);
      const run = await beginAuditRun(harness, vocabularyHash);
      await harness.client.tags.appendTagAuditRun({
        run,
        sequence: 0,
        batchDigest: hashSynthesisContractCanonicalJson(FULL_ENTRIES),
        entries: FULL_ENTRIES,
      });

      assert.deepEqual(
        await harness.client.tags.abortTagAuditRun({
          run,
          reason: "canceled",
        }),
        { outcome: "aborted" },
      );
      assert.deepEqual(
        await harness.client.tags.abortTagAuditRun({
          run,
          reason: "canceled",
        }),
        { outcome: "already_terminal" },
      );

      let fenced: unknown;
      try {
        await harness.client.tags.promoteTagAuditRun({
          run,
          visitedItems: FULL_ENTRIES.length,
          coverageDigest: fullCoverageDigest,
          evidenceId: "evidence-aborted-run",
        });
      } catch (error) {
        fenced = error;
      }
      assert.instanceOf(fenced, SynthesisClientError);
      assert.equal(fenced.code, "unavailable");
      assert.equal(fenced.details?.sidecarReason, "tag_audit_run_fenced");

      const next = await beginAuditRun(harness, vocabularyHash);
      assert.notEqual(next.auditRunId, run.auditRunId);
      await harness.client.tags.appendTagAuditRun({
        run: next,
        sequence: 0,
        batchDigest: hashSynthesisContractCanonicalJson([COMPLIANT_ENTRY]),
        entries: [COMPLIANT_ENTRY],
      });
      const published = await harness.client.tags.promoteTagAuditRun({
        run: next,
        visitedItems: 1,
        coverageDigest: hostCoverageDigest([
          {
            libraryId: 1,
            key: COMPLIANT,
            revision: COMPLIANT_ENTRY.auditedRevision,
            tagDigest: COMPLIANT_ENTRY.auditedTagDigest,
          },
        ]),
        evidenceId: "evidence-second-run",
      });
      assert.equal(published.outcome, "published");
      if (published.outcome !== "published") throw new Error("unreachable");
      assert.equal(published.snapshot.auditedItems, 1);
      assert.equal(published.snapshot.needsRegulation, 0);
    } finally {
      await harness.stop();
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("applies an import against the vocabulary basis present at apply time", async function () {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "zs-tag-import-basis-"));
    const harness = await startTagHarness({
      id: "tag-import-basis",
      root,
      states: seededHostStates(),
    });
    try {
      await seedVocabulary(harness);
      const payload = JSON.stringify({
        entries: [{ tag: "method:imported", facet: "method" }],
        aliases: {},
        abbrev: {},
      });
      const preview = await harness.client.tags.previewTagVocabularyImport({
        payload,
      });
      assert.deepEqual(
        (preview.additions as Array<{ tag: string }>).map((entry) => entry.tag),
        ["method:imported"],
      );

      const current = await harness.client.tags.loadTagVocabulary();
      await harness.client.tags.saveTagVocabulary({
        entries: [
          ...((current.entries as unknown[]) || []),
          { tag: "method:imported", facet: "method" },
        ],
        aliases: current.aliases,
        abbrev: current.abbrev,
        protocol: current.protocol,
      });

      const applied = await harness.client.tags.applyTagVocabularyImport({
        payload,
        action: "merge-non-conflicting",
      });
      assert.equal(applied.status, "unchanged");
      const loaded = await harness.client.tags.loadTagVocabulary();
      assert.deepEqual(
        (loaded.entries as Array<{ tag: string }>)
          .filter((entry) => entry.tag === "method:imported")
          .map((entry) => entry.tag),
        ["method:imported"],
      );
    } finally {
      await harness.stop();
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("refuses invalid coverage and batch digests before publishing a traversal", async function () {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "zs-tag-audit-guards-"));
    const harness = await startTagHarness({
      id: "audit-guards",
      root,
      states: seededHostStates(),
    });
    try {
      const vocabularyHash = await seedVocabulary(harness);
      const run = await beginAuditRun(harness, vocabularyHash);

      // A batch digest that does not match the entries is refused outright.
      assert.deepEqual(
        await clientError(
          harness.client.tags.appendTagAuditRun({
            run,
            sequence: 0,
            batchDigest: "sha256:" + "0".repeat(64),
            entries: FULL_ENTRIES,
          }),
        ),
        {
          code: "unavailable",
          sidecarReason: "tag_audit_batch_digest_mismatch",
        },
      );

      // An entry whose auditedTagDigest does not cover its auditedTags is refused.
      const badDigestEntry = {
        ...COMPLIANT_ENTRY,
        auditedTagDigest: hostTagDigest(["topic:not-a-real-tag"]),
      };
      assert.deepEqual(
        await clientError(
          harness.client.tags.appendTagAuditRun({
            run,
            sequence: 0,
            batchDigest: hashSynthesisContractCanonicalJson([badDigestEntry]),
            entries: [badDigestEntry],
          }),
        ),
        {
          code: "unavailable",
          sidecarReason: "tag_audit_tag_digest_mismatch",
        },
      );

      // Nothing was staged by the refused batches.
      const appended = await harness.client.tags.appendTagAuditRun({
        run,
        sequence: 0,
        batchDigest: hashSynthesisContractCanonicalJson(FULL_ENTRIES),
        entries: FULL_ENTRIES,
      });
      assert.deepEqual(appended, { outcome: "appended", stagedItems: 3 });

      // Promotion cannot declare a coverage it cannot prove from the staged batch.
      assert.deepEqual(
        await clientError(
          harness.client.tags.promoteTagAuditRun({
            run,
            visitedItems: FULL_ENTRIES.length + 1,
            coverageDigest: fullCoverageDigest,
            evidenceId: "evidence-wrong-count",
          }),
        ),
        {
          code: "unavailable",
          sidecarReason: "tag_audit_coverage_conflict",
        },
      );
      assert.deepEqual(
        await clientError(
          harness.client.tags.promoteTagAuditRun({
            run,
            visitedItems: FULL_ENTRIES.length,
            coverageDigest: hostCoverageDigest([]),
            evidenceId: "evidence-wrong-digest",
          }),
        ),
        {
          code: "unavailable",
          sidecarReason: "tag_audit_coverage_conflict",
        },
      );

      // Only the matching coverage publishes.
      const published = await harness.client.tags.promoteTagAuditRun({
        run,
        visitedItems: FULL_ENTRIES.length,
        coverageDigest: fullCoverageDigest,
        evidenceId: "evidence-guarded-run",
      });
      assert.equal(published.outcome, "published");
      if (published.outcome !== "published") throw new Error("unreachable");
      assert.equal(published.snapshot.auditedItems, 3);
      assert.equal(published.snapshot.needsRegulation, 2);
    } finally {
      await harness.stop();
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("scopes durable Tag audit records per library and clears only the target row", async function () {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "zs-tag-audit-scope-"));
    let harness = await startTagHarness({
      id: "audit-scope",
      root,
      states: seededHostStates(),
    });
    try {
      assert.deepEqual(
        await harness.client.tags.replaceTagAuditRecords({
          libraryId: 1,
          entries: [
            {
              itemKey: "SCOPE001",
              compliant: false,
              nonCompliantTags: ["topic:legacy"],
            },
            {
              itemKey: "SCOPE002",
              compliant: false,
              nonCompliantTags: ["topic:legacy"],
            },
          ],
        }),
        { libraryId: 1, audited: 2 },
      );
      // The same item key in a different library is an independent row.
      assert.deepEqual(
        await harness.client.tags.replaceTagAuditRecords({
          libraryId: 2,
          entries: [
            {
              itemKey: "SCOPE001",
              compliant: false,
              nonCompliantTags: ["method:other"],
            },
          ],
        }),
        { libraryId: 2, audited: 1 },
      );
      assert.deepEqual(readTagAuditRows(root), [
        { libraryId: 1, itemKey: "SCOPE001", needsTagRegulation: 1 },
        { libraryId: 1, itemKey: "SCOPE002", needsTagRegulation: 1 },
        { libraryId: 2, itemKey: "SCOPE001", needsTagRegulation: 1 },
      ]);

      // Clearing one item only resolves that item in its own library.
      assert.deepEqual(
        await harness.client.tags.clearTagAuditRecord({
          libraryId: 1,
          itemKey: "SCOPE001",
        }),
        { ok: true },
      );
      assert.deepEqual(readTagAuditRows(root), [
        { libraryId: 1, itemKey: "SCOPE001", needsTagRegulation: 0 },
        { libraryId: 1, itemKey: "SCOPE002", needsTagRegulation: 1 },
        { libraryId: 2, itemKey: "SCOPE001", needsTagRegulation: 1 },
      ]);
      // Clearing again is a stable no-op, and a missing item does not error.
      assert.deepEqual(
        await harness.client.tags.clearTagAuditRecord({
          libraryId: 1,
          itemKey: "SCOPE001",
        }),
        { ok: true },
      );
      assert.deepEqual(
        await harness.client.tags.clearTagAuditRecord({
          libraryId: 1,
          itemKey: "MISSINGX",
        }),
        { ok: true },
      );

      // Replacing one library's records leaves the other library intact.
      assert.deepEqual(
        await harness.client.tags.replaceTagAuditRecords({
          libraryId: 2,
          entries: [],
        }),
        { libraryId: 2, audited: 0 },
      );
      assert.deepEqual(readTagAuditRows(root), [
        { libraryId: 1, itemKey: "MISSINGX", needsTagRegulation: 0 },
        { libraryId: 1, itemKey: "SCOPE001", needsTagRegulation: 0 },
        { libraryId: 1, itemKey: "SCOPE002", needsTagRegulation: 1 },
      ]);
    } finally {
      await harness.stop();
    }

    harness = await startTagHarness({
      id: "audit-scope-reopen",
      root,
      states: seededHostStates(),
    });
    try {
      // The scoped clear survives reopen.
      assert.deepEqual(readTagAuditRows(root), [
        { libraryId: 1, itemKey: "MISSINGX", needsTagRegulation: 0 },
        { libraryId: 1, itemKey: "SCOPE001", needsTagRegulation: 0 },
        { libraryId: 1, itemKey: "SCOPE002", needsTagRegulation: 1 },
      ]);
    } finally {
      await harness.stop();
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("keeps a conflicting Tag import unmerged and writes no Host effect", async function () {
    const root = fs.mkdtempSync(
      path.join(os.tmpdir(), "zs-tag-import-conflict-"),
    );
    const harness = await startTagHarness({
      id: "tag-import-conflict",
      root,
      states: seededHostStates(),
    });
    try {
      await seedVocabulary(harness);
      const payload = JSON.stringify({
        entries: [
          // Same tag, different facet than the local entry: a real conflict.
          { tag: "topic:agents", facet: "method", source: "regulator" },
          { tag: "method:fresh-import", facet: "method", source: "regulator" },
        ],
        aliases: {},
        abbrev: {},
      });
      const preview = await harness.client.tags.previewTagVocabularyImport({
        payload,
      });
      assert.deepEqual(
        (preview.conflicts as Array<{ tag: string }>).map((entry) => entry.tag),
        ["topic:agents"],
      );
      const conflict = (
        preview.conflicts as Array<{
          local: { facet: string };
          imported: { facet: string };
        }>
      )[0];
      assert.equal(conflict.local.facet, "topic");
      assert.equal(conflict.imported.facet, "method");
      assert.deepEqual(
        (preview.additions as Array<{ tag: string }>).map((entry) => entry.tag),
        ["method:fresh-import"],
      );
      assert.isNotEmpty(preview.previewDigest);

      const applied = await harness.client.tags.applyTagVocabularyImport({
        payload,
        action: "merge-non-conflicting",
      });
      assert.equal(applied.status, "committed");

      const loaded = await harness.client.tags.loadTagVocabulary();
      const byTag = new Map(
        (loaded.entries as Array<{ tag: string; facet: string }>).map(
          (entry) => [entry.tag, entry.facet],
        ),
      );
      // The conflicting tag keeps the local facet; it is not silently replaced.
      assert.equal(byTag.get("topic:agents"), "topic");
      // The non-conflicting addition is merged.
      assert.equal(byTag.get("method:fresh-import"), "method");

      // A vocabulary import never mutates Host item tags.
      assert.isFalse(
        harness.recorder.hostCalls.some((call) =>
          call.capability.startsWith("effects."),
        ),
      );
    } finally {
      await harness.stop();
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("reports Tag policy initialization state and exports the loadable vocabulary", async function () {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "zs-tag-init-flag-"));
    let harness = await startTagHarness({
      id: "tag-init-flag",
      root,
      states: seededHostStates(),
    });
    try {
      // Before initialization the policy is not initialized.
      assert.isFalse(await harness.client.tags.isBuiltinTagPolicyInitialized());
      await harness.client.tags.initializeBuiltinTagPolicy();
      assert.isTrue(await harness.client.tags.isBuiltinTagPolicyInitialized());

      const current = await harness.client.tags.loadTagVocabulary();
      await harness.client.tags.saveTagVocabulary({
        entries: [
          ...((current.entries as unknown[]) || []),
          { tag: "topic:user-entry", facet: "topic", source: "manual" },
        ],
        aliases: current.aliases,
        abbrev: current.abbrev,
        protocol: current.protocol,
      });
      // Re-initializing must not wipe the user's own entries.
      await harness.client.tags.initializeBuiltinTagPolicy();
      const afterReinit = await harness.client.tags.loadTagVocabulary();
      assert.include(
        (afterReinit.entries as Array<{ tag: string }>).map(
          (entry) => entry.tag,
        ),
        "topic:user-entry",
      );

      // The regulator export corresponds to the same vocabulary hash as load.
      const exported =
        await harness.client.tags.exportTagVocabularyForRegulator();
      assert.equal(exported.vocabularyHash, afterReinit.manifest.manifest_hash);
      assert.include(exported.allowedTags, "topic:user-entry");
      assert.include(exported.allowedTags, "status:need-analysis");
    } finally {
      await harness.stop();
    }

    harness = await startTagHarness({
      id: "tag-init-flag-reopen",
      root,
      states: seededHostStates(),
    });
    try {
      // Initialization state is durable across reopen.
      assert.isTrue(await harness.client.tags.isBuiltinTagPolicyInitialized());
      assert.include(
        (
          (await harness.client.tags.loadTagVocabulary()).entries as Array<{
            tag: string;
          }>
        ).map((entry) => entry.tag),
        "topic:user-entry",
      );
    } finally {
      await harness.stop();
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("refuses invalid vocabulary saves and rebuilds the index on the committed basis", async function () {
    const root = fs.mkdtempSync(
      path.join(os.tmpdir(), "zs-tag-vocabulary-save-"),
    );
    const harness = await startTagHarness({
      id: "tag-vocabulary-save",
      root,
      states: seededHostStates(),
    });
    try {
      await seedVocabulary(harness);
      const before = await harness.client.tags.loadTagVocabulary();

      // A protocol without facets is refused before it can reach the sidecar.
      assert.deepEqual(
        await clientError(
          Promise.resolve().then(() =>
            harness.client.tags.saveTagVocabulary({
              entries: before.entries,
              aliases: before.aliases,
              abbrev: before.abbrev,
              protocol: { ...before.protocol, facets: [] },
            }),
          ),
        ),
        { code: "invalid_request", sidecarReason: undefined },
      );

      // Two entries that differ only by case are a conflicting save.
      assert.equal(
        (
          await harness.client.tags.saveTagVocabulary({
            entries: [
              ...before.entries,
              { tag: "method:case-clash", facet: "method" },
              { tag: "METHOD:case-clash", facet: "method" },
            ],
            aliases: before.aliases,
            abbrev: before.abbrev,
            protocol: before.protocol,
          })
        ).status,
        "invalid_request",
      );
      assert.deepEqual(
        await harness.client.tags.loadTagVocabulary(),
        before,
        "a refused save must leave the stored vocabulary untouched",
      );

      // A committed save replaces the whole vocabulary, so its rule
      // violations are observable in the stored snapshot.
      const saved = await harness.client.tags.saveTagVocabulary({
        entries: [
          ...before.entries,
          { tag: "method:facet-clash", facet: "topic" },
          {
            tag: "method:retired",
            facet: "method",
            deprecated: true,
            replacement: "method:absent",
          },
        ],
        aliases: { ...before.aliases, "dangling-alias": "method:absent" },
        abbrev: before.abbrev,
        protocol: before.protocol,
      });
      assert.equal(saved.status, "committed");
      const afterSave = await harness.client.tags.loadTagVocabulary();
      // The public validation result reports the engine rules that this
      // vocabulary violates; the contract does not order them, and 188 locks
      // the rule codes.
      const expectedRuleWarnings = [
        ["facet_mismatch", "method:facet-clash", "error"],
        ["missing_replacement", "method:retired", "warning"],
        ["alias_target_missing", "dangling-alias", "error"],
      ];
      assert.sameDeepMembers(
        (await harness.client.tags.validateTagVocabulary()).map((warning) => [
          warning.code,
          warning.tag,
          warning.severity,
        ]),
        expectedRuleWarnings,
      );
      assert.sameDeepMembers(
        afterSave.validation_warnings.map((warning) => [
          warning.code,
          warning.tag,
          warning.severity,
        ]),
        expectedRuleWarnings,
      );
      // Validation is read-only: the stored vocabulary is byte-identical.
      assert.deepEqual(
        await harness.client.tags.loadTagVocabulary(),
        afterSave,
      );
      // The committed vocabulary invalidated the previous index.
      assert.equal(readTagIndexState(root).indexStale, 1);

      const accepted = await harness.client.tags.rebuildTagVocabularyIndex();
      assert.equal(accepted.status, "pending");
      const receipt = await waitForSynthesisProductionRouteReceipt({
        operationId: accepted.operation_id,
        getOperation: (operationId) =>
          harness.client.maintenance.getOperation({
            operation_id: operationId,
          }),
      });
      assert.equal(receipt.status, "completed");
      assert.equal(
        (receipt.receipt as { status?: string }).status,
        "committed",
      );

      const index = readTagIndexState(root);
      assert.equal(index.indexStale, 0);
      assert.equal(index.indexBasisHash, index.vocabularyHash);
      assert.isNotEmpty(index.indexHash);
      // The rebuilt index carries the current vocabulary, minus deprecated tags.
      assert.include(index.indexTags, "topic:agents");
      assert.notInclude(index.indexTags, "method:retired");
      const afterRebuild = await harness.client.tags.loadTagVocabulary();
      assert.equal(
        afterRebuild.manifest.manifest_hash,
        afterSave.manifest.manifest_hash,
        "an index rebuild must not rewrite the vocabulary",
      );
      assert.deepEqual(afterRebuild.entries, afterSave.entries);
    } finally {
      await harness.stop();
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("edits staged suggestions as an upsert and a case-variant merge", async function () {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "zs-tag-staged-edit-"));
    const harness = await startTagHarness({
      id: "tag-staged-edit",
      root,
      states: seededHostStates(),
    });
    try {
      await seedVocabulary(harness);
      const staged = await harness.client.tags.stageTagSuggestions({
        entries: [
          { tag: "method:alpha", facet: "method", note: "alpha-note" },
          { tag: "method:beta", facet: "method" },
        ],
      });
      assert.deepEqual(
        staged.staged.map((entry) => entry.tag),
        ["method:alpha", "method:beta"],
      );
      const vocabularyBeforeEdits =
        await harness.client.tags.loadTagVocabulary();

      // An unknown original tag adds the requested row and keeps the peers.
      await harness.client.tags.updateStagedTagSuggestion({
        originalTag: "method:not-staged",
        tag: "method:gamma",
        facet: "method",
        note: "added",
        sourceFlow: "tag-regulator-suggest",
        parentBindings: [],
      });
      assert.sameMembers(
        (await harness.client.tags.listStagedTagSuggestions()).map(
          (entry) => entry.tag,
        ),
        ["method:alpha", "method:beta", "method:gamma"],
      );

      // Renaming onto an existing tag collapses the pair into one row.
      const merged = await harness.client.tags.updateStagedTagSuggestion({
        originalTag: "method:alpha",
        tag: "METHOD:BETA",
        facet: "method",
        note: "merged",
        sourceFlow: "tag-regulator-suggest",
        parentBindings: [],
      });
      assert.deepEqual(
        merged.staged.map((entry) => [entry.tag, entry.note]),
        [["METHOD:BETA", "merged"]],
      );
      const afterMerge = await harness.client.tags.listStagedTagSuggestions();
      assert.sameMembers(
        afterMerge.map((entry) => entry.tag),
        ["METHOD:BETA", "method:gamma"],
      );

      // Staged edits never touch the vocabulary or Host item tags.
      const vocabularyAfterEdits =
        await harness.client.tags.loadTagVocabulary();
      assert.equal(
        vocabularyAfterEdits.manifest.manifest_hash,
        vocabularyBeforeEdits.manifest.manifest_hash,
      );
      assert.isFalse(
        harness.recorder.hostCalls.some((call) =>
          call.capability.startsWith("effects."),
        ),
      );
    } finally {
      await harness.stop();
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("renames, refuses, and deletes vocabulary entries with a stable alias policy", async function () {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "zs-tag-entry-edit-"));
    const harness = await startTagHarness({
      id: "tag-entry-edit",
      root,
      states: seededHostStates(),
    });
    try {
      await seedVocabulary(harness);
      const initial = await harness.client.tags.loadTagVocabulary();
      await harness.client.tags.saveTagVocabulary({
        entries: [
          ...initial.entries,
          { tag: "method:target", facet: "method", source: "manual" },
          {
            tag: "method:parent",
            facet: "method",
            deprecated: true,
            replacement: "method:target",
          },
        ],
        aliases: { ...initial.aliases, "target-alias": "method:target" },
        abbrev: { ...initial.abbrev, tk: "Target" },
        protocol: initial.protocol,
      });

      // A rename carries the alias and replacement references with it and
      // leaves entry fields the update request cannot express untouched.
      const renamed = await harness.client.tags.updateTagVocabularyEntry({
        originalTag: "method:target",
        tag: "method:target-renamed",
        facet: "method",
        note: "renamed",
      });
      assert.equal(renamed.mutated, true);
      assert.deepInclude(renamed.updated as Record<string, unknown>, {
        tag: "method:target-renamed",
        facet: "method",
        note: "renamed",
        source: "manual",
        deprecated: false,
      });
      const afterRename = await harness.client.tags.loadTagVocabulary();
      assert.deepEqual(afterRename.aliases, {
        "target-alias": "method:target-renamed",
      });
      assert.equal(
        afterRename.entries.find((entry) => entry.tag === "method:parent")
          ?.replacement,
        "method:target-renamed",
      );

      // A rename onto a tag another entry already uses, and an unknown
      // original, are both refused without writing.
      for (const refusal of [
        {
          label: "rename conflict",
          code: "tag_vocabulary_entry_conflict",
          request: {
            originalTag: "method:parent",
            tag: "method:target-renamed",
            facet: "method",
            note: "conflict",
          },
        },
        {
          label: "missing entry",
          code: "tag_vocabulary_entry_not_found",
          request: {
            originalTag: "method:not-in-vocabulary",
            tag: "method:whatever",
            facet: "method",
            note: "missing",
          },
        },
      ]) {
        const result = await harness.client.tags.updateTagVocabularyEntry(
          refusal.request,
        );
        assert.equal(result.mutated, false, refusal.label);
        assert.equal(result.diagnostic?.code, refusal.code, refusal.label);
        assert.deepEqual(
          await harness.client.tags.loadTagVocabulary(),
          afterRename,
          `${refusal.label} must not write`,
        );
      }

      // Deleting an entry drops the aliases that point at it and clears the
      // replacement references, but leaves the abbreviation registry alone.
      assert.deepEqual(
        await harness.client.tags.deleteTagVocabularyEntry({
          originalTag: "method:target-renamed",
        }),
        { mutated: true, deleted: ["method:target-renamed"] },
      );
      const afterDelete = await harness.client.tags.loadTagVocabulary();
      assert.deepEqual(afterDelete.aliases, {});
      assert.deepEqual(afterDelete.abbrev, { tk: "Target" });
      assert.notInclude(
        afterDelete.entries.map((entry) => entry.tag),
        "method:target-renamed",
      );
      assert.equal(
        afterDelete.entries.find((entry) => entry.tag === "method:parent")
          ?.replacement,
        undefined,
      );
      // Deleting again is a stable no-op on the now-absent entry.
      assert.deepEqual(
        await harness.client.tags.deleteTagVocabularyEntry({
          originalTag: "method:target-renamed",
        }),
        { mutated: false, deleted: [] },
      );
      assert.isFalse(
        harness.recorder.hostCalls.some((call) =>
          call.capability.startsWith("effects."),
        ),
      );
    } finally {
      await harness.stop();
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("lists more than one hundred staged Tag suggestions without truncating", async function () {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "zs-tag-staged-bulk-"));
    const harness = await startTagHarness({
      id: "tag-staged-bulk",
      root,
      states: seededHostStates(),
    });
    try {
      await seedVocabulary(harness);
      const tags = Array.from(
        { length: 101 },
        (_, index) => `method:bulk-${index.toString().padStart(3, "0")}`,
      );
      const staged = await harness.client.tags.stageTagSuggestions({
        entries: tags.map((tag) => ({
          tag,
          facet: "method",
          source_flow: "bulk-fixture",
        })),
      });
      assert.equal(staged.staged.length, 101);
      const listed = await harness.client.tags.listStagedTagSuggestions();
      assert.equal(listed.length, 101);
      assert.deepEqual(
        listed.map((entry) => entry.tag).sort(),
        [...tags].sort(),
      );
      // The public list is a stable, complete array across repeated reads.
      const again = await harness.client.tags.listStagedTagSuggestions();
      assert.deepEqual(again, listed);

      // Staging suggestions never applies a Host effect.
      assert.isFalse(
        harness.recorder.hostCalls.some((call) =>
          call.capability.startsWith("effects."),
        ),
      );

      // Discarding a selection keeps the remaining suggestions, and repeating
      // the same discard is a stable no-op.
      assert.deepEqual(
        await harness.client.tags.discardStagedTagSuggestions({
          tags: ["method:bulk-000"],
        }),
        { discarded: ["method:bulk-000"] },
      );
      const afterDiscard = await harness.client.tags.listStagedTagSuggestions();
      assert.equal(afterDiscard.length, 100);
      assert.include(
        afterDiscard.map((entry) => entry.tag),
        "method:bulk-001",
      );
      assert.deepEqual(
        await harness.client.tags.discardStagedTagSuggestions({
          tags: ["method:bulk-000"],
        }),
        { discarded: [] },
      );
      assert.deepEqual(
        await harness.client.tags.listStagedTagSuggestions(),
        afterDiscard,
      );

      // Clearing the non-empty staged list empties it, keeps the vocabulary,
      // and repeats idempotently.
      const vocabularyBeforeClear = (
        await harness.client.tags.loadTagVocabulary()
      ).manifest.manifest_hash;
      const cleared = await harness.client.tags.clearStagedTagSuggestions();
      assert.equal(cleared.discarded.length, 100);
      assert.deepEqual(
        await harness.client.tags.listStagedTagSuggestions(),
        [],
      );
      assert.equal(
        (await harness.client.tags.loadTagVocabulary()).manifest.manifest_hash,
        vocabularyBeforeClear,
      );
      assert.deepEqual(await harness.client.tags.clearStagedTagSuggestions(), {
        discarded: [],
      });
    } finally {
      await harness.stop();
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
