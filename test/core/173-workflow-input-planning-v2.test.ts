import { assert } from "chai";
import { lockSelection } from "../../src/modules/selectionContext";
import { createFailClosedZoteroHostCapabilityBroker } from "../helpers/zoteroHostCapabilityBrokerHarness";
import { createWorkflowHostApi } from "../../src/workflows/hostApi";
import { parseWorkflowManifestFromText } from "../../src/workflows/loaderContracts";
import {
  planWorkflowInput,
  type WorkflowInputPlan,
} from "../../src/workflows/workflowInputPlanning";
import {
  executeBuildRequests,
  planWorkflowExecutionUnits,
} from "../../src/workflows/runtime";
import type { WorkflowManifest } from "../../src/workflows/types";

function manifest(override: Record<string, unknown> = {}): WorkflowManifest {
  const base = {
    schemaVersion: 2,
    id: "input-planning-v2",
    label: "Input Planning v2",
    provider: "pass-through",
    trigger: { requiresSelection: true },
    inputs: {
      member: { kind: "parent" },
      grouping: { mode: "each" },
    },
    validateSelection: {
      require: {
        selection: {
          counts: { parents: { min: 1 } },
          allowMixed: false,
        },
      },
      select: { policy: "input-member", source: "selected" },
      filters: [],
    },
    hooks: { applyResult: "hooks/applyResult.js" },
  };
  return {
    ...base,
    ...override,
  } as WorkflowManifest;
}

function parse(candidate: Record<string, unknown>) {
  return parseWorkflowManifestFromText({
    raw: JSON.stringify(candidate),
    manifestPath: "/test/workflow.json",
  });
}

function parent(id: number, title: string) {
  return {
    kind: "parent" as const,
    ref: { libraryId: 1, key: `P${id}` },
    itemType: "journalArticle",
    title,
  };
}

function attachment(id: number, parentId?: number) {
  return {
    kind: "attachment" as const,
    ref: { libraryId: 1, key: `A${id}` },
    itemType: "attachment",
    title: `Attachment ${id}`,
    filename: `${id}.pdf`,
    contentType: "application/pdf",
    ...(parentId ? { parentRef: { libraryId: 1, key: `P${parentId}` } } : {}),
  };
}

async function plan(
  workflowManifest: WorkflowManifest,
  selectionContext: unknown,
): Promise<WorkflowInputPlan> {
  return planWorkflowInput({
    manifest: workflowManifest,
    selectionContext,
    mode: "execute",
  });
}

