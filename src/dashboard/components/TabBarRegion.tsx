/** @jsxRuntime automatic */
/** @jsxImportSource preact */
import { memo } from "preact/compat";

import { equalBySignature } from "../../shared/regionEquality";

// Sidebar tab strip of the dashboard page. All display strings are resolved
// by the panel model from host-supplied labels; this component only renders
// the selection and reports tab clicks through `onSelectTab`.

export type DashboardTabView = {
  key: string;
  label: string;
  group: "system" | "backend";
  active: boolean;
  disabled: boolean;
  disabledReason: string;
  unavailableTag: string;
  iconClass: string;
};

export type DashboardTabBarSelection = {
  systemTitle: string;
  backendTitle: string;
  emptyText: string;
  tabs: DashboardTabView[];
};

type TabBarRegionProps = {
  selection: DashboardTabBarSelection;
  onSelectTab: (tabKey: string) => void;
};

function TabButton(props: {
  tab: DashboardTabView;
  onSelectTab: (tabKey: string) => void;
}) {
  const { tab, onSelectTab } = props;
  const className = [
    "tab-btn",
    tab.active ? "active" : "",
    tab.disabled ? "disabled" : "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <button
      class={className}
      disabled={tab.disabled}
      title={
        tab.disabled && tab.disabledReason ? tab.disabledReason : undefined
      }
      onClick={() => {
        if (tab.disabled) return;
        onSelectTab(tab.key);
      }}
    >
      <span class="tab-btn-content">
        {tab.iconClass ? (
          <span
            class={`zs-icon zs-icon-sm tab-btn-icon ${tab.iconClass}`}
            aria-hidden="true"
          />
        ) : null}
        <span class="tab-btn-label">{tab.label}</span>
      </span>
      {tab.disabled ? (
        <span class="tab-disabled-tag">{tab.unavailableTag}</span>
      ) : null}
    </button>
  );
}

export const TabBarRegion = memo(
  function TabBarRegion(props: TabBarRegionProps) {
    const { selection, onSelectTab } = props;
    const systemTabs = selection.tabs.filter((tab) => tab.group === "system");
    const backendTabs = selection.tabs.filter((tab) => tab.group === "backend");
    return (
      <div class="dashboard-tabbar" data-region-content="dashboard-tabbar">
        <h3 class="sidebar-title">{selection.systemTitle}</h3>
        {selection.tabs.length === 0 ? (
          <div class="empty">{selection.emptyText}</div>
        ) : (
          <>
            {systemTabs.map((tab) => (
              <TabButton key={tab.key} tab={tab} onSelectTab={onSelectTab} />
            ))}
            <div class="tab-divider" />
            <h3 class="sidebar-title">{selection.backendTitle}</h3>
            {backendTabs.map((tab) => (
              <TabButton key={tab.key} tab={tab} onSelectTab={onSelectTab} />
            ))}
          </>
        )}
      </div>
    );
  },
  (prev, next) =>
    prev.onSelectTab === next.onSelectTab &&
    equalBySignature(prev.selection, next.selection),
);
