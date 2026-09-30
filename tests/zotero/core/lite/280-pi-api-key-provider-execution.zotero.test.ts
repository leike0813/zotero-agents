import { assert } from "chai";
import { getPref, setPref } from "../../../../src/utils/prefs";
import { putPiCredential } from "../../../../src/modules/piCredentialStore";
import { createPiProviderModelSource } from "../../../../src/modules/piProviderExecution";
import type { PiModelSelectionSnapshot } from "../../../../src/shared/piProviderContract";

describe("Pi API-key Provider in real Zotero", function () {
  it("streams through the browser bundle with an encrypted selected key", async function () {
    assert.isUndefined(
      (globalThis as { process?: { versions?: { node?: string } } }).process
        ?.versions?.node,
    );
    const prior = String(getPref("piCredentialEncryptedJson") || "");
    const id = `zotero-pi-${Date.now()}`;
    try {
      await putPiCredential({
        id,
        label: "Fixture",
        material: { kind: "api-key", secret: "fixture-only" },
      });
      const selection: PiModelSelectionSnapshot = {
        configurationId: "fixture",
        configurationLabel: "Fixture",
        provider: "fixture-provider",
        modelId: "fixture-model",
        authVariant: "api-key",
        credentialRef: id,
        api: "openai-completions",
        baseUrl: "https://provider.example/v1",
        reasoning: "off",
        catalogRevision: "fixture",
        adapterVersion: "0.84.4",
        runtimeVersion: "0.84.4",
        requiresLocalNetwork: false,
        policy: {
          contextWindow: 8192,
          maxTokens: 1024,
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
            'data: {"id":"a","object":"chat.completion.chunk","created":1,"model":"fixture-model","choices":[{"index":0,"delta":{"content":"hello"},"finish_reason":null}]}\n\ndata: {"id":"a","object":"chat.completion.chunk","created":1,"model":"fixture-model","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n',
            { headers: { "content-type": "text/event-stream" } },
          );
        },
      });
      let text = "";
      for await (const delta of source({
        systemPrompt: "",
        messages: [{ role: "user", text: "hi" }],
        signal: new AbortController().signal,
      }))
        text += delta;
      assert.equal(text, "hello");
      assert.equal(authorization, "Bearer fixture-only");
      assert.notInclude(
        String(getPref("piCredentialEncryptedJson")),
        "fixture-only",
      );
    } finally {
      setPref("piCredentialEncryptedJson", prior);
    }
  });
});
