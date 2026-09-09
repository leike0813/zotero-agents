import type { HostHttpRequest } from "../hostHttpRequestReader";
import type { HostBridgeRouteMatch } from "../hostBridgeRouteContract";

export type HostBridgeWorkflowActivityRouteHandlers = Record<
  | "listWorkflows"
  | "describeWorkflow"
  | "listProviderProfiles"
  | "describeProviderProfile"
  | "validateProviderProfile"
  | "refreshProviderProfile"
  | "workflowDefaults"
  | "validateWorkflow"
  | "workflowRequirements"
  | "submitWorkflow"
  | "listWorkflowQueue"
  | "cancelWorkflowQueueUnit"
  | "getWorkflowSubmission"
  | "agentRunWorkflow"
  | "applyAgentRunWorkflow"
  | "renewAgentRunWorkflow"
  | "abandonAgentRunWorkflow"
  | "cancelWorkflowRun"
  | "listWorkflowRuns"
  | "getWorkflowRun"
  | "listActiveTasks"
  | "listRecentTasks"
  | "listTasks"
  | "listPendingPermissions"
  | "getPermission"
  | "listNotifications"
  | "ackNotifications"
  | "listRecentSkillRuns"
  | "handleSkillRun",
  HostBridgeRouteMatch["handle"]
>;

export function matchHostBridgeWorkflowActivityRoute(
  request: HostHttpRequest,
  handlers: HostBridgeWorkflowActivityRouteHandlers,
): HostBridgeRouteMatch | null {
  const path = request.path;
  const read = (
    handle: HostBridgeRouteMatch["handle"],
  ): HostBridgeRouteMatch => ({
    admission: "read",
    handle,
  });
  const write = (
    handle: HostBridgeRouteMatch["handle"],
  ): HostBridgeRouteMatch => ({
    admission: request.method === "GET" ? "read" : "generic-operation",
    handle,
  });

  if (path === "/bridge/v2/workflows") return read(handlers.listWorkflows);
  if (path === "/bridge/v2/workflows/describe")
    return read(handlers.describeWorkflow);
  if (path === "/bridge/v2/workflows/provider-profiles")
    return read(handlers.listProviderProfiles);
  if (path === "/bridge/v2/workflows/provider-profiles/describe")
    return read(handlers.describeProviderProfile);
  if (path === "/bridge/v2/workflows/provider-profiles/validate")
    return read(handlers.validateProviderProfile);
  if (path === "/bridge/v2/workflows/provider-profiles/refresh")
    return read(handlers.refreshProviderProfile);
  if (path === "/bridge/v2/workflows/defaults")
    return read(handlers.workflowDefaults);
  if (path === "/bridge/v2/workflows/validate")
    return read(handlers.validateWorkflow);
  if (path === "/bridge/v2/workflows/requirements")
    return read(handlers.workflowRequirements);
  if (path === "/bridge/v2/workflows/submit")
    return write(handlers.submitWorkflow);
  if (path === "/bridge/v2/workflows/queue")
    return read(handlers.listWorkflowQueue);
  if (/^\/bridge\/v2\/workflows\/queue\/[^/]+\/cancel$/.test(path))
    return write(handlers.cancelWorkflowQueueUnit);
  if (path.startsWith("/bridge/v2/workflows/submissions/"))
    return read(handlers.getWorkflowSubmission);
  if (path === "/bridge/v2/workflows/agent-run")
    return write(handlers.agentRunWorkflow);
  if (/^\/bridge\/v2\/workflows\/agent-runs\/[^/]+\/apply$/.test(path))
    return write(handlers.applyAgentRunWorkflow);
  if (/^\/bridge\/v2\/workflows\/agent-runs\/[^/]+\/renew$/.test(path))
    return write(handlers.renewAgentRunWorkflow);
  if (/^\/bridge\/v2\/workflows\/agent-runs\/[^/]+\/abandon$/.test(path))
    return write(handlers.abandonAgentRunWorkflow);
  if (/^\/bridge\/v2\/workflows\/runs\/[^/]+\/cancel$/.test(path))
    return write(handlers.cancelWorkflowRun);
  if (path === "/bridge/v2/workflows/runs")
    return read(handlers.listWorkflowRuns);
  if (path.startsWith("/bridge/v2/workflows/runs/"))
    return read(handlers.getWorkflowRun);
  if (path === "/bridge/v2/tasks/active") return read(handlers.listActiveTasks);
  if (path === "/bridge/v2/tasks/recent") return read(handlers.listRecentTasks);
  if (path === "/bridge/v2/tasks") return read(handlers.listTasks);
  if (path === "/bridge/v2/permissions/pending")
    return read(handlers.listPendingPermissions);
  if (path.startsWith("/bridge/v2/permissions/"))
    return read(handlers.getPermission);
  if (path === "/bridge/v2/notifications")
    return read(handlers.listNotifications);
  if (path === "/bridge/v2/notifications/ack")
    return write(handlers.ackNotifications);
  if (path === "/bridge/v2/skill-runs/recent")
    return read(handlers.listRecentSkillRuns);
  if (/^\/bridge\/v2\/skill-runs\/[^/]+\/(reply|connect)$/.test(path))
    return write(handlers.handleSkillRun);
  if (path.startsWith("/bridge/v2/skill-runs/"))
    return read(handlers.handleSkillRun);
  return null;
}
