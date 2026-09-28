import { assert } from "chai";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { getPref, setPref } from "../../src/utils/prefs";
import {
  getPluginMetaValue,
  resetPluginStateStoreForTests,
  setPluginMetaValue,
} from "../../src/modules/pluginStateStore";
import { installPluginStateNodeSqliteAdapter } from "../helpers/pluginStateNodeSqliteAdapter";
import {
  deletePiCredential,
  getPiCredentialRevision,
  listPiCredentials,
  putPiCredential,
  readPiCredential,
} from "../../src/modules/piCredentialStore";

describe("Pi credential store", function () {
  let root: string;
  let priorRoot: string | undefined;
  let priorPref: string;
  beforeEach(async function () {
    priorRoot = process.env.ZOTERO_SKILLS_RUNTIME_ROOT;
    root = await fs.mkdtemp(path.join(os.tmpdir(), "pi-credential-"));
    process.env.ZOTERO_SKILLS_RUNTIME_ROOT = root;
    installPluginStateNodeSqliteAdapter();
    resetPluginStateStoreForTests();
    priorPref = String(getPref("piCredentialEncryptedJson") || "");
    setPref("piCredentialEncryptedJson", "");
  });
  afterEach(async function () {
    resetPluginStateStoreForTests();
    setPref("piCredentialEncryptedJson", priorPref);
    if (priorRoot === undefined) delete process.env.ZOTERO_SKILLS_RUNTIME_ROOT;
    else process.env.ZOTERO_SKILLS_RUNTIME_ROOT = priorRoot;
    await fs.rm(root, { recursive: true, force: true });
  });

  it("isolates records, masks metadata, and replaces one credential", async function () {
    await putPiCredential({
      id: "a",
      label: "Primary",
      material: { kind: "api-key", secret: "secret-A" },
    });
    await putPiCredential({
      id: "b",
      label: "Second",
      material: { kind: "api-key", secret: "secret-B" },
    });
    assert.lengthOf(listPiCredentials(), 2);
    assert.notInclude(JSON.stringify(listPiCredentials()), "secret-A");
    assert.notInclude(String(getPref("piCredentialEncryptedJson")), "secret-A");
    assert.equal((await readPiCredential("a")).ok, true);
    await putPiCredential({
      id: "a",
      label: "Primary",
      material: { kind: "api-key", secret: "secret-A2" },
    });
    const b = await readPiCredential("b");
    assert.isTrue(b.ok);
    if (b.ok && b.material.kind === "api-key")
      assert.equal(b.material.secret, "secret-B");
    await deletePiCredential("a");
    assert.equal((await readPiCredential("a")).ok, false);
    assert.equal((await readPiCredential("b")).ok, true);
  });

  it("keeps legacy model credentials usable while isolating MCP secrets", async function () {
    await putPiCredential({
      id: "legacy-model",
      label: "Model",
      material: { kind: "api-key", secret: "model-secret" },
    });
    const oldDocument = JSON.parse(
      String(getPref("piCredentialEncryptedJson")),
    );
    delete oldDocument.records["legacy-model"].namespace;
    setPref("piCredentialEncryptedJson", JSON.stringify(oldDocument));
    await putPiCredential({
      id: "mcp-header",
      label: "MCP token",
      namespace: "mcp-source",
      material: { kind: "mcp-secret", secret: "mcp-private-value" },
    });
    assert.deepEqual(
      listPiCredentials().map((row) => row.id),
      ["legacy-model"],
    );
    assert.deepEqual(
      listPiCredentials("mcp-source").map((row) => row.id),
      ["mcp-header"],
    );
    assert.isTrue((await readPiCredential("legacy-model")).ok);
    assert.isFalse((await readPiCredential("mcp-header")).ok);
    const mcp = await readPiCredential("mcp-header", "mcp-source");
    assert.isTrue(mcp.ok);
    if (mcp.ok && mcp.material.kind === "mcp-secret") {
      assert.equal(mcp.material.secret, "mcp-private-value");
    }
    assert.isFalse((await readPiCredential("legacy-model", "mcp-source")).ok);
    assert.notInclude(
      String(getPref("piCredentialEncryptedJson")),
      "mcp-private-value",
    );
  });

  it("changes the private MCP credential revision on replacement and recreation", async function () {
    const input = {
      id: "mcp-token",
      label: "MCP token",
      namespace: "mcp-source" as const,
      material: { kind: "mcp-secret" as const, secret: "first" },
    };
    await putPiCredential(input);
    const first = getPiCredentialRevision(input.id, "mcp-source");
    await putPiCredential({
      ...input,
      material: { kind: "mcp-secret", secret: "second" },
    });
    const second = getPiCredentialRevision(input.id, "mcp-source");
    assert.isString(first);
    assert.notEqual(second, first);
    await deletePiCredential(input.id, "mcp-source");
    await putPiCredential(input);
    assert.notEqual(getPiCredentialRevision(input.id, "mcp-source"), first);
  });

  it("fails closed on tampering or a lost profile key", async function () {
    await putPiCredential({
      id: "a",
      label: "Primary",
      material: { kind: "api-key", secret: "secret-A" },
    });
    const key = getPluginMetaValue("pi.credential.key.v1");
    setPluginMetaValue("pi.credential.key.v1", "");
    assert.equal((await readPiCredential("a")).ok, false);
    setPluginMetaValue("pi.credential.key.v1", key);
    const doc = JSON.parse(String(getPref("piCredentialEncryptedJson")));
    doc.records.a.ciphertext = "AAAA";
    setPref("piCredentialEncryptedJson", JSON.stringify(doc));
    assert.equal((await readPiCredential("a")).ok, false);
  });
});
