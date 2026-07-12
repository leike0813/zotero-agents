import { assert } from "chai";
import { evaluateTagCompliance } from "../../workflows_builtin/literature-workbench-package/lib/tagCompliance.mjs";
import { applyResult } from "../../workflows_builtin/literature-workbench-package/tag-auditor/hooks/applyResult.mjs";

describe("tag compliance evaluation", function () {
  it("reports only active tags outside the controlled vocabulary", function () {
    const result = evaluateTagCompliance({
      tags: ["method:review", " topic:AI ", "topic:AI", ""],
      controlledTags: ["method:review"],
    });

    assert.isFalse(result.compliant);
    assert.deepEqual(result.nonCompliantTags, ["topic:AI"]);
  });

  it("accepts an item whose active tags all belong to the vocabulary", function () {
    const result = evaluateTagCompliance({
      tags: ["method:review", "topic:AI"],
      controlledTags: ["method:review", "topic:AI"],
    });

    assert.isTrue(result.compliant);
    assert.deepEqual(result.nonCompliantTags, []);
  });

  it("audits all top-level regular library items without a selection", async function () {
    const replacements: Array<{
      libraryId: number;
      entries: Array<{ itemKey: string; compliant: boolean }>;
    }> = [];
    const runtime = {
      hostApiVersion: 7,
      hostApi: {
        items: {
          async getAll() {
            return [
              {
                libraryID: 1,
                key: "NONCOMPLIANT",
                isRegularItem: () => true,
                getTags: () => [{ tag: "legacy:tag" }],
              },
              {
                libraryID: 1,
                key: "COMPLIANT",
                isRegularItem: () => true,
                getTags: () => [{ tag: "method:review" }],
              },
              {
                libraryID: 1,
                key: "CHILD",
                parentID: 12,
                isRegularItem: () => true,
                getTags: () => [{ tag: "legacy:tag" }],
              },
            ];
          },
        },
        synthesis: {
          async exportTagVocabularyForRegulator() {
            return ["method:review"];
          },
          async replaceTagAuditRecords(args: {
            libraryId: number;
            entries: Array<{ itemKey: string; compliant: boolean }>;
          }) {
            replacements.push(args);
          },
        },
      },
    };

    const result = await applyResult({ runtime });

    assert.lengthOf(replacements, 1);
    assert.equal(replacements[0]?.libraryId, 1);
    assert.deepEqual(
      replacements[0]?.entries.map(({ itemKey, compliant }) => ({
        itemKey,
        compliant,
      })),
      [
        { itemKey: "NONCOMPLIANT", compliant: false },
        { itemKey: "COMPLIANT", compliant: true },
      ],
    );
    assert.deepInclude(result.libraries[0], {
      libraryId: 1,
      audited: 2,
      needsTagRegulation: 1,
    });
  });
});
