import { assert } from "chai";
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
  return { item: { id, key: `P${id}`, title } };
}

function attachment(id: number, parentId?: number) {
  return {
    item: {
      id,
      key: `A${id}`,
      title: `Attachment ${id}`,
      parentItemID: parentId ?? null,
      data: { contentType: "application/pdf" },
    },
    filePath: `/tmp/${id}.pdf`,
    mimeType: "application/pdf",
    ...(parentId
      ? { parent: { id: parentId, title: `Parent ${parentId}` } }
      : {}),
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
        {
          items: { parents: [parent(1, "First"), parent(2, "Second")] },
          summary: { parentCount: 2 },
        },
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
          { memberCount: 1, identities: ["parent:P1"], label: "First" },
          { memberCount: 1, identities: ["parent:P2"], label: "Second" },
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
      const selectionContext = {
        items: { parents: [parent(1, "First"), parent(2, "Second")] },
        summary: { parentCount: 2 },
      };
      const workflow = {
        rootDir: "/test",
        manifestPath: "/test/workflow.json",
        manifest: workflowManifest,
        hooks: {
          buildRequest: async ({ selectionContext: scoped }: any) => ({
            selectedParent: scoped.items?.parents?.[0]?.item?.key || "missing",
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
        {
          items: { parents: [parent(1, "First"), parent(2, "Second")] },
          summary: { parentCount: 2 },
        },
      );
      assert.lengthOf(result.units, 1);
      assert.equal(result.units[0].memberCount, 2);
      assert.deepEqual(result.units[0].memberIdentities, [
        "parent:P1",
        "parent:P2",
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
        {
          items: {
            attachments: [
              attachment(11, 2),
              attachment(12, 1),
              attachment(13, 2),
              attachment(14),
            ],
          },
          summary: { attachmentCount: 4 },
        },
      );

      assert.deepEqual(
        result.units.map((unit) => ({
          parent: unit.targetParentIdentity,
          members: unit.memberIdentities,
        })),
        [
          {
            parent: "parent-id:2",
            members: ["attachment:A11", "attachment:A13"],
          },
          { parent: "parent-id:1", members: ["attachment:A12"] },
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
        {
          items: {
            children: [
              {
                item: { id: 31, key: "C31", title: "Child" },
                parent: { id: 3, title: "Parent" },
              },
            ],
          },
          summary: { childCount: 1 },
        },
      );
      assert.equal(result.candidates[0].kind, "child");
      assert.equal(result.candidates[0].identity, "child:C31");
      assert.equal(result.units[0].targetParentIdentity, "parent-id:3");
    });
  });
});
