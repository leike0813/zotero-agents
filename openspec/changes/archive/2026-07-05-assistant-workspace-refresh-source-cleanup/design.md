# Design

## Shell Load

The shell frame `load` handler should only record frame/window state and ensure
the host bridge is installed. It must not publish `assistant-workspace:init` or
child init snapshots. Baseline publication remains owned by target commit,
shell ready, child ready, typed panel changes, and explicit tab requests.

## Streaming Preference

The workspace host treats `subscribeAssistantStreamingRenderPreference()` as an
external-change source after its initial synchronous callback. Each host skips
that initial callback.

When a child action writes the streaming render preference for the same host,
the host marks the write as local while calling
`setAssistantStreamingRenderEnabled()`. The synchronous preference listener
observes the marker and skips scheduling a second refresh. ACP Chat and ACP
Skills then use their existing post-action snapshot path, while SkillRunner
keeps its active sidebar refresh path because it does not have the same outer
panel repost.

External preference changes still flow through the subscription: SkillRunner
refreshes through its sidebar host when active, and ACP Chat / ACP Skills use
the shared scheduled snapshot path.
