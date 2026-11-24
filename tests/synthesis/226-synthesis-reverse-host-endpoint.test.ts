import { assert } from "chai";
import { ZoteroHostCapabilityError } from "../../src/modules/zoteroHostCapabilityBroker";
import {
  SYNTHESIS_REVERSE_HOST_CALL_SCHEMA,
  SynthesisClientError,
} from "../../packages/synthesis-contracts/src";
import {
  SYNTHESIS_REVERSE_HOST_PATH,
  handleSynthesisReverseHostHttpRequest,
} from "../../src/modules/synthesis/reverseHost/synthesisReverseHostEndpoint";
import {
  normalizeSynthesisSidecarRpcError,
  SynthesisSidecarRpcError,
} from "../../src/modules/synthesis/sidecar/synthesisSidecarRpcClient";
import { createCancellationController } from "../../src/utils/wait";

describe("Synthesis reverse Host endpoint", function () {
  it("exposes a normalized transfer cause in the native-consumed reason field", async function () {
    const result = await handleSynthesisReverseHostHttpRequest(
      {
        method: "POST",
        path: SYNTHESIS_REVERSE_HOST_PATH,
        headers: {},
        body: {},
      },
      {
        async dispatch() {
          throw normalizeSynthesisSidecarRpcError(
            new SynthesisSidecarRpcError("service_unavailable", {
              reason: "transport_unavailable",
            }),
          );
        },
      },
    );
    assert.equal(result.status, 503);
    assert.deepInclude(result.body, {
      ok: false,
      error: {
        code: "unavailable",
        details: {
          reason: "transport_unavailable",
          sidecarCode: "service_unavailable",
          sidecarReason: "transport_unavailable",
          retryable: true,
        },
      },
    });
  });

  it("never transports an invalid error identifier or unsafe error detail", async function () {
    const result = await handleSynthesisReverseHostHttpRequest(
      {
        method: "POST",
        path: SYNTHESIS_REVERSE_HOST_PATH,
        headers: {},
        body: {},
      },
      {
        async dispatch() {
          throw new SynthesisClientError("unavailable", "sensitive", {
            reason: "C:\\private\\file",
          });
        },
      },
    );
    assert.equal(result.status, 500);
    assert.deepEqual(result.body, { ok: false, error: { code: "internal" } });
  });
  for (const [error, status, reason] of [
    [
      new ZoteroHostCapabilityError("conflict", "sensitive", {
        reason: "basis_mismatch",
      }),
      409,
      "basis_mismatch",
    ],
    [
      new ZoteroHostCapabilityError("invalid_request", "sensitive", {
        reason: "invalid_value",
      }),
      400,
      "invalid_request",
    ],
    [
      new ZoteroHostCapabilityError("resource_limited", "sensitive", {
        resource: "items",
        limit: 32,
      }),
      413,
      "resource_limited",
    ],
  ] as const) {
    it(`preserves Broker ${error.code} at the reverse Host boundary`, async function () {
      const result = await handleSynthesisReverseHostHttpRequest(
        {
          method: "POST",
          path: SYNTHESIS_REVERSE_HOST_PATH,
          headers: {},
          body: {},
        },
        {
          async dispatch() {
            throw error;
          },
        },
      );
      assert.equal(result.status, status);
      assert.deepEqual(result.body, {
        ok: false,
        error: { code: error.code, details: { reason } },
      });
      assert.notInclude(JSON.stringify(result.body), "sensitive");
    });
  }

  it("accepts only the scoped POST route and bearer token", async function () {
    const calls: Array<{
      authorizationToken: string;
      call: unknown;
      signal?: unknown;
    }> = [];
    const broker = {
      async dispatch(input: {
        authorizationToken: string;
        call: unknown;
        signal?: unknown;
      }) {
        calls.push(input);
        return { accepted: true };
      },
    };
    const result = await handleSynthesisReverseHostHttpRequest(
      {
        method: "POST",
        path: SYNTHESIS_REVERSE_HOST_PATH,
        headers: { authorization: "Bearer scoped-token" },
        body: {
          schema: SYNTHESIS_REVERSE_HOST_CALL_SCHEMA,
        },
      },
      broker,
    );
    assert.equal(result.status, 200);
    assert.deepEqual(result.body, {
      ok: true,
      result: { accepted: true },
    });
    assert.lengthOf(calls, 1);
    assert.equal(calls[0]?.authorizationToken, "scoped-token");
    assert.deepEqual(calls[0]?.call, {
      schema: SYNTHESIS_REVERSE_HOST_CALL_SCHEMA,
    });
    assert.isUndefined(calls[0]?.signal);
    assert.equal(
      (
        await handleSynthesisReverseHostHttpRequest(
          {
            method: "GET",
            path: SYNTHESIS_REVERSE_HOST_PATH,
            headers: {},
            body: {},
          },
          broker,
        )
      ).status,
      404,
    );
  });

  it("forwards an optional cancellation signal into the Broker dispatch", async function () {
    const signals: unknown[] = [];
    const broker = {
      async dispatch(input: {
        authorizationToken: string;
        call: unknown;
        signal?: unknown;
      }) {
        signals.push(input.signal);
        return { accepted: true };
      },
    };
    const cancellation = createCancellationController();

    const result = await handleSynthesisReverseHostHttpRequest(
      {
        method: "POST",
        path: SYNTHESIS_REVERSE_HOST_PATH,
        headers: { authorization: "Bearer scoped-token" },
        body: { schema: SYNTHESIS_REVERSE_HOST_CALL_SCHEMA },
      },
      broker,
      cancellation.signal,
    );

    assert.equal(result.status, 200);
    assert.deepEqual(signals, [cancellation.signal]);
  });

  it("returns stable status and structured details without leaking messages", async function () {
    const result = await handleSynthesisReverseHostHttpRequest(
      {
        method: "POST",
        path: SYNTHESIS_REVERSE_HOST_PATH,
        headers: {},
        body: {},
      },
      {
        async dispatch() {
          throw new SynthesisClientError(
            "conflict",
            "sensitive internal message",
            { reason: "operation_conflict" },
          );
        },
      },
    );
    assert.equal(result.status, 409);
    assert.deepEqual(result.body, {
      ok: false,
      error: {
        code: "conflict",
        details: { reason: "operation_conflict" },
      },
    });
    assert.notInclude(JSON.stringify(result.body), "sensitive");
  });
});
