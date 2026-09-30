import { assert } from "chai";
import { getPref, setPref } from "../../../../src/utils/prefs";
import { connectPiOpenAICodex } from "../../../../src/modules/piOpenAICodexAuth";
import { readPiCredential } from "../../../../src/modules/piCredentialStore";
import {
  loadPiModelCatalog,
  refreshPiCodexModelCatalog,
} from "../../../../src/modules/piModelCatalog";
import { createPiProviderModelSource } from "../../../../src/modules/piProviderExecution";
import type { PiModelSelectionSnapshot } from "../../../../src/shared/piProviderContract";

describe("Pi OpenAI Codex in real Zotero", function () {
  it("authorizes and streams through the browser bundle with fixture responses", async function () {
    assert.isUndefined(
      (globalThis as { process?: { versions?: { node?: string } } }).process
        ?.versions?.node,
    );
    const prior = String(getPref("piCredentialEncryptedJson") || "");
    const id = `zotero-codex-${Date.now()}`;
    const access = `${btoa("header")}.${btoa(
      JSON.stringify({
        "https://api.openai.com/auth": {
          chatgpt_account_id: "fixture-account",
        },
      }),
    )}.signature`;
    try {
      const codes: string[] = [];
      let polls = 0;
      await connectPiOpenAICodex({
        id,
        label: "Fixture Codex",
        signal: new AbortController().signal,
        onCode: ({ userCode }) => codes.push(userCode),
        fetch: async (input) => {
          const url = String(input);
          if (url.endsWith("/usercode"))
            return Response.json({
              device_auth_id: "fixture-device",
              user_code: "ABCD-EFGH",
              interval: 0,
            });
          if (url.endsWith("/deviceauth/token")) {
            polls += 1;
            return polls === 1
              ? new Response(null, { status: 403 })
              : Response.json({
                  authorization_code: "fixture-auth",
                  code_verifier: "fixture-verifier",
                });
          }
          if (url.endsWith("/oauth/token"))
            return Response.json({
              access_token: access,
              refresh_token: "fixture-refresh",
              expires_in: 3600,
            });
          throw new Error("Unexpected fixture request");
        },
      });
      assert.deepEqual(codes, ["ABCD-EFGH"]);
      assert.equal(polls, 2);
      assert.isTrue((await readPiCredential(id)).ok);
      assert.notInclude(
        String(getPref("piCredentialEncryptedJson")),
        "fixture-refresh",
      );
      const discovered = await refreshPiCodexModelCatalog(
        await loadPiModelCatalog(),
        {
          credentialId: id,
          signal: new AbortController().signal,
          fetch: async () =>
            Response.json({
              models: [
                {
                  slug: "fixture-model",
                  visibility: "list",
                  context_window: 8192,
                  input_modalities: ["text"],
                  supported_reasoning_levels: [{ effort: "low" }],
                },
              ],
            }),
        },
      );
      const catalogModel = discovered.models.find(
        (model) => model.credentialRef === id,
      );
      assert.equal(catalogModel?.id, "fixture-model");
      assert.equal(catalogModel?.maxTokens, 0);
      const selection: PiModelSelectionSnapshot = {
        configurationId: "fixture",
        configurationLabel: "Fixture",
        provider: "openai-codex",
        modelId: "fixture-model",
        authVariant: "openai-codex",
        credentialRef: id,
        api: "openai-codex-responses",
        baseUrl: "https://chatgpt.com/backend-api",
        reasoning: "off",
        catalogRevision: "fixture",
        adapterVersion: "0.84.4",
        runtimeVersion: "0.84.4",
        requiresLocalNetwork: false,
        policy: {
          contextWindow: 8192,
          maxTokens: 0,
          input: ["text"],
          supportsTools: false,
        },
      };
      let authorization = "";
      const source = createPiProviderModelSource(selection, {
        fetch: async (input, init) => {
          const request = new Request(input, init);
          authorization = request.headers.get("authorization") || "";
          return new Response(
            [
              'data: {"type":"response.created","response":{"id":"r1"}}',
              'data: {"type":"response.output_item.added","output_index":0,"item":{"type":"message","id":"m1","role":"assistant"}}',
              'data: {"type":"response.output_text.delta","output_index":0,"delta":"hello"}',
              'data: {"type":"response.completed","response":{"id":"r1","status":"completed","output":[]}}',
              "",
            ].join("\n\n"),
            { headers: { "content-type": "text/event-stream" } },
          );
        },
      });
      let output = "";
      for await (const delta of source({
        systemPrompt: "",
        messages: [{ role: "user", text: "hi" }],
        signal: new AbortController().signal,
      }))
        output += delta;
      assert.equal(output, "hello");
      assert.equal(authorization, `Bearer ${access}`);
    } finally {
      setPref("piCredentialEncryptedJson", prior);
    }
  });
});
