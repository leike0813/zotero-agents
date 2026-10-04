import { assert } from "chai";
import { getPref, setPref } from "../../../../src/utils/prefs";
import { createPiChatGPTAuth } from "../../../../src/modules/piChatGPTAuth";
import { readPiCredential } from "../../../../src/modules/piCredentialStore";
import {
  createPiProviderModelSource,
  createPiProviderSource,
} from "../../../../src/modules/piProviderExecution";
import { normalizeContext, type Tool } from "@earendil-works/pi-ai";
import type { PiModelSelectionSnapshot } from "../../../../src/shared/piProviderContract";
import {
  PI_RUNTIME_VERSION,
  PI_PROVIDER_ADAPTER_VERSION,
} from "../../../../src/config/piRuntimeBuild";
import type { PiChatGPTCompletedResponse } from "../../../../src/modules/piChatGPTProvider";

const ISSUER = "https://auth.openai.com";
const FIXTURE_CLIENT_ID = "zotero_native_fixture_client";
const FIXTURE_CODE = "native-loopback-fixture-code";
const FIXTURE_ACCOUNT = "fixture-account-not-a-real-account";
const SCOPE =
  "openid profile email offline_access resource.invoke chatgpt.tokens.use.direct";

function base64Url(bytes: Uint8Array) {
  let value = "";
  for (const byte of bytes) value += String.fromCharCode(byte);
  return btoa(value).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

describe("Pi ChatGPT native callback host in real Zotero", function () {
  it("accepts authorization through the default listener with a signed fixture token", async function () {
    this.timeout(20_000);
    assert.isUndefined(
      (globalThis as { process?: { versions?: { node?: string } } }).process
        ?.versions?.node,
    );

    const priorCredentials = String(getPref("piCredentialEncryptedJson") || "");
    const registrationId = `native-fixture-${Date.now()}`;
    const signingKeys = await crypto.subtle.generateKey(
      {
        name: "RSASSA-PKCS1-v1_5",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["sign", "verify"],
    );
    const publicJwk = await crypto.subtle.exportKey(
      "jwk",
      signingKeys.publicKey,
    );
    const encodeJson = (value: unknown) =>
      base64Url(new TextEncoder().encode(JSON.stringify(value)));

    let authorization: URL | undefined;
    let callbackRequest: Promise<{ status: number }> | undefined;
    const fixtureFetch = async (
      input: string | URL | Request,
      init?: RequestInit,
    ) => {
      const url = String(input);
      if (url.endsWith("/.well-known/openid-configuration")) {
        return Response.json({
          issuer: ISSUER,
          jwks_uri: `${ISSUER}/.well-known/jwks.json`,
          revocation_endpoint: `${ISSUER}/api/accounts/oauth/revoke`,
        });
      }
      if (url.endsWith("/.well-known/jwks.json")) {
        return Response.json({
          keys: [
            {
              ...publicJwk,
              kid: "native-fixture",
              alg: "RS256",
              use: "sig",
            },
          ],
        });
      }
      if (url.endsWith("/api/accounts/oauth/token")) {
        const body = new URLSearchParams(String(init?.body || ""));
        const nonce = authorization?.searchParams.get("nonce") || "";
        const header = encodeJson({ alg: "RS256", kid: "native-fixture" });
        const payload = encodeJson({
          iss: ISSUER,
          aud: FIXTURE_CLIENT_ID,
          sub: FIXTURE_ACCOUNT,
          email: "fixture-account@example.invalid",
          exp: Math.floor(Date.now() / 1000) + 3600,
          nonce,
        });
        const unsigned = `${header}.${payload}`;
        const signature = await crypto.subtle.sign(
          "RSASSA-PKCS1-v1_5",
          signingKeys.privateKey,
          new TextEncoder().encode(unsigned),
        );
        assert.equal(body.get("grant_type"), "authorization_code");
        assert.equal(body.get("client_id"), FIXTURE_CLIENT_ID);
        assert.equal(body.get("code"), FIXTURE_CODE);
        assert.isTrue(body.get("code_verifier")?.length === 43);
        assert.equal(
          body.get("redirect_uri"),
          authorization?.searchParams.get("redirect_uri"),
        );
        return Response.json({
          access_token: "fixture-access-token",
          refresh_token: "fixture-refresh-token",
          id_token: `${unsigned}.${base64Url(new Uint8Array(signature))}`,
          expires_in: 3600,
          token_type: "Bearer",
          scope: SCOPE,
        });
      }
      throw new Error("unexpected fixture endpoint");
    };

    const auth = createPiChatGPTAuth({
      fetch: fixtureFetch,
      // Exercise production nativeListen and its dynamic fallback when 1455 is
      // occupied. Only the browser launch and remote service are fixtures.
      launchURL: (url) => {
        authorization = new URL(url);
        const redirect = new URL(
          authorization.searchParams.get("redirect_uri") || "",
        );
        redirect.searchParams.set(
          "state",
          authorization.searchParams.get("state") || "",
        );
        redirect.searchParams.set("code", FIXTURE_CODE);
        redirect.searchParams.set("client_id", FIXTURE_CLIENT_ID);
        callbackRequest = Zotero.HTTP.request("GET", redirect.href, {
          timeout: 5000,
          logBodyLength: 0,
          noCache: true,
          followRedirects: false,
        }).then((response) => ({ status: response.status }));
      },
    });

    try {
      const result = await auth.connect({
        id: registrationId,
        label: "Native callback fixture (not a real account)",
        signal: new AbortController().signal,
        fetch: fixtureFetch,
      });
      assert.isOk(authorization);
      assert.isOk(callbackRequest);
      assert.equal((await callbackRequest!).status, 200);
      assert.equal(authorization!.searchParams.get("response_type"), "code");
      assert.equal(
        authorization!.searchParams.get("code_challenge_method"),
        "S256",
      );
      const redirect = new URL(
        authorization!.searchParams.get("redirect_uri") || "",
      );
      assert.equal(redirect.protocol, "http:");
      assert.equal(redirect.hostname, "127.0.0.1");
      assert.equal(redirect.pathname, "/auth/callback");
      assert.isAbove(Number(redirect.port), 0);
      assert.equal(result.kind, "chatgpt");
      assert.equal((await readPiCredential(registrationId)).ok, true);
      assert.equal(
        auth.registrations().find((entry) => entry.id === registrationId)
          ?.email,
        "fixture-account@example.invalid",
      );
      await auth.acceptWelcome(registrationId);
      let wire: Record<string, unknown> | undefined;
      let completed: PiChatGPTCompletedResponse | undefined;
      const message = {
        id: "msg_native",
        type: "message",
        role: "assistant",
        status: "completed",
        content: [{ type: "output_text", text: "hello", annotations: [] }],
      };
      const response = {
        id: "resp_native",
        status: "completed",
        output: [message],
        usage: { input_tokens: 12, output_tokens: 3, total_tokens: 15 },
      };
      const frames = [
        {
          type: "response.created",
          response: { id: response.id, status: "in_progress" },
        },
        {
          type: "response.output_item.added",
          output_index: 0,
          item: { ...message, status: "in_progress", content: [] },
        },
        {
          type: "response.output_text.delta",
          output_index: 0,
          content_index: 0,
          delta: "hello",
        },
        { type: "response.output_item.done", output_index: 0, item: message },
        { type: "response.completed", response },
      ]
        .map((event) => `data: ${JSON.stringify(event)}\n\n`)
        .join("");
      const selection: PiModelSelectionSnapshot = {
        configurationId: "native-fixture",
        configurationLabel: "Native fixture",
        provider: "openai",
        modelId: "native-fixture-model",
        authVariant: "chatgpt",
        credentialRef: registrationId,
        api: "openai-responses",
        baseUrl: "https://api.openai.com/v1",
        reasoning: "off",
        catalogRevision: "native-fixture",
        adapterVersion: PI_PROVIDER_ADAPTER_VERSION,
        runtimeVersion: PI_RUNTIME_VERSION,
        requiresLocalNetwork: false,
        policy: {
          contextWindow: 8192,
          maxTokens: 0,
          input: ["text"],
          supportsTools: false,
        },
      };
      const admission: NonNullable<
        Parameters<typeof createPiProviderModelSource>[1]
      > = {
        chatGPTAuth: {
          resolvePiChatGPTAccess: auth.resolveAccess,
          assertPiChatGPTInferenceAllowed: auth.assertAllowed,
          pausePiChatGPTInference: auth.pause,
        },
        fetch: async (input, init) => {
          const request = new Request(input, init);
          assert.equal(request.url, "https://api.openai.com/v1/responses");
          wire = await request.json();
          return new Response(frames, {
            headers: { "content-type": "text/event-stream" },
          });
        },
        onChatGPTCompletedResponse: (result) => {
          completed = result;
        },
      };
      const source = createPiProviderModelSource(selection, admission);
      let output = "";
      for await (const chunk of source({
        systemPrompt: "Native fixture instructions",
        messages: [{ role: "user", text: "hi" }],
        signal: new AbortController().signal,
      }))
        output += chunk;
      assert.equal(output, "hello");
      assert.equal(wire?.stream, true);
      assert.equal(wire?.store, false);
      assert.isArray(wire?.input);
      assert.isUndefined(wire?.max_output_tokens);
      assert.equal(completed?.id, response.id);
      assert.deepEqual(completed?.usage, {
        inputTokens: 12,
        outputTokens: 3,
        totalTokens: 15,
      });

      const tool: Tool = {
        name: "read/items",
        description: "Read fixture metadata",
        parameters: {
          type: "object",
          properties: { itemId: { type: "string" } },
          required: ["itemId"],
        } as Tool["parameters"],
      };
      const call = {
        id: "fc_native",
        type: "function_call",
        status: "completed",
        namespace: "zotero_agents",
        name: "zotero_tool_1",
        call_id: "call_native",
        arguments: JSON.stringify({ itemId: "fixture-item" }),
      };
      const toolResponse = {
        ...response,
        id: "resp_native_tool",
        output: [call],
      };
      const toolFrames = [
        {
          type: "response.created",
          response: { id: toolResponse.id, status: "in_progress" },
        },
        {
          type: "response.output_item.added",
          output_index: 0,
          item: { ...call, status: "in_progress", arguments: "" },
        },
        {
          type: "response.function_call_arguments.delta",
          output_index: 0,
          delta: call.arguments,
        },
        { type: "response.output_item.done", output_index: 0, item: call },
        { type: "response.completed", response: toolResponse },
      ]
        .map((event) => `data: ${JSON.stringify(event)}\n\n`)
        .join("");
      const requests: Record<string, unknown>[] = [];
      const prepared = createPiProviderSource(
        { ...selection, policy: { ...selection.policy, supportsTools: true } },
        {
          ...admission,
          fetch: async (input, init) => {
            requests.push(await new Request(input, init).json());
            return new Response(requests.length === 1 ? toolFrames : frames, {
              headers: { "content-type": "text/event-stream" },
            });
          },
        },
      );
      const first = await prepared.source({
        sessionId: "native-tools",
        turnId: "native-tools",
        invocationId: "native-tools:0",
        model: prepared.model,
        signal: new AbortController().signal,
        context: normalizeContext({
          tools: [tool],
          messages: [{ role: "user", content: "Read fixture", timestamp: 0 }],
        }),
      });
      const assistant = await first.result();
      assert.equal(assistant.stopReason, "toolUse");
      const projectedCall = assistant.content.find(
        (part) => part.type === "toolCall",
      );
      assert.equal(projectedCall?.name, tool.name);
      assert.deepEqual(projectedCall?.arguments, { itemId: "fixture-item" });
      const continuation = await prepared.source({
        sessionId: "native-tools",
        turnId: "native-tools",
        invocationId: "native-tools:1",
        model: prepared.model,
        signal: new AbortController().signal,
        context: normalizeContext({
          tools: [tool],
          messages: [
            { role: "user", content: "Read fixture", timestamp: 0 },
            assistant,
            {
              role: "toolResult",
              toolCallId: projectedCall!.id,
              toolName: tool.name,
              content: [{ type: "text", text: "Fixture metadata" }],
              isError: false,
              timestamp: Date.now(),
            },
          ],
        }),
      });
      assert.equal((await continuation.result()).stopReason, "stop");
      const history = requests[1].input as Record<string, unknown>[];
      const historicalCall = history.find(
        (item) => item.type === "function_call",
      );
      const historicalResult = history.find(
        (item) => item.type === "function_call_output",
      );
      assert.equal(historicalCall?.namespace, call.namespace);
      assert.equal(historicalCall?.name, call.name);
      assert.equal(historicalResult?.call_id, historicalCall?.call_id);
      assert.isUndefined(requests[1].previous_response_id);
    } finally {
      await auth.shutdown(Date.now() + 1000);
      setPref("piCredentialEncryptedJson", priorCredentials);
    }
  });
});
