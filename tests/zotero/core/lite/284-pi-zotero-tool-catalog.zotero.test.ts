import { assert } from "chai";
import "../../../runtime/250-pi-zotero-tool-catalog.test";
import { freezePiToolGatewayTurn } from "../../../../src/modules/piToolGateway";
import {
  createZoteroNativeToolDefinitions,
  type PiZoteroMutationContext,
  type PiZoteroMutationDependencies,
} from "../../../../src/modules/zoteroNativeToolCatalog";
import {
  createZoteroHostCapabilityBroker,
  type ZoteroHostCapabilityBroker,
} from "../../../../src/modules/zoteroHostCapabilityBroker";
import { createPiTrustedNativeExecution } from "../../../../src/modules/piTrustedNativeExecution";
import {
  appendPiConversationFact,
  createPiConversationOwner,
  inspectPiOwner,
  type PiOwnerRef,
} from "../../../../src/modules/piOwnerPersistence";
import {
  ensureRuntimeDirectoryStrict,
  readRuntimeTextFileStrict,
  removeRuntimePath,
  writeRuntimeBytes,
} from "../../../../src/modules/runtimePersistence";
import { assertWorkflowHostStrictJsonValue } from "../../../../src/workflows/workflowHostErrorContract";
import { joinPath } from "../../../../src/utils/path";
import type {
  CurrentViewDto,
  JsonValue,
} from "../../../../src/workflows/types";

const READ_TOOL_NAMES = [
  "zotero_context_get_current_view",
  "zotero_context_get_selected_items",
  "zotero_library_list_items",
  "zotero_library_list_collections",
  "zotero_library_get_item_detail",
  "zotero_library_get_item_notes",
  "zotero_library_get_note_detail",
  "zotero_library_get_item_attachments",
  "zotero_library_list_annotations",
  "zotero_library_export_annotations",
  "zotero_metadata_translate_identifier",
  "zotero_library_readiness_audit",
  "zotero_library_get_item_audit_state",
  "zotero_library_traverse_items",
];

const MUTATION_TOOL_NAMES = [
  "zotero_item_create",
  "zotero_item_update_metadata",
  "zotero_item_update_tags",
  "zotero_item_add_related_items",
  "zotero_item_remove_related_items",
  "zotero_note_create",
  "zotero_note_update_content",
  "zotero_collection_create",
  "zotero_collection_update",
  "zotero_collection_update_membership",
  "zotero_attachment_update_metadata",
  "zotero_item_change_type",
  "zotero_attachment_import",
  "zotero_attachment_replace_file",
  "zotero_attachment_move",
  "zotero_trash_move_items",
  "zotero_trash_restore_items",
  "zotero_custom_note_write",
  "zotero_conversation_note_write",
  "zotero_literature_digest_upsert",
  "zotero_literature_references_upsert",
  "zotero_literature_citation_analysis_upsert",
  "zotero_literature_score_upsert",
];

/**
 * Freezes the full read + mutation catalog behind direct authorization. The
 * canary exercises the real Broker/Gateway composition without the interactive
 * permission round-trip, which the production Conversation canary covers.
 */
async function mutationGateway(args: {
  broker: ZoteroHostCapabilityBroker;
  workspace: Awaited<ReturnType<typeof createPiTrustedNativeExecution>>;
  mutations: PiZoteroMutationDependencies;
  ownerId: string;
  turnId: string;
}) {
  const definitions = createZoteroNativeToolDefinitions({
    broker: args.broker,
    workspace: args.workspace,
    mutations: args.mutations,
  });
  return freezePiToolGatewayTurn({
    owner: { kind: "conversation", ownerId: args.ownerId },
    turnId: args.turnId,
    definitions: [...definitions],
    policy: {
      mode: "interactive",
      systemAllowedEffects: ["bounded-read", "zotero-mutation"],
      authorizedEffects: ["bounded-read", "zotero-mutation"],
      authorizedKeys: ["zotero-mutation:enhanced"],
      maxCalls: 100,
      maxConcurrent: 1,
      maxCost: 100,
    },
    runtimeCapability: {
      identity: "real-zotero-mutation",
      availableCapabilityIds: definitions.map((tool) => tool.capabilityId),
    },
    hooks: {
      recordStarted: async () => undefined,
      recordReceipt: async () => undefined,
      recordPermission: async () => undefined,
    },
  });
}

