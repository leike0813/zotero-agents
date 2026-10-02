import { Client, StreamableHTTPClientTransport, } from "@modelcontextprotocol/client";
import { CallToolResultSchema } from "@modelcontextprotocol/core";
import { sha256PrefixedHex } from "../utils/sha256";
import { getRuntimeEnvironmentSnapshot } from "../platform/env";
import { getRuntimePersistencePaths } from "./runtimePersistence";
import { getPiCredentialRevision, readPiCredential } from "./piCredentialStore";
import { classifyPiMcpHttpUrl, loadPiMcpSourceRegistry, } from "./piMcpSourceRegistry";
import { createPiBrokeredMcpFetch } from "./piBrokeredWebHttp";
import { PiMcpStdioTransport } from "./piMcpStdioTransport";
import { freezePiToolGatewayTurn } from "./piToolGateway";
const MAX_RESULT_BYTES = 1024 * 1024;
const CACHE_MS = 30_000;
const textBytes = (value) => new TextEncoder().encode(JSON.stringify(value)).length;
const sourceIdentity = (source) => JSON.stringify([
    source.transport,
    source.url,
    source.executable,
    source.argv,
    source.cwd,
    source.credentialSlots,
    Object.values(source.credentialSlots).map((ref) => [
        ref,
        getPiCredentialRevision(ref, "mcp-source"),
    ]),
    source.localNetworkApproval,
    source.cleartextApproval,
]);
function freeze(value) {
    if (value && typeof value === "object") {
        for (const child of Object.values(value))
            freeze(child);
        Object.freeze(value);
    }
    return value;
}
const failed = (code, effectCertainty = "confirmed_none") => ({ status: "failed", effectCertainty, code });
export function normalizePiMcpCallResult(raw) {
    try {
        if (textBytes(raw) > MAX_RESULT_BYTES)
            return failed("result_too_large", "unknown");
    }
    catch {
        return failed("invalid_result", "unknown");
    }
    const parsed = CallToolResultSchema.safeParse(raw);
    if (!parsed.success)
        return failed("invalid_result");
    const result = parsed.data;
    const content = [];
    let unsupported = false;
    for (const item of result.content) {
        if (item.type === "text")
            content.push({ type: "text", text: item.text });
        else if (item.type === "resource_link")
            content.push({ type: "resource_link", uri: item.uri, name: item.name });
        else if (item.type === "image")
            content.push({ type: "image", mimeType: item.mimeType, data: item.data });
        else
            unsupported = true;
    }
    const value = {
        content,
        ...(result.structuredContent
            ? { structuredContent: result.structuredContent }
            : {}),
    };
    if (!content.length && !result.structuredContent)
        return failed(unsupported ? "unsupported_result_content" : "empty_result", "unknown");
    if (textBytes(value) > MAX_RESULT_BYTES)
        return failed("result_too_large", "unknown");
    return result.isError
        ? {
            status: "failed",
            effectCertainty: "unknown",
            code: "remote_tool_error",
            value,
        }
        : { status: "completed", effectCertainty: "confirmed_complete", value };
}
async function digest(value) {
    const hash = await sha256PrefixedHex(new TextEncoder().encode(JSON.stringify(value)));
    if (!hash)
        throw new Error("mcp_hash_unavailable");
    return hash;
}
/**
 * Resolve the configured slots to secret values. An explicit override supplies
 * values for already-declared slots without writing them to the credential
 * store; slots without a usable override fall back to the stored record.
 */
