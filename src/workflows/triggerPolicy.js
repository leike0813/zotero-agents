export function canWorkflowRunWithoutSelection(manifest) {
    return manifest.trigger?.requiresSelection === false;
}
export function requiresWorkflowSelection(manifest) {
    return !canWorkflowRunWithoutSelection(manifest);
}
