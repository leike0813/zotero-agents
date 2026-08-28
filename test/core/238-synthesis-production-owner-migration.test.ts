import { assert } from "chai";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { createReadonlySqliteDatabase } from "../../src/modules/harness/sqliteReadonly";
import {
  SYNTHESIS_PRODUCTION_ROUTE_EXECUTABLE,
  startSynthesisProductionRouteHarness,
} from "../helpers/synthesisProductionRouteHarness";

function hashFile(filePath: string) {
  return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function listFiles(root: string, relative = ""): string[] {
  const current = path.join(root, relative);
  return fs.readdirSync(current, { withFileTypes: true }).flatMap((entry) => {
    const next = path.join(relative, entry.name);
    return entry.isDirectory() ? listFiles(root, next) : [next];
  });
}

function hashTree(root: string, excluded = new Set<string>()) {
  const hash = createHash("sha256");
  for (const relative of listFiles(root)
    .filter((relative) => !excluded.has(relative))
    .sort()) {
    hash.update(relative);
    hash.update("\0");
    hash.update(fs.readFileSync(path.join(root, relative)));
    hash.update("\0");
  }
  return hash.digest("hex");
}

async function listTopicsWhenReady(
  harness: Awaited<ReturnType<typeof startSynthesisProductionRouteHarness>>,
) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      return (await harness.call("client.listTopics", {
        args: [{ cursor: "", limit: 50 }],
      })) as { topics: Array<{ topic_id: string }> };
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }
  throw new Error(`${String(lastError)}\n${harness.stderr()}`);
}

