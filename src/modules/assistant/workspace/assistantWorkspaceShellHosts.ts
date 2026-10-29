import type { AssistantWorkspaceActionRouterShellHost } from "./assistantWorkspaceActionRouter";
import type { AssistantWorkspacePublicationShellHost } from "./assistantWorkspacePublicationHost";

export let actionRouterShellHost: AssistantWorkspaceActionRouterShellHost;
export let publicationShellHost: AssistantWorkspacePublicationShellHost;

export function setActionRouterShellHost(
  host: AssistantWorkspaceActionRouterShellHost,
) {
  actionRouterShellHost = host;
}

export function setPublicationShellHost(
  host: AssistantWorkspacePublicationShellHost,
) {
  publicationShellHost = host;
}
