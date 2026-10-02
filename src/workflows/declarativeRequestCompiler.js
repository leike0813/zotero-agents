import { getBaseName } from "../utils/path";
import { buildHostBridgeSelectionBundlePath, buildSkillRunnerUploadRelativePath, } from "../providers/skillrunner/uploadMapping";
import { PASS_THROUGH_REQUEST_KIND } from "../config/defaults";
import { assertRequestKindSupported, assertRequestPayloadContract, } from "../providers/requestContracts";
import { canWorkflowRunWithoutSelection } from "./triggerPolicy";
import { createWorkflowHostApi } from "./hostApi";
import { selectionTargetRef, } from "../modules/selectionContext";
function isObject(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
}
function resolveDefaultWorkflowParams(manifest) {
    const schemaMap = manifest.parameters || {};
    const defaults = {};
    for (const [key, schema] of Object.entries(schemaMap)) {
        if (typeof schema?.default === "undefined") {
            continue;
        }
        defaults[key] = schema.default;
    }
    return defaults;
}
function resolveWorkflowParams(args) {
    return {
        ...resolveDefaultWorkflowParams(args.manifest),
        ...(args.executionOptions?.workflowParams &&
            isObject(args.executionOptions.workflowParams)
            ? args.executionOptions.workflowParams
            : {}),
    };
}
function getAttachmentMime(entry) {
    return (entry.contentType || "").toLowerCase();
}
function isMarkdownAttachment(entry) {
    const mime = getAttachmentMime(entry);
    if (mime === "text/markdown" || mime === "text/x-markdown") {
        return true;
    }
    const filePath = String(entry.filename || "").toLowerCase();
    return filePath.endsWith(".md");
}
function isPdfAttachment(entry) {
    const mime = getAttachmentMime(entry);
    if (mime === "application/pdf") {
        return true;
    }
    const filePath = String(entry.filename || "").toLowerCase();
    return filePath.endsWith(".pdf");
}
function resolveAttachmentBySelector(attachments, selector) {
    const matched = attachments.filter((entry) => {
        if (selector === "selected.markdown") {
            return isMarkdownAttachment(entry);
        }
        if (selector === "selected.pdf") {
            return isPdfAttachment(entry);
        }
        return true;
    });
    if (matched.length !== 1) {
        throw new Error(`Selector ${selector} requires exactly 1 matched attachment, got ${matched.length}`);
    }
    return matched[0];
}
function resolveTargetParentRef(selectionContext) {
    const ref = selectionTargetRef(selectionContext);
    if (!ref)
        throw new Error("Cannot resolve target parent item from selection context");
    return ref;
}
function resolveOptionalTargetParentRef(selectionContext) {
    try {
        return resolveTargetParentRef(selectionContext);
    }
    catch {
        return null;
    }
}
function resolveDeclarativeTargetParentRef(args) {
    if (canWorkflowRunWithoutSelection(args.manifest)) {
        return resolveOptionalTargetParentRef(args.selectionContext);
    }
    return resolveTargetParentRef(args.selectionContext);
}
function resolveSelectionAttachments(selectionContext) {
    const selection = selectionContext;
    return selection.items.filter((item) => item.kind === "attachment");
}
function resolveSourceAttachmentRefs(attachments) {
    return attachments.map((item) => item.ref);
}
function getFileStem(filePath) {
    const name = getBaseName(filePath);
    if (!name) {
        return "";
    }
    return name.replace(/\.[^.]+$/, "");
}
function normalizeTemplateKey(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[\s_-]+/g, "");
}
function compactRenderedTaskName(value) {
    return String(value || "")
        .replace(/\s+([:：])/g, "$1")
        .replace(/([:：])\s*$/g, "")
        .replace(/\s+/g, " ")
        .trim();
}
function renderTaskNameTemplate(args) {
    const template = String(args.manifest.taskNameTemplate || "").trim();
    if (!template) {
        return "";
    }
    const sourceAttachmentName = resolveSelectionAttachments(args.selectionContext)[0]?.filename || "";
    const values = {
        workflowId: args.manifest.id,
        workflowLabel: args.manifest.label,
        targetParentKey: args.targetParentRef?.key || "",
        sourceAttachmentName,
        sourceAttachmentStem: getFileStem(sourceAttachmentName),
        ...args.workflowParams,
    };
    const normalizedValues = new Map();
    for (const [key, value] of Object.entries(values)) {
        const normalizedKey = normalizeTemplateKey(key);
        if (!normalizedKey) {
            continue;
        }
        const renderedValue = typeof value === "string" ||
            typeof value === "number" ||
            typeof value === "boolean"
            ? String(value).trim()
            : "";
        normalizedValues.set(normalizedKey, renderedValue);
    }
    return compactRenderedTaskName(template.replace(/\{([^{}]+)\}/g, (_matched, rawKey) => {
        const key = String(rawKey || "").trim();
        if (Object.prototype.hasOwnProperty.call(values, key)) {
            const value = values[key];
            return typeof value === "string" ||
                typeof value === "number" ||
                typeof value === "boolean"
                ? String(value).trim()
                : "";
        }
        return normalizedValues.get(normalizeTemplateKey(key)) || "";
    }));
}
function resolveSingleSourceAttachment(attachments) {
    return attachments[0] || null;
}
function resolveTaskName(args) {
    const templated = renderTaskNameTemplate(args);
    if (templated) {
        return templated;
    }
    const selection = args.selectionContext;
    const parentTitle = selection.items[0]?.filename || selection.items[0]?.title || "";
    if (String(parentTitle || "").trim()) {
        return String(parentTitle).trim();
    }
    if (args.targetParentRef) {
        return `item-${args.targetParentRef.key}`;
    }
    if (args.manifest.label) {
        return `Workflow: ${args.manifest.label}`;
    }
    return "Task";
}
async function buildSkillRunnerJobRequest(args) {
    const request = args.manifest.request;
    if (!request) {
        throw new Error(`Workflow ${args.manifest.id} missing request declaration`);
    }
    const skillId = String(request.create?.skill_id || "").trim();
    if (!skillId) {
        throw new Error(`Workflow ${args.manifest.id} skillrunner.job.v1 requires request.create.skill_id`);
    }
    const mode = String(request.create?.mode || "").trim();
    if (mode !== "auto" && mode !== "interactive") {
        throw new Error(`Workflow ${args.manifest.id} skillrunner.job.v1 requires request.create.mode`);
    }
    const declaredSkillSource = String(request.create?.skill_source || "").trim();
    const skillSource = declaredSkillSource === "installed" ? "installed" : "local-package";
    const attachments = resolveSelectionAttachments(args.selectionContext);
    const targetParentRef = resolveDeclarativeTargetParentRef(args);
    const declaredFiles = request.input?.upload?.files || [];
    const declaredInput = isObject(request.input) ? request.input : null;
    const inlineInput = declaredInput
        ? Object.fromEntries(Object.entries(declaredInput).filter(([key]) => key !== "upload"))
        : {};
    const keys = new Set();
    const uploadFiles = await Promise.all(declaredFiles.map(async (entry) => {
        if (!entry?.key || typeof entry.key !== "string") {
            throw new Error("request.input.upload.files[].key is required");
        }
        if (keys.has(entry.key)) {
            throw new Error(`Duplicated upload file key: ${entry.key}`);
        }
        keys.add(entry.key);
        if (Object.prototype.hasOwnProperty.call(inlineInput, entry.key)) {
            throw new Error(`request.input field conflict: ${entry.key} is declared by both inline input and upload selector`);
        }
        const attachment = resolveAttachmentBySelector(attachments, entry.from);
        const ref = attachment.ref;
        if (args.handoff) {
            const bundlePath = buildHostBridgeSelectionBundlePath(ref, attachment.filename);
            inlineInput[entry.key] = bundlePath;
            return {
                key: entry.key,
                path: bundlePath,
            };
        }
        const detail = await (args.hostApi || createWorkflowHostApi()).library.getItemDetail(ref);
        if (detail.kind !== "attachment" ||
            detail.item.file.state !== "available") {
            throw new Error("Source attachment file is unavailable");
        }
        const localPath = detail.item.file.path;
        inlineInput[entry.key] = buildSkillRunnerUploadRelativePath(entry.key, localPath);
        return {
            key: entry.key,
            path: localPath,
        };
    }));
    const sourceAttachmentRefs = resolveSourceAttachmentRefs(attachments);
    const workflowParams = resolveWorkflowParams({
        manifest: args.manifest,
        executionOptions: args.executionOptions,
    });
    const taskName = resolveTaskName({
        manifest: args.manifest,
        workflowParams,
        sourceAttachmentRefs,
        selectionContext: args.selectionContext,
        targetParentRef,
    });
    const fetchType = args.manifest.result?.fetch?.type || "bundle";
    const requestPayload = {
        kind: "skillrunner.job.v1",
        taskName,
        sourceAttachmentRefs,
        skill_id: skillId,
        skill_source: skillSource,
        runtime_options: {
            execution_mode: mode,
        },
        ...(uploadFiles.length > 0 ? { upload_files: uploadFiles } : {}),
        parameter: workflowParams,
        ...(Object.keys(inlineInput).length > 0 ? { input: inlineInput } : {}),
        poll: {
            interval_ms: request.poll?.interval_ms || args.manifest.execution?.poll_interval_ms,
        },
        fetch_type: fetchType === "result" ? "result" : "bundle",
    };
    if (targetParentRef) {
        requestPayload.targetParentRef = targetParentRef;
    }
    return requestPayload;
}
function cloneRecord(value) {
    return value && typeof value === "object" && !Array.isArray(value)
        ? { ...value }
        : {};
}
function buildSkillRunnerSequenceRequest(args) {
    const request = args.manifest.request;
    const steps = request?.sequence?.steps || [];
    if (!Array.isArray(steps) || steps.length === 0) {
        throw new Error(`Workflow ${args.manifest.id} skillrunner.sequence.v1 requires request.sequence.steps`);
    }
    const provider = String(args.manifest.provider || "").trim();
    if (provider !== "acp" && provider !== "skillrunner") {
        throw new Error(`Workflow ${args.manifest.id} skillrunner.sequence.v1 requires provider=acp or provider=skillrunner`);
    }
    const finalStepId = String(args.manifest.result?.final_step_id || "").trim();
    if (!finalStepId) {
        throw new Error(`Workflow ${args.manifest.id} skillrunner.sequence.v1 requires result.final_step_id`);
    }
    const workflowParams = resolveWorkflowParams({
        manifest: args.manifest,
        executionOptions: args.executionOptions,
    });
    const targetParentRef = resolveDeclarativeTargetParentRef(args);
    const attachments = resolveSelectionAttachments(args.selectionContext);
    const sourceAttachmentRefs = resolveSourceAttachmentRefs(attachments);
    const taskName = resolveTaskName({
        manifest: args.manifest,
        workflowParams,
        sourceAttachmentRefs,
        selectionContext: args.selectionContext,
        targetParentRef,
    });
    const payload = {
        kind: "skillrunner.sequence.v1",
        taskName,
        sourceAttachmentRefs,
        steps: steps.map((step) => ({
            id: String(step.id || "").trim(),
            skill_id: String(step.skill_id || "").trim(),
            mode: String(step.mode || "").trim(),
            ...(step.input ? { input: cloneRecord(step.input) } : {}),
            ...(step.parameter ? { parameter: cloneRecord(step.parameter) } : {}),
            ...(step.fetch_type ? { fetch_type: step.fetch_type } : {}),
            ...(step.workspace ? { workspace: step.workspace } : {}),
            ...(step.apply_result
                ? { apply_result: cloneRecord(step.apply_result) }
                : {}),
            ...(step.handoff ? { handoff: cloneRecord(step.handoff) } : {}),
            ...(step.short_circuit
                ? { short_circuit: cloneRecord(step.short_circuit) }
                : {}),
        })),
        final_step_id: finalStepId,
        parameter: workflowParams,
        poll: {
            interval_ms: request?.poll?.interval_ms || args.manifest.execution?.poll_interval_ms,
        },
    };
    if (targetParentRef) {
        payload.targetParentRef = targetParentRef;
    }
    return payload;
}
function buildGenericHttpRequest(args) {
    const requestSpec = args.manifest.request;
    const http = requestSpec?.http || {};
    const method = String(http.method || "")
        .trim()
        .toUpperCase();
    const path = String(http.path || "").trim();
    if (!method || !path) {
        throw new Error(`Workflow ${args.manifest.id} generic-http.request.v1 requires request.http.method and request.http.path`);
    }
    const attachments = resolveSelectionAttachments(args.selectionContext);
    const targetParentRef = resolveDeclarativeTargetParentRef(args);
    const sourceAttachmentRefs = resolveSourceAttachmentRefs(attachments);
    const workflowParams = resolveWorkflowParams({
        manifest: args.manifest,
        executionOptions: args.executionOptions,
    });
    const taskName = resolveTaskName({
        manifest: args.manifest,
        workflowParams,
        sourceAttachmentRefs,
        selectionContext: args.selectionContext,
        targetParentRef,
    });
    const sharedPayload = {
        workflow_id: args.manifest.id,
        workflow_label: args.manifest.label,
        attachment_refs: sourceAttachmentRefs,
    };
    const targetParentPayload = targetParentRef
        ? {
            target_parent_ref: targetParentRef,
        }
        : {};
    const payload = isObject(http.json)
        ? {
            ...sharedPayload,
            ...targetParentPayload,
            ...http.json,
        }
        : typeof http.json === "undefined"
            ? {
                ...sharedPayload,
                ...targetParentPayload,
            }
            : {
                ...sharedPayload,
                ...targetParentPayload,
                input: http.json,
            };
    const requestPayload = {
        kind: "generic-http.request.v1",
        taskName,
        sourceAttachmentRefs,
        request: {
            method,
            path,
            ...(http.headers ? { headers: http.headers } : {}),
            json: payload,
        },
        timeout_ms: typeof http.timeout_ms === "number"
            ? http.timeout_ms
            : args.manifest.execution?.timeout_ms,
    };
    if (targetParentRef) {
        requestPayload.targetParentRef = targetParentRef;
    }
    return requestPayload;
}
function buildPassThroughRequest(args) {
    const attachments = resolveSelectionAttachments(args.selectionContext);
    const targetParentRef = resolveOptionalTargetParentRef(args.selectionContext);
    const sourceAttachmentRefs = resolveSourceAttachmentRefs(attachments);
    const workflowParams = resolveWorkflowParams({
        manifest: args.manifest,
        executionOptions: args.executionOptions,
    });
    const taskName = resolveTaskName({
        manifest: args.manifest,
        workflowParams,
        sourceAttachmentRefs,
        selectionContext: args.selectionContext,
        targetParentRef,
    });
    const requestPayload = {
        kind: PASS_THROUGH_REQUEST_KIND,
        taskName,
        sourceAttachmentRefs,
        selectionContext: args.selectionContext,
        parameter: workflowParams,
    };
    if (targetParentRef) {
        requestPayload.targetParentRef = targetParentRef;
    }
    return requestPayload;
}
function buildGenericHttpStepsRequest(args) {
    const requestSpec = args.manifest.request;
    const declaredSteps = Array.isArray(requestSpec?.steps)
        ? requestSpec?.steps || []
        : [];
    if (declaredSteps.length === 0) {
        throw new Error(`Workflow ${args.manifest.id} generic-http.steps.v1 requires request.steps[]`);
    }
    const attachments = resolveSelectionAttachments(args.selectionContext);
    const targetParentRef = resolveDeclarativeTargetParentRef(args);
    const sourceAttachmentRefs = resolveSourceAttachmentRefs(attachments);
    const workflowParams = resolveWorkflowParams({
        manifest: args.manifest,
        executionOptions: args.executionOptions,
    });
    const taskName = resolveTaskName({
        manifest: args.manifest,
        workflowParams,
        sourceAttachmentRefs,
        selectionContext: args.selectionContext,
        targetParentRef,
    });
    const sourceAttachment = resolveSingleSourceAttachment(attachments);
    const sourceAttachmentName = sourceAttachment?.filename || "";
    const context = {
        ...workflowParams,
        workflow_id: args.manifest.id,
        workflow_label: args.manifest.label,
        source_attachment_ref: sourceAttachment?.ref || null,
        source_attachment_name: sourceAttachmentName,
        source_attachment_stem: getFileStem(sourceAttachmentName),
        ...(isObject(requestSpec?.context) ? requestSpec?.context || {} : {}),
    };
    if (targetParentRef) {
        context.target_parent_ref = targetParentRef;
    }
    const requestPayload = {
        kind: "generic-http.steps.v1",
        taskName,
        sourceAttachmentRefs,
        context,
        steps: declaredSteps,
        poll: {
            interval_ms: requestSpec?.poll?.interval_ms ||
                args.manifest.execution?.poll_interval_ms,
            timeout_ms: requestSpec?.poll?.timeout_ms || args.manifest.execution?.timeout_ms,
        },
    };
    if (targetParentRef) {
        requestPayload.targetParentRef = targetParentRef;
    }
    return requestPayload;
}
export async function compileDeclarativeRequest(args) {
    const resolvedKind = assertRequestKindSupported(args.kind).requestKind;
    if (resolvedKind === "skillrunner.job.v1") {
        const request = await buildSkillRunnerJobRequest(args);
        assertRequestPayloadContract({
            requestKind: resolvedKind,
            request,
        });
        return request;
    }
    if (resolvedKind === "skillrunner.sequence.v1") {
        const request = buildSkillRunnerSequenceRequest(args);
        assertRequestPayloadContract({
            requestKind: resolvedKind,
            request,
        });
        return request;
    }
    if (resolvedKind === "generic-http.request.v1") {
        const request = buildGenericHttpRequest(args);
        assertRequestPayloadContract({
            requestKind: resolvedKind,
            request,
        });
        return request;
    }
    if (resolvedKind === "generic-http.steps.v1") {
        const request = buildGenericHttpStepsRequest(args);
        assertRequestPayloadContract({
            requestKind: resolvedKind,
            request,
        });
        return request;
    }
    if (resolvedKind === PASS_THROUGH_REQUEST_KIND) {
        const request = buildPassThroughRequest(args);
        assertRequestPayloadContract({
            requestKind: resolvedKind,
            request,
        });
        return request;
    }
    throw new Error(`Unsupported declarative request kind: ${resolvedKind}`);
}