describe("Synthesis legacy production owner migration", function () {
  this.timeout(120_000);

  it("migrates the representative pre-Rust profile only through an isolated copy", async function () {
    const sampleRoot = process.env.ZOTERO_SYNTHESIS_MIGRATION_SAMPLE_ROOT;
    if (!sampleRoot) return this.skip();
    assert.isTrue(fs.existsSync(SYNTHESIS_PRODUCTION_ROUTE_EXECUTABLE));
    const sourceDatabase = path.join(
      sampleRoot,
      "zotero-agents/state/synthesis.db",
    );
    const sourceCanonical = path.join(
      sampleRoot,
      "zotero-agents/data/synthesis",
    );
    const sourceZotero = path.join(sampleRoot, "zotero.sqlite");
    const sourceDatabaseHash = hashFile(sourceDatabase);
    const sourceCanonicalHash = hashTree(sourceCanonical);
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "zs-legacy-owner-"));
    fs.mkdirSync(path.join(root, "state"), { recursive: true });
    fs.mkdirSync(path.join(root, "data"), { recursive: true });
    fs.copyFileSync(sourceDatabase, path.join(root, "state/synthesis.db"));
    fs.cpSync(sourceCanonical, path.join(root, "data/synthesis"), {
      recursive: true,
      preserveTimestamps: true,
    });
    const zotero = await createReadonlySqliteDatabase(sourceZotero);
    const resolverCalls: number[][] = [];
    const hostFixture = {
      handle({
        capability,
        payload,
      }: {
        capability: string;
        payload: Record<string, unknown>;
      }) {
        if (capability === "webdav.describe") return { configured: false };
        if (capability !== "effects.staged_tag_binding.resolve") {
          return { status: "unavailable", diagnostics: [] };
        }
        const libraryId = Number(payload.libraryId);
        const itemIds = (payload.itemIds as number[]).map(Number);
        resolverCalls.push(itemIds);
        const bindings: Record<string, unknown> = { $libraryId: libraryId };
        const placeholders = itemIds.map((itemId, index) => {
          bindings[`$item${index}`] = itemId;
          return `$item${index}`;
        });
        const rows = zotero.all(
          `SELECT itemID AS itemId,libraryID AS libraryId,key AS itemKey
             FROM items WHERE libraryID=$libraryId
              AND itemID IN (${placeholders.join(",")}) ORDER BY itemID`,
          bindings,
        ) as Array<{ itemId: number; libraryId: number; itemKey: string }>;
        const resolvedIds = new Set(rows.map((row) => row.itemId));
        return {
          resolved: rows.map((row) => ({
            itemId: row.itemId,
            ref: { libraryId: row.libraryId, itemKey: row.itemKey },
          })),
          missingItemIds: itemIds.filter((itemId) => !resolvedIds.has(itemId)),
          diagnostics: [],
        };
      },
    };
    let harness: Awaited<
      ReturnType<typeof startSynthesisProductionRouteHarness>
    > | null = null;
    try {
      harness = await startSynthesisProductionRouteHarness({
        id: "legacy-owner-first",
        root,
        hostFixture,
      });
      const topics = await listTopicsWhenReady(harness);
      assert.lengthOf(topics.topics, 4);
      assert.deepEqual(resolverCalls, [
        [4, 6, 17, 19, 104, 115, 117, 119, 123, 128, 208, 233, 242],
      ]);

      let lockConflict = "";
      try {
        await startSynthesisProductionRouteHarness({
          id: "legacy-owner-lock-conflict",
          root,
          hostFixture,
        });
      } catch (error) {
        lockConflict = String(error);
      }
      assert.include(lockConflict, "production_lock_conflict");
      await harness.stop();
      harness = null;

      const migrated = new DatabaseSync(path.join(root, "state/synthesis.db"), {
        readOnly: true,
      });
      assert.equal(
        migrated
          .prepare(
            "SELECT value FROM synt_schema_meta WHERE key='repository_foundation_schema_version'",
          )
          .get().value,
        "synthesis-repository-foundation.v3",
      );
      assert.equal(
        migrated
          .prepare("SELECT COUNT(*) AS count FROM synt_topic_application_state")
          .get().count,
        4,
      );
      assert.deepEqual(
        migrated
          .prepare(
            "SELECT COUNT(*) AS count,SUM(locator='') AS blankLocators FROM synt_reference_artifact",
          )
          .get(),
        { count: 258, blankLocators: 198 },
      );
      assert.deepEqual(
        migrated
          .prepare(
            "SELECT (SELECT COUNT(*) FROM synt_operation) AS operations,(SELECT COUNT(*) FROM synt_cache_basis WHERE status='stale') AS staleCaches,(SELECT COUNT(*) FROM synt_citation_layout_state WHERE status='stale') AS staleLayouts,(SELECT COUNT(*) FROM synt_citation_metrics_complex WHERE status='stale') AS staleMetrics",
          )
          .get(),
        { operations: 29, staleCaches: 23, staleLayouts: 2, staleMetrics: 80 },
      );
      assert.equal(
        migrated
          .prepare(
            "SELECT COUNT(*) AS count FROM synt_tag_staged_suggestion WHERE EXISTS (SELECT 1 FROM json_each(parent_bindings_json) WHERE json_each.type='integer')",
          )
          .get().count,
        0,
      );
      assert.deepInclude(
        migrated
          .prepare(
            "SELECT status,processed_count,skipped_count,total_count FROM synt_operation WHERE operation_id='staged-tag-binding-migration'",
          )
          .get(),
        {
          status: "completed",
          processed_count: 46,
          skipped_count: 0,
          total_count: 46,
        },
      );
      migrated.close();
      assert.equal(
        fs.readdirSync(path.join(root, "state/synthesis-migration-backups"))
          .length,
        1,
      );
      assert.isTrue(
        fs.existsSync(path.join(root, "data/synthesis/identity.json")),
      );
      assert.equal(
        hashTree(path.join(root, "data/synthesis"), new Set(["identity.json"])),
        sourceCanonicalHash,
      );

      let identityMismatch = "";
      try {
        await startSynthesisProductionRouteHarness({
          id: "legacy-owner-identity-mismatch",
          root,
          profileId: "9".repeat(64),
          hostFixture,
        });
      } catch (error) {
        identityMismatch = String(error);
      }
      assert.include(identityMismatch, "identity_mismatch");

      harness = await startSynthesisProductionRouteHarness({
        id: "legacy-owner-reopen",
        root,
        hostFixture,
      });
      assert.lengthOf(resolverCalls, 1);
      const reopenedTopics = await listTopicsWhenReady(harness);
      assert.lengthOf(reopenedTopics.topics, 4);
      await harness.stop();
      harness = null;

      assert.equal(hashFile(sourceDatabase), sourceDatabaseHash);
      assert.equal(hashTree(sourceCanonical), sourceCanonicalHash);
    } finally {
      if (harness) await harness.stop();
      zotero.close();
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
