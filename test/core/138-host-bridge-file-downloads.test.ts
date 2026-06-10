import { assert } from "chai";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import {
  configureHostBridgeServerForTests,
  handleHostBridgeHttpRequestForTests,
  resetHostBridgeServerForTests,
  rotateHostBridgeMasterToken,
} from "../../src/modules/hostBridgeServer";
import {
  registerHostBridgeExportFile,
  registerHostBridgeFileHandle,
  registerHostBridgeWorkflowArtifactFile,
  resetHostBridgeFileRegistryForTests,
} from "../../src/modules/hostBridgeFileRegistry";
import {
  configureHostBridgeGlobalApprovalHandlerForTests,
  resetHostBridgePermissionManagerForTests,
} from "../../src/modules/hostBridgePermissionManager";
import { setPref } from "../../src/utils/prefs";

function parseRawHttpResponse(raw: string) {
  const splitIndex = raw.indexOf("\r\n\r\n");
  const head = splitIndex >= 0 ? raw.slice(0, splitIndex) : raw;
  const body = splitIndex >= 0 ? raw.slice(splitIndex + 4) : "";
  const status = Number(head.match(/^HTTP\/1\.1\s+(\d+)/)?.[1] || 0);
  return {
    status,
    head,
    body,
    json: body.trim().startsWith("{") ? JSON.parse(body) : null,
  };
}

async function bridgeRequest(args: {
  token: string;
  method: string;
  path: string;
  body?: unknown;
}) {
  return parseRawHttpResponse(
    await handleHostBridgeHttpRequestForTests({
      method: args.method,
      path: args.path,
      headers: {
        authorization: `Bearer ${args.token}`,
      },
      body:
        typeof args.body === "undefined"
          ? undefined
          : JSON.stringify(args.body),
    }),
  );
}

async function writeTempFile(name: string, content: string) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "zs-bridge-file-"));
  const filePath = path.join(root, name);
  await fs.writeFile(filePath, content, "utf8");
  return { root, filePath };
}

