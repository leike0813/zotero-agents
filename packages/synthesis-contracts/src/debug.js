import { rebuildSynthesisProtocolCapabilityDto } from "./protocolSchema.js";
export function rebuildSynthesisDebugCapabilityResult(capability, value) {
    return rebuildSynthesisProtocolCapabilityDto({
        capability,
        direction: "result",
        value,
    });
}