describe("workflow input planning protocol v2", function () {
  this.timeout(10_000);

  it("plans exact canonical parents without native IDs or rich selection groups", async function () {
    const refs = [
      { libraryId: 1, key: "PARENT02" },
      { libraryId: 1, key: "PARENT01" },
    ];
    const result = await plan(manifest(), {
      items: refs.map((ref) => ({
        kind: "parent",
        ref,
        itemType: "journalArticle",
        title: ref.key,
      })),
      sampledAt: "2026-09-06T00:00:00Z",
    });
    assert.equal(result.state, "enabled");
    assert.deepEqual(
      result.units.map((unit) => unit.selectionContext.items[0].ref),
      refs,
    );
    assert.deepEqual(
      result.units.map((unit) => unit.targetParentRef),
      refs,
    );
    assert.isTrue(
      result.units.every((unit) =>
        Object.isFrozen(unit.selectionContext.items),
      ),
    );
  });

  describe("manifest contract", function () {
    it("requires every explicit v2 planning boundary", function () {
      for (const key of [
        "schemaVersion",
        "trigger",
        "inputs",
        "validateSelection",
      ]) {
        const candidate = { ...manifest() } as Record<string, unknown>;
        delete candidate[key];
        const result = parse(candidate);
        assert.isNull(result.manifest, `expected missing ${key} to fail`);
      }
    });

    it("rejects removed v1 fields", function () {
      const cases = [
        { inputs: { unit: "parent" } },
        {
          inputs: {
            member: { kind: "parent" },
            grouping: { mode: "each" },
            per_parent: { min: 1 },
          },
        },
        {
          validateSelection: {
            select: {
              policy: "input-member",
              source: "selected",
              unit: "parent",
            },
            filters: [],
          },
        },
        {
          validateSelection: {
            select: { policy: "input-member", source: "selected" },
            derive: ["exportCandidates"],
            filters: [],
          },
        },
      ];
      for (const override of cases) {
        assert.isNull(parse({ ...manifest(), ...override }).manifest);
      }
    });

    it("rejects invalid, empty, and contradictory count rules", function () {
      const invalidCounts = [
        { parents: {} },
        { parents: { min: 1.5 } },
        { parents: { exact: 1, min: 1 } },
        { parents: { min: 2, max: 1 } },
        { parents: { min: 2 }, total: { max: 1 } },
        {
          parents: { max: 0 },
          children: { max: 0 },
          attachments: { max: 0 },
          notes: { max: 0 },
        },
      ];
      for (const counts of invalidCounts) {
        const candidate = manifest({
          validateSelection: {
            require: {
              selection: { counts, allowMixed: false },
            },
            select: { policy: "input-member", source: "selected" },
            filters: [],
          },
        });
        assert.isNull(
          parse(candidate as unknown as Record<string, unknown>).manifest,
          JSON.stringify(counts),
        );
      }
    });

    it("rejects trigger, selector, member, MIME, filter, and grouping contradictions", function () {
      const invalid = [
        manifest({
          trigger: { requiresSelection: false },
          validateSelection: {
            select: { policy: "input-member", source: "selected" },
            filters: [],
          },
        }),
        manifest({
          trigger: { requiresSelection: false },
          validateSelection: {
            require: {
              selection: { counts: { parents: { min: 1 } } },
            },
            select: { policy: "input-member", source: "selected" },
            filters: [],
          },
        }),
        manifest({
          trigger: { requiresSelection: false },
          inputs: {
            member: { kind: "selection" },
            grouping: { mode: "all" },
          },
          validateSelection: {
            require: { candidates: { exact: 2 } },
            select: { policy: "selection" },
            filters: [],
          },
        }),
        manifest({
          inputs: {
            member: { kind: "note", accepts: { mime: ["text/plain"] } },
            grouping: { mode: "each" },
          },
        }),
        manifest({
          inputs: {
            member: { kind: "selection" },
            grouping: { mode: "each" },
          },
          validateSelection: {
            select: { policy: "selection" },
            filters: [],
          },
        }),
        manifest({
          inputs: {
            member: { kind: "parent" },
            grouping: { mode: "each" },
          },
          validateSelection: {
            select: { policy: "literature-source" },
            filters: [],
          },
        }),
      ];
      for (const candidate of invalid) {
        assert.isNull(
          parse(candidate as unknown as Record<string, unknown>).manifest,
        );
      }
    });
  });

  describe("confirmed planning", function () {
    it("preserves repeated refs and order in whole-selection units", async function () {
      const selection = lockSelection([
        parent(2, "Second"),
        parent(1, "First"),
        parent(2, "Second"),
      ]);
      const result = await plan(
        manifest({
          inputs: { member: { kind: "selection" }, grouping: { mode: "all" } },
          validateSelection: { select: { policy: "selection" }, filters: [] },
        }),
        selection,
      );
      assert.deepEqual(result.units[0].selectionContext.items, selection.items);
    });
    it("evaluates generated note readiness from canonical note facts", async function () {
      const ref = { libraryId: 1, key: "PARENT01" };
      const noteRef = { libraryId: 1, key: "NOTE0001" };
      const broker = createFailClosedZoteroHostCapabilityBroker({
        library: {
          getItemNotes: async () => ({
            notes: [
              {
                ref: noteRef,
                parentRef: ref,
                title: "Digest",
                textExcerpt: "",
                textLength: 0,
                htmlLength: 0,
                revision: "1",
              },
            ],
            limit: 100,
            returned: 1,
            total: 1,
            hasMore: false,
            nextCursor: null,
          }),
          getNoteDetail: async () => ({
            ref: noteRef,
            parentRef: ref,
            title: "Digest",
            content: '<div data-zs-note-kind="digest">Digest</div>',
            format: "html",
            revision: "1",
          }),
          listNotePayloads: async () => ({
            payloads: [],
            scanned: 0,
            limit: 100,
            returned: 0,
            total: null,
            hasMore: false,
            nextCursor: null,
          }),
        },
      });
      const result = await planWorkflowInput({
        manifest: manifest({
          validateSelection: {
            select: { policy: "input-member", source: "selected" },
            filters: [
              {
                kind: "generated-note-readiness",
                phase: "availability",
                artifacts: [{ id: "digest", noteKinds: ["digest"] }],
                modes: [
                  { id: "ready", allAvailable: ["digest"] },
                  { id: "missing", default: true },
                ],
                acceptModes: ["ready"],
              },
            ],
          },
        }),
        selectionContext: lockSelection([
          { kind: "parent", ref, itemType: "journalArticle" },
        ]),
        runtime: {
          hostApi: { ...createWorkflowHostApi(), library: broker.library },
        },
        mode: "execute",
      });
      assert.equal(result.state, "enabled");
      assert.lengthOf(result.units, 1);
    });
    it("retains a shared portable parent when all-group members use distinct ref objects", async function () {
      const result = await plan(
        manifest({
          inputs: { member: { kind: "attachment" }, grouping: { mode: "all" } },
          validateSelection: {
            select: { policy: "input-member", source: "selected" },
            filters: [],
          },
        }),
        lockSelection([attachment(11, 2), attachment(12, 2)]),
      );
      assert.deepEqual(result.units[0].targetParentRef, {
        libraryId: 1,
        key: "P2",
      });
    });
    it("validates a global parent minimum once before each grouping", async function () {
      const result = await plan(
        manifest({
          validateSelection: {
            require: {
              selection: {
                counts: { parents: { min: 2 } },
                allowMixed: false,
              },
            },
            select: { policy: "input-member", source: "selected" },
            filters: [],
          },
        }),
        lockSelection([parent(1, "First"), parent(2, "Second")]),
      );

      assert.equal(result.state, "enabled");
      assert.deepEqual(result.selectionCounts, {
        parents: 2,
        children: 0,
        attachments: 0,
        notes: 0,
        total: 2,
      });
      assert.deepEqual(
        result.units.map((unit) => ({
          memberCount: unit.memberCount,
          identities: unit.memberIdentities,
          label: unit.taskName,
        })),
        [
          { memberCount: 1, identities: ["parent:1:P1"], label: "First" },
          { memberCount: 1, identities: ["parent:1:P2"], label: "Second" },
        ],
      );
    });

    it("builds every prepared unit without revalidating global selection counts", async function () {
      const workflowManifest = manifest({
        provider: "generic-http",
        validateSelection: {
          require: {
            selection: {
              counts: { parents: { min: 2 } },
              allowMixed: false,
            },
          },
          select: { policy: "input-member", source: "selected" },
          filters: [],
        },
        hooks: {
          buildRequest: "hooks/buildRequest.js",
          applyResult: "hooks/applyResult.js",
        },
      });
      const selectionContext = lockSelection([
        parent(1, "First"),
        parent(2, "Second"),
      ]);
      const workflow = {
        rootDir: "/test",
        manifestPath: "/test/workflow.json",
        manifest: workflowManifest,
        hooks: {
          buildRequest: async ({ selectionContext: scoped }: any) => ({
            selectedParent: scoped.items[0]?.ref.key || "missing",
          }),
          applyResult: async () => undefined,
        },
      } as any;
      const planned = await planWorkflowExecutionUnits({
        workflow,
        selectionContext,
      });

      const built = await Promise.all(
        planned.units.map((preparedUnit) =>
          executeBuildRequests({
            workflow,
            selectionContext,
            preparedUnit,
          }),
        ),
      );

      assert.deepEqual(
        built.map((requests) => requests[0].selectedParent),
        ["P1", "P2"],
      );
    });

    it("aggregates all candidates into one immutable unit", async function () {
      const result = await plan(
        manifest({
          inputs: {
            member: { kind: "parent" },
            grouping: { mode: "all" },
          },
        }),
        lockSelection([parent(1, "First"), parent(2, "Second")]),
      );
      assert.lengthOf(result.units, 1);
      assert.equal(result.units[0].memberCount, 2);
      assert.deepEqual(result.units[0].memberIdentities, [
        "parent:1:P1",
        "parent:1:P2",
      ]);
      assert.isFrozen(result);
      assert.isFrozen(result.units);
      assert.isFrozen(result.units[0]);
      assert.isFrozen(result.units[0].members);
      assert.isFrozen(result.units[0].members[0].scopedContext);
      assert.isFrozen(result.units[0].members[0].scopedContext.items);
      assert.isFrozen(result.units[0].selectionContext.items);
    });

    it("groups attachments by stable first-seen parent and skips orphans once", async function () {
      const result = await plan(
        manifest({
          inputs: {
            member: {
              kind: "attachment",
              accepts: { mime: ["application/pdf"] },
            },
            grouping: { mode: "parent" },
          },
          validateSelection: {
            select: { policy: "input-member", source: "selected" },
            filters: [],
          },
        }),
        lockSelection([
          attachment(11, 2),
          attachment(12, 1),
          attachment(13, 2),
          attachment(14),
        ]),
      );

      assert.deepEqual(
        result.units.map((unit) => ({
          parent: unit.targetParentIdentity,
          members: unit.memberIdentities,
        })),
        [
          {
            parent: "parent:1:P2",
            members: ["attachment:1:A11", "attachment:1:A13"],
          },
          { parent: "parent:1:P1", members: ["attachment:1:A12"] },
        ],
      );
      assert.deepInclude(result.stats.candidates, {
        total: 4,
        accepted: 3,
        skipped: 1,
      });
      assert.deepEqual(result.stats.candidates.reasons, {
        "missing-parent": 1,
      });
    });

    it("scopes each atomic candidate without retaining unrelated selection arrays", async function () {
      const selectedParent = parent(1, "Parent");
      const selectedAttachment = attachment(11, 1);
      const selectedChild = {
        kind: "child" as const,
        ref: { libraryId: 1, key: "C21" },
        itemType: "annotation",
        parentRef: { libraryId: 1, key: "P1" },
        title: "Child",
      };
      const selectedNote = {
        kind: "note" as const,
        ref: { libraryId: 1, key: "N31" },
        itemType: "note",
        parentRef: { libraryId: 1, key: "P1" },
        title: "Note",
      };
      const selectedItems = [
        selectedParent,
        selectedAttachment,
        selectedChild,
        selectedNote,
      ];
      const cases = [
        {
          kind: "parent",
          plural: "parents",
          expected: selectedParent,
        },
        {
          kind: "attachment",
          plural: "attachments",
          expected: selectedAttachment,
        },
        {
          kind: "child",
          plural: "children",
          expected: selectedChild,
        },
        {
          kind: "note",
          plural: "notes",
          expected: selectedNote,
        },
      ] as const;

      for (const testCase of cases) {
        const result = await plan(
          manifest({
            inputs: {
              member: { kind: testCase.kind },
              grouping: { mode: "each" },
            },
            validateSelection: {
              select: { policy: "input-member", source: "selected" },
              filters: [],
            },
          }),
          lockSelection(selectedItems),
        );

        assert.lengthOf(result.units, 1, testCase.kind);
        const scoped = result.units[0].selectionContext;
        assert.deepEqual(scoped.items, [testCase.expected]);
      }
    });

    it("supports child as an atomic selected member", async function () {
      const result = await plan(
        manifest({
          inputs: {
            member: { kind: "child" },
            grouping: { mode: "each" },
          },
          validateSelection: {
            select: { policy: "input-member", source: "selected" },
            filters: [],
          },
        }),
        lockSelection([
          {
            kind: "child",
            ref: { libraryId: 1, key: "C31" },
            itemType: "annotation",
            parentRef: { libraryId: 1, key: "P3" },
            title: "Child",
          },
        ]),
      );
      assert.equal(result.candidates[0].kind, "child");
      assert.equal(result.candidates[0].identity, "child:1:C31");
      assert.equal(result.units[0].targetParentIdentity, "parent:1:P3");
    });
  });
});
