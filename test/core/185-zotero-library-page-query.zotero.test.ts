import { assert } from "chai";
import { handlers } from "../../src/handlers";
import { queryZoteroLibraryPage } from "../../src/modules/zoteroLibraryPageQuery";
import {
  SYNTHESIS_REVERSE_HOST_CALL_SCHEMA,
  SYNTHESIS_REVERSE_HOST_CAPABILITIES,
  SYNTHESIS_SIDECAR_OBSERVATION_SCHEMA,
} from "../../packages/synthesis-contracts/src";
import {
  createSynthesisReverseHostEndpoint,
  SYNTHESIS_REVERSE_HOST_PATH,
} from "../../src/modules/synthesisReverseHostEndpoint";
import type { SynthesisReverseHostHandlers } from "../../src/modules/synthesisReverseHostBroker";
import type { SynthesisSidecarObservationEvent } from "../../packages/synthesis-contracts/src/sidecarObservability";
import { setDebugModeOverrideForTests } from "../../src/modules/debugMode";

function isRealZoteroRuntime() {
  const runtime = globalThis as {
    Zotero?: { __parity?: { runtime?: string } };
  };
  return !!runtime.Zotero && runtime.Zotero.__parity?.runtime !== "node-mock";
}

const describeZotero = isRealZoteroRuntime() ? describe : describe.skip;

async function expectPageErrorCode(
  action: () => Promise<unknown>,
  expectedCode: string,
  message: string,
) {
  let failure: unknown;
  let rejected = false;
  try {
    await action();
  } catch (error) {
    rejected = true;
    failure = error;
  }
  assert.isTrue(rejected, `${message}: expected the page request to reject`);
  assert.strictEqual(
    (failure as { code?: unknown }).code,
    expectedCode,
    message,
  );
}

const reverseHostRequestHeaders = {
  authorization: "",
  "content-type": "application/json",
  "zotero-allowed-request": "1",
};

