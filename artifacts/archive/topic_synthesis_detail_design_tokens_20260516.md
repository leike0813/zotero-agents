# Topic Synthesis Detail Design Tokens

This token sheet captures the visual decisions validated by
`artifact/topic_synthesis_detail_mockup_20260516.html`. It is scoped to the
structured Topic Detail workbench and should be treated as the implementation
baseline for the first UI pass.

## Foundation

### Color

| Token | Value | Usage |
| --- | --- | --- |
| `color.bg.app` | `#eef3f8` | Full workbench background. |
| `color.surface.panel` | `#ffffff` | Primary panels, cards, modal surfaces. |
| `color.surface.subtle` | `#f7fafc` | Secondary surfaces and quiet rows. |
| `color.text.primary` | `#172033` | Main prose and headings. |
| `color.text.muted` | `#637184` | Metadata, captions, secondary labels. |
| `color.text.faint` | `#8a96a7` | Low-emphasis UI labels. |
| `color.border.default` | `#d6dee8` | Panel and control borders. |
| `color.border.strong` | `#aebccb` | Axis ticks, stronger separators. |
| `color.accent.blue` | `#2563eb` | Primary actions and default timeline pins. |
| `color.accent.blueStrong` | `#174ea6` | Strong blue borders and active text. |
| `color.accent.green` | `#15803d` | Positive status and coverage success. |
| `color.accent.orange` | `#b45309` | Sparse warnings only. |
| `color.accent.purple` | `#7c3aed` | Secondary categorization accents. |
| `color.soft.blue` | `#edf4ff` | Quiet blue background, not timeline pin fill. |
| `color.soft.green` | `#e7f6ed` | Quiet green background. |
| `color.soft.orange` | `#fff3e7` | Quiet warning background. |
| `color.soft.purple` | `#f2ecff` | Quiet purple background. |

Timeline pins use higher-contrast fills than the soft color tokens:

| Token | Value | Usage |
| --- | --- | --- |
| `color.timeline.pin.fill` | `#2563eb` | Default pin waterdrop fill. |
| `color.timeline.pin.border` | `#174ea6` | Default pin border. |
| `color.timeline.pin.selectedFill` | `#1d4ed8` | Selected pin fill. |
| `color.timeline.pin.selectedBorder` | `#0f3c9e` | Selected pin border. |
| `color.timeline.pin.warningFill` | `#d97706` | Warning pin fill. |
| `color.timeline.pin.warningBorder` | `#92400e` | Warning pin border. |
| `color.timeline.pin.center` | `#ffffff` | Center dot fill. |
| `color.timeline.pin.centerBorder` | `rgba(15, 23, 42, 0.18)` | Center dot outline. |
| `color.timeline.track.early` | `#8bb8ff` | Timeline gradient segment, early phase. |
| `color.timeline.track.middle` | `#86d9c1` | Timeline gradient segment, convergence phase. |
| `color.timeline.track.late` | `#d7b8ff` | Timeline gradient segment, expansion/deployment phase. |

### Typography

| Token | Value | Usage |
| --- | --- | --- |
| `font.family.ui` | `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` | Workbench UI and prose. |
| `font.size.base` | `13px` | Default app text. |
| `font.lineHeight.base` | `1.5` | Default readable line height. |
| `font.size.caption` | `11px` | Timeline labels, dense metadata. |
| `font.size.small` | `12px` | Chips, phase labels, compact controls. |
| `font.weight.medium` | `650` | Timeline short codes and emphasized labels. |

Long-form synthesis prose should use base-size text with normal weight. Avoid
hero-scale typography inside Topic Detail because real synthesis artifacts are
long and scanning-oriented.

### Shape, Spacing, Shadow

| Token | Value | Usage |
| --- | --- | --- |
| `radius.control` | `6px` | Buttons and compact controls. |
| `radius.panel` | `8px` | Panels, repeated cards, modal blocks. |
| `space.panel` | `12px` | Default panel padding. |
| `space.compact` | `6px` | Dense toolbar gaps. |
| `shadow.panel` | `0 18px 44px rgba(23, 32, 51, 0.16)` | Modal and elevated shell. |
| `shadow.soft` | `0 8px 20px rgba(23, 32, 51, 0.08)` | Quiet panel elevation. |

## Topic Detail Layout

| Token | Value | Usage |
| --- | --- | --- |
| `layout.app.minWidth` | `1180px` | Minimum mockup/workbench width. |
| `layout.explorer.width.default` | `360px` | Evidence Explorer default width. |
| `layout.explorer.width.min` | `300px` | Evidence Explorer minimum resize width. |
| `layout.explorer.width.max` | `560px` | Evidence Explorer maximum resize width. |
| `layout.timeline.height` | `108px` | Bottom horizontal timeline rail height. |
| `layout.timeline.minWidth` | `1080px` | Timeline scroll content minimum width. |
| `layout.timeline.padding` | `14px 18px 10px` | Timeline internal padding. |

The primary reading area uses left-side vertical tabs for Overview, Claims,
External Literature, and Coverage & Gaps. Evidence Explorer stays on the right
as a full-height, resizable inspector. The timeline is a bottom horizontal rail
inside the main workbench area.

## Timeline Component

| Token | Value | Usage |
| --- | --- | --- |
| `timeline.track.top` | `54px` | Baseline Y position inside timeline rail. |
| `timeline.track.height` | `3px` | Baseline thickness. |
| `timeline.axis.top` | `64px` | Time coordinate row below baseline. |
| `timeline.axis.tickTop` | `-10px` | Tick position relative to axis labels. |
| `timeline.axis.tickHeight` | `10px` | Tick height. |
| `timeline.phaseLabel.top` | `78px` | Phase/event text row. |
| `timeline.pin.offsetY` | `-12px` | Calibrated vertical pin offset from mockup review. |
| `timeline.pin.hitWidth` | `54px` | Marker button width and hit target. |
| `timeline.pin.hitHeight` | `39px` | Marker button height and hit target. |
| `timeline.pin.bodyWidth` | `22px` | Waterdrop body width. |
| `timeline.pin.bodyHeight` | `28px` | Waterdrop body height. |
| `timeline.pin.dotSize` | `8px` | Center dot diameter. |
| `timeline.pin.dotBottom` | `14px` | Center dot bottom offset. |

Pin shape:

```css
clip-path: polygon(
  50% 100%,
  12% 60%,
  7% 34%,
  18% 12%,
  34% 4%,
  66% 4%,
  82% 12%,
  93% 34%,
  88% 60%
);
```

The waterdrop tip should visually land on the timeline baseline. Short paper
codes may be shown above pins when density permits. Dense clusters hide codes
visually but keep accessible labels and hover tooltips.

## Interaction States

| State | Rule |
| --- | --- |
| Hovered timeline marker | Show title, year, and evidence summary in tooltip without mutating topic state. |
| Selected timeline marker | Use selected pin fill and a subtle outer ring; do not switch to white fill. |
| Warning marker | Use warning fill only for source-changed, stale, or incomplete evidence. |
| Focus-visible | Use a 2px blue outline with 2px offset for keyboard accessibility. |
| Reduced motion | Transitions should be optional and short; no essential state should depend on animation. |

