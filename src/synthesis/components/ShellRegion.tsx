/** @jsxRuntime automatic */
/** @jsxImportSource preact */
import { memo } from "preact/compat";

import { equalBySignature } from "../../shared/regionEquality";
import type {
  SynthesisWorkbenchNavTab,
  SynthesisWorkbenchTab,
} from "../../shared/synthesisWorkbenchWireContract";

// Sidebar + topbar shell of the synthesis workbench page. All display strings
// are resolved by the panel model from the i18n envelope; this component only
// renders the selection and reports intents through callbacks.

export type SynthesisWorkbenchNavTabView = {
  tab: SynthesisWorkbenchNavTab;
  label: string;
  iconName: string;
  iconClass: string;
  active: boolean;
};

export type SynthesisWorkbenchShellSelection = {
  brandAlt: string;
  libraryLabel: string;
  expanded: boolean;
  collapseLabel: string;
  expandLabel: string;
  tabs: SynthesisWorkbenchNavTabView[];
};

type ShellRegionProps = {
  selection: SynthesisWorkbenchShellSelection;
  onSelectTab: (tab: SynthesisWorkbenchTab) => void;
  onToggleSidebar: () => void;
};

export const ShellRegion = memo(
  function ShellRegion(props: ShellRegionProps) {
    const { selection, onSelectTab, onToggleSidebar } = props;
    return (
      <div class="synthesis-shell" data-region-content="synthesis-shell">
        <div class="brand brand-icon-only">
          <img src="../icons/favicon.png" alt={selection.brandAlt} />
          <button
            type="button"
            class="sidebar-collapse-toggle icon-only"
            title={
              selection.expanded
                ? selection.collapseLabel
                : selection.expandLabel
            }
            aria-label={
              selection.expanded
                ? selection.collapseLabel
                : selection.expandLabel
            }
            aria-expanded={selection.expanded ? "true" : "false"}
            onClick={onToggleSidebar}
          >
            <span
              class={`zs-icon ${
                selection.expanded
                  ? "zs-icon-right-panel-open"
                  : "zs-icon-right-panel-close"
              }`}
              aria-hidden="true"
            />
          </button>
        </div>
        <div class="muted sidebar-library">{selection.libraryLabel}</div>
        <div class="nav">
          {selection.tabs.map((tab) => (
            <button
              key={tab.tab}
              type="button"
              class={tab.active ? "active" : ""}
              data-synthesis-tab={tab.tab}
              title={tab.label}
              aria-label={tab.label}
              onClick={() => onSelectTab(tab.tab)}
            >
              <span class={`nav-icon nav-icon-${tab.iconName}`}>
                <span class={tab.iconClass} aria-hidden="true" />
              </span>
              <span class="nav-label">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  },
  (prev, next) =>
    prev.onSelectTab === next.onSelectTab &&
    prev.onToggleSidebar === next.onToggleSidebar &&
    equalBySignature(prev.selection, next.selection),
);

export type SynthesisWorkbenchTopbarSelection = {
  title: string;
};

type TopbarRegionProps = {
  selection: SynthesisWorkbenchTopbarSelection;
};

export const TopbarRegion = memo(
  function TopbarRegion(props: TopbarRegionProps) {
    return (
      <div class="synthesis-topbar" data-region-content="synthesis-topbar">
        <h1>{props.selection.title}</h1>
      </div>
    );
  },
  (prev, next) => equalBySignature(prev.selection, next.selection),
);