describe("host bridge file downloads", function () {
  afterEach(async function () {
    resetHostBridgeServerForTests();
    resetHostBridgeFileRegistryForTests();
    resetHostBridgePermissionManagerForTests();
    setPref("hostBridgeMasterTokenEncryptedJson", "");
    setPref("hostBridgeMasterTokenMasked", "");
    setPref("hostBridgeMasterTokenUpdatedAt", "");
    setPref("hostBridgeMasterTokenKeyMaterial", "");
  });

  it("downloads only registered file handles without approval", async function () {
    const token = configureHostBridgeServerForTests({ token: "file-token" });
    const { root, filePath } = await writeTempFile(
      "paper.txt",
      "registered file content",
    );
    configureHostBridgeGlobalApprovalHandlerForTests(() => {
      throw new Error("download must not request approval");
    });
    try {
      const descriptor = await registerHostBridgeExportFile({
        localPath: filePath,
        displayName: "../paper.txt",
        contentType: "text/plain",
      });

      const parsed = await bridgeRequest({
        token,
        method: "GET",
        path: `/bridge/v1/files/${descriptor.fileId}`,
      });

      assert.strictEqual(parsed.status, 200);
      assert.include(parsed.head, "Content-Type: text/plain");
      assert.include(
        parsed.head,
        'Content-Disposition: attachment; filename="paper.txt"',
      );
      assert.strictEqual(parsed.body, "registered file content");
      assert.notInclude(JSON.stringify(descriptor), filePath);

      const artifact = await registerHostBridgeWorkflowArtifactFile({
        localPath: filePath,
        workflowId: "workflow-1",
        runId: "run-1",
      });
      assert.strictEqual(artifact.sourceKind, "workflow-artifact");
      assert.strictEqual(artifact.owner?.workflowId, "workflow-1");
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("encodes non-ASCII download filenames as RFC 5987 header values", async function () {
    const token = configureHostBridgeServerForTests({ token: "file-token" });
    const { root, filePath } = await writeTempFile(
      "paper.pdf",
      "registered file content",
    );
    try {
      const descriptor = await registerHostBridgeExportFile({
        localPath: filePath,
        displayName: "中文 文件.pdf",
        contentType: "application/pdf",
      });

      const parsed = await bridgeRequest({
        token,
        method: "GET",
        path: `/bridge/v1/files/${descriptor.fileId}`,
      });

      assert.strictEqual(parsed.status, 200);
      assert.include(
        parsed.head,
        'Content-Disposition: attachment; filename="download.pdf"; filename*=UTF-8\'\'%E4%B8%AD%E6%96%87%20%E6%96%87%E4%BB%B6.pdf',
      );
      assert.notInclude(parsed.head, "中文");
      assert.notInclude(parsed.head, "\u0000");
      assert.match(parsed.head, /^[\x00-\x7f]*$/);
      assert.strictEqual(parsed.body, "registered file content");
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("downloads registered file handles with a master token for remote profiles", async function () {
    configureHostBridgeServerForTests({ token: "local-file-token" });
    const master = await rotateHostBridgeMasterToken();
    const { root, filePath } = await writeTempFile(
      "remote.txt",
      "remote file content",
    );
    try {
      const descriptor = await registerHostBridgeExportFile({
        localPath: filePath,
        displayName: "remote.txt",
        contentType: "text/plain",
      });

      const parsed = await bridgeRequest({
        token: master.token,
        method: "GET",
        path: `/bridge/v1/files/${descriptor.fileId}`,
      });

      assert.strictEqual(parsed.status, 200);
      assert.strictEqual(parsed.body, "remote file content");
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("rejects unknown, expired, and path-like file ids structurally", async function () {
    const token = configureHostBridgeServerForTests({ token: "file-token" });
    const { root, filePath } = await writeTempFile("expired.txt", "expired");
    try {
      const unknown = await bridgeRequest({
        token,
        method: "GET",
        path: "/bridge/v1/files/file-missing",
      });
      assert.strictEqual(unknown.status, 404);
      assert.strictEqual(unknown.json.error.code, "file_not_found");

      const pathLike = await bridgeRequest({
        token,
        method: "GET",
        path: "/bridge/v1/files/..%2Fsecret.txt",
      });
      assert.strictEqual(pathLike.status, 400);
      assert.strictEqual(pathLike.json.error.code, "invalid_file_id");

      const expiredDescriptor = await registerHostBridgeFileHandle({
        localPath: filePath,
        sourceKind: "bridge-export",
        ttlMs: 1,
      });
      await new Promise((resolve) => setTimeout(resolve, 5));
      const expired = await bridgeRequest({
        token,
        method: "GET",
        path: `/bridge/v1/files/${expiredDescriptor.fileId}`,
      });
      assert.strictEqual(expired.status, 410);
      assert.strictEqual(expired.json.error.code, "file_handle_expired");
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("returns bridge-download attachment descriptors without local paths", async function () {
    const token = configureHostBridgeServerForTests({
      token: "attachment-token",
    });
    const { root, filePath } = await writeTempFile(
      "attachment.txt",
      "attachment bytes",
    );
    const parent = new Zotero.Item("journalArticle");
    parent.setField("title", "Bridge Attachment Parent");
    await parent.saveTx();
    const previousGet = Zotero.Items.get;
    const attachmentId = 991234;
    (parent as any).getAttachments = () => [attachmentId];
    (Zotero.Items as any).get = (id: number) => {
      if (id === attachmentId) {
        return {
          id: attachmentId,
          key: "ATTACH1",
          libraryID: Zotero.Libraries.userLibraryID,
          parentItemID: parent.id,
          getField: (field: string) =>
            field === "title"
              ? "Attachment"
              : field === "contentType"
                ? "text/plain"
                : "",
          getFilePathAsync: async () => filePath,
        };
      }
      return previousGet.call(Zotero.Items, id);
    };

    try {
      const parsed = await bridgeRequest({
        token,
        method: "POST",
        path: "/bridge/v1/call",
        body: {
          capability: "library.get_item_attachments",
          input: { id: parent.id },
        },
      });

      assert.strictEqual(parsed.status, 200);
      const attachment = parsed.json.result.data[0];
      assert.strictEqual(attachment.access.mode, "bridge-download");
      assert.match(attachment.access.file.fileId, /^file-/);
      assert.strictEqual(attachment.access.file.displayName, "attachment.txt");
      assert.notProperty(attachment, "path");
      assert.notInclude(parsed.body, filePath);
    } finally {
      (Zotero.Items as any).get = previousGet;
      await parent.eraseTx();
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});
