import {
  hideTopicTimelineTooltip,
  renderTopicTimeline,
} from "./topicTimelineRenderer";

declare const window: Window &
  typeof globalThis & {
    ZoteroSkillsTopicTimeline?: {
      renderTopicTimeline: typeof renderTopicTimeline;
      hideTopicTimelineTooltip: typeof hideTopicTimelineTooltip;
    };
  };

window.ZoteroSkillsTopicTimeline = {
  renderTopicTimeline,
  hideTopicTimelineTooltip,
};
