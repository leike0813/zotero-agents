/** @jsxRuntime automatic */
/** @jsxImportSource preact */
// Window chrome regions: left navigation, the page host, the status line and
// the dialog layer.
//
// Scroll ownership: the navigation column and the page header never scroll, and
// exactly one main content scroller exists per selected page (see
// addon/content/dashboard/zotero-agent-settings.css). Every region compares only
// its own selection, so a result arriving for one object never rebuilds another
// region's DOM.

import { memo } from "preact/compat";
import { equalBySignature } from "../../shared/regionEquality";
import type {
  NavSelection,
  SettingsPage,
  StatusSelection,
  ZoteroAgentSettingsHandlers,
  ZoteroAgentSettingsView,
} from "./ZoteroAgentSettingsView";
import { text } from "./ZoteroAgentSettingsControls";
import { OverviewRegion } from "./ZoteroAgentSettingsOnboardingRegion";
import { WorkbenchRegion } from "./ZoteroAgentSettingsWorkbenchRegion";
import { McpRegion, SearchRegion } from "./ZoteroAgentSettingsToolsRegions";
import { CatalogRegion } from "./ZoteroAgentSettingsCatalogRegion";
import { DialogRegion } from "./ZoteroAgentSettingsDialogRegion";

export const NavRegion = memo(
  function NavRegion(props: {
    selection: NavSelection;
    handlers: ZoteroAgentSettingsHandlers;
  }) {
    return (
      <nav
        class="zs-nav"
        aria-label={text(props.selection.labels, "navLabel", "Settings")}
        data-testid="settings-nav"
      >
        <div class="zs-nav-brand">Zotero Agent</div>
        {props.selection.groups.map((group) => (
          <div class="zs-nav-group" key={group.label || "root"}>
            {group.label && <div class="zs-nav-group-label">{group.label}</div>}
            {group.items.map((item) => (
              <button
                key={item.id}
                type="button"
                class={
                  "zs-nav-item" +
                  (item.id === props.selection.page ? " is-active" : "")
                }
                aria-current={
                  item.id === props.selection.page ? "page" : undefined
                }
                data-testid={"nav-" + item.id}
                onClick={() => props.handlers.navigate(item.id as SettingsPage)}
              >
                <span>{item.label}</span>
                {item.badge && <span class="zs-nav-badge">{item.badge}</span>}
              </button>
            ))}
          </div>
        ))}
        <div class="zs-nav-foot">
          {text(
            props.selection.labels,
            "navFoot",
            "Model connections and tool sources are managed here.",
          )}
        </div>
      </nav>
    );
  },
  (prev, next) =>
    prev.handlers === next.handlers &&
    equalBySignature(prev.selection, next.selection),
);

export const StatusRegion = memo(
  function StatusRegion(props: { selection: StatusSelection }) {
    if (!props.selection) return null;
    return (
      <footer
        class={"zs-status zs-status--" + props.selection.tone}
        role="status"
        data-testid="settings-status"
      >
        {props.selection.text}
      </footer>
    );
  },
  (prev, next) => equalBySignature(prev.selection, next.selection),
);

export type PageHostProps = {
  view: ZoteroAgentSettingsView;
  handlers: ZoteroAgentSettingsHandlers;
};

/**
 * Chooses which single page region renders. The page host itself holds no state
 * of its own, so a result for one page's object cannot disturb another's DOM.
 */
export function PageHost(props: PageHostProps) {
  const { view, handlers } = props;
  const page = view.nav.page;
  return (
    <main
      class="zs-page"
      data-testid={"settings-page-" + page}
      data-page={page}
    >
      {view.overview && (
        <OverviewRegion selection={view.overview} handlers={handlers} />
      )}
      {view.workbench && (
        <WorkbenchRegion selection={view.workbench} handlers={handlers} />
      )}
      {view.mcp && <McpRegion selection={view.mcp} handlers={handlers} />}
      {view.search && (
        <SearchRegion selection={view.search} handlers={handlers} />
      )}
      {view.catalog && (
        <CatalogRegion selection={view.catalog} handlers={handlers} />
      )}
    </main>
  );
}

export const DialogHostRegion = memo(
  function DialogHostRegion(props: PageHostProps) {
    return <DialogRegion view={props.view} handlers={props.handlers} />;
  },
  (prev, next) =>
    prev.handlers === next.handlers &&
    equalBySignature(prev.view.dialog, next.view.dialog) &&
    equalBySignature(prev.view.leave, next.view.leave),
);
