# Proposal

## Why

The Built-in Pi Agent Runtime has a generic Tool Gateway and a canonical Zotero capability broker, but no direct Zotero tool definition that joins them. C12 establishes that seam with one real read capability before the later read, mutation, and navigation catalogs extend it.

## What Changes

- Add a broker-bound, static Pi definition for `context.get_current_view` with a closed empty input and a provider-safe name.
- Preserve the broker's strict-JSON result and structured error facts through the existing Gateway result envelope; keep unknown exceptions opaque.
- Verify capability admission, frozen catalog, dual receipt identity, and real Zotero dispatch without creating another Zotero semantic owner.

## Capabilities

### New Capabilities

- `pi-zotero-tool-catalog`: Explicit mapping and safe Broker projection for the first Zotero Native Tool.

### Modified Capabilities

- `pi-tool-gateway-policy`: Allow bounded, validated executor failure details and retryability in the structured tool result while keeping receipts payload-free.

## Impact

The new catalog module consumes `ZoteroHostCapabilityBroker` and returns `PiGatewayToolDefinition` values. The Gateway execution/result types gain optional structured failure fields. Existing Host Bridge, MCP, Workflow Host, broker semantics, dependencies, UI, and owner composition are unchanged.