async function credentials(source, override) {
    const values = {};
    for (const [slot, ref] of Object.entries(source.credentialSlots)) {
        const provided = override?.[slot];
        if (typeof provided === "string" && provided) {
            values[slot] = provided;
            continue;
        }
        const result = await readPiCredential(ref, "mcp-source");
        if (!result.ok || result.material.kind !== "mcp-secret")
            throw new Error("mcp_credential_unavailable");
        values[slot] = result.material.secret;
    }
    return values;
}
async function openSource(source, invalidate, credentialsOverride, signal) {
    if (signal?.aborted)
        throw new Error("mcp_canceled");
    const client = new Client({ name: "zotero-agents", version: "0.9.0" }, { listMaxPages: 16 });
    client.setNotificationHandler("notifications/tools/list_changed", async () => {
        invalidate();
    });
    const canceled = () => {
        void client.close().catch(() => undefined);
    };
    signal?.addEventListener("abort", canceled, { once: true });
    try {
        if (source.transport === "http") {
            const endpoint = classifyPiMcpHttpUrl(source.url);
            if (endpoint.location !== "public" &&
                source.localNetworkApproval !== endpoint.origin)
                throw new Error("mcp_local_network_denied");
            const headers = await credentials(source, credentialsOverride);
            if (signal?.aborted)
                throw new Error("mcp_canceled");
            await client.connect(new StreamableHTTPClientTransport(new URL(endpoint.url), {
                requestInit: { headers },
                fetch: createPiBrokeredMcpFetch({
                    origin: endpoint.origin,
                    ...(source.localNetworkApproval
                        ? { localNetworkApprovedOrigin: source.localNetworkApproval }
                        : {}),
                    credentialed: Object.keys(headers).length > 0,
                }),
            }));
        }
        else {
            const ambient = getRuntimeEnvironmentSnapshot().env;
            const environment = {};
            for (const key of [
                "PATH",
                "Path",
                "SystemRoot",
                "WINDIR",
                "PATHEXT",
                "HOME",
                "USERPROFILE",
                "TEMP",
                "TMP",
                "LANG",
            ]) {
                if (ambient[key])
                    environment[key] = ambient[key];
            }
            Object.assign(environment, await credentials(source, credentialsOverride));
            if (signal?.aborted)
                throw new Error("mcp_canceled");
            await client.connect(new PiMcpStdioTransport({
                executable: source.executable,
                argv: source.argv || [],
                cwd: source.cwd || getRuntimePersistencePaths().runtimeRoot,
                environment,
            }));
        }
        return client;
    }
    catch (error) {
        await client.close().catch(() => undefined);
        throw error;
    }
    finally {
        signal?.removeEventListener("abort", canceled);
    }
}
/**
 * Production entry point for opening one MCP source connection. The caller may
 * supply explicit values for already-declared credential slots so an admitted
 * source can be opened without persisting additional credentials.
 */
