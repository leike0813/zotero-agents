import Ajv2020 from "ajv/dist/2020";
import capabilityContractJson from "../../../../contracts/host-bridge/capabilities.v2.json";
import capabilityContractSchema from "../../../../contracts/host-bridge/schemas/host-bridge-capabilities.v2.schema.json";
import { MUTATION_EXECUTE_INPUT_SCHEMA, MUTATION_EXECUTE_OUTPUT_SCHEMA, MUTATION_GET_OPERATION_INPUT_SCHEMA, MUTATION_GET_OPERATION_OUTPUT_SCHEMA, MUTATION_PREVIEW_INPUT_SCHEMA, MUTATION_PREVIEW_OUTPUT_SCHEMA, NOTE_DETAIL_OUTPUT_SCHEMA, } from "../../../schemas/zoteroHostMutationSchemas";
export const HOST_BRIDGE_NOTE_DETAIL_OUTPUT_SCHEMA = {
    ...NOTE_DETAIL_OUTPUT_SCHEMA,
    oneOf: NOTE_DETAIL_OUTPUT_SCHEMA.oneOf.map((branch) => branch.properties.kind.const === "ordinary"
        ? {
            ...branch,
            properties: {
                ...branch.properties,
                offset: { type: "integer", minimum: 0 },
                nextOffset: { type: "integer", minimum: 0 },
                totalChars: { type: "integer", minimum: 0 },
                hasMore: { type: "boolean" },
                truncated: { type: "boolean" },
                maxChars: { type: "integer", minimum: 1 },
            },
            required: [
                ...branch.required,
                "offset",
                "nextOffset",
                "totalChars",
                "hasMore",
                "truncated",
                "maxChars",
            ],
        }
        : branch),
};
const contract = capabilityContractJson;
contract.capabilities["library.get_note_detail"] = {
    ...contract.capabilities["library.get_note_detail"],
    outputSchema: HOST_BRIDGE_NOTE_DETAIL_OUTPUT_SCHEMA,
};
const ajv = new Ajv2020({
    allErrors: true,
    strict: false,
    logger: false,
});
const validateContract = ajv.compile(capabilityContractSchema);
if (!validateContract(contract)) {
    throw new Error(`Invalid Host Bridge capability contract: ${ajv.errorsText(validateContract.errors)}`);
}
const inputValidators = new Map();
const outputValidators = new Map();
for (const [name, entry] of Object.entries(contract.capabilities)) {
    inputValidators.set(name, ajv.compile(entry.inputSchema));
    outputValidators.set(name, ajv.compile(entry.outputSchema));
}
const mutationExecuteInputValidator = ajv.compile(MUTATION_EXECUTE_INPUT_SCHEMA);
const mutationExecuteOutputValidator = ajv.compile(MUTATION_EXECUTE_OUTPUT_SCHEMA);
const mutationPreviewInputValidator = ajv.compile(MUTATION_PREVIEW_INPUT_SCHEMA);
const mutationPreviewOutputValidator = ajv.compile(MUTATION_PREVIEW_OUTPUT_SCHEMA);
const mutationGetOperationInputValidator = ajv.compile(MUTATION_GET_OPERATION_INPUT_SCHEMA);
const mutationGetOperationOutputValidator = ajv.compile(MUTATION_GET_OPERATION_OUTPUT_SCHEMA);
function valueType(value) {
    if (value === null)
        return "null";
    if (Array.isArray(value))
        return "array";
    return typeof value;
}
function propertySuggestions(property, schema) {
    const properties = schema.properties &&
        typeof schema.properties === "object" &&
        !Array.isArray(schema.properties)
        ? Object.keys(schema.properties)
        : [];
    const lowered = property.toLowerCase();
    return properties
        .filter((candidate) => {
        const candidateLowered = candidate.toLowerCase();
        return (candidateLowered.includes(lowered) ||
            lowered.includes(candidateLowered) ||
            candidateLowered[0] === lowered[0]);
    })
        .slice(0, 3);
}
function violationFromAjv(error, value, schema) {
    const property = error.keyword === "additionalProperties"
        ? String(error.params.additionalProperty || "")
        : error.keyword === "required"
            ? String(error.params.missingProperty || "")
            : "";
    const expected = error.keyword === "type"
        ? error.params.type
        : error.keyword === "enum"
            ? error.params.allowedValues
            : undefined;
    const suggestions = property && error.keyword === "additionalProperties"
        ? propertySuggestions(property, schema)
        : [];
    return {
        reason: error.keyword,
        ...(error.instancePath ? { path: error.instancePath } : {}),
        ...(error.schemaPath ? { schemaPath: error.schemaPath } : {}),
        ...(expected !== undefined ? { expected } : {}),
        actualType: valueType(value),
        ...(property ? { property } : {}),
        ...(suggestions.length ? { suggestions } : {}),
    };
}
function validate(validator, value, schema) {
    if (!validator) {
        return [
            {
                reason: "capability_not_registered",
            },
        ];
    }
    if (validator(value)) {
        return [];
    }
    return (validator.errors || [])
        .map((error) => violationFromAjv(error, value, schema))
        .sort((left, right) => `${left.path || ""}\n${left.reason}\n${left.property || ""}`.localeCompare(`${right.path || ""}\n${right.reason}\n${right.property || ""}`))
        .slice(0, 8);
}
export function listHostBridgeCapabilityContractEntries() {
    return Object.entries(contract.capabilities).map(([name, entry]) => ({
        name,
        ...entry,
    }));
}
export function getHostBridgeCapabilityContract(name) {
    return contract.capabilities[name] || null;
}
export function validateHostBridgeCapabilityInput(name, value) {
    const entry = getHostBridgeCapabilityContract(name);
    return entry
        ? validate(inputValidators.get(name), value ?? {}, entry.inputSchema)
        : [{ reason: "capability_not_registered" }];
}
export function validateHostBridgeCapabilityOutput(name, value) {
    const entry = getHostBridgeCapabilityContract(name);
    return entry
        ? validate(outputValidators.get(name), value ?? null, entry.outputSchema)
        : [{ reason: "capability_not_registered" }];
}
export function validateHostBridgeMutationExecuteInput(value) {
    return validate(mutationExecuteInputValidator, value ?? {}, MUTATION_EXECUTE_INPUT_SCHEMA);
}
export function validateHostBridgeMutationExecuteOutput(value) {
    return validate(mutationExecuteOutputValidator, value ?? null, MUTATION_EXECUTE_OUTPUT_SCHEMA);
}
export function validateHostBridgeMutationPreviewInput(value) {
    return validate(mutationPreviewInputValidator, value ?? {}, MUTATION_PREVIEW_INPUT_SCHEMA);
}
export function validateHostBridgeMutationPreviewOutput(value) {
    return validate(mutationPreviewOutputValidator, value ?? null, MUTATION_PREVIEW_OUTPUT_SCHEMA);
}
export function validateHostBridgeMutationGetOperationInput(value) {
    return validate(mutationGetOperationInputValidator, value ?? {}, MUTATION_GET_OPERATION_INPUT_SCHEMA);
}
export function validateHostBridgeMutationGetOperationOutput(value) {
    return validate(mutationGetOperationOutputValidator, value ?? null, MUTATION_GET_OPERATION_OUTPUT_SCHEMA);
}
export const HOST_BRIDGE_CAPABILITY_CONTRACT_SCHEMA = contract.schema;
