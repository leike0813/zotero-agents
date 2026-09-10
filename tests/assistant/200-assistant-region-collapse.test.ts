import { assert } from "chai";

import {
  createSidebarDomEnvironment,
  installSidebarDomGlobals,
  restoreSidebarDomGlobals,
  subtreeNodes,
} from "../helpers/sidebarDomEnv";
import {
  autoCollapsed,
  createRegionCollapseController,
  effectiveCollapsed,
  nextOverride,
  resolveAutoStage,
  type CollapseRegionName,
  type RegionCollapseLabels,
} from "../../src/sidebar/assistantRegionCollapse";

const LABELS: RegionCollapseLabels = {
  collapseToolbar: "Collapse toolbar",
  expandToolbar: "Expand toolbar",
  collapseBanner: "Collapse banner",
  expandBanner: "Expand banner",
  collapseComposer: "Collapse composer",
  expandComposer: "Expand composer",
};

describe("Assistant Workspace region collapse", function () {
  let environment: ReturnType<typeof createSidebarDomEnvironment>;

  beforeEach(function () {
    environment = createSidebarDomEnvironment();
    installSidebarDomGlobals(environment);
  });

  afterEach(function () {
    restoreSidebarDomGlobals();
  });

  describe("resolveAutoStage", function () {
    it("classifies heights into stages from scratch", function () {
      assert.equal(resolveAutoStage(800, 0), 0);
      assert.equal(resolveAutoStage(681, 0), 0);
      assert.equal(resolveAutoStage(620, 0), 1);
      assert.equal(resolveAutoStage(540, 0), 2);
      assert.equal(resolveAutoStage(500, 0), 2);
      assert.equal(resolveAutoStage(440, 0), 3);
      assert.equal(resolveAutoStage(300, 0), 3);
    });

    it("deepens immediately when an enter threshold is crossed", function () {
      assert.equal(resolveAutoStage(500, 0), 2);
      assert.equal(resolveAutoStage(430, 1), 3);
    });

    it("holds the previous stage inside the hysteresis band", function () {
      // Above the enter threshold but below the exit threshold: no change.
      assert.equal(resolveAutoStage(650, 1), 1);
      assert.equal(resolveAutoStage(560, 2), 2);
      assert.equal(resolveAutoStage(470, 3), 3);
    });

    it("recovers only after crossing the exit threshold", function () {
      assert.equal(resolveAutoStage(681, 1), 0);
      assert.equal(resolveAutoStage(601, 2), 1);
      assert.equal(resolveAutoStage(501, 3), 2);
      // Recovery cascades through multiple stages in one step.
      assert.equal(resolveAutoStage(720, 3), 0);
    });
  });

  describe("override state machine", function () {
    it("derives auto collapse flags from the stage", function () {
      assert.isFalse(autoCollapsed("banner", 0));
      assert.isTrue(autoCollapsed("banner", 1));
      assert.isFalse(autoCollapsed("composer", 1));
      assert.isTrue(autoCollapsed("composer", 2));
      assert.isFalse(autoCollapsed("toolbar", 2));
      assert.isTrue(autoCollapsed("toolbar", 3));
    });

    it("lets a manual override win over the auto stage", function () {
      assert.isTrue(effectiveCollapsed(null, "banner", 1));
      assert.isFalse(effectiveCollapsed(false, "banner", 3));
      assert.isTrue(effectiveCollapsed(true, "toolbar", 0));
    });

    it("clears the override when the toggled value matches auto", function () {
      // Collapsed by hand while auto says expanded -> sticky collapse.
      assert.isTrue(nextOverride(false, false));
      // Expanded by hand while auto says collapsed -> sticky expand.
      assert.isFalse(nextOverride(true, true));
      // Toggling back to the auto value returns to auto mode.
      assert.isNull(nextOverride(true, false));
      assert.isNull(nextOverride(false, true));
    });
  });

  describe("controller", function () {
    function setup(options: { composer?: boolean } = {}) {
      const document = environment.document;
      const root = document.createElement("main");
      const regions: Record<CollapseRegionName, HTMLElement | null> = {
        toolbar: document.createElement("header"),
        banner: document.createElement("section"),
        composer:
          options.composer === false ? null : document.createElement("section"),
      };
      root.appendChild(regions.toolbar!);
      root.appendChild(regions.banner!);
      if (regions.composer) root.appendChild(regions.composer);
      // Stand-in for managed region content the controller must never touch.
      for (const region of [
        regions.toolbar,
        regions.banner,
        regions.composer,
      ]) {
        if (!region) continue;
        const managed = document.createElement("div");
        managed.className = "assistant-panel-managed-view";
        managed.appendChild(document.createElement("button"));
        region.appendChild(managed);
      }
      document.body.appendChild(root);
      let labels: RegionCollapseLabels = LABELS;
      const controller = createRegionCollapseController({
        root,
        regions,
        getLabels: () => labels,
        observe: false,
      });
      return {
        root,
        regions,
        controller,
        setLabels(next: RegionCollapseLabels) {
          labels = next;
        },
      };
    }

    function toggleOf(region: HTMLElement | null) {
      return region
        ? region.querySelector<HTMLButtonElement>(
            ".assistant-region-collapse-toggle",
          )
        : null;
    }

    it("creates a labelled toggle button inside each region container", function () {
      const { regions } = setup();
      for (const name of ["toolbar", "banner", "composer"] as const) {
        const button = toggleOf(regions[name]);
        assert.exists(button, `${name} toggle exists`);
        assert.equal(button!.getAttribute("aria-expanded"), "true");
        assert.equal(button!.getAttribute("data-collapse-region"), name);
        assert.equal(button!.getAttribute("aria-label"), `Collapse ${name}`);
        assert.equal(button!.getAttribute("title"), `Collapse ${name}`);
      }
    });

    it("toggles the collapsed class on the target region only", function () {
      const { regions, controller } = setup();
      controller.toggle("banner");
      assert.isTrue(regions.banner!.classList.contains("is-region-collapsed"));
      assert.isFalse(
        regions.toolbar!.classList.contains("is-region-collapsed"),
      );
      assert.isFalse(
        regions.composer!.classList.contains("is-region-collapsed"),
      );
      const button = toggleOf(regions.banner)!;
      assert.equal(button.getAttribute("aria-expanded"), "false");
      assert.equal(button.getAttribute("aria-label"), "Expand banner");
    });

    it("returns to auto mode when toggled back to the auto value", function () {
      const { regions, controller } = setup();
      controller.toggle("banner");
      assert.isTrue(controller.getOverride("banner"));
      controller.toggle("banner");
      assert.isNull(controller.getOverride("banner"));
      assert.isFalse(regions.banner!.classList.contains("is-region-collapsed"));
    });

    it("collapses regions by stage and keeps manual overrides sticky", function () {
      const { root, regions, controller } = setup();
      controller.setViewportHeight(500);
      assert.equal(controller.getStage(), 2);
      assert.equal(root.getAttribute("data-collapse-stage"), "2");
      assert.isTrue(regions.banner!.classList.contains("is-region-collapsed"));
      assert.isTrue(
        regions.composer!.classList.contains("is-region-collapsed"),
      );
      assert.isFalse(
        regions.toolbar!.classList.contains("is-region-collapsed"),
      );

      // Manual expand of the banner survives deeper auto stages.
      controller.toggle("banner");
      assert.isFalse(regions.banner!.classList.contains("is-region-collapsed"));
      controller.setViewportHeight(300);
      assert.equal(controller.getStage(), 3);
      assert.isTrue(regions.toolbar!.classList.contains("is-region-collapsed"));
      assert.isFalse(regions.banner!.classList.contains("is-region-collapsed"));

      // Auto recovery still respects the override.
      controller.setViewportHeight(720);
      assert.equal(controller.getStage(), 0);
      assert.isFalse(
        regions.toolbar!.classList.contains("is-region-collapsed"),
      );
    });

    it("preserves region subtree identity across collapse toggles", function () {
      const { regions, controller } = setup();
      const before = {
        toolbar: subtreeNodes(regions.toolbar!.firstChild),
        banner: subtreeNodes(regions.banner!.firstChild),
        composer: subtreeNodes(regions.composer!.firstChild),
      };
      const toolbarButton = toggleOf(regions.toolbar);
      controller.toggle("toolbar");
      controller.setViewportHeight(300);
      controller.toggle("banner");
      for (const name of ["toolbar", "banner", "composer"] as const) {
        const current = subtreeNodes(regions[name]!.firstChild);
        assert.deepEqual(current, before[name], `${name} subtree rebuilt`);
      }
      assert.strictEqual(toggleOf(regions.toolbar), toolbarButton);
    });

    it("syncs labels without recreating the toggle button", function () {
      const { regions, controller, setLabels } = setup();
      const button = toggleOf(regions.composer)!;
      setLabels({ ...LABELS, collapseComposer: "收起输入区" });
      controller.refreshLabels();
      const after = toggleOf(regions.composer)!;
      assert.strictEqual(after, button);
      assert.equal(after.getAttribute("aria-label"), "收起输入区");
    });

    it("tolerates a missing composer region", function () {
      const { regions, controller } = setup({ composer: false });
      assert.isNull(toggleOf(regions.composer));
      controller.setViewportHeight(300);
      controller.toggle("composer");
      assert.isTrue(regions.toolbar!.classList.contains("is-region-collapsed"));
    });
  });
});
