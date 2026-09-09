import type {
  LoadedWorkflow,
  WorkflowManifest,
} from "../../../workflows/types";
import { isDebugModeEnabled } from "../../debugMode";
import { getLoadedWorkflowEntries } from "./workflowRuntime";

function toManifest(input: LoadedWorkflow | WorkflowManifest) {
  if ("manifest" in input) {
    return input.manifest;
  }
  return input;
}

export function isWorkflowDebugOnly(input: LoadedWorkflow | WorkflowManifest) {
  return toManifest(input).debug_only === true;
}

export function isWorkflowVisible(input: LoadedWorkflow | WorkflowManifest) {
  if (!isWorkflowDebugOnly(input)) {
    return true;
  }
  return isDebugModeEnabled();
}

export function getVisibleLoadedWorkflowEntries() {
  return getLoadedWorkflowEntries().filter((entry) => isWorkflowVisible(entry));
}
