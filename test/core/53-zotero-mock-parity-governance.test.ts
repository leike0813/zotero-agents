import { assert } from "chai";
import { handlers } from "../../src/handlers";
import { isFullTestMode } from "./testMode";
import { joinPath, mkTempDir, writeUtf8 } from "./workflow-test-utils";

type MockParityDescriptor = {
  runtime?: string;
  contractVersion?: string;
  capabilities?: Record<string, boolean>;
  drifts?: Array<{
    id?: string;
    scope?: string;
    risk?: string;
    status?: string;
    summary?: string;
    closureCriteria?: string;
  }>;
};

function getMockParityDescriptor() {
  const runtime = Zotero as unknown as {
    __parity?: MockParityDescriptor;
  };
  const descriptor = runtime.__parity;
  if (!descriptor || descriptor.runtime !== "node-mock") {
    return null;
  }
  return descriptor;
}

describe("zotero mock parity governance", function () {
  this.timeout(30000);

  it("exposes mock parity descriptor with contract metadata", function () {
    const descriptor = getMockParityDescriptor();
    if (!descriptor) {
      this.skip();
      return;
    }
    assert.equal(descriptor.runtime, "node-mock");
    assert.equal(descriptor.contractVersion, "2026-02-hb08");
    assert.isTrue(
      Boolean(descriptor.capabilities?.attachmentsRelativePathResolution),
    );
    assert.isTrue(Boolean(descriptor.capabilities?.trashMarksDeleted));
    assert.isTrue(Boolean(descriptor.capabilities?.readonlyDeletedField));
    assert.isTrue(Boolean(descriptor.capabilities?.itemLookupSemantics));
    assert.isTrue(Boolean(descriptor.capabilities?.fieldValidationSemantics));
  });

  it("keeps attachments-relative resolution semantics for createFromPath", async function () {
    const descriptor = getMockParityDescriptor();
    if (!descriptor) {
      this.skip();
      return;
    }

    const tempDir = await mkTempDir("zotero-mock-parity-path");
    const pdfPath = joinPath(tempDir, "path-contract.pdf");
    await writeUtf8(pdfPath, "pdf");

    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Mock Parity Path Parent" },
    });

    const originalResolveRelativePath = Zotero.Attachments.resolveRelativePath;
    let calledWith = "";
    Zotero.Attachments.resolveRelativePath = ((value: string) => {
      calledWith = String(value || "");
      return pdfPath;
    }) as typeof Zotero.Attachments.resolveRelativePath;

    try {
      const attachment = await handlers.attachment.createFromPath({
        parent,
        dataPath: "attachments:2026/path-contract.pdf",
        title: "path-contract.pdf",
        mimeType: "application/pdf",
      });
      const attachmentPath = await attachment.getFilePathAsync?.();
      assert.equal(calledWith, "attachments:2026/path-contract.pdf");
      assert.equal(attachmentPath, pdfPath);
    } finally {
      Zotero.Attachments.resolveRelativePath = originalResolveRelativePath;
    }
  });

  it("keeps deleted semantics and readonly deleted flag contract", async function () {
    const descriptor = getMockParityDescriptor();
    if (!descriptor) {
      this.skip();
      return;
    }

    const item = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Mock Parity Deleted Contract" },
    });

    const maybeTrash = (
      Zotero.Items as unknown as {
        trashTx?: (ids: number[]) => Promise<void>;
      }
    ).trashTx;
    assert.isFunction(maybeTrash);
    await maybeTrash!([item.id]);

    const deletedItem = Zotero.Items.get(item.id);
    assert.isOk(deletedItem);
    assert.isTrue(
      Boolean((deletedItem as unknown as { deleted?: boolean }).deleted),
    );

    let assignmentError: unknown = null;
    try {
      (deletedItem as unknown as { deleted?: boolean }).deleted = false;
    } catch (error) {
      assignmentError = error;
    }

    assert.isTrue(
      Boolean((deletedItem as unknown as { deleted?: boolean }).deleted),
    );
    if (assignmentError) {
      assert.match(String(assignmentError), /typeerror|readonly|setter/i);
    }
  });

  it("keeps key runtime lookup semantics aligned across get/getAsync/getByLibraryAndKey", async function () {
    const descriptor = getMockParityDescriptor();
    if (!descriptor) {
      this.skip();
      return;
    }

    const tempDir = await mkTempDir("zotero-mock-parity-lookup");
    const pdfPath = joinPath(tempDir, "lookup-contract.pdf");
    await writeUtf8(pdfPath, "pdf");
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Mock Parity Lookup Parent" },
    });

    const attachment = await handlers.attachment.createFromPath({
      parent,
      path: pdfPath,
      title: "lookup-contract.pdf",
      mimeType: "application/pdf",
    });
    const parentAttachmentIds =
      Zotero.Items.get(parent.id)?.getAttachments() || [];
    assert.include(parentAttachmentIds, attachment.id);

    const byId = Zotero.Items.get(attachment.id);
    const byKey = Zotero.Items.getByLibraryAndKey(
      attachment.libraryID,
      attachment.key,
    );
    const byAsync = await (Zotero.Items.getAsync?.(attachment.id) ||
      Promise.resolve(undefined));

    assert.isOk(byId);
    assert.isOk(byKey);
    assert.isOk(byAsync);
    assert.equal(byId?.id, byKey?.id);
    assert.equal(byId?.id, byAsync?.id);
  });

  it("tracks high-risk drift entries in full mode", function () {
    const descriptor = getMockParityDescriptor();
    if (!descriptor) {
      this.skip();
      return;
    }
    if (!isFullTestMode()) {
      this.skip();
      return;
    }

    const driftIds = (descriptor.drifts || []).map((entry) => entry.id);
    assert.includeMembers(driftIds, ["DR-001", "DR-002", "DR-003"]);
    const drivePathDrift = (descriptor.drifts || []).find(
      (entry) => entry.id === "DR-001",
    );
    assert.equal(drivePathDrift?.risk, "high");
    assert.equal(drivePathDrift?.status, "open");
  });
});
