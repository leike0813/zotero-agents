export function createSidebarFrame(doc: Document, pageUrl: string) {
  const createXul = (doc as { createXULElement?: (tag: string) => Element })
    .createXULElement;
  if (typeof createXul === "function") {
    const browser = createXul.call(doc, "browser");
    browser.setAttribute("disableglobalhistory", "true");
    browser.setAttribute("maychangeremoteness", "true");
    browser.setAttribute("type", "content");
    browser.setAttribute("flex", "1");
    browser.setAttribute("src", pageUrl);
    (browser as Element & { style?: CSSStyleDeclaration }).style?.setProperty(
      "width",
      "100%",
    );
    (browser as Element & { style?: CSSStyleDeclaration }).style?.setProperty(
      "height",
      "100%",
    );
    (browser as Element & { style?: CSSStyleDeclaration }).style?.setProperty(
      "flex",
      "1 1 auto",
    );
    (browser as Element & { style?: CSSStyleDeclaration }).style?.setProperty(
      "min-height",
      "0",
    );
    (browser as Element & { style?: CSSStyleDeclaration }).style?.setProperty(
      "min-width",
      "0",
    );
    (browser as Element & { style?: CSSStyleDeclaration }).style?.setProperty(
      "display",
      "block",
    );
    (browser as Element & { style?: CSSStyleDeclaration }).style?.setProperty(
      "border",
      "0",
    );
    return browser;
  }
  const frame = doc.createElement("iframe");
  frame.src = pageUrl;
  frame.style.width = "100%";
  frame.style.height = "100%";
  frame.style.flex = "1 1 auto";
  frame.style.minHeight = "0";
  frame.style.minWidth = "0";
  frame.style.display = "block";
  frame.style.border = "0";
  return frame;
}

export function resolveSidebarFrameWindow(frame: Element | null) {
  return (
    (frame as (Element & { contentWindow?: Window | null }) | null)
      ?.contentWindow || null
  );
}

export function createSidebarContainer(doc: Document) {
  const createXul = (doc as { createXULElement?: (tag: string) => XULElement })
    .createXULElement;
  if (typeof createXul === "function") {
    const box = createXul.call(doc, "vbox");
    box.setAttribute("flex", "1");
    return box;
  }
  return doc.createElement("div") as unknown as XULElement;
}

export function applySidebarPaneContainerStyles(container: XULElement) {
  (container as Element & { style?: CSSStyleDeclaration }).style?.setProperty(
    "display",
    "none",
  );
  (container as Element & { style?: CSSStyleDeclaration }).style?.setProperty(
    "flex",
    "1",
  );
  (container as Element & { style?: CSSStyleDeclaration }).style?.setProperty(
    "height",
    "100%",
  );
  (container as Element & { style?: CSSStyleDeclaration }).style?.setProperty(
    "min-width",
    "0",
  );
  (container as Element & { style?: CSSStyleDeclaration }).style?.setProperty(
    "min-height",
    "0",
  );
  (container as Element & { style?: CSSStyleDeclaration }).style?.setProperty(
    "overflow",
    "hidden",
  );
  (container as Element & { style?: CSSStyleDeclaration }).style?.setProperty(
    "flex-direction",
    "column",
  );
}

export function setSidebarContainerVisible(
  container: XULElement | null,
  visible: boolean,
) {
  (
    container as (Element & { style?: CSSStyleDeclaration }) | null
  )?.style?.setProperty("display", visible ? "flex" : "none");
}
