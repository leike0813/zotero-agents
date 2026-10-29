import type {
  AssistantReplySubmission,
  AssistantWorkspaceOwner,
} from "../../../shared/assistantWireContract";

type Entry = { state: AssistantReplySubmission; active: boolean };
const submissions = new Map<string, Entry>();
const listeners = new Set<(owner: AssistantWorkspaceOwner) => void>();

function key(owner: AssistantWorkspaceOwner) {
  return `${owner.source}\n${owner.ownerKey}`;
}

function notify(owner: AssistantWorkspaceOwner) {
  for (const listener of listeners) listener(owner);
}

export function getAssistantReplySubmission(owner: AssistantWorkspaceOwner) {
  const entry = submissions.get(key(owner));
  return entry ? { ...entry.state } : null;
}

export function beginAssistantReplySubmission(
  owner: AssistantWorkspaceOwner,
  actionId: string,
) {
  if (!actionId || actionId.length > 256) return false;
  const ownerKey = key(owner);
  if (submissions.get(ownerKey)?.active) return false;
  const transcriptLinks = submissions.get(ownerKey)?.state.transcriptLinks;
  submissions.delete(ownerKey);
  submissions.set(ownerKey, {
    active: true,
    state: {
      actionId,
      phase: "submitting",
      transcriptItemId: null,
      error: null,
      displayText: null,
      ...(transcriptLinks?.length ? { transcriptLinks } : {}),
    },
  });
  // Keep in-flight owners pinned; settled receipts are only a bounded UI cache.
  if (submissions.size > 128) {
    for (const [oldKey, entry] of submissions) {
      if (!entry.active) submissions.delete(oldKey);
      if (submissions.size <= 128) break;
    }
  }
  notify(owner);
  return true;
}

function update(
  owner: AssistantWorkspaceOwner,
  patch: Partial<AssistantReplySubmission>,
) {
  const entry = submissions.get(key(owner));
  if (!entry) return;
  entry.state = { ...entry.state, ...patch };
  if (patch.phase === "accepted") entry.active = false;
  notify(owner);
}

export function linkAssistantReplySubmissionTranscript(
  owner: AssistantWorkspaceOwner,
  itemId: string,
  actionId?: string,
) {
  const entry = submissions.get(key(owner));
  if (entry && actionId && entry.state.actionId !== actionId) {
    const transcriptLinks = (entry.state.transcriptLinks || []).filter(
      (link) => link.actionId !== actionId,
    );
    transcriptLinks.push({ actionId, transcriptItemId: itemId });
    update(owner, { transcriptLinks: transcriptLinks.slice(-20) });
    return;
  }
  if (
    !entry ||
    (entry.state.transcriptItemId && entry.state.transcriptItemId !== itemId) ||
    entry.state.phase === "failed" ||
    entry.state.phase === "superseded"
  )
    return;
  const transcriptLinks = (entry.state.transcriptLinks || []).filter(
    (link) => link.actionId !== entry.state.actionId,
  );
  transcriptLinks.push({
    actionId: entry.state.actionId,
    transcriptItemId: itemId,
  });
  update(owner, {
    phase: "accepted",
    transcriptItemId: itemId,
    error: null,
    transcriptLinks: transcriptLinks.slice(-20),
  });
}

export function identifyAssistantReplySubmissionTranscript(
  owner: AssistantWorkspaceOwner,
  itemId: string,
) {
  update(owner, { transcriptItemId: itemId });
}

export function acceptAssistantReplySubmission(owner: AssistantWorkspaceOwner) {
  update(owner, { phase: "accepted", error: null });
}

export function setAssistantReplySubmissionMessage(
  owner: AssistantWorkspaceOwner,
  displayText: string,
) {
  update(owner, { displayText: displayText.slice(0, 4000) });
}

export function failAssistantReplySubmission(
  owner: AssistantWorkspaceOwner,
  error: string,
) {
  update(owner, { phase: "failed", error: error.slice(0, 2000) });
}

export function supersedeAssistantReplySubmission(
  owner: AssistantWorkspaceOwner,
) {
  update(owner, { phase: "superseded", error: null });
}

export function finishAssistantReplySubmission(
  owner: AssistantWorkspaceOwner,
  actionId: string,
) {
  const entry = submissions.get(key(owner));
  if (entry?.state.actionId !== actionId) return;
  entry.active = false;
  if (entry.state.phase === "submitting")
    supersedeAssistantReplySubmission(owner);
}

export function subscribeAssistantReplySubmissions(
  listener: (owner: AssistantWorkspaceOwner) => void,
) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
