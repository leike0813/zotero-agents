import { assert } from "chai";
import { h, render } from "preact";

import {
  createSidebarDomEnvironment,
  installSidebarDomGlobals,
  restoreSidebarDomGlobals,
} from "../helpers/sidebarDomEnv";
import { CustomMultiSelect, CustomSelect } from "../../src/shared/customSelect";

async function flushPreactUpdates() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

function keydown(element: Element, key: string) {
  element.dispatchEvent(
    new window.KeyboardEvent("keydown", { key, bubbles: true }),
  );
}

function setChecked(element: Element, checked: boolean) {
  (element as HTMLInputElement).checked = checked;
  element.dispatchEvent(new window.Event("change", { bubbles: true }));
}

describe("shared CustomSelect / CustomMultiSelect (src/shared)", function () {
  beforeEach(function () {
    installSidebarDomGlobals(createSidebarDomEnvironment());
  });

  afterEach(function () {
    restoreSidebarDomGlobals();
  });

  function renderSelect(
    options: Array<{ value: string; label: string; description?: string }>,
    value: string,
    changes: string[],
    container?: HTMLElement,
  ): HTMLElement {
    const host = container || document.createElement("div");
    if (!host.parentNode) {
      document.body.appendChild(host);
    }
    render(
      h(CustomSelect, {
        options,
        value,
        onChange: (next) => changes.push(next),
      }),
      host,
    );
    return host;
  }

  it("renders the custom-select class contract with the selected option", function () {
    const changes: string[] = [];
    const host = renderSelect(
      [
        { value: "a", label: "Alpha" },
        { value: "b", label: "Beta", description: "Second option" },
      ],
      "b",
      changes,
    );
    const root = host.querySelector(".custom-select")!;
    assert.ok(root, "root keeps the .custom-select class");
    const trigger = root.querySelector(".custom-select-trigger")!;
    assert.ok(trigger, "trigger exists");
    assert.equal(
      trigger.querySelector(".custom-select-trigger-label")?.textContent,
      "Beta",
    );
    const menu = root.querySelector(".custom-select-menu")!;
    assert.ok(menu, "menu exists");
    assert.notOk(menu.classList.contains("open"), "menu starts closed");
    const options = menu.querySelectorAll(".custom-select-option");
    assert.equal(options.length, 2);
    assert.notOk(options[0].classList.contains("selected"));
    assert.ok(options[1].classList.contains("selected"));
    assert.equal(
      options[1].getAttribute("title"),
      "Beta\nSecond option",
      "description joins the tooltip",
    );
  });

  it("closes select A when select B opens (outside-click closes peers)", async function () {
    const changesA: string[] = [];
    const changesB: string[] = [];
    const hostA = renderSelect([{ value: "a", label: "Alpha" }], "a", changesA);
    const hostB = renderSelect([{ value: "x", label: "Xray" }], "x", changesB);

    (hostA.querySelector(".custom-select-trigger") as HTMLElement).click();
    await flushPreactUpdates();
    assert.ok(
      hostA.querySelector(".custom-select-menu")!.classList.contains("open"),
      "A is open",
    );

    (hostB.querySelector(".custom-select-trigger") as HTMLElement).click();
    await flushPreactUpdates();
    assert.notOk(
      hostA.querySelector(".custom-select-menu")!.classList.contains("open"),
      "opening B closes A",
    );
    assert.ok(
      hostB.querySelector(".custom-select-menu")!.classList.contains("open"),
      "B is open",
    );
  });

  it("marks the selected option by value, not by label text", async function () {
    const changes: string[] = [];
    const host = renderSelect(
      [
        { value: "v1", label: "Same" },
        { value: "v2", label: "Same" },
      ],
      "v2",
      changes,
    );
    const options = host.querySelectorAll(".custom-select-option");
    assert.notOk(options[0].classList.contains("selected"));
    assert.ok(
      options[1].classList.contains("selected"),
      "the option whose value matches is selected even with duplicate labels",
    );

    (options[0] as HTMLElement).click();
    await flushPreactUpdates();
    assert.deepEqual(changes, ["v1"]);
  });

  it("toggles on Enter/Space and closes on Escape", async function () {
    const changes: string[] = [];
    const host = renderSelect([{ value: "a", label: "Alpha" }], "a", changes);
    const trigger = host.querySelector(".custom-select-trigger")!;
    const menu = host.querySelector(".custom-select-menu")!;

    keydown(trigger, "Enter");
    await flushPreactUpdates();
    assert.ok(menu.classList.contains("open"), "Enter opens the menu");
    keydown(trigger, " ");
    await flushPreactUpdates();
    assert.notOk(menu.classList.contains("open"), "Space closes the menu");
    keydown(trigger, "Enter");
    await flushPreactUpdates();
    assert.ok(menu.classList.contains("open"));
    keydown(trigger, "Escape");
    await flushPreactUpdates();
    assert.notOk(menu.classList.contains("open"), "Escape closes the menu");
  });

  it("flips the menu upwards near the viewport bottom", async function () {
    const changes: string[] = [];
    const host = renderSelect([{ value: "a", label: "Alpha" }], "a", changes);
    const trigger = host.querySelector(".custom-select-trigger") as HTMLElement;
    const viewportHeight = window.innerHeight;
    trigger.getBoundingClientRect = () =>
      ({
        bottom: viewportHeight - 10,
        top: viewportHeight - 40,
        left: 0,
        right: 100,
        width: 100,
        height: 30,
        x: 0,
        y: viewportHeight - 40,
        toJSON: () => ({}),
      }) as DOMRect;

    trigger.click();
    await flushPreactUpdates();
    const menu = host.querySelector(".custom-select-menu")!;
    assert.ok(menu.classList.contains("open"));
    assert.ok(
      menu.classList.contains("open-up"),
      "menu flips upwards when there is no room below",
    );
  });

  it("does not open or emit while disabled", async function () {
    const changes: string[] = [];
    const host = document.createElement("div");
    document.body.appendChild(host);
    render(
      h(CustomSelect, {
        options: [{ value: "a", label: "Alpha" }],
        value: "a",
        disabled: true,
        onChange: (next) => changes.push(next),
      }),
      host,
    );
    const root = host.querySelector(".custom-select")!;
    assert.ok(root.classList.contains("disabled"));
    (host.querySelector(".custom-select-trigger") as HTMLElement).click();
    await flushPreactUpdates();
    assert.notOk(
      host.querySelector(".custom-select-menu")!.classList.contains("open"),
    );
    assert.deepEqual(changes, []);
  });

  function renderMultiSelect(
    values: string[],
    applied: string[][],
    container?: HTMLElement,
  ): HTMLElement {
    const host = container || document.createElement("div");
    if (!host.parentNode) {
      document.body.appendChild(host);
    }
    render(
      h(CustomMultiSelect, {
        options: [
          { value: "a", label: "Alpha" },
          { value: "b", label: "Beta" },
        ],
        values,
        placeholder: "All",
        onChange: (next) => applied.push(next),
      }),
      host,
    );
    return host;
  }

  it("applies multi-select edits only when the menu closes", async function () {
    const applied: string[][] = [];
    const values = ["a"];
    const host = renderMultiSelect(values, applied);
    const root = host.querySelector(".custom-select.custom-multi-select")!;
    assert.ok(root, "multi select keeps the combined class contract");
    const trigger = root.querySelector(".custom-select-trigger")!;
    const menu = root.querySelector(".custom-select-menu")!;
    assert.equal(
      root.querySelectorAll(".custom-multi-select-option").length,
      2,
    );
    assert.equal(trigger.textContent, "Alpha");

    (trigger as HTMLElement).click();
    await flushPreactUpdates();
    assert.ok(menu.classList.contains("open"));
    const boxes = menu.querySelectorAll<HTMLInputElement>(
      ".custom-multi-select-option input[type='checkbox']",
    );
    assert.isTrue(boxes[0].checked);
    assert.isFalse(boxes[1].checked);

    setChecked(boxes[1], true);
    await flushPreactUpdates();
    assert.equal(
      applied.length,
      0,
      "checking options while open does not emit",
    );
    assert.equal(trigger.textContent, "All");

    keydown(trigger, "Escape");
    await flushPreactUpdates();
    assert.notOk(menu.classList.contains("open"));
    assert.equal(applied.length, 1, "closing the menu applies once");
    assert.deepEqual(applied[0], ["a", "b"]);
    assert.notStrictEqual(
      applied[0],
      values,
      "the applied payload is a fresh array",
    );
  });

  it("keeps the menu open across value-only prop updates", async function () {
    const applied: string[][] = [];
    const host = renderMultiSelect(["a"], applied);
    const trigger = host.querySelector(".custom-select-trigger") as HTMLElement;
    trigger.click();
    await flushPreactUpdates();
    const menu = host.querySelector(".custom-select-menu")!;
    assert.ok(menu.classList.contains("open"));

    renderMultiSelect(["a", "b"], applied, host);
    await flushPreactUpdates();
    assert.ok(
      host.querySelector(".custom-select-menu")!.classList.contains("open"),
      "a value-only update does not close the menu",
    );
    assert.equal(applied.length, 0);
  });
});