/** Canonical owner-scoped mutation evidence, mirroring the production wiring. */
function ownerMutations(
  ownerRef: PiOwnerRef,
  root: string,
  receipts: string[],
): PiZoteroMutationDependencies {
  const operationIds = new Map<string, string>();
  const fact = (
    kind: string,
    payload: unknown,
    context: PiZoteroMutationContext,
    entryId: string,
  ) =>
    appendPiConversationFact(
      ownerRef,
      {
        kind,
        payload: JSON.parse(JSON.stringify(payload)) as JsonValue,
        turnId: context.sourceTurnId,
        entryId,
      },
      root,
    );
  return {
    identity: async (context) => {
      const key = `${context.sourceTurnId}:${context.callId}`;
      const operationId =
        operationIds.get(key) ?? `zotero-mutation-${context.callId}`;
      operationIds.set(key, operationId);
      await fact(
        "zotero_mutation_identity",
        { operationId, generatedSourceReferenceIds: [] },
        context,
        `zotero-identity-${context.callId}`,
      );
      return { operationId, generatedSourceReferenceIds: [] };
    },
    recordSourceIds: async (context, ids) => {
      await fact(
        "zotero_mutation_source_ids",
        { generatedSourceReferenceIds: ids },
        context,
        `zotero-source-ids-${context.callId}`,
      );
    },
    recordDomainResult: async (context, result) => {
      const entryId = `zotero-receipt-${context.callId}`;
      await fact("zotero_mutation_receipt", result, context, entryId);
      receipts.push(entryId);
      return entryId;
    },
  };
}

/** Minimal valid canonical citation-analysis artifact for an authoring smoke. */
function citationAnalysisArtifact(): JsonValue {
  const bucket = () => ({ summary: "Canary bucket", sourceReferenceIds: [] });
  return {
    meta: {
      language: "en",
      scope: { section_title: null, line_start: null, line_end: null },
      scope_source: null,
      scope_decision: {
        selection_reason: null,
        covered_sections: [],
        fallback_from: null,
        fallback_reason: null,
      },
      mapping_reliability: "normal",
      reference_extraction: { status: "completed" },
    },
    summary: "Canary citation analysis",
    timeline: { early: bucket(), mid: bucket(), recent: bucket() },
    items: [],
    unresolved: [],
  } as unknown as JsonValue;
}

/** Minimal valid canonical literature-score artifact for an authoring smoke. */
function literatureScoreArtifact(): JsonValue {
  const dimension = (key: string) => ({
    dimension_key: key,
    name: key,
    configured_weight: 1,
    effective_weight: 1,
    raw_score: 3,
    applicable_max_score: 3,
    score: 100,
    confidence: 1,
    summary: "Canary dimension",
    criteria: [
      {
        criterion_key: `${key}-criterion`,
        name: "Canary criterion",
        status: "scored",
        score: 3,
        max_score: 3,
        reason: "Canary evidence",
        evidence: [],
      },
    ],
  });
  return {
    rubric_id: "canary-rubric",
    paper_type: "empirical",
    paper_type_reason: "Canary fixture",
    overall_score: 100,
    confidence: 1,
    confidence_adjusted_score: 100,
    dimensions: [
      "rigor",
      "novelty",
      "clarity",
      "impact",
      "methodology",
      "reproducibility",
    ].map(dimension),
  } as unknown as JsonValue;
}

