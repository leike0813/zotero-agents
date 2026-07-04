## Context

The single-shell Assistant Workspace keeps one `assistant-workspace.html` frame
per Zotero main window and moves it between library and reader docks. The child
panels inside that shell are separate iframes. The broken first-open behavior
comes from two gaps: host state is not actively published when a user opens the
workspace, and the shell does not replay cached snapshots when a child reports
ready after an early host snapshot. ACP Chat and ACP Skills recover when later
store updates emit real snapshots, while SkillRunner used to appear special
because it had attach-time init and ready fallback paths.

## Goals / Non-Goals

**Goals:**

- Use one lifecycle protocol for ACP Chat, ACP Skills, and SkillRunner child
  panels.
- Ensure first open and tab switches receive localized host snapshots.
- Keep Zotero startup light by avoiding hidden loading of the Assistant shell
  and its child iframe tree.
- Defend against `contentWindow` changes caused by XUL browser load,
  remoteness, or reparent behavior.
- Keep the existing single live Assistant shell and tabbed child iframe model.

**Non-Goals:**

- Do not restore separate library and reader shell DOM trees.
- Do not rewrite child panel rendering architecture.
- Do not change ACP Skills transcript run switching or page loading.

## Decisions

- Host init is not acknowledged. `assistant-workspace:init` only carries
  `activeTab`, `activeTarget`, and `scopeKey`; it synchronizes shell tab state
  and diagnostic scope, but it is not the source of panel data.
- Snapshot publication is host-driven and active-tab scoped. A state pulse
  posts the current real snapshot for the active tab when the target is
  committed, the shell loads, the shell reports ready, the active child reports
  ready, the active tab changes, or a store update occurs. Publishing requires
  an active target and current shell window, but `loaded`/`ready` are trigger
  signals rather than a hard gate; store subscriptions must still publish after
  startup ready events are missed.
- Startup installs only the two dock containers and entry buttons. The single
  shell frame is created lazily when a target is activated, so Zotero startup
  does not load ACP Chat, ACP Skills, or SkillRunner iframe code in the
  background.
- The shell owns only cache/replay, not default panel data. It caches the
  latest host payload for each tab and replays it on child load, tab switch,
  host init, and child ready. It does not synthesize a SkillRunner empty init
  payload.
- Child ready is edge-triggered. The shell may replay cached payloads whenever
  a child reports ready or load completes, but it reports ready to the host
  only on the first ready edge for that child frame. Host init SHALL NOT
  re-announce every initialized child as ready.
- Shell window resolution is current-window first. Host runtime reads
  `frame.contentWindow` for every post, source check, bridge install, and
  SkillRunner sidebar attach. When the current window differs from the cached
  one, the host clears the old bridge and stops routing stale sources.
- SkillRunner keeps its business snapshot builder but shares transport only
  when the SkillRunner tab is active. ACP Chat and ACP Skills pulses SHALL NOT
  attach the global SkillRunner sidebar host, because that host owns
  subscriptions and selection state used by task execution. Switching away
  from SkillRunner detaches the sidebar host.
## Risks / Trade-offs

- [Risk] Posting hidden-tab baseline snapshots while ACP Chat is active can
  bind heavy host paths and disturb task execution.
  -> Mitigation: baseline pulses publish only the active tab; SkillRunner host
  binding and refresh run only when the SkillRunner tab is active.
- [Risk] Node tests cannot prove real Zotero XUL browser remoteness behavior.
  -> Mitigation: keep current-window-first logic covered in mocks and verify
  manually in Zotero 7 and 9 by first opening, switching tabs, closing/reopening,
  and moving between library and reader docks.
- [Risk] Hidden startup prewarm loads the full child iframe tree before the
  user needs it.
  -> Decision: do not prewarm at startup; rely on lazy shell creation,
  current-window posting, child-ready replay, and store snapshot recovery.
