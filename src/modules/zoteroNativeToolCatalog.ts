import {
  ZoteroHostCapabilityError,
  type ZoteroHostCapabilityBroker,
  type ZoteroHostLibraryReadinessAuditArgs,
} from "./zoteroHostCapabilityBroker";
import type { PiGatewayEffect, PiGatewayToolDefinition } from "./piToolGateway";
import type { createPiTrustedNativeExecution } from "./piTrustedNativeExecution";
import type {
  JsonObject,
  JsonValue,
  LibraryListItemsRequestDto,
  LibraryTraversalRequestDto,
  PortableItemRef,
  WorkflowCallControl,
} from "../workflows/types";

type Workspace = Pick<
  Awaited<ReturnType<typeof createPiTrustedNativeExecution>>,
  "materializeOrReuseMany" | "beginGeneratedTextOutput"
>;

const BYTE_LIMIT = 50 * 1024;
const refSchema = {
  type: "object",
  properties: {
    libraryId: { type: "integer", minimum: 1 },
    key: { type: "string", minLength: 1 },
  },
  required: ["libraryId", "key"],
  additionalProperties: false,
};
const pageProperties = {
  limit: { type: "integer", minimum: 1, maximum: 100 },
  cursor: { type: "string", minLength: 1 },
};
const listProperties = {
  libraryId: { type: "integer", minimum: 1 },
  collectionRef: refSchema,
  tag: { type: "string" },
  itemType: { type: "string" },
  query: { type: "string" },
};
const objectSchema = (
  properties: Record<string, unknown>,
  required: string[] = [],
) => ({
  type: "object",
  properties,
  ...(required.length ? { required } : {}),
  additionalProperties: false,
});
const refInput = (args: JsonObject) => args.ref as PortableItemRef;
const pageInput = (args: JsonObject) => ({
  ...(args.limit === undefined ? {} : { limit: args.limit as number }),
  ...(args.cursor === undefined ? {} : { cursor: args.cursor as string }),
});
const control = (signal: AbortSignal): WorkflowCallControl => ({ signal });

class CatalogFailure extends Error {
  constructor(
    readonly code: string,
    readonly details?: JsonValue,
    readonly effectCertainty:
      | "confirmed_none"
      | "confirmed_complete" = "confirmed_none",
  ) {
    super(code);
  }
}

function readDefinition(
  capabilityId: string,
  name: string,
  schema: Record<string, unknown>,
  read: (
    args: JsonObject,
    signal: AbortSignal,
  ) => Promise<JsonValue> | JsonValue,
  effects: PiGatewayEffect[] = ["bounded-read"],
): PiGatewayToolDefinition {
  const writes = effects.includes("workspace-mutation");
  return {
    capabilityId,
    name,
    description: `Read Zotero ${capabilityId.replaceAll("_", " ")}`,
    schema,
    minimumEffects: effects,
    maxResultBytes: BYTE_LIMIT,
    classify: () => ({
      effects,
      authorizationKeys: [],
      resourceKeys: [],
      cost: 1,
    }),
    execute: async (value, { signal }) => {
      try {
        const result = await read(value as JsonObject, signal);
        return {
          status: "completed",
          effectCertainty: writes ? "confirmed_complete" : "not_applicable",
          value: result,
        };
      } catch (error) {
        if (error instanceof ZoteroHostCapabilityError) {
          return {
            status: "failed",
            effectCertainty: "confirmed_none",
            code: error.code,
            retryable: error.retryable,
            details: error.details,
          };
        }
        if (error instanceof CatalogFailure) {
          return {
            status: error.code === "canceled" ? "canceled" : "failed",
            effectCertainty: error.effectCertainty,
            code: error.code,
            details: error.details,
          };
        }
        const message = String(error);
        if (message.includes("pi_managed_cleanup_pending")) {
          return {
            status: "failed",
            effectCertainty: "unknown",
            code: "cleanup_pending",
          };
        }
        if (
          /pi_(?:managed_file_too_large|generated_file_too_large|owner_quota_exceeded|manifest_limit)/.test(
            message,
          )
        ) {
          return {
            status: "failed",
            effectCertainty: "confirmed_none",
            code: "resource_limited",
          };
        }
        return {
          status: "failed",
          effectCertainty: writes ? "unknown" : "confirmed_none",
          code: "internal_error",
        };
      }
    },
  };
}

