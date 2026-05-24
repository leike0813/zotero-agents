import { assert } from "chai";
import { setDebugModeOverrideForTests } from "../../src/modules/debugMode";
import { WORKFLOW_HOST_API_VERSION } from "../../src/workflows/hostApi";
import { encodeBase64Utf8 } from "../zotero/workflow-test-utils";
import { decodeBase64Utf8 } from "../../workflows_builtin/literature-workbench-package/lib/htmlCodec.mjs";
import {
  buildPredictedCitekey,
  DEFAULT_CITEKEY_TEMPLATE,
} from "../../workflows_builtin/literature-workbench-package/lib/citekeyTemplate.mjs";
import {
  normalizeNoteSelectionEntry,
  parseReferencesPayload,
  replaceReferencesTable,
  updatePayloadBlock,
} from "../../workflows_builtin/literature-workbench-package/lib/referencesNote.mjs";
import { withPackageRuntimeScope } from "../../workflows_builtin/literature-workbench-package/lib/runtime.mjs";

describe("literature-workbench-package lib", function () {
  afterEach(function () {
    setDebugModeOverrideForTests();
  });

  it("builds legacy and bbt-lite predicted citekeys deterministically", function () {
    const reference = {
      title: "Signal Flow Modeling",
      year: "2033",
      author: ["Alice Zhao"],
    };

    assert.equal(
      buildPredictedCitekey(reference, DEFAULT_CITEKEY_TEMPLATE),
      "zhao_signal-flow_2033",
    );
    assert.equal(
      buildPredictedCitekey(
        reference,
        "auth.lower + '_' + title.nopunct.skipwords.select(1,1).lower + '-' + title.nopunct.skipwords.select(2,1).lower + '_' + year",
      ),
      "zhao_signal-flow_2033",
    );
  });

  it("roundtrips references payload block and rendered table content", function () {
    const payloadJson = JSON.stringify({
      version: 1,
      format: "json",
      references: [{ title: "Original Title", year: "2024", author: ["Chen"] }],
    });
    const noteContent = [
      '<div data-zs-note-kind="references">',
      '<table data-zs-view="references-table"><tbody><tr><td>old</td></tr></tbody></table>',
      `<span data-zs-block="payload" data-zs-payload="references-json" data-zs-version="1" data-zs-encoding="base64" data-zs-value="${encodeBase64Utf8(payloadJson)}"></span>`,
      "</div>",
    ].join("\n");

    const { payload, payloadTag } = parseReferencesPayload(noteContent);
    assert.equal(payload.references?.[0]?.title, "Original Title");

    const nextPayload = {
      ...payload,
      references: [{ title: "Updated Title", year: "2025", author: ["Li"] }],
    };
    const withPayload = updatePayloadBlock(
      noteContent,
      payloadTag,
      nextPayload,
    );
    const withTable = replaceReferencesTable(
      withPayload,
      '<table data-zs-view="references-table"><tbody><tr><td>updated</td></tr></tbody></table>',
    );
    const reparsed = parseReferencesPayload(withTable);

    assert.equal(reparsed.payload.references?.[0]?.title, "Updated Title");
    assert.include(withTable, 'data-zs-view="references-table"');
    assert.include(withTable, "updated");
  });

  it("note helpers resolve parent items through runtime.hostApi.items", async function () {
    const normalized = await withPackageRuntimeScope(
      {
        hostApiVersion: 2,
        hostApi: {
          items: {
            get(id: number) {
              return id === 7
                ? {
                    getField(field: string) {
                      return field === "title" ? "Scoped Parent" : "";
                    },
                  }
                : null;
            },
          },
        },
      },
      () =>
        normalizeNoteSelectionEntry({
          id: 11,
          key: "NOTE11",
          itemType: "note",
          libraryID: 1,
          parentItemID: 7,
          getField(field: string) {
            return field === "title" ? "Child Note" : "";
          },
          toJSON() {
            return {};
          },
          getTags() {
            return [];
          },
          getCollections() {
            return [];
          },
        }),
    );

    assert.equal(normalized.parent?.title, "Scoped Parent");
  });

  it("accepts current hostApi v5 as a compatible v2 extension", async function () {
    const normalized = await withPackageRuntimeScope(
      {
        hostApiVersion: WORKFLOW_HOST_API_VERSION,
        hostApi: {
          items: {
            get(id: number) {
              return id === 7
                ? {
                    getField(field: string) {
                      return field === "title" ? "HostApi v5 Parent" : "";
                    },
                  }
                : null;
            },
          },
        },
      },
      () =>
        normalizeNoteSelectionEntry({
          id: 11,
          key: "NOTE11",
          itemType: "note",
          libraryID: 1,
          parentItemID: 7,
          getField(field: string) {
            return field === "title" ? "Child Note" : "";
          },
          toJSON() {
            return {};
          },
          getTags() {
            return [];
          },
          getCollections() {
            return [];
          },
        }),
    );

    assert.equal(WORKFLOW_HOST_API_VERSION, 5);
    assert.equal(normalized.parent?.title, "HostApi v5 Parent");
  });

  it("hostApi-backed item accessors work in debug mode without raw Zotero globals", async function () {
    const normalized = await withPackageRuntimeScope(
      {
        hostApiVersion: 2,
        hostApi: {
          items: {
            get(id: number) {
              return id === 7
                ? {
                    getField(field: string) {
                      return field === "title" ? "HostApi Parent" : "";
                    },
                  }
                : null;
            },
          },
        },
        workflowId: "reference-matching",
        packageId: "literature-workbench-package",
        hookName: "filterInputs",
        debugMode: true,
      },
      () =>
        normalizeNoteSelectionEntry({
          id: 11,
          key: "NOTE11",
          itemType: "note",
          libraryID: 1,
          parentItemID: 7,
          getField(field: string) {
            return field === "title" ? "Child Note" : "";
          },
          toJSON() {
            return {};
          },
          getTags() {
            return [];
          },
          getCollections() {
            return [];
          },
        }),
    );

    assert.equal(normalized.parent?.title, "HostApi Parent");
  });

  it("emits structured diagnostics when hostApi.items is missing in debug mode", async function () {
    setDebugModeOverrideForTests(true);
    const captured: Array<Record<string, unknown>> = [];

    try {
      await withPackageRuntimeScope(
        {
          hostApiVersion: 2,
          hostApi: {
            logging: {
              appendRuntimeLog(entry: Record<string, unknown>) {
                captured.push(entry);
              },
            },
          },
          debugMode: true,
          workflowId: "reference-matching",
          packageId: "literature-workbench-package",
          workflowSourceKind: "builtin",
          hookName: "applyResult",
        },
        () =>
          normalizeNoteSelectionEntry({
            id: 11,
            key: "NOTE11",
            itemType: "note",
            libraryID: 1,
            parentItemID: 7,
            getField() {
              return "";
            },
            toJSON() {
              return {};
            },
            getTags() {
              return [];
            },
            getCollections() {
              return [];
            },
          }),
      );
      assert.fail("expected items accessor to fail");
    } catch (error) {
      assert.include(String(error), "host capability missing: items");
    }

    assert.isOk(
      captured.find((entry) => entry.stage === "runtime-items-missing"),
      JSON.stringify(captured, null, 2),
    );
  });

  it("accepts runtime candidates that only expose codec capabilities", function () {
    const decoded = decodeBase64Utf8("5rWL6K+V", {
      atob: (text: string) => Buffer.from(text, "base64").toString("binary"),
      TextDecoder,
      workflowId: "reference-matching",
      packageId: "literature-workbench-package",
      hookName: "filterInputs",
      debugMode: true,
    });

    assert.equal(decoded, "测试");
  });
});