describe("Pi Zotero Native Tool Catalog in real Zotero", function () {
  it("reads the live current view through Broker and Gateway without Node", async function () {
    assert.isUndefined(
      (globalThis as { process?: { versions?: { node?: string } } }).process
        ?.versions?.node,
    );
    const mainWindow = Zotero.getMainWindow();
    assert.isOk(mainWindow?.ZoteroPane);
    const gateway = await freezePiToolGatewayTurn({
      owner: { kind: "conversation", ownerId: "real-zotero" },
      turnId: "read-current-view",
      definitions: [
        ...createZoteroNativeToolDefinitions({
          broker: createZoteroHostCapabilityBroker(() => mainWindow),
          workspace: {
            materializeOrReuseMany: async () => {
              throw new Error("unused");
            },
            beginGeneratedTextOutput: async () => {
              throw new Error("unused");
            },
          },
        }),
      ],
      policy: {
        mode: "interactive",
        systemAllowedEffects: ["bounded-read"],
        authorizedEffects: ["bounded-read"],
        authorizedKeys: [],
        maxCalls: 1,
        maxConcurrent: 1,
        maxCost: 1,
      },
      runtimeCapability: {
        identity: "real-zotero",
        availableCapabilityIds: ["context.get_current_view"],
      },
      hooks: {
        recordStarted: async () => undefined,
        recordReceipt: async () => undefined,
        recordPermission: async () => undefined,
      },
    });
    const result = (
      await gateway.executeBatch([
        {
          callId: "read-view",
          name: "zotero_context_get_current_view",
          arguments: {},
        },
      ])
    ).results[0];
    assert.equal(result.status, "completed", result.failure?.code);
    assertWorkflowHostStrictJsonValue(result.value);
    assert.include(
      ["library", "reader"],
      (result.value as CurrentViewDto).target,
    );
  });

  it("pages the live library and commits one annotation export to the owner workspace", async function () {
    const workspaceRoot = joinPath(
      Zotero.getTempDirectory().path,
      `pi-zotero-read-${Date.now()}`,
    );
    await ensureRuntimeDirectoryStrict(workspaceRoot);
    const parent = new Zotero.Item("journalArticle");
    parent.setField("title", "Pi read tool canary");
    await parent.saveTx();
    try {
      const workspace = await createPiTrustedNativeExecution({
        workspaceRoot,
        ownerRoot: joinPath(workspaceRoot, ".owner"),
        mode: "restricted",
      });
      const broker = createZoteroHostCapabilityBroker(() =>
        Zotero.getMainWindow(),
      );
      const definitions = createZoteroNativeToolDefinitions({
        broker,
        workspace,
      });
      const context = {
        signal: new AbortController().signal,
        onUpdate: () => undefined,
      };
      const list = await definitions
        .find((tool) => tool.capabilityId === "library.list_items")!
        .execute(
          { libraryId: Zotero.Libraries.userLibraryID, limit: 1 },
          context,
        );
      assert.equal(list.status, "completed", list.code);
      assertWorkflowHostStrictJsonValue(list.value);
      const exported = await definitions
        .find((tool) => tool.capabilityId === "library.export_annotations")!
        .execute(
          { ref: { libraryId: parent.libraryID, key: parent.key } },
          context,
        );
      assert.equal(exported.status, "completed", exported.code);
      const artifact = (exported.value as { artifact: { path: string } })
        .artifact;
      assert.include(artifact.path, workspaceRoot);
      assert.isString(await readRuntimeTextFileStrict(artifact.path));
    } finally {
      await Zotero.Items.trashTx([parent.id]);
      await removeRuntimePath(workspaceRoot).catch(() => false);
    }
  });

  it("freezes the reviewed read and mutation catalog with unique identities", async function () {
    this.timeout(30000);
    const workspaceRoot = joinPath(
      Zotero.getTempDirectory().path,
      `pi-zotero-catalog-${Date.now()}`,
    );
    await ensureRuntimeDirectoryStrict(workspaceRoot);
    try {
      const workspace = await createPiTrustedNativeExecution({
        workspaceRoot,
        ownerRoot: joinPath(workspaceRoot, ".owner"),
        mode: "trusted",
      });
      const gateway = await mutationGateway({
        broker: createZoteroHostCapabilityBroker(() => Zotero.getMainWindow()),
        workspace,
        mutations: ownerMutations(
          { kind: "conversation", ownerId: "unused" },
          workspaceRoot,
          [],
        ),
        ownerId: `catalog-${Date.now()}`,
        turnId: "catalog",
      });
      const names = gateway.catalog.tools.map((tool) => tool.name);
      assert.lengthOf(names, 37);
      assert.sameMembers(
        [...names],
        [...READ_TOOL_NAMES, ...MUTATION_TOOL_NAMES],
      );
      assert.notInclude(names, "zotero_note_upsert_payload");
      assert.notInclude(names, "zotero_library_get_note_payload");
      assert.notInclude(names, "zotero_library_list_note_payloads");
    } finally {
      await removeRuntimePath(workspaceRoot).catch(() => false);
    }
  });

  it("executes representative ordinary mutations with effect-free previews", async function () {
    this.timeout(30000);
    assert.isUndefined(
      (globalThis as { process?: { versions?: { node?: string } } }).process
        ?.versions?.node,
    );
    const workspaceRoot = joinPath(
      Zotero.getTempDirectory().path,
      `pi-zotero-mutation-${Date.now()}`,
    );
    const piRoot = joinPath(workspaceRoot, ".pi");
    const ownerId = `mutation-canary-${Date.now()}`;
    const createdItemIds: number[] = [];
    const createdCollectionIds: number[] = [];
    await ensureRuntimeDirectoryStrict(workspaceRoot);
    try {
      const { ref: ownerRef } = await createPiConversationOwner(
        { conversationId: ownerId },
        piRoot,
      );
      const receipts: string[] = [];
      const workspace = await createPiTrustedNativeExecution({
        workspaceRoot,
        ownerRoot: joinPath(workspaceRoot, ".owner"),
        mode: "trusted",
      });
      const gateway = await mutationGateway({
        broker: createZoteroHostCapabilityBroker(() => Zotero.getMainWindow()),
        workspace,
        mutations: ownerMutations(ownerRef, piRoot, receipts),
        ownerId,
        turnId: "turn-mutations",
      });
      const run = async (callId: string, name: string, args: JsonValue) => {
        const outcome = await gateway.executeBatch([
          { callId, name, arguments: args },
        ]);
        assert.isEmpty(outcome.pending, JSON.stringify(outcome.results));
        return outcome.results[0];
      };

      const libraryId = Zotero.Libraries.userLibraryID;
      const title = `Pi mutation canary ${Date.now()}`;
      const createResult = await run("create", "zotero_item_create", {
        libraryId,
        itemType: "journalArticle",
        fields: { title },
      });
      assert.equal(
        createResult.status,
        "completed",
        JSON.stringify(createResult.failure),
      );
      const createValue = createResult.value as {
        outcome: string;
        receiptId: string;
        result: { item: { ref: { libraryId: number; key: string } } };
      };
      assert.equal(createValue.outcome, "committed");
      assert.isString(createValue.receiptId);
      const itemRef = createValue.result.item.ref;
      const item = Zotero.Items.getByLibraryAndKey(
        itemRef.libraryId,
        itemRef.key,
      )!;
      assert.isOk(item);
      createdItemIds.push(item.id);

      const receiptsBeforePreview = receipts.length;
      const preview = await run("preview", "zotero_item_update_metadata", {
        itemRef,
        patch: { fields: { title: `${title} (dry run)` } },
        dryRun: true,
      });
      assert.equal(
        preview.status,
        "completed",
        JSON.stringify(preview.failure),
      );
      assert.equal(
        (preview.value as { outcome: string }).outcome,
        "would_change",
      );
      assert.equal(item.getField("title"), title);
      // A dry run performs no effect and records no domain receipt.
      assert.lengthOf(receipts, receiptsBeforePreview);

      const renamed = `${title} renamed`;
      const updated = await run("update", "zotero_item_update_metadata", {
        itemRef,
        patch: { fields: { title: renamed } },
      });
      assert.equal(
        updated.status,
        "completed",
        JSON.stringify(updated.failure),
      );
      assert.equal(item.getField("title"), renamed);

      const tagged = await run("tags", "zotero_item_update_tags", {
        itemRef,
        add: ["pi-canary"],
        remove: [],
      });
      assert.equal(tagged.status, "completed", JSON.stringify(tagged.failure));
      assert.include(
        (item.getTags() as { tag: string }[]).map((tag) => tag.tag),
        "pi-canary",
      );

      const collectionName = `Pi canary collection ${Date.now()}`;
      const collectionResult = await run(
        "collection",
        "zotero_collection_create",
        { name: collectionName, placement: { kind: "root", libraryId } },
      );
      assert.equal(
        collectionResult.status,
        "completed",
        JSON.stringify(collectionResult.failure),
      );
      const collectionRef = (
        collectionResult.value as {
          result: { collection: { ref: { libraryId: number; key: string } } };
        }
      ).result.collection.ref;
      const collection = Zotero.Collections.getByLibraryAndKey(
        collectionRef.libraryId,
        collectionRef.key,
      )!;
      assert.isOk(collection);
      createdCollectionIds.push(collection.id);

      const membership = await run(
        "membership",
        "zotero_collection_update_membership",
        { collectionRef, add: [itemRef], remove: [] },
      );
      assert.equal(
        membership.status,
        "completed",
        JSON.stringify(membership.failure),
      );
      assert.include(item.getCollections(), collection.id);

      const note = await run("note", "zotero_note_create", {
        placement: { kind: "child", parentRef: itemRef },
        content: { format: "html", value: "<p>Pi canary note</p>" },
      });
      assert.equal(note.status, "completed", JSON.stringify(note.failure));

      const trashed = await run("trash", "zotero_trash_move_items", {
        itemRefs: [itemRef],
      });
      assert.equal(
        trashed.status,
        "completed",
        JSON.stringify(trashed.failure),
      );
      assert.equal(
        (trashed.value as { result: { state: string } }).result.state,
        "trashed",
      );
      assert.isTrue(item.deleted);

      const restored = await run("restore", "zotero_trash_restore_items", {
        itemRefs: [itemRef],
      });
      assert.equal(
        restored.status,
        "completed",
        JSON.stringify(restored.failure),
      );
      assert.equal(
        (restored.value as { result: { state: string } }).result.state,
        "active",
      );
      assert.isFalse(item.deleted);

      const history = await inspectPiOwner(
        { kind: "conversation", ownerId },
        piRoot,
      );
      const recorded = history.entries.filter(
        (entry) => entry.kind === "zotero_mutation_receipt",
      );
      assert.lengthOf(recorded, 8);
      assert.lengthOf(receipts, 8);
      for (const entry of recorded) {
        const payload = entry.payload as {
          outcome: string;
          receipt: { receiptId: string };
        };
        assert.include(["committed", "unchanged"], payload.outcome);
        assert.isString(payload.receipt.receiptId);
      }
    } finally {
      await Zotero.Items.trashTx(createdItemIds).catch(() => false);
      for (const id of createdCollectionIds) {
        const collection = Zotero.Collections.get(id);
        if (collection) await collection.eraseTx().catch(() => false);
      }
      await removeRuntimePath(workspaceRoot).catch(() => false);
    }
  });

  it("authors managed notes and stages a Workspace file into managed storage", async function () {
    this.timeout(30000);
    const workspaceRoot = joinPath(
      Zotero.getTempDirectory().path,
      `pi-zotero-authoring-${Date.now()}`,
    );
    const piRoot = joinPath(workspaceRoot, ".pi");
    const ownerId = `authoring-canary-${Date.now()}`;
    let parentId: number | undefined;
    await ensureRuntimeDirectoryStrict(workspaceRoot);
    try {
      const { ref: ownerRef } = await createPiConversationOwner(
        { conversationId: ownerId },
        piRoot,
      );
      const workspace = await createPiTrustedNativeExecution({
        workspaceRoot,
        ownerRoot: joinPath(workspaceRoot, ".owner"),
        mode: "trusted",
      });
      const gateway = await mutationGateway({
        broker: createZoteroHostCapabilityBroker(() => Zotero.getMainWindow()),
        workspace,
        mutations: ownerMutations(ownerRef, piRoot, []),
        ownerId,
        turnId: "turn-authoring",
      });
      const run = async (callId: string, name: string, args: JsonValue) => {
        const outcome = await gateway.executeBatch([
          { callId, name, arguments: args },
        ]);
        assert.isEmpty(outcome.pending, JSON.stringify(outcome.results));
        return outcome.results[0];
      };

      const parent = new Zotero.Item("journalArticle");
      parent.setField("title", `Pi authoring canary ${Date.now()}`);
      await parent.saveTx();
      parentId = parent.id;
      const parentRef = { libraryId: parent.libraryID, key: parent.key };

      const custom = await run("custom", "zotero_custom_note_write", {
        target: { kind: "create", parentRef },
        title: "Canary custom note",
        markdown: "# Canary\nbody",
      });
      assert.equal(custom.status, "completed", JSON.stringify(custom.failure));
      assert.equal(
        (custom.value as { result: { note: { noteKind: string } } }).result.note
          .noteKind,
        "custom",
      );

      const digest = await run("digest", "zotero_literature_digest_upsert", {
        parentRef,
        markdown: "# Digest\nbody",
      });
      assert.equal(digest.status, "completed", JSON.stringify(digest.failure));
      assert.equal(
        (digest.value as { result: { note: { noteKind: string } } }).result.note
          .noteKind,
        "digest",
      );

      const references = await run(
        "references",
        "zotero_literature_references_upsert",
        {
          parentRef,
          references: {
            references: [
              {
                extraction: { raw: "Canary et al. 2024", confidence: 0.5 },
                bibliography: {
                  title: "Canary reference",
                  authors: ["Canary"],
                  year: 2024,
                },
                matching: {},
              },
            ],
          },
        },
      );
      assert.equal(
        references.status,
        "completed",
        JSON.stringify(references.failure),
      );
      assert.equal(
        (references.value as { result: { note: { noteKind: string } } }).result
          .note.noteKind,
        "references",
      );

      const conversationNote = await run(
        "conversation-note",
        "zotero_conversation_note_write",
        {
          target: { kind: "create", parentRef },
          title: "Canary conversation note",
          markdown: "# Conversation\nbody",
        },
      );
      assert.equal(
        conversationNote.status,
        "completed",
        JSON.stringify(conversationNote.failure),
      );
      assert.equal(
        (conversationNote.value as { result: { note: { noteKind: string } } })
          .result.note.noteKind,
        "conversation-note",
      );

      const citation = await run(
        "citation",
        "zotero_literature_citation_analysis_upsert",
        { parentRef, citationAnalysis: citationAnalysisArtifact() },
      );
      assert.equal(
        citation.status,
        "completed",
        JSON.stringify(citation.failure),
      );
      assert.equal(
        (citation.value as { result: { note: { noteKind: string } } }).result
          .note.noteKind,
        "citation-analysis",
      );

      const score = await run("score", "zotero_literature_score_upsert", {
        parentRef,
        score: literatureScoreArtifact(),
      });
      assert.equal(score.status, "completed", JSON.stringify(score.failure));
      assert.equal(
        (score.value as { result: { note: { noteKind: string } } }).result.note
          .noteKind,
        "literature-score",
      );

      await writeRuntimeBytes(
        joinPath(workspaceRoot, "canary-upload.txt"),
        new TextEncoder().encode("canary attachment body"),
      );
      const imported = await run("import", "zotero_attachment_import", {
        placement: { kind: "child", parentRef },
        path: "canary-upload.txt",
      });
      assert.equal(
        imported.status,
        "completed",
        JSON.stringify(imported.failure),
      );
      const attachmentRef = (
        imported.value as {
          result: { attachment: { ref: { libraryId: number; key: string } } };
        }
      ).result.attachment.ref;
      const attachment = Zotero.Items.getByLibraryAndKey(
        attachmentRef.libraryId,
        attachmentRef.key,
      )!;
      assert.isOk(attachment);
      assert.equal(
        attachment.attachmentLinkMode,
        Zotero.Attachments.LINK_MODE_IMPORTED_FILE,
      );

      await writeRuntimeBytes(
        joinPath(workspaceRoot, "canary-replace.txt"),
        new TextEncoder().encode("canary replacement body"),
      );
      const replaced = await run("replace", "zotero_attachment_replace_file", {
        attachmentRef,
        path: "canary-replace.txt",
        targetFilename: "canary-replace.txt",
      });
      assert.equal(
        replaced.status,
        "completed",
        JSON.stringify(replaced.failure),
      );
      assert.equal(
        (replaced.value as { result: { outcome: string } }).result.outcome,
        "replaced",
      );
    } finally {
      if (parentId !== undefined)
        await Zotero.Items.trashTx([parentId]).catch(() => false);
      await removeRuntimePath(workspaceRoot).catch(() => false);
    }
  });

  it("reports unknown state without success when the domain receipt cannot be published", async function () {
    this.timeout(30000);
    const workspaceRoot = joinPath(
      Zotero.getTempDirectory().path,
      `pi-zotero-receipt-failure-${Date.now()}`,
    );
    const piRoot = joinPath(workspaceRoot, ".pi");
    const ownerId = `receipt-failure-${Date.now()}`;
    let itemId: number | undefined;
    await ensureRuntimeDirectoryStrict(workspaceRoot);
    try {
      const { ref: ownerRef } = await createPiConversationOwner(
        { conversationId: ownerId },
        piRoot,
      );
      const workspace = await createPiTrustedNativeExecution({
        workspaceRoot,
        ownerRoot: joinPath(workspaceRoot, ".owner"),
        mode: "trusted",
      });
      let receiptAttempts = 0;
      const mutations: PiZoteroMutationDependencies = {
        ...ownerMutations(ownerRef, piRoot, []),
        recordDomainResult: async () => {
          receiptAttempts += 1;
          throw new Error("pi_domain_receipt_publish_failed");
        },
      };
      const gateway = await mutationGateway({
        broker: createZoteroHostCapabilityBroker(() => Zotero.getMainWindow()),
        workspace,
        mutations,
        ownerId,
        turnId: "turn-receipt-failure",
      });
      const item = new Zotero.Item("journalArticle");
      item.setField("title", "Pi receipt failure before");
      await item.saveTx();
      itemId = item.id;

      const outcome = await gateway.executeBatch([
        {
          callId: "fail-receipt",
          name: "zotero_item_update_metadata",
          arguments: {
            itemRef: { libraryId: item.libraryID, key: item.key },
            patch: { fields: { title: "Pi receipt failure after" } },
          },
        },
      ]);
      assert.isEmpty(outcome.pending);
      const result = outcome.results[0];
      // The write committed, but no success is published without a durable receipt.
      assert.equal(item.getField("title"), "Pi receipt failure after");
      assert.equal(
        result.status,
        "state_unknown",
        JSON.stringify(result.failure),
      );
      assert.equal(result.effectCertainty, "unknown");
      assert.equal(result.failure?.code, "state_unknown");
      assert.deepEqual(result.failure?.details, { recovery: "reconcile" });
      assert.isUndefined(result.value);
      // The effect runs once: the failure is not silently replayed.
      assert.equal(receiptAttempts, 1);
      const history = await inspectPiOwner(
        { kind: "conversation", ownerId },
        piRoot,
      );
      assert.isEmpty(
        history.entries.filter(
          (entry) => entry.kind === "zotero_mutation_receipt",
        ),
      );
    } finally {
      if (itemId !== undefined)
        await Zotero.Items.trashTx([itemId]).catch(() => false);
      await removeRuntimePath(workspaceRoot).catch(() => false);
    }
  });
});
