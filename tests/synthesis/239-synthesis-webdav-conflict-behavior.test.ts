import { assert } from "chai";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  SYNTHESIS_PRODUCTION_ROUTE_EXECUTABLE as EXECUTABLE,
  startSynthesisProductionRouteHarness,
  waitForSynthesisProductionRouteReceipt,
  type SynthesisProductionRouteHarness,
} from "../helpers/synthesisProductionRouteHarness";

type RemoteEntry = { text: string; etag: string };

/**
 * In-memory WebDAV remote used as the synthetic external Host boundary. It
 * serves real durable snapshots (HEAD.json + manifest + bundles) written by the
 * sidecar, honors conditional writes via `ifMatch`, and can simulate a racing
 * remote HEAD. `manualRemoteClear` models the user clearing the remote bundle
 * before `clear_after_manual_edit`.
 */
class InMemoryWebDavRemote {
  readonly files = new Map<string, RemoteEntry>();
  headRace = false;
  private seq = 0;

  handle({
    capability,
    payload,
  }: {
    capability: string;
    payload: Record<string, unknown>;
  }): unknown {
    if (capability === "webdav.describe") {
      return {
        status: "available",
        configStatus: "configured",
        autoSyncEnabled: false,
        autoRetryEnabled: false,
        baseUrl: "https://webdav.invalid",
        remotePath: "zotero-agents",
        username: "",
        credentialUpdatedAt: "",
        connectionTest: null,
        diagnostics: [],
      };
    }
    if (capability === "webdav.read_text")
      return this.read(String(payload.path));
    if (capability === "webdav.ensure_collection") {
      return { status: "ready", etag: "", diagnostics: [] };
    }
    if (capability === "webdav.write_text") {
      return this.write(
        String(payload.path),
        String(payload.text),
        payload.ifMatch,
      );
    }
    if (capability.startsWith("effects.")) return { status: "applied" };
    return { status: "unavailable", diagnostics: [] };
  }

  read(path: string) {
    const entry = this.files.get(path);
    if (!entry) {
      return { status: "missing", text: "", etag: "", diagnostics: [] };
    }
    // A racing remote returns a fresh ETag on every HEAD.json read, so the
    // sidecar's pre-upload ETag comparison detects the concurrent change.
    const etag =
      path === "HEAD.json" && this.headRace ? `race-${++this.seq}` : entry.etag;
    return { status: "read", text: entry.text, etag, diagnostics: [] };
  }

  write(path: string, text: string, ifMatch: unknown) {
    const current = this.files.get(path);
    if (typeof ifMatch === "string" && ifMatch && current?.etag !== ifMatch) {
      return {
        status: "conflict",
        etag: current?.etag ?? "",
        diagnostics: ["etag_mismatch"],
      };
    }
    const etag = `w-${++this.seq}`;
    this.files.set(path, { text, etag });
    return { status: "written", etag, diagnostics: [] };
  }

  head() {
    const text = this.files.get("HEAD.json")?.text;
    return text ? JSON.parse(text) : null;
  }

  manualRemoteClear() {
    for (const key of [...this.files.keys()]) {
      if (key === "HEAD.json" || key.startsWith("snapshots/")) {
        this.files.delete(key);
      }
    }
  }
}

function hostFixtureFor(remote: InMemoryWebDavRemote) {
  return { handle: (call: any) => remote.handle(call) };
}

async function tagFixture(
  harness: SynthesisProductionRouteHarness,
  tag: string,
) {
  await harness.client.tags.initializeBuiltinTagPolicy();
  const initial = await harness.client.tags.loadTagVocabulary();
  await harness.client.tags.saveTagVocabulary({
    entries: [
      ...(initial.entries as unknown[]),
      { tag, facet: "topic", source: "manual" },
    ],
    aliases: initial.aliases,
    abbrev: initial.abbrev,
    protocol: initial.protocol,
  });
}

async function replaceTag(
  harness: SynthesisProductionRouteHarness,
  oldTag: string,
  newTag: string,
) {
  const current = await harness.client.tags.loadTagVocabulary();
  await harness.client.tags.saveTagVocabulary({
    entries: (current.entries as any[])
      .filter((entry) => entry.tag !== oldTag)
      .concat([{ tag: newTag, facet: "topic", source: "manual" }]),
    aliases: current.aliases,
    abbrev: current.abbrev,
    protocol: current.protocol,
  });
}

async function localTags(
  harness: SynthesisProductionRouteHarness,
  prefix: string,
) {
  const vocabulary = await harness.client.tags.loadTagVocabulary();
  return (vocabulary.entries as any[])
    .map((entry) => String(entry.tag))
    .filter((tag) => tag.startsWith(prefix));
}

