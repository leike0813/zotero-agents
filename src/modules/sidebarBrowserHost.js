export function createSidebarFrame(doc, pageUrl) {
    const createXul = doc
        .createXULElement;
    if (typeof createXul === "function") {
        const browser = createXul.call(doc, "browser");
        browser.setAttribute("disableglobalhistory", "true");
        browser.setAttribute("maychangeremoteness", "true");
        browser.setAttribute("type", "content");
        browser.setAttribute("flex", "1");
        browser.setAttribute("src", pageUrl);
        browser.style?.setProperty("width", "100%");
        browser.style?.setProperty("height", "100%");
        browser.style?.setProperty("flex", "1 1 auto");
        browser.style?.setProperty("min-height", "0");
        browser.style?.setProperty("min-width", "0");
        browser.style?.setProperty("display", "block");
        browser.style?.setProperty("border", "0");
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
export function resolveSidebarFrameWindow(frame) {
    return (frame
        ?.contentWindow || null);
}
export function createSidebarContainer(doc) {
    const createXul = doc
        .createXULElement;
    if (typeof createXul === "function") {
        const box = createXul.call(doc, "vbox");
        box.setAttribute("flex", "1");
        return box;
    }
    return doc.createElement("div");
}
export function applySidebarPaneContainerStyles(container) {
    container.style?.setProperty("display", "none");
    container.style?.setProperty("flex", "1");
    container.style?.setProperty("height", "100%");
    container.style?.setProperty("min-width", "0");
    container.style?.setProperty("min-height", "0");
    container.style?.setProperty("overflow", "hidden");
    container.style?.setProperty("flex-direction", "column");
}
export function setSidebarContainerVisible(container, visible) {
    container?.style?.setProperty("display", visible ? "flex" : "none");
}
