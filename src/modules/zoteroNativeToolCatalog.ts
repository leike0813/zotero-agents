import {
  ZoteroHostCapabilityError,
  type ZoteroHostCapabilityBroker,
} from "./zoteroHostCapabilityBroker";
import type { PiGatewayToolDefinition } from "./piToolGateway";

export function createZoteroNativeToolDefinitions(
  broker: ZoteroHostCapabilityBroker,
): readonly PiGatewayToolDefinition[] {
  if (typeof broker?.context?.getCurrentView !== "function")
    throw new Error("pi_zotero_broker_incomplete");

  return [
    {
      capabilityId: "context.get_current_view",
      name: "zotero_context_get_current_view",
      description: "Read the current Zotero view context",
      schema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      minimumEffects: ["bounded-read"],
      maxResultBytes: 50 * 1024,
      classify: () => ({
        effects: ["bounded-read"],
        authorizationKeys: [],
        resourceKeys: [],
        cost: 1,
      }),
      execute: async () => {
        try {
          return {
            status: "completed",
            effectCertainty: "not_applicable",
            value: broker.context.getCurrentView(),
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
          return {
            status: "failed",
            effectCertainty: "confirmed_none",
            code: "internal_error",
          };
        }
      },
    },
  ];
}
