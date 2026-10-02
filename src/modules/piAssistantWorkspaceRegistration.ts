import { PI_CONVERSATIONS_WORKSPACE_ADAPTER } from "./piConversationWorkspaceSurface";
import { getPiConversationCoordinator } from "./piConversation";
import {
  PI_SKILL_RUNS_WORKSPACE_ADAPTER,
  setPiSkillRunActionNotice,
} from "./piSkillRunWorkspaceSurface";
import { getPiSkillRunCoordinator } from "./piSkillRun";
import {
  focusPiSkillRunWorkspace,
  setPiAssistantWorkspaceBindings,
} from "./assistant/workspace/assistantWorkspaceSidebar";
import { setPiPublicationAdapters } from "./assistant/workspace/assistantWorkspacePublicationHost";
import { buildPiLocalNetworkAuthorizer } from "./assistant/workspace/assistantWorkspaceActionRouter";

/**
 * The single composition boundary that puts the Built-in Pi surfaces into the
 * Assistant Workspace. It is imported dynamically and only when the Pi runtime
 * is compiled in, so the measurement-only control build keeps its entry graph
 * free of every Pi Conversation and Skill Run module.
 */
export function registerPiAssistantWorkspaceSurfaces() {
  setPiAssistantWorkspaceBindings({
    conversationsSurface: () => ({
      adapter: PI_CONVERSATIONS_WORKSPACE_ADAPTER,
    }),
    conversationCoordinator: () => getPiConversationCoordinator(),
    skillRunsSurface: () => ({ adapter: PI_SKILL_RUNS_WORKSPACE_ADAPTER }),
    skillRunCoordinator: () => getPiSkillRunCoordinator(),
    listSkillRuns: () => getPiSkillRunCoordinator().list(),
    subscribeSkillRuns: (listener) =>
      getPiSkillRunCoordinator().subscribe(listener),
    selectSkillRun: (requestId) => getPiSkillRunCoordinator().select(requestId),
    setSkillRunActionNotice: (requestId, code) =>
      setPiSkillRunActionNotice(requestId, code),
  });
  setPiPublicationAdapters({
    conversations: PI_CONVERSATIONS_WORKSPACE_ADAPTER,
    skillRuns: PI_SKILL_RUNS_WORKSPACE_ADAPTER,
  });
  // Interactive Pi Skill Run admission focuses once through the coordinator's
  // launch hook; the snapshot window main captured at admission wins, and only
  // a missing snapshot falls back to the current main window.
  getPiSkillRunCoordinator().setLaunchFocus(async (requestId, window) => {
    await focusPiSkillRunWorkspace(
      requestId,
      (window as _ZoteroTypes.MainWindow | undefined) || undefined,
    );
  });
  // Local-network approval reuses the same window-scoped dialog ACP uses, so a
  // local endpoint never becomes an unapproved implicit grant. The coordinator
  // passes the turn's transient origin window; only a missing one falls back to
  // the current main window, resolved per request rather than at module load.
  getPiSkillRunCoordinator().setLocalNetworkAuthorizer(
    async (endpoint, window) => {
      const win =
        (window as _ZoteroTypes.MainWindow | undefined) ||
        (Zotero.getMainWindow?.() as _ZoteroTypes.MainWindow | undefined);
      return win ? buildPiLocalNetworkAuthorizer({ win })(endpoint) : false;
    },
  );
}