describeZotero("zotero library page query in Zotero runtime", function () {
  it("transfers one large Unicode reverse Host response with exact framing", async function () {
    setDebugModeOverrideForTests(true);
    const authorizationToken = "a".repeat(64);
    const profileId = "b".repeat(64);
    const serviceInstanceId = "service-unicode";
    const diagnosticEvents: SynthesisSidecarObservationEvent[] = [];
    let value = `目录治理 ${"文献".repeat(32_000)}`;
    const artifactReadPayload = {
      locator: "fixture:unicode",
      expectedHash: "fixture-unicode-hash",
    };
    const handlers = Object.fromEntries(
      SYNTHESIS_REVERSE_HOST_CAPABILITIES.map((capability) => [
        capability,
        async () =>
          capability === "library.artifacts.read"
            ? {
                status: "available",
                payloadHash: artifactReadPayload.expectedHash,
                content: { kind: "json", value: { value } },
                diagnostics: [],
              }
            : capability === "library.artifacts.scan_page"
              ? {
                  cursor: "",
                  nextCursor: "",
                  hasMore: false,
                  returned: 1,
                  limit: 1,
                  artifacts: [
                    {
                      paperRef: "1:UNICODE",
                      artifactType: "digest",
                      payloadType: "digest-markdown",
                      status: "missing",
                      diagnostics: value.match(/[\s\S]{1,60000}/g) || [],
                    },
                  ],
                }
              : { capability, value },
      ]),
    ) as SynthesisReverseHostHandlers;
    const endpoint = createSynthesisReverseHostEndpoint({
      profileId,
      authorizationToken,
      now: Date.now,
      isHostConnected: () => true,
      authorizeCapability: () => true,
      handlers,
      recordTraceEvent: (event) => diagnosticEvents.push(event),
    });
    const locator = endpoint.start();
    endpoint.bindServiceInstance(serviceInstanceId);
    const trace = {
      schema: SYNTHESIS_SIDECAR_OBSERVATION_SCHEMA,
      traceId: "c".repeat(32),
      spanId: "d".repeat(16),
      attempt: 0,
    };
    try {
      const response = await fetch(
        `http://127.0.0.1:${locator.port}${SYNTHESIS_REVERSE_HOST_PATH}`,
        {
          method: "POST",
          headers: {
            ...reverseHostRequestHeaders,
            authorization: `Bearer ${authorizationToken}`,
          },
          body: JSON.stringify({
            schema: SYNTHESIS_REVERSE_HOST_CALL_SCHEMA,
            requestId: "request-unicode",
            profileId,
            serviceInstanceId,
            operationId: "operation-unicode",
            trace,
            capability: "library.artifacts.read",
            deadlineAtMs: Date.now() + 30_000,
            payload: artifactReadPayload,
          }),
        },
      ).catch((error) => {
        throw new Error(`small-unicode-response: ${String(error)}`);
      });
      const source = await response.text().catch((error) => {
        throw new Error(
          `small-unicode-body: ${String(error)} ${JSON.stringify(
            diagnosticEvents.slice(-3),
          )}`,
        );
      });
      assert.equal(
        response.status,
        200,
        `reverse Host response: ${source}; diagnostics: ${JSON.stringify(
          diagnosticEvents.slice(-3),
        )}`,
      );
      assert.equal(
        Number(response.headers.get("content-length")),
        new TextEncoder().encode(source).byteLength,
      );
      assert.equal(JSON.parse(source).result.content.value.value, value);

      value = "文".repeat(400_000);
      const aboveGeneralLimit = await fetch(
        `http://127.0.0.1:${locator.port}${SYNTHESIS_REVERSE_HOST_PATH}`,
        {
          method: "POST",
          headers: {
            ...reverseHostRequestHeaders,
            authorization: `Bearer ${authorizationToken}`,
          },
          body: JSON.stringify({
            schema: SYNTHESIS_REVERSE_HOST_CALL_SCHEMA,
            requestId: "request-oversized",
            profileId,
            serviceInstanceId,
            operationId: "operation-oversized",
            trace,
            capability: "library.artifacts.read",
            deadlineAtMs: Date.now() + 30_000,
            payload: artifactReadPayload,
          }),
        },
      ).catch((error) => {
        throw new Error(`artifact-policy-response: ${String(error)}`);
      });
      const aboveGeneralLimitSource = await aboveGeneralLimit
        .text()
        .catch((error) => {
          throw new Error(
            `artifact-policy-body: ${String(error)} ${JSON.stringify(
              diagnosticEvents.slice(-3),
            )}`,
          );
        });
      assert.equal(aboveGeneralLimit.status, 200);
      assert.equal(
        JSON.parse(aboveGeneralLimitSource).result.content.value.value,
        value,
      );

      value = "页".repeat(300_000);
      const scanResponse = await fetch(
        `http://127.0.0.1:${locator.port}${SYNTHESIS_REVERSE_HOST_PATH}`,
        {
          method: "POST",
          headers: {
            ...reverseHostRequestHeaders,
            authorization: `Bearer ${authorizationToken}`,
          },
          body: JSON.stringify({
            schema: SYNTHESIS_REVERSE_HOST_CALL_SCHEMA,
            requestId: "request-large-scan-page",
            profileId,
            serviceInstanceId,
            operationId: "operation-large-scan-page",
            trace,
            capability: "library.artifacts.scan_page",
            deadlineAtMs: Date.now() + 30_000,
            payload: {},
          }),
        },
      );
      const scanSource = await scanResponse.text();
      assert.equal(scanResponse.status, 200);
      assert.equal(
        Number(scanResponse.headers.get("content-length")),
        new TextEncoder().encode(scanSource).byteLength,
      );
      assert.equal(
        JSON.parse(scanSource).result.artifacts[0].diagnostics.join(""),
        value,
      );

      value = "文".repeat(2_800_000);
      const oversized = await fetch(
        `http://127.0.0.1:${locator.port}${SYNTHESIS_REVERSE_HOST_PATH}`,
        {
          method: "POST",
          headers: {
            ...reverseHostRequestHeaders,
            authorization: `Bearer ${authorizationToken}`,
          },
          body: JSON.stringify({
            schema: SYNTHESIS_REVERSE_HOST_CALL_SCHEMA,
            requestId: "request-over-artifact-limit",
            profileId,
            serviceInstanceId,
            operationId: "operation-over-artifact-limit",
            trace,
            capability: "library.artifacts.read",
            deadlineAtMs: Date.now() + 30_000,
            payload: artifactReadPayload,
          }),
        },
      ).catch((error) => {
        throw new Error(`oversized-error-response: ${String(error)}`);
      });
      const oversizedSource = await oversized.text().catch((error) => {
        throw new Error(
          `oversized-error-body: ${String(error)} ${JSON.stringify(
            diagnosticEvents.slice(-3),
          )}`,
        );
      });
      assert.equal(oversized.status, 503);
      assert.equal(
        Number(oversized.headers.get("content-length")),
        new TextEncoder().encode(oversizedSource).byteLength,
      );
      assert.equal(
        JSON.parse(oversizedSource).error.details.reason,
        "reverse_host_response_too_large",
      );
      const oversizedEvent = diagnosticEvents.find(
        (event) =>
          event.phase === "transport-terminal" &&
          event.code === "reverse_host_response_too_large",
      );
      assert.equal(oversizedEvent?.outcome, "failed");
      assert.equal(oversizedEvent?.metrics?.budgetBytes, 8 * 1024 * 1024);
      assert.isAbove(Number(oversizedEvent?.metrics?.responseBytes), 0);
    } finally {
      endpoint.stop();
      setDebugModeOverrideForTests();
    }
  });

  it("returns real SQLite pages with stable, user-visible results", async function () {
    const token = `keyset-${Date.now()}`;
    const collection = new Zotero.Collection();
    collection.name = `Keyset ${token}`;
    (collection as any).libraryID = Zotero.Libraries.userLibraryID;
    await collection.saveTx();

    const created: Zotero.Item[] = [];
    for (const suffix of ["100%_literal", "creator", "publication"]) {
      const item = new Zotero.Item("journalArticle");
      item.setField("title", `${token} ${suffix}`);
      item.setField("abstractNote", `${token} abstract`);
      item.setField("date", "2026-07-17");
      item.setField("publicationTitle", `${token} Journal`);
      item.setCreators?.([
        { firstName: "Ada", lastName: "Keyset", creatorType: "author" },
      ]);
      item.setTags?.([{ tag: `${token}:tag` }]);
      await item.saveTx();
      await handlers.collection.add([item], collection.id);
      created.push(item);
    }
    const pagedItems = [...created];

    try {
      const first = await queryZoteroLibraryPage({
        libraryId: Zotero.Libraries.userLibraryID,
        collectionId: collection.id,
        query: token,
        limit: 1,
      });
      const second = await queryZoteroLibraryPage({
        libraryId: Zotero.Libraries.userLibraryID,
        collectionId: collection.id,
        query: token,
        limit: 2,
        cursor: first.nextCursor,
      });
      const literal = await queryZoteroLibraryPage({
        libraryId: Zotero.Libraries.userLibraryID,
        collectionId: collection.id,
        query: "100%_literal",
        limit: 10,
      });
      const fieldQueries: Array<[string, number[]]> = [
        ["Ada Keyset", pagedItems.map((item) => item.id)],
        ["2026-07-17", pagedItems.map((item) => item.id)],
        [`${token} Journal`, pagedItems.map((item) => item.id)],
        [`${token} abstract`, pagedItems.map((item) => item.id)],
        [`${token}:tag`, pagedItems.map((item) => item.id)],
        [pagedItems[1].key, [pagedItems[1].id]],
      ];
      for (const [query, expectedIds] of fieldQueries) {
        const matched = await queryZoteroLibraryPage({
          libraryId: Zotero.Libraries.userLibraryID,
          collectionId: collection.id,
          query,
          limit: 10,
        });
        assert.deepEqual(
          matched.items.map((item) => item.id),
          expectedIds,
          query,
        );
      }
      const structuralMatch = await queryZoteroLibraryPage({
        libraryId: Zotero.Libraries.userLibraryID,
        collectionId: collection.id,
        tag: `${token}:tag`,
        itemType: "journalArticle",
        limit: 10,
      });
      assert.deepEqual(
        structuralMatch.items.map((item) => item.id),
        pagedItems.map((item) => item.id),
      );
      const wrongItemType = await queryZoteroLibraryPage({
        libraryId: Zotero.Libraries.userLibraryID,
        collectionId: collection.id,
        tag: `${token}:tag`,
        itemType: "book",
        limit: 10,
      });
      assert.deepEqual(wrongItemType.items, []);

      const childAttachment = new Zotero.Item("attachment");
      childAttachment.parentID = pagedItems[0].id;
      childAttachment.setField("title", `${token}-child-only`);
      await childAttachment.saveTx();
      created.push(childAttachment);
      const childMatch = await queryZoteroLibraryPage({
        libraryId: Zotero.Libraries.userLibraryID,
        query: `${token}-child-only`,
        limit: 10,
      });
      assert.deepEqual(childMatch.items, []);

      const crossBoundary = new Zotero.Item("journalArticle");
      crossBoundary.setField("title", `${token}-field-start`);
      crossBoundary.setField("abstractNote", `${token}-field-end`);
      await crossBoundary.saveTx();
      await handlers.collection.add([crossBoundary], collection.id);
      created.push(crossBoundary);
      const boundaryMatch = await queryZoteroLibraryPage({
        libraryId: Zotero.Libraries.userLibraryID,
        collectionId: collection.id,
        query: `${token}-field-start ${token}-field-end`,
        limit: 10,
      });
      assert.deepEqual(boundaryMatch.items, []);

      const deleted = new Zotero.Item("journalArticle");
      deleted.setField("title", `${token}-deleted-only`);
      await deleted.saveTx();
      await handlers.collection.add([deleted], collection.id);
      created.push(deleted);
      await Zotero.Items.trashTx([deleted.id]);
      const deletedMatch = await queryZoteroLibraryPage({
        libraryId: Zotero.Libraries.userLibraryID,
        collectionId: collection.id,
        query: `${token}-deleted-only`,
        limit: 10,
      });
      assert.deepEqual(deletedMatch.items, []);

      assert.deepEqual(
        first.items.map((item) => item.id),
        [pagedItems[0].id],
      );
      assert.deepEqual(
        second.items.map((item) => item.id),
        pagedItems.slice(1).map((item) => item.id),
      );
      assert.deepEqual(
        literal.items.map((item) => item.id),
        [pagedItems[0].id],
      );
    } finally {
      await Zotero.Items.trashTx(created.map((item) => item.id));
      await collection.eraseTx();
    }
  });

  it("normalizes canonical criteria and enforces bounded keyset pages", async function () {
    const token = `canonical-page-${Date.now()}`;
    const libraryId = Zotero.Libraries.userLibraryID;
    const collection = new Zotero.Collection();
    collection.name = `Canonical page ${token}`;
    (collection as any).libraryID = libraryId;
    await collection.saveTx();

    const created: Zotero.Item[] = [];
    for (const suffix of ["first", "second", "third"]) {
      const item = new Zotero.Item("journalArticle");
      item.setField("title", `${token} ${suffix}`);
      item.setTags?.([{ tag: `${token}:tag` }]);
      await item.saveTx();
      await handlers.collection.add([item], collection.id);
      created.push(item);
    }

    const baseInput = {
      libraryId,
      collectionId: collection.id,
      tag: `  ${token.toUpperCase()}:TAG  `,
      itemType: "  journalArticle  ",
      query: `  ${token.toUpperCase()}  `,
    };
    const expectedCriteria = {
      schema: "zotero-agents.library-live-items.v1",
      libraryId,
      collectionId: collection.id,
      tag: `${token}:tag`,
      itemType: "journalArticle",
      query: token,
      scope: "top-level-regular",
      order: "stable_identity",
    };

    try {
      const normalizedCases = [
        {
          name: "normalizes case and surrounding whitespace once",
          input: baseInput,
          expectedIds: created.map((item) => item.id),
          expectedCriteria,
        },
        {
          name: "normalizes empty optional criteria as absent",
          input: {
            libraryId,
            collectionId: collection.id,
            tag: "   ",
            itemType: "   ",
            query: ` ${token} `,
          },
          expectedIds: created.map((item) => item.id),
          expectedCriteria: {
            schema: "zotero-agents.library-live-items.v1",
            libraryId,
            collectionId: collection.id,
            tag: "",
            itemType: "",
            query: token,
            scope: "top-level-regular",
            order: "stable_identity",
          },
        },
      ];
      for (const testCase of normalizedCases) {
        const page = await queryZoteroLibraryPage({
          ...testCase.input,
          limit: 10,
        });
        assert.deepEqual(
          page.items.map((item) => item.id),
          testCase.expectedIds,
          testCase.name,
        );
        assert.deepEqual(
          page.criteria,
          testCase.expectedCriteria,
          testCase.name,
        );
        assert.strictEqual(page.returned, testCase.expectedIds.length);
        assert.isFalse(page.hasMore);
        assert.strictEqual(page.nextCursor, "");
      }

      const first = await queryZoteroLibraryPage({ ...baseInput, limit: 1 });
      const second = await queryZoteroLibraryPage({
        ...baseInput,
        cursor: first.nextCursor,
        limit: 2,
      });
      assert.deepEqual(first.criteria, expectedCriteria);
      assert.deepEqual(
        first.items.map((item) => item.id),
        [created[0].id],
      );
      assert.strictEqual(first.returned, 1);
      assert.isTrue(first.hasMore);
      assert.isNotEmpty(first.nextCursor);
      assert.deepEqual(
        second.items.map((item) => item.id),
        created.slice(1).map((item) => item.id),
      );
      assert.strictEqual(second.returned, 2);
      assert.isFalse(second.hasMore);
      assert.strictEqual(second.nextCursor, "");

      const invalidCursorCases = [
        {
          name: "rejects a malformed cursor",
          input: { ...baseInput, cursor: "not-a-valid-cursor" },
        },
        {
          name: "rejects a cursor bound to different normalized criteria",
          input: {
            ...baseInput,
            query: `${token}-other`,
            cursor: first.nextCursor,
          },
        },
      ];
      for (const testCase of invalidCursorCases) {
        await expectPageErrorCode(
          () => queryZoteroLibraryPage({ ...testCase.input, limit: 1 }),
          "invalid_library_cursor",
          testCase.name,
        );
      }

      const empty = await queryZoteroLibraryPage({
        libraryId,
        query: `${token}-no-match`,
        limit: 10,
      });
      assert.deepEqual(empty.items, []);
      assert.strictEqual(empty.returned, 0);
      assert.strictEqual(empty.totalScanned, 0);
      assert.isFalse(empty.hasMore);
      assert.strictEqual(empty.nextCursor, "");

      await expectPageErrorCode(
        () => queryZoteroLibraryPage({ ...baseInput, limit: 101 }),
        "library_page_limit_exceeded",
        "rejects an item page request above the hard limit",
      );
    } finally {
      await Zotero.Items.trashTx(created.map((item) => item.id));
      await collection.eraseTx();
    }
  });
});
