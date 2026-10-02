import { assert } from "chai";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  loadPiModelCatalog,
  normalizePiModelOverlay,
  refreshPiModelCatalog,
  refreshPiCodexModelCatalog,
  removePiCodexCredentialModels,
} from "../../src/modules/piModelCatalog";
import {
  putPiCredential,
  deletePiCredential,
} from "../../src/modules/piCredentialStore";

describe("Pi model catalog", function () {
  it("discovers only the selected Codex account and keeps unknown output limits absent", async function () {
    const id = "catalog-codex-fixture";
    const access = `header.${btoa(JSON.stringify({ "https://api.openai.com/auth": { chatgpt_account_id: "fixture-account" } }))}.signature`;
    await putPiCredential({
      id,
      label: "Fixture",
      material: {
        kind: "openai-codex",
        access,
        refresh: "fixture-refresh",
        expiresAt: Date.now() + 3600000,
        accountId: "fixture-account",
      },
    });
    try {
      const prior = await loadPiModelCatalog();
      const result = await refreshPiCodexModelCatalog(prior, {
        credentialId: id,
        signal: new AbortController().signal,
        fetch: async (input, init) => {
          const request = new Request(input, init);
          assert.equal(
            new URL(request.url).pathname,
            "/backend-api/codex/models",
          );
          assert.isNotEmpty(
            new URL(request.url).searchParams.get("client_version") || "",
          );
          assert.equal(
            request.headers.get("authorization"),
            `Bearer ${access}`,
          );
          assert.equal(
            request.headers.get("chatgpt-account-id"),
            "fixture-account",
          );
          assert.equal(request.redirect, "error");
          return Response.json({
            models: [
              {
                slug: "new-codex-model",
                display_name: "New model",
                visibility: "list",
                context_window: 272000,
                input_modalities: ["text", "image"],
                supported_reasoning_levels: [
                  { effort: "low" },
                  { effort: "medium" },
                ],
                instructions: "private response",
              },
              { slug: "hidden-model", visibility: "hide" },
            ],
          });
        },
      });
      const model = result.models.find((x) => x.id === "new-codex-model");
      assert.equal(model?.source, "discovered");
      assert.equal(model?.credentialRef, id);
      assert.equal(model?.contextWindow, 272000);
      assert.equal(model?.maxTokens, 0);
      assert.deepEqual(model?.reasoning, ["low", "medium"]);
      assert.isFalse(model?.supportsTools);
      assert.isFalse(result.models.some((x) => x.id === "hidden-model"));
      assert.notEqual(result.revision, prior.revision);
      assert.notInclude(JSON.stringify(result), "private response");
      assert.notInclude(JSON.stringify(result), access);
      const shared = await loadPiModelCatalog();
      assert.deepEqual(
        shared.models.find((entry) => entry.id === "new-codex-model"),
        model,
      );
      assert.equal(shared.revision, result.revision);
      await putPiCredential({
        id,
        label: "Replacement",
        material: {
          kind: "openai-codex",
          access,
          refresh: "replacement-refresh",
          expiresAt: Date.now() + 3600000,
          accountId: "fixture-account",
        },
      });
      const replaced = await loadPiModelCatalog();
      assert.isFalse(
        replaced.models.some((entry) => entry.credentialRef === id),
      );
      assert.notEqual(replaced.revision, result.revision);
      const disconnected = await removePiCodexCredentialModels(result, id);
      assert.notEqual(disconnected.revision, result.revision);
      assert.isFalse(
        disconnected.models.some((entry) => entry.credentialRef === id),
      );
      assert.isFalse(
        (await loadPiModelCatalog()).models.some(
          (entry) => entry.credentialRef === id,
        ),
      );
      assert.deepEqual(
        disconnected.models,
        result.models.filter((entry) => entry.credentialRef !== id),
      );
      let canceledBody = false;
      try {
        await refreshPiCodexModelCatalog(result, {
          credentialId: id,
          signal: new AbortController().signal,
          fetch: async () =>
            new Response(
              new ReadableStream({
                start(controller) {
                  controller.enqueue(new Uint8Array(2 * 1024 * 1024 + 1));
                  controller.enqueue(new Uint8Array(1));
                  controller.close();
                },
                cancel() {
                  canceledBody = true;
                },
              }),
            ),
        });
        assert.fail("oversized discovery accepted");
      } catch (error) {
        assert.equal((error as { code: string }).code, "provider_http_error");
      }
      assert.isTrue(canceledBody);
      try {
        await refreshPiCodexModelCatalog(result, {
          credentialId: id,
          signal: new AbortController().signal,
          fetch: async () => new Response("private error", { status: 401 }),
        });
        assert.fail("discovery accepted rejected authorization");
      } catch (error) {
        assert.equal((error as { code: string }).code, "provider_auth_failed");
      }
      assert.equal(
        result.models.find((x) => x.id === "new-codex-model")?.credentialRef,
        id,
      );
      try {
        await refreshPiCodexModelCatalog(result, {
          credentialId: id,
          signal: new AbortController().signal,
          fetch: async () => {
            await deletePiCredential(id);
            return Response.json({ models: [] });
          },
        });
        assert.fail("late discovery survived local disconnect");
      } catch (error) {
        assert.equal((error as { code: string }).code, "credential_missing");
      }
    } finally {
      await deletePiCredential(id);
    }
  });
  it("rejects executable or secret overlay fields", function () {
    assert.throws(
      () =>
        normalizePiModelOverlay(
          "providers:\n  custom:\n    apiKey: secret\n    models: [{id: m}]\n",
        ),
      /apiKey|unsupported|field/i,
    );
    assert.throws(
      () =>
        normalizePiModelOverlay(
          "providers:\n  custom:\n    command: curl\n    models: [{id: m}]\n",
        ),
      /command|unsupported|field/i,
    );
    const unknown = normalizePiModelOverlay(
      "providers:\n  custom:\n    api: openai-completions\n    baseUrl: http://127.0.0.1:1234/v1\n    models: [{id: m}]\n",
    )[0];
    assert.isFalse(unknown.supportsTools);
    assert.deepEqual(unknown.input, []);
    assert.deepEqual(unknown.reasoning, ["off"]);
  });

  it("keeps the last sanitized overlay after a bad refresh", async function () {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "pi-catalog-"));
    const overlayPath = path.join(root, "models.yml");
    try {
      await fs.writeFile(
        overlayPath,
        "providers:\n  custom:\n    api: openai-completions\n    baseUrl: https://example.com/v1\n    models:\n      - id: m\n        name: M\n        contextWindow: 1000\n        maxTokens: 100\n        input: [text]\n        reasoning: false\n",
      );
      const first = await refreshPiModelCatalog({ overlayPath, root });
      assert.isAtLeast(first.models.length, 1);
      const count = first.models.length;
      await fs.writeFile(
        overlayPath,
        "providers:\n  custom:\n    apiKey: leaked\n    models: [{id: m}]\n",
      );
      try {
        await refreshPiModelCatalog({ overlayPath, root });
        assert.fail("invalid overlay accepted");
      } catch (error) {
        assert.match(String(error), /apiKey|unsupported|field/i);
      }
      const cached = await loadPiModelCatalog({ root });
      assert.equal(cached.models.length, count);
      assert.equal(cached.revision, first.revision);
      assert.notInclude(JSON.stringify(cached), "leaked");
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});