async function waitOperation(
  harness: SynthesisProductionRouteHarness,
  operation: { operation_id: string; status: string },
) {
  return waitForSynthesisProductionRouteReceipt({
    operationId: operation.operation_id,
    getOperation: (operationId) =>
      harness.client.maintenance.getOperation({
        operation_id: operationId,
      }) as any,
  });
}

async function syncNow(harness: SynthesisProductionRouteHarness) {
  return waitOperation(harness, await harness.client.sync.webDav.runNow());
}

/** Read the durable WebDAV state through the typed startup reconciliation. */
async function readSyncState(harness: SynthesisProductionRouteHarness) {
  return (await harness.client.system.reconcileRuntimeWorkOnStartup()) as any;
}

function newRoot(prefix: string, roots: string[]) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  roots.push(root);
  return root;
}

describe("Synthesis WebDAV conflict and durable sync behavior", function () {
  this.timeout(180_000);

  it("imports a remote durable snapshot, reads the imported facts back, and keeps them across reopen", async function () {
    assert.isTrue(fs.existsSync(EXECUTABLE), "Rust sidecar must be built");
    const roots: string[] = [];
    const remote = new InMemoryWebDavRemote();
    const hostFixture = hostFixtureFor(remote);
    let origin: SynthesisProductionRouteHarness | undefined;
    let importer: SynthesisProductionRouteHarness | undefined;
    try {
      origin = await startSynthesisProductionRouteHarness({
        id: "webdav-import-origin",
        root: newRoot("zs-webdav-origin-", roots),
        hostFixture,
      });
      await tagFixture(origin, "topic:import-origin");
      const published = await syncNow(origin);
      assert.equal(published.receipt?.queue_state, "idle");
      assert.isNotEmpty(
        [...remote.files.keys()].filter((key) => key.startsWith("snapshots/")),
        "origin must publish a real durable snapshot",
      );

      importer = await startSynthesisProductionRouteHarness({
        id: "webdav-import-target",
        root: newRoot("zs-webdav-import-", roots),
        hostFixture,
      });
      const imported = await syncNow(importer);
      assert.equal(
        imported.receipt?.queue_state,
        "idle",
        "a fresh local imports the remote snapshot instead of blocking",
      );
      assert.include(
        await localTags(importer, "topic:import-origin"),
        "topic:import-origin",
        "the remote tag fact is readable locally after import",
      );

      await importer.stop();
      importer = await startSynthesisProductionRouteHarness({
        id: "webdav-import-reopen",
        root: roots[1],
        hostFixture,
      });
      assert.include(
        await localTags(importer, "topic:import-origin"),
        "topic:import-origin",
        "the imported fact survives a process reopen",
      );
    } finally {
      await importer?.stop();
      await origin?.stop();
      for (const root of roots)
        fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("blocks an unsafe same-entity conflict, preserves local facts and the remote head, and republishes through clear_after_manual_edit", async function () {
    assert.isTrue(fs.existsSync(EXECUTABLE), "Rust sidecar must be built");
    const roots: string[] = [];
    const remote = new InMemoryWebDavRemote();
    const hostFixture = hostFixtureFor(remote);
    let harness: SynthesisProductionRouteHarness | undefined;
    try {
      harness = await startSynthesisProductionRouteHarness({
        id: "webdav-conflict",
        root: newRoot("zs-webdav-conflict-", roots),
        hostFixture,
      });
      await tagFixture(harness, "topic:origin");
      await syncNow(harness);
      const publishedHead = remote.head();
      assert.isNotNull(publishedHead);

      await replaceTag(harness, "topic:origin", "topic:local");
      const blocked = await syncNow(harness);
      const conflictState = blocked.receipt;
      assert.equal(
        conflictState?.queue_state,
        "blocked_conflict",
        "an unsafe same-entity change blocks the sync",
      );
      assert.equal(conflictState?.conflict_report?.status, "blocked");
      const conflict = conflictState?.conflict_report?.conflicts?.[0];
      assert.equal(conflict?.reason, "unbased_update_acknowledgement_required");
      assert.equal(conflict?.asset_path, "durable://unbased-updates");
      assert.include(
        conflictState?.conflict_actions ?? [],
        "clear_after_manual_edit",
      );
      assert.include(
        conflictState?.allowed_actions ?? [],
        "resolveWebDavSyncConflict",
      );
      assert.include(
        await localTags(harness, "topic:"),
        "topic:local",
        "a blocked conflict must not mutate local durable facts",
      );
      assert.deepEqual(
        remote.head(),
        publishedHead,
        "a blocked conflict must not change the remote head",
      );

      await harness.stop();
      harness = await startSynthesisProductionRouteHarness({
        id: "webdav-conflict-reopen",
        root: roots[0],
        hostFixture,
      });
      const reopened = await readSyncState(harness);
      assert.equal(reopened.webdav.queue_state, "blocked_conflict");
      assert.equal(
        reopened.webdav.conflict_report?.status,
        "blocked",
        "the blocked conflict is durable across reopen",
      );

      remote.manualRemoteClear();
      const cleared = await harness.client.sync.webDav.resolveConflict({
        action: "clear_after_manual_edit",
      });
      assert.equal(cleared.queue_state, "idle");
      assert.equal(cleared.last_run?.status, "completed");
      const republishedHead = remote.head();
      assert.isNotNull(republishedHead, "retry republishes the remote head");
      assert.notEqual(
        republishedHead?.manifest_hash,
        publishedHead?.manifest_hash,
        "the republished snapshot carries the local facts",
      );

      const verifier = await startSynthesisProductionRouteHarness({
        id: "webdav-conflict-verify",
        root: newRoot("zs-webdav-verify-", roots),
        hostFixture,
      });
      try {
        await syncNow(verifier);
        assert.deepEqual(
          await localTags(verifier, "topic:"),
          ["topic:local"],
          "a fresh importer observes the local facts the retry published",
        );
      } finally {
        await verifier.stop();
      }
    } finally {
      await harness?.stop();
      for (const root of roots)
        fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("resolves a blocked conflict with keep_local, persists the resolution across reopen, and keeps pause durable", async function () {
    assert.isTrue(fs.existsSync(EXECUTABLE), "Rust sidecar must be built");
    const roots: string[] = [];
    const remote = new InMemoryWebDavRemote();
    const hostFixture = hostFixtureFor(remote);
    let harness: SynthesisProductionRouteHarness | undefined;
    try {
      harness = await startSynthesisProductionRouteHarness({
        id: "webdav-keep-local",
        root: newRoot("zs-webdav-keep-", roots),
        hostFixture,
      });
      await tagFixture(harness, "topic:origin");
      await syncNow(harness);
      await replaceTag(harness, "topic:origin", "topic:local");
      const blocked = await syncNow(harness);
      assert.equal(blocked.receipt?.queue_state, "blocked_conflict");

      const kept = await harness.client.sync.webDav.resolveConflict({
        action: "keep_local",
      });
      assert.equal(kept.queue_state, "queued");
      assert.equal(kept.conflict_report?.status, "resolved");
      assert.include(
        await localTags(harness, "topic:"),
        "topic:local",
        "keep_local preserves the local fact",
      );

      await harness.stop();
      harness = await startSynthesisProductionRouteHarness({
        id: "webdav-keep-local-reopen",
        root: roots[0],
        hostFixture,
      });
      const reopened = await readSyncState(harness);
      assert.equal(
        reopened.webdav.conflict_report?.status,
        "resolved",
        "the keep_local resolution is durable across reopen",
      );

      await replaceTag(harness, "topic:local", "topic:final");
      const reblocked = await syncNow(harness);
      assert.equal(
        reblocked.receipt?.queue_state,
        "blocked_conflict",
        "a fresh unsafe change blocks again",
      );

      const paused = await harness.client.sync.webDav.pause();
      assert.isTrue(paused.paused);
      await harness.stop();
      harness = await startSynthesisProductionRouteHarness({
        id: "webdav-keep-local-paused-reopen",
        root: roots[0],
        hostFixture,
      });
      const pausedReopen = await readSyncState(harness);
      assert.isTrue(
        pausedReopen.webdav.paused,
        "pause is durable across reopen",
      );
      assert.equal(
        pausedReopen.webdav.queue_state,
        "blocked_conflict",
        "pause does not discard the pending conflict",
      );
      const resumed = await harness.client.sync.webDav.resume();
      assert.isFalse(resumed.paused);
    } finally {
      await harness?.stop();
      for (const root of roots)
        fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("blocks both_changed against a shared baseline and preserves both branches until explicit resolution", async function () {
    const roots: string[] = [];
    const publisherRemote = new InMemoryWebDavRemote();
    const localRemote = new InMemoryWebDavRemote();
    let publisher: SynthesisProductionRouteHarness | undefined;
    let local: SynthesisProductionRouteHarness | undefined;
    const readFacts = async (harness: SynthesisProductionRouteHarness) => {
      const { entries, aliases, abbrev, protocol } =
        await harness.client.tags.loadTagVocabulary();
      return { entries, aliases, abbrev, protocol };
    };
    const vocabularyFact = (remote: InMemoryWebDavRemote) => {
      const snapshot = `snapshots/${remote.head().snapshot_id}`;
      const manifest = JSON.parse(
        remote.files.get(`${snapshot}/manifest.json`)!.text,
      );
      const entries = manifest.assets.flatMap(
        (asset: { path: string }) =>
          JSON.parse(remote.files.get(`${snapshot}/${asset.path}`)!.text)
            .entries,
      ) as Array<{
        entity_kind: string;
        entity_id: string;
        content_hash: string;
      }>;
      const facts = entries.filter(
        (entry) => entry.entity_kind === "tag_vocabulary",
      );
      assert.lengthOf(facts, 1);
      const { entity_kind, entity_id, content_hash } = facts[0];
      return { entity_kind, entity_id, content_hash };
    };
    try {
      publisher = await startSynthesisProductionRouteHarness({
        id: "webdav-three-way-publisher",
        root: newRoot("zs-webdav-three-way-publisher-", roots),
        hostFixture: hostFixtureFor(publisherRemote),
      });
      await tagFixture(publisher, "topic:baseline");
      assert.equal((await syncNow(publisher)).receipt?.queue_state, "idle");
      const baseline = vocabularyFact(publisherRemote);
      for (const [key, value] of publisherRemote.files) {
        localRemote.files.set(key, value);
      }
      local = await startSynthesisProductionRouteHarness({
        id: "webdav-three-way-local",
        root: newRoot("zs-webdav-three-way-local-", roots),
        hostFixture: hostFixtureFor(localRemote),
      });
      assert.equal((await syncNow(local)).receipt?.queue_state, "idle");
      assert.deepEqual(await readFacts(local), await readFacts(publisher));
      assert.deepEqual(vocabularyFact(localRemote), baseline);

      // Publish each offline branch to an empty remote, retaining the imported local basis.
      await replaceTag(publisher, "topic:baseline", "topic:remote-branch");
      publisherRemote.manualRemoteClear();
      assert.equal((await syncNow(publisher)).receipt?.queue_state, "idle");
      const remoteFact = vocabularyFact(publisherRemote);
      await replaceTag(local, "topic:baseline", "topic:local-branch");
      localRemote.manualRemoteClear();
      assert.equal((await syncNow(local)).receipt?.queue_state, "idle");
      const localFact = vocabularyFact(localRemote);
      const localSnapshot = new Map(localRemote.files);
      assert.equal(remoteFact.entity_id, baseline.entity_id);
      assert.equal(localFact.entity_id, baseline.entity_id);
      assert.equal(
        new Set([
          baseline.content_hash,
          localFact.content_hash,
          remoteFact.content_hash,
        ]).size,
        3,
      );
      const localBefore = await readFacts(local);
      const publisherBefore = await readFacts(publisher);
      localRemote.manualRemoteClear();
      for (const [key, value] of publisherRemote.files) {
        localRemote.files.set(key, value);
      }
      const remoteBefore = new Map(localRemote.files);
      const blocked = await syncNow(local);
      assert.equal(blocked.receipt?.queue_state, "blocked_conflict");
      const conflicts = blocked.receipt.conflict_report.conflicts;
      const vocabularyConflicts = conflicts.filter(
        (conflict: { base_hash?: string }) =>
          conflict.base_hash === baseline.content_hash,
      );
      assert.lengthOf(vocabularyConflicts, 1);
      assert.include(vocabularyConflicts[0], {
        reason: "both_changed",
        base_hash: baseline.content_hash,
        local_hash: localFact.content_hash,
        remote_hash: remoteFact.content_hash,
      });
      assert.deepEqual(await readFacts(local), localBefore);
      assert.deepEqual(localRemote.files, remoteBefore);
      assert.deepEqual(await readFacts(publisher), publisherBefore);

      await local.stop();
      local = await startSynthesisProductionRouteHarness({
        id: "webdav-three-way-reopen",
        root: roots[1],
        hostFixture: hostFixtureFor(localRemote),
      });
      const reopened = await readSyncState(local);
      assert.equal(reopened.webdav.queue_state, "blocked_conflict");
      assert.deepEqual(reopened.webdav.conflict_report.conflicts, conflicts);
      const kept = await local.client.sync.webDav.resolveConflict({
        action: "keep_local",
      });
      assert.equal(kept.queue_state, "queued");
      assert.equal(kept.conflict_report?.status, "resolved");
      assert.deepEqual(await readFacts(local), localBefore);
      assert.deepEqual(localRemote.files, remoteBefore);
      const reblocked = await syncNow(local);
      assert.equal(reblocked.receipt?.queue_state, "blocked_conflict");
      assert.deepEqual(reblocked.receipt.conflict_report.conflicts, conflicts);

      // The manual edit chooses the previously exported local snapshot as the remote head.
      localRemote.manualRemoteClear();
      for (const [key, value] of localSnapshot) {
        localRemote.files.set(key, value);
      }
      const resolved = await local.client.sync.webDav.resolveConflict({
        action: "clear_after_manual_edit",
      });
      assert.equal(resolved.queue_state, "idle");
      assert.notExists(resolved.conflict_report);
      assert.deepEqual(await readFacts(local), localBefore);
      assert.equal(
        vocabularyFact(localRemote).content_hash,
        localFact.content_hash,
      );
      assert.deepEqual(await readFacts(publisher), publisherBefore);
      assert.deepEqual(publisherRemote.files, remoteBefore);
    } finally {
      await local?.stop();
      await publisher?.stop();
      for (const root of roots)
        fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("keeps local facts and the remote head when the remote HEAD races, then recovers on retry", async function () {
    assert.isTrue(fs.existsSync(EXECUTABLE), "Rust sidecar must be built");
    const roots: string[] = [];
    const remote = new InMemoryWebDavRemote();
    const hostFixture = hostFixtureFor(remote);
    let harness: SynthesisProductionRouteHarness | undefined;
    try {
      harness = await startSynthesisProductionRouteHarness({
        id: "webdav-etag-race",
        root: newRoot("zs-webdav-race-", roots),
        hostFixture,
      });
      await tagFixture(harness, "topic:race");
      await syncNow(harness);
      const headBefore = remote.head();
      assert.isNotNull(headBefore);

      remote.headRace = true;
      const raced = await syncNow(harness);
      assert.equal(raced.receipt?.queue_state, "failed_retryable");
      assert.include(
        (raced.receipt?.diagnostics ?? []).map((entry: any) => entry.code),
        "webdav_sync_remote_changed_during_sync",
      );
      assert.include(
        await localTags(harness, "topic:"),
        "topic:race",
        "a remote race must not disturb local facts",
      );
      assert.deepEqual(
        remote.head(),
        headBefore,
        "a remote race must not overwrite the remote head",
      );

      remote.headRace = false;
      const retried = await waitOperation(
        harness,
        await harness.client.sync.webDav.retry(),
      );
      assert.equal(retried.receipt?.queue_state, "idle", "retry succeeds");
      assert.include(await localTags(harness, "topic:"), "topic:race");
    } finally {
      await harness?.stop();
      for (const root of roots)
        fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("rejects a tampered remote asset without partially importing it", async function () {
    assert.isTrue(fs.existsSync(EXECUTABLE), "Rust sidecar must be built");
    const roots: string[] = [];
    const remote = new InMemoryWebDavRemote();
    const hostFixture = hostFixtureFor(remote);
    let harness: SynthesisProductionRouteHarness | undefined;
    try {
      harness = await startSynthesisProductionRouteHarness({
        id: "webdav-tamper",
        root: newRoot("zs-webdav-tamper-", roots),
        hostFixture,
      });
      await tagFixture(harness, "topic:origin");
      await syncNow(harness);
      const head = remote.head();
      assert.isNotNull(head);
      const snapshot = `snapshots/${head!.snapshot_id}`;
      const manifest = JSON.parse(
        remote.files.get(`${snapshot}/manifest.json`)!.text,
      );
      const assetPath = `${snapshot}/${manifest.assets[0].path}`;
      const asset = remote.files.get(assetPath)!;
      remote.files.set(assetPath, {
        ...asset,
        text: asset.text.replace("topic:origin", "topic:tampered"),
      });

      const rejected = await syncNow(harness);
      assert.equal(rejected.receipt?.queue_state, "failed_permanent");
      assert.include(
        (rejected.receipt?.diagnostics ?? []).map((entry: any) => entry.code),
        "webdav_sync_snapshot_validation_failed",
      );
      assert.deepEqual(
        await localTags(harness, "topic:"),
        ["topic:origin"],
        "a tampered asset must not be partially imported",
      );
      assert.deepEqual(
        remote.head(),
        head,
        "a rejected import leaves the remote head untouched",
      );
    } finally {
      await harness?.stop();
      for (const root of roots)
        fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
