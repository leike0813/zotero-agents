# Design

## Shell Strategy

The first version uses a tab shell that embeds the existing pages in iframes. The shell forwards child-page actions to the host and forwards host snapshots back to the corresponding iframe. This avoids a large rewrite of the mature ACP Chat, ACP Skill Run, and SkillRunner run-dialog pages.

## Host Routing

A new Assistant sidebar host owns the single Zotero side-pane button and mounts one browser frame for the shell. Programmatic open calls can request an initial tab. Dashboard actions for ACP Chat, ACP Skill Runs, and SkillRunner route to this host.

## Visual Alignment

ACP Chat keeps its plan model and composer. ACP Skills adopts the Chat plan panel behavior and status icons. ACP Chat adopts the Skills running indicator polish and keeps LED-first tool rows.

## ACP Skills Reply Scaffold

ACP Skills gets a disabled-by-default reply composer and a `reply-run` action envelope. The UI becomes active only when a later run snapshot exposes an interactive/waiting-user state.
