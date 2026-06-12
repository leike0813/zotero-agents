import "../test/setup/zotero-mock.ts";
import path from "path";
import { fileURLToPath } from "url";
import { handlers } from "../src/handlers";
import { createHookHelpers } from "../src/workflows/helpers";
import { loadWorkflowManifests } from "../src/workflows/loader";
import { executeBuildRequests } from "../src/workflows/runtime";
import { LITERATURE_ANALYSIS_FIXTURE_CASES } from "../test/workflow-literature-analysis/literature-analysis-fixture-cases";
import type {
  LoadedWorkflow,
  WorkflowManifest,
  WorkflowRuntimeContext,
} from "../src/workflows/types";

type AttachmentLike = {
  parent?: { id?: number | null } | null;
  filePath?: string | null;
  item?: { id?: number; data?: { dateAdded?: string; contentType?: string } };
};

type BuiltRequest = {
  kind: string;
  targetParentID: number;
  steps: Array<{
    id: string;
    files?: Array<{ key: string; path: string }>;
  }>;
};

type SelectionLike = {
  items?: {
    attachments?: AttachmentLike[];
    parents?: Array<{ attachments?: AttachmentLike[] }>;
    children?: Array<{ attachments?: AttachmentLike[] }>;
  };
  summary?: { attachmentCount?: number };
};

function resolveProjectRoot() {
  const scriptPath = fileURLToPath(import.meta.url);
  const scriptDir = path.dirname(scriptPath);
  return path.resolve(scriptDir, "..");
}

