import { rebuildSynthesisProtocolCapabilityDto } from "./protocolSchema.js";
export function rebuildSynthesisLibraryIndexResult(value) {
    return rebuildSynthesisProtocolCapabilityDto({
        capability: "client.getLibraryIndex",
        direction: "result",
        value,
    });
}