export function createZoteroNativeToolDefinitions(args: {
  broker: ZoteroHostCapabilityBroker;
  workspace: Workspace;
}): readonly PiGatewayToolDefinition[] {
  const { broker, workspace } = args || {};
  if (typeof broker?.context?.getCurrentView !== "function")
    throw new Error("pi_zotero_broker_incomplete");
  if (
    typeof workspace?.materializeOrReuseMany !== "function" ||
    typeof workspace?.beginGeneratedTextOutput !== "function"
  )
    throw new Error("pi_zotero_workspace_incomplete");

  const ref = { ref: refSchema };
  const refPage = { ...ref, ...pageProperties };
  const fileEffects: PiGatewayEffect[] = ["bounded-read", "workspace-mutation"];
  return [
    readDefinition(
      "context.get_current_view",
      "zotero_context_get_current_view",
      objectSchema({}),
      () => broker.context.getCurrentView() as JsonValue,
    ),
    readDefinition(
      "context.get_selected_items",
      "zotero_context_get_selected_items",
      objectSchema(pageProperties),
      (input, signal) =>
        broker.context.getSelectedItems(
          pageInput(input),
          control(signal),
        ) as Promise<JsonValue>,
    ),
    readDefinition(
      "library.list_items",
      "zotero_library_list_items",
      objectSchema({ ...listProperties, ...pageProperties }),
      (input, signal) =>
        broker.library.listItems(
          input as LibraryListItemsRequestDto,
          control(signal),
        ) as Promise<JsonValue>,
    ),
    readDefinition(
      "library.list_collections",
      "zotero_library_list_collections",
      objectSchema({ libraryId: listProperties.libraryId, ...pageProperties }),
      (input, signal) =>
        broker.library.listCollections(
          input,
          control(signal),
        ) as Promise<JsonValue>,
    ),
    readDefinition(
      "library.get_item_detail",
      "zotero_library_get_item_detail",
      objectSchema(ref, ["ref"]),
      async (input, signal) => {
        const detail = await broker.library.getItemDetail(
          refInput(input),
          control(signal),
        );
        if (
          detail.kind !== "attachment" ||
          detail.item.file.state !== "available"
        )
          return detail as JsonValue;
        const { path: _sourcePath, ...file } = detail.item.file;
        return { ...detail, item: { ...detail.item, file } } as JsonValue;
      },
    ),
    readDefinition(
      "library.get_item_notes",
      "zotero_library_get_item_notes",
      objectSchema(refPage, ["ref"]),
      (input, signal) =>
        broker.library.getItemNotes(
          refInput(input),
          pageInput(input),
          control(signal),
        ) as Promise<JsonValue>,
    ),
    readDefinition(
      "library.get_note_detail",
      "zotero_library_get_note_detail",
      objectSchema(
        { ...ref, format: { type: "string", enum: ["html", "text"] } },
        ["ref", "format"],
      ),
      async (input, signal) => {
        const detail = await broker.library.getNoteDetail(
          refInput(input),
          { format: input.format as "html" | "text" },
          control(signal),
        );
        if (detail.kind === "managed") {
          const observed = new TextEncoder().encode(
            JSON.stringify(detail),
          ).byteLength;
          if (observed > BYTE_LIMIT)
            throw new CatalogFailure("resource_limited", {
              managedType: detail.noteKind,
              limitBytes: BYTE_LIMIT,
              observedBytes: observed,
              recovery: "inspect_note_in_zotero",
            });
        }
        return detail as JsonValue;
      },
    ),
    readDefinition(
      "library.get_item_attachments",
      "zotero_library_get_item_attachments",
      objectSchema(refPage, ["ref"]),
      async (input, signal) => {
        const page = await broker.library.getItemAttachments(
          refInput(input),
          pageInput(input),
          control(signal),
        );
        if (signal.aborted) throw new CatalogFailure("canceled");
        const available = page.attachments.filter(
          (item) => item.file.state === "available",
        );
        const copies = available.length
          ? await workspace.materializeOrReuseMany(
              available.map((item) => ({
                sourcePath: (item.file as { path: string }).path,
                sourceId: `${item.ref.libraryId}:${item.ref.key}`,
                revision: item.revision,
              })),
            )
          : [];
        if (signal.aborted)
          throw new CatalogFailure(
            "canceled",
            undefined,
            available.length ? "confirmed_complete" : "confirmed_none",
          );
        let index = 0;
        return {
          ...page,
          attachments: page.attachments.map((item) =>
            item.file.state === "available"
              ? { ...item, file: { ...item.file, path: copies[index++].path } }
              : item,
          ),
        } as JsonValue;
      },
      fileEffects,
    ),
    readDefinition(
      "library.list_annotations",
      "zotero_library_list_annotations",
      objectSchema(refPage, ["ref"]),
      (input, signal) =>
        broker.library.listAnnotations(
          refInput(input),
          pageInput(input),
          control(signal),
        ) as Promise<JsonValue>,
    ),
    readDefinition(
      "library.export_annotations",
      "zotero_library_export_annotations",
      objectSchema(
        { ...ref, format: { type: "string", enum: ["markdown", "json"] } },
        ["ref"],
      ),
      async (input, signal) => {
        const format =
          (input.format as "markdown" | "json" | undefined) || "markdown";
        const output = await workspace.beginGeneratedTextOutput(
          format === "json" ? ".json" : ".md",
        );
        try {
          const exportResult = await broker.library.exportAnnotations(
            refInput(input),
            { format },
            control(signal),
          );
          if (signal.aborted) throw new CatalogFailure("canceled");
          await output.append(
            format === "json"
              ? JSON.stringify(exportResult.annotations)
              : exportResult.markdown || "",
          );
          return { format, artifact: await output.commit() };
        } catch (error) {
          await output.discard();
          throw error;
        }
      },
      fileEffects,
    ),
    readDefinition(
      "metadata.translate_identifier",
      "zotero_metadata_translate_identifier",
      objectSchema(
        {
          type: { type: "string", enum: ["DOI", "ISBN", "arXiv", "PMID"] },
          value: { type: "string", minLength: 1 },
        },
        ["type", "value"],
      ),
      (input, signal) =>
        broker.metadata.translateIdentifier(
          input as { type: "DOI"; value: string },
          control(signal),
        ) as Promise<JsonValue>,
      ["bounded-read", "external-egress"],
    ),
    readDefinition(
      "library.readiness_audit",
      "zotero_library_readiness_audit",
      objectSchema({
        ...listProperties,
        ...pageProperties,
        checks: {
          type: "array",
          items: { type: "string", enum: ["pdf", "markdown", "analysis"] },
        },
        missingOnly: { type: "boolean" },
      }),
      (input, signal) => {
        const { collectionRef, ...rest } = input;
        return broker.library.readinessAudit(
          {
            ...rest,
            ...(collectionRef ? { collection: collectionRef } : {}),
          } as ZoteroHostLibraryReadinessAuditArgs,
          control(signal),
        ) as Promise<JsonValue>;
      },
    ),
    readDefinition(
      "library.get_item_audit_state",
      "zotero_library_get_item_audit_state",
      objectSchema(ref, ["ref"]),
      (input, signal) =>
        broker.library.getItemAuditState(
          refInput(input),
          control(signal),
        ) as Promise<JsonValue>,
    ),
    readDefinition(
      "library.traverse_items",
      "zotero_library_traverse_items",
      objectSchema(
        {
          ...listProperties,
          scope: { type: "string", enum: ["top-level-regular"] },
          resumeCursor: { type: "string", minLength: 1 },
          pageSize: { type: "integer", minimum: 1, maximum: 100 },
          maxItems: { type: "integer", minimum: 1 },
          maxPages: { type: "integer", minimum: 1 },
          maxDurationMs: { type: "integer", minimum: 1 },
        },
        ["scope"],
      ),
      async (input, signal) => {
        const output = await workspace.beginGeneratedTextOutput(".ndjson");
        let rowCount = 0;
        try {
          const result = await broker.library.traverseItems(
            input as LibraryTraversalRequestDto,
            control(signal),
            async (batch) => {
              for (const item of batch.items) {
                await output.append(`${JSON.stringify(item)}\n`);
                rowCount += 1;
              }
            },
          );
          if (signal.aborted || result.outcome === "canceled")
            throw new CatalogFailure("canceled");
          if (result.visitedItems !== rowCount)
            throw new CatalogFailure("internal_error");
          const artifact = await output.commit();
          return {
            ...result,
            artifact: {
              ...artifact,
              rowCount,
              complete: result.outcome === "completed",
            },
          };
        } catch (error) {
          await output.discard();
          throw error;
        }
      },
      fileEffects,
    ),
  ];
}
