export function shouldShowWorkflowNotifications(manifest) {
    return manifest.execution?.feedback?.showNotifications !== false;
}