export function openPiMcpSource(source, invalidate = () => undefined, credentialsOverride, signal) {
    return openSource(source, invalidate, credentialsOverride, signal);
}
const LOCAL_DENIAL_CODE = /^(?:pi_network_|mcp_)/;
/** Typed local denial code buried anywhere in an MCP transport failure. */
function localDenialCode(error) {
    let current = error;
    for (let depth = 0; current && depth < 6; depth += 1) {
        if (typeof current.code === "string" &&
            LOCAL_DENIAL_CODE.test(current.code))
            return current.code;
        current = current.cause;
    }
    return undefined;
}
export function createPiMcpToolSources(options = {}) {
    const connections = new Map();
    async function getConnection(source) {
        const identity = sourceIdentity(source);
        let active = connections.get(source.id);
        if (active?.identity !== identity) {
            if (active)
                await active.client.close();
            const client = await (options.openClient || openSource)(source, () => {
                const entry = connections.get(source.id);
                if (entry)
                    entry.dirty = true;
            });
            active = { identity, client, loadedAt: 0, dirty: true };
            connections.set(source.id, active);
        }
        return active;
    }
    async function discover(source) {
        const entry = await getConnection(source);
        if (entry.dirty || Date.now() - entry.loadedAt > CACHE_MS || !entry.tools) {
            const listed = await entry.client.listTools(undefined, {
                timeout: 20_000,
            });
            if (!Array.isArray(listed.tools) ||
                listed.tools.length > 512 ||
                textBytes(listed.tools) > 1024 * 1024)
                throw new Error("mcp_catalog_invalid");
            entry.tools = listed.tools.filter((item) => typeof item?.name === "string" &&
                !!item.name &&
                item.name.length <= 128 &&
                (!item.description || item.description.length <= 4096) &&
                !!item.inputSchema &&
                typeof item.inputSchema === "object");
            entry.loadedAt = Date.now();
            entry.dirty = false;
        }
        return entry.tools;
    }
    async function testSource(id) {
        const source = loadPiMcpSourceRegistry().sources.find((item) => item.id === id);
        if (!source)
            throw new Error("mcp_source_missing");
        return Promise.all((await discover(source)).map(async (tool) => ({
            ...tool,
            digest: await digest([
                tool.name,
                tool.description || "",
                tool.inputSchema,
            ]),
        })));
    }
    async function getCatalogForTurn() {
        let sources = [];
        try {
            sources = loadPiMcpSourceRegistry().sources.filter((item) => item.enabled && Object.keys(item.selectedTools).length > 0);
        }
        catch {
            /* Corrupt registry contributes no callable tools. */
        }
        const tools = [];
        for (const source of sources) {
            let discovered;
            try {
                discovered = await testSource(source.id);
            }
            catch {
                continue;
            }
            for (const tool of discovered) {
                const review = source.selectedTools[tool.name];
                if (!review || review.digest !== tool.digest)
                    continue;
                const location = source.transport === "http"
                    ? classifyPiMcpHttpUrl(source.url).location
                    : "public";
                tools.push({
                    ...tool,
                    sourceId: source.id,
                    alias: (await digest([source.id, tool.name])).slice(7, 31),
                    sourceIdentity: sourceIdentity(source),
                    effects: [
                        ...new Set([
                            ...(review.effects ||
                                (source.transport === "http"
                                    ? ["external-egress", "external-mutation"]
                                    : ["code-execution", "host-control"])),
                            ...(source.transport === "http"
                                ? ["external-egress"]
                                : ["code-execution", "host-control"]),
                            ...(location !== "public" ? ["local-network"] : []),
                        ]),
                    ],
                    promoted: review.promoted,
                });
            }
        }
        tools.sort((a, b) => `${a.sourceId}\n${a.name}`.localeCompare(`${b.sourceId}\n${b.name}`));
        return freeze({
            digest: await digest(tools.map(({ sourceId, sourceIdentity, name, digest: descriptor, effects, promoted, }) => [sourceId, sourceIdentity, name, descriptor, effects, promoted])),
            tools: JSON.parse(JSON.stringify(tools)),
        });
    }
    async function callTool(catalog, sourceId, name, args, signal, trackPhysical) {
        const selected = catalog.tools.find((item) => item.sourceId === sourceId && item.name === name);
        if (!selected)
            return failed("mcp_tool_not_selected");
        let source;
        try {
            source = loadPiMcpSourceRegistry().sources.find((item) => item.id === sourceId);
        }
        catch {
            return failed("mcp_source_unavailable");
        }
        if (!source?.enabled || sourceIdentity(source) !== selected.sourceIdentity)
            return failed("mcp_source_unavailable");
        try {
            const connection = await getConnection(source);
            // A stdio source owns a real child process, so its exit is the physical
            // evidence. A dropped transport proves nothing about the tool call, so
            // the result stays unknown until that child actually settles.
            const settlement = connection.client.physicalSettlement;
            if (settlement)
                trackPhysical?.(settlement.then((state) => state.state, () => "unknown"));
            return normalizePiMcpCallResult(await connection.client.callTool({ name, arguments: args }, { signal, timeout: 30_000, toolDefinition: selected }));
        }
        catch (error) {
            if (error instanceof Error && error.message === "oauth_not_supported")
                return failed("oauth_not_supported", "unknown");
            const denial = localDenialCode(error);
            if (denial)
                return failed(denial, "confirmed_none");
            return failed("mcp_outcome_unknown", "unknown");
        }
    }
    async function dispose() {
        const closing = [...connections.values()];
        connections.clear();
        await Promise.allSettled(closing.map((entry) => entry.client.close()));
    }
    async function disconnectSource(id) {
        const entry = connections.get(id);
        connections.delete(id);
        if (entry)
            await entry.client.close();
    }
    return { testSource, getCatalogForTurn, callTool, disconnectSource, dispose };
}
export function piMcpGatewayDefinitions(catalog, runtime) {
    const byKey = new Map(catalog.tools.map((tool) => [`${tool.sourceId}\n${tool.name}`, tool]));
    const classify = (tool) => ({
        effects: tool.effects,
        authorizationKeys: [`mcp:${tool.sourceId}`],
        resourceKeys: [`mcp:${tool.sourceId}`],
        cost: 1,
    });
    const direct = catalog.tools
        .filter((tool) => tool.promoted)
        .map((tool) => ({
        capabilityId: `mcp.${tool.alias}`,
        name: `mcp_${tool.alias}`,
        description: `[${tool.sourceId}] ${tool.description || tool.name}`,
        schema: tool.inputSchema,
        minimumEffects: tool.effects,
        maxResultBytes: MAX_RESULT_BYTES,
        classify: () => classify(tool),
        execute: (args, context) => runtime.callTool(catalog, tool.sourceId, tool.name, args, context.signal, context.trackPhysical),
    }));
    const proxy = {
        capabilityId: "mcp.proxy",
        name: "mcp",
        description: "Search, describe, or call selected MCP tools",
        schema: {
            type: "object",
            properties: {
                action: { enum: ["search", "describe", "call"] },
                sourceId: { type: "string" },
                name: { type: "string" },
                query: { type: "string" },
                arguments: { type: "object" },
            },
            required: ["action"],
            additionalProperties: false,
        },
        minimumEffects: ["bounded-read"],
        maxResultBytes: MAX_RESULT_BYTES,
        classify: (args) => {
            const call = args;
            const tool = byKey.get(`${call.sourceId}\n${call.name}`);
            if (call.action === "call" && !tool)
                throw new Error("mcp_tool_not_selected");
            return call.action === "call"
                ? {
                    ...classify(tool),
                    effects: ["bounded-read", ...tool.effects],
                }
                : {
                    effects: ["bounded-read"],
                    authorizationKeys: [],
                    resourceKeys: [],
                    cost: 1,
                };
        },
        execute: async (args, context) => {
            const call = args;
            if (call.action === "search")
                return {
                    status: "completed",
                    effectCertainty: "not_applicable",
                    value: catalog.tools
                        .filter((tool) => !call.query ||
                        `${tool.name} ${tool.description || ""}`
                            .toLowerCase()
                            .includes(String(call.query).toLowerCase()))
                        .map(({ sourceId, name, description }) => ({
                        sourceId,
                        name,
                        description: description || "",
                    })),
                };
            if (call.action === "describe") {
                const tool = byKey.get(`${call.sourceId}\n${call.name}`);
                return tool
                    ? {
                        status: "completed",
                        effectCertainty: "not_applicable",
                        value: {
                            sourceId: tool.sourceId,
                            name: tool.name,
                            description: tool.description || "",
                            inputSchema: tool.inputSchema,
                        },
                    }
                    : failed("mcp_tool_not_selected");
            }
            if (call.action === "call")
                return runtime.callTool(catalog, String(call.sourceId), String(call.name), (call.arguments || {}), context.signal, context.trackPhysical);
            return failed("invalid_request");
        },
    };
    return [proxy, ...direct];
}
export function freezePiMcpGatewayTurn(catalog, runtime, input) {
    return freezePiToolGatewayTurn({
        ...input,
        definitions: [
            ...input.definitions,
            ...piMcpGatewayDefinitions(catalog, runtime),
        ],
        hiddenCatalogDigest: catalog.digest,
    });
}