function toCopy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function flattenAttachments(selection: SelectionLike) {
  const items = selection.items || {};
  const direct = Array.isArray(items.attachments) ? items.attachments : [];
  const fromParents = (Array.isArray(items.parents) ? items.parents : [])
    .flatMap((entry) => entry.attachments || [])
    .filter(Boolean);
  const fromChildren = (Array.isArray(items.children) ? items.children : [])
    .flatMap((entry) => entry.attachments || [])
    .filter(Boolean);
  const merged = [...direct, ...fromParents, ...fromChildren];
  const seen = new Set<string>();
  const deduped: AttachmentLike[] = [];
  for (const entry of merged) {
    const parentId = entry.parent?.id || "";
    const key =
      typeof entry.item?.id === "number"
        ? `id:${entry.item.id}`
        : `file:${entry.filePath || ""}|parent:${parentId}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(entry);
  }
  return deduped;
}

function collectAttachmentCandidates(selection: SelectionLike) {
  const direct = selection.items?.attachments || [];
  if (direct.length > 0) {
    return flattenAttachments({
      items: {
        attachments: direct,
        parents: [],
        children: [],
      },
    });
  }
  return flattenAttachments(selection);
}

function applyManifestInputFilter(
  selectionContext: unknown,
  manifest: WorkflowManifest,
): SelectionLike {
  const copied =
    selectionContext && typeof selectionContext === "object"
      ? toCopy(selectionContext as SelectionLike)
      : {};
  if (manifest.inputs?.unit && manifest.inputs.unit !== "attachment") {
    return copied;
  }

  const allowedMimes = manifest.inputs?.accepts?.mime || [];
  if (!copied.items) {
    copied.items = {};
  }
  const attachments = collectAttachmentCandidates(copied).filter((attachment) => {
    if (!allowedMimes.length) {
      return true;
    }
    const mime = (attachment as { mimeType?: string; item?: { data?: { contentType?: string } } })
      .mimeType || attachment.item?.data?.contentType || "";
    if (mime && allowedMimes.includes(mime)) {
      return true;
    }
    const filePath = String(attachment.filePath || "").toLowerCase();
    if (
      filePath.endsWith(".md") &&
      (allowedMimes.includes("text/markdown") ||
        allowedMimes.includes("text/x-markdown") ||
        allowedMimes.includes("text/plain"))
    ) {
      return true;
    }
    if (filePath.endsWith(".pdf") && allowedMimes.includes("application/pdf")) {
      return true;
    }
    return false;
  });

  copied.items.attachments = attachments;
  if (!copied.summary) {
    copied.summary = {};
  }
  copied.summary.attachmentCount = attachments.length;
  return copied;
}

function countByParent(attachments: AttachmentLike[]) {
  const byParent = new Map<number, number>();
  for (const entry of attachments) {
    const parentId = entry.parent?.id || null;
    if (!parentId) {
      continue;
    }
    byParent.set(parentId, (byParent.get(parentId) || 0) + 1);
  }
  return byParent;
}

function shouldCallFilterHook(selection: SelectionLike, manifest: WorkflowManifest) {
  if (manifest.inputs?.unit && manifest.inputs.unit !== "attachment") {
    return false;
  }
  const max = manifest.inputs?.per_parent?.max;
  if (typeof max !== "number" || max < 0) {
    return false;
  }
  const attachments = collectAttachmentCandidates(selection);
  const byParent = countByParent(attachments);
  for (const count of byParent.values()) {
    if (count > max) {
      return true;
    }
  }
  return false;
}

async function resolveSelectionForInspection(args: {
  workflow: LoadedWorkflow;
  selectionContext: unknown;
  runtime: WorkflowRuntimeContext;
}) {
  const filteredByManifest = applyManifestInputFilter(
    args.selectionContext,
    args.workflow.manifest,
  );
  const hookUsed =
    !!args.workflow.hooks.filterInputs &&
    shouldCallFilterHook(filteredByManifest, args.workflow.manifest);

  if (!hookUsed || !args.workflow.hooks.filterInputs) {
    return { selection: filteredByManifest, hookUsed: false };
  }

  const fromHook = await args.workflow.hooks.filterInputs({
    selectionContext: filteredByManifest,
    manifest: args.workflow.manifest,
    runtime: args.runtime,
  });
  return { selection: fromHook as SelectionLike, hookUsed: true };
}

function pickAttachmentSummary(selection: SelectionLike) {
  const attachments = selection.items?.attachments || [];
  return attachments.map((entry, idx) => {
    const filePath = entry.filePath || "";
    return {
      index: idx + 1,
      parentId: entry.parent?.id || null,
      fileName: path.basename(filePath),
      filePath,
      dateAdded: entry.item?.data?.dateAdded || null,
    };
  });
}

async function main() {
  const projectRoot = resolveProjectRoot();
  // Keep loader input relative to project root to stay compatible with
  // runtime-specific path join behavior.
  process.chdir(projectRoot);
  const workflowsDir = "workflows_builtin";
  const loaded = await loadWorkflowManifests(workflowsDir);
  const workflow = loaded.workflows.find(
    (entry) => entry.manifest.id === "literature-analysis",
  );
  if (!workflow) {
    const loadedIds = loaded.workflows.map((entry) => entry.manifest.id).join(", ");
    throw new Error(
      `Workflow literature-analysis not found. cwd=${process.cwd()}; workflowsDir=${workflowsDir}; loaded=[${loadedIds}]; warnings=${loaded.warnings.join(" | ")}`,
    );
  }

  const runtime: WorkflowRuntimeContext = {
    handlers,
    zotero: Zotero,
    helpers: createHookHelpers(Zotero),
  };

  for (const fixtureCase of LITERATURE_ANALYSIS_FIXTURE_CASES) {
    const selectionContext = fixtureCase.context;
    const resolved = await resolveSelectionForInspection({
      workflow,
      selectionContext,
      runtime,
    });
    const requests = (await executeBuildRequests({
      workflow,
      selectionContext,
      runtime,
    })) as BuiltRequest[];

    const summary = pickAttachmentSummary(resolved.selection);

    console.log(`\n=== ${fixtureCase.name} ===`);
    console.log(`filterInputs called: ${resolved.hookUsed ? "yes" : "no"}`);
    console.log(`filtered inputs count: ${summary.length}`);
    if (!summary.length) {
      console.log("- (none)");
    } else {
      for (const entry of summary) {
        console.log(
          `- #${entry.index} parent=${entry.parentId} file=${entry.fileName} path=${entry.filePath} dateAdded=${entry.dateAdded}`,
        );
      }
    }
    console.log(`request count: ${requests.length}`);
    requests.forEach((request, idx) => {
      console.log(`request[${idx + 1}].json:`);
      console.log(JSON.stringify(request, null, 2));
    });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
