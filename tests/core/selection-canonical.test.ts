import { assert } from "chai";
import {
  buildSelectionContext,
  readSelectionContext,
} from "../../src/modules/selectionContext";
import { createFailClosedZoteroHostCapabilityBroker } from "../helpers/zoteroHostCapabilityBrokerHarness";
import { ZoteroHostCapabilityError } from "../../src/modules/zoteroHostCapabilityBroker";
import { compileDeclarativeRequest } from "../../src/workflows/declarativeRequestCompiler";
import { lockSelection } from "../../src/modules/selectionContext";
import type { WorkflowManifest } from "../../src/workflows/types";

describe("canonical locked selection", function () {
  it("compiles portable task identity without native IDs or source path aliases", async function () {
    const ref = { libraryId: 1, key: "PARENT01" };
    const request = await compileDeclarativeRequest({
      kind: "pass-through.run.v1",
      selectionContext: lockSelection([
        { kind: "parent", ref, itemType: "journalArticle", title: "Paper" },
      ]),
      manifest: {
        id: "canonical",
        label: "Canonical",
        provider: "pass-through",
      } as WorkflowManifest,
    });
    assert.deepInclude(request, { targetParentRef: ref, taskName: "Paper" });
    assert.notProperty(request, "targetParentID");
    assert.notProperty(request, "sourceAttachmentPaths");
  });
  it("resolves uploads from the current canonical descriptor and fails on unavailable files", async function () {
    const ref = { libraryId: 1, key: "ATTACH01" };
    const selectionContext = lockSelection([
      {
        kind: "attachment",
        ref,
        itemType: "attachment",
        filename: "paper.md",
        contentType: "text/markdown",
      },
    ]);
    const manifest = {
      id: "upload",
      label: "Upload",
      provider: "skillrunner",
      request: {
        kind: "skillrunner.job.v1",
        create: { skill_id: "analysis", mode: "auto" },
        input: {
          upload: { files: [{ key: "source", from: "selected.markdown" }] },
        },
      },
    } as WorkflowManifest;
    let available = true;
    const broker = createFailClosedZoteroHostCapabilityBroker({
      library: {
        getItemDetail: async () => ({
          kind: "attachment",
          item: {
            ref,
            title: "Paper",
            filename: "paper.md",
            contentType: "text/markdown",
            url: null,
            linkMode: "imported_file",
            role: "ordinary",
            createdAt: "2026-01-01",
            file: available
              ? { state: "available", path: "/managed/paper.md" }
              : { state: "missing" },
          },
        }),
      },
    });
    const request = await compileDeclarativeRequest({
      kind: "skillrunner.job.v1",
      selectionContext,
      manifest,
      hostApi: broker,
    });
    assert.deepInclude(request, {
      upload_files: [{ key: "source", path: "/managed/paper.md" }],
      sourceAttachmentRefs: [ref],
    });
    available = false;
    try {
      await compileDeclarativeRequest({
        kind: "skillrunner.job.v1",
        selectionContext,
        manifest,
        hostApi: broker,
      });
      assert.fail("expected unavailable source failure");
    } catch (error) {
      assert.include(String(error), "unavailable");
    }
  });
  it("locks exact ordered page facts without rereading item details", async function () {
    const parentRef = { libraryId: 1, key: "PARENT01" };
    const childRef = { libraryId: 1, key: "ATTACH01" };
    const broker = createFailClosedZoteroHostCapabilityBroker({
      context: {
        getSelectedItems: async (request) =>
          request?.cursor
            ? {
                items: [{ ref: parentRef, itemType: "journalArticle" }],
                returned: 1,
                total: 2,
                hasMore: false,
                nextCursor: null,
              }
            : {
                items: [{ ref: childRef, parentRef, itemType: "attachment" }],
                returned: 1,
                total: 2,
                hasMore: true,
                nextCursor: "next",
              },
      },
    });
    const selection = await readSelectionContext(broker);
    assert.deepEqual(
      selection.items.map((item) => item.ref),
      [childRef, parentRef],
    );
    assert.deepEqual(selection.items[0].parentRef, parentRef);
    assert.isTrue(Object.isFrozen(selection.items));
  });

  it("propagates a changed basis without returning a partial selection", async function () {
    const broker = createFailClosedZoteroHostCapabilityBroker({
      context: {
        getSelectedItems: async (request) => {
          if (request?.cursor)
            throw new ZoteroHostCapabilityError("conflict", "changed", {
              reason: "concurrent_modification",
            });
          return {
            items: [
              {
                ref: { libraryId: 1, key: "PARENT01" },
                itemType: "journalArticle",
              },
            ],
            returned: 1,
            total: 2,
            hasMore: true,
            nextCursor: "next",
          };
        },
      },
    });
    try {
      await readSelectionContext(broker);
      assert.fail("expected failure");
    } catch (error) {
      assert.equal(
        (error as ZoteroHostCapabilityError).details.reason,
        "concurrent_modification",
      );
    }
  });

  it("rejects incomplete explicit refs before reading library facts", async function () {
    const broker = createFailClosedZoteroHostCapabilityBroker();
    try {
      await buildSelectionContext([{ key: "PARENT01" } as never], broker);
      assert.fail("expected failure");
    } catch (error) {
      assert.equal(
        (error as ZoteroHostCapabilityError).code,
        "invalid_request",
      );
    }
  });
});
