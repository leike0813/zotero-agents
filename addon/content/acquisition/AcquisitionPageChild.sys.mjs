export class ZoteroAgentsAcquisitionPageChild extends JSWindowActorChild {
  receiveMessage(message) {
    if (message.name !== "observe") return null;
    const doc = this.document;
    const win = this.contentWindow;
    const limits = message.data;
    const authentication = [
      ...doc.querySelectorAll(
        'input[type="password"],input[autocomplete="username"],input[autocomplete="one-time-code"]',
      ),
    ].some(
      (input) =>
        input.getClientRects().length &&
        win.getComputedStyle(input).visibility !== "hidden",
    );
    const result = {
      documentId: String(this.manager.innerWindowId),
      loading: doc.readyState !== "complete",
      closed: false,
      authentication,
      origin: doc.location.origin === "null" ? "" : doc.location.origin,
      title: authentication ? "" : doc.title.slice(0, limits.titleChars),
      text: "",
      targets: [],
    };
    if (authentication || !doc.body) return result;
    const walker = doc.createTreeWalker(doc.body, win.NodeFilter.SHOW_TEXT);
    let visited = 0;
    let node;
    while ((node = walker.nextNode()) && visited++ < 3000) {
      const parent = node.parentElement;
      if (
        !parent ||
        parent.closest(
          "script,style,noscript,form,input,textarea,select,[hidden],[aria-hidden=true]",
        )
      )
        continue;
      if (!parent.getClientRects().length) continue;
      const style = win.getComputedStyle(parent);
      if (style.visibility === "hidden" || style.display === "none") continue;
      const text = node.textContent
        .replace(/https?:\/\/\S+/g, "[link]")
        .replace(/\s+/g, " ")
        .trim();
      if (text)
        result.text += `${text}\n`.slice(
          0,
          limits.textChars - result.text.length,
        );
      if (result.text.length >= limits.textChars) break;
    }
    const links = doc.getElementsByTagName("a");
    for (let index = 0; index < Math.min(links.length, 2000); index++) {
      const link = links[index];
      if (
        !link.getClientRects().length ||
        link.closest("form,[hidden],[aria-hidden=true]")
      )
        continue;
      let url;
      try {
        url = new URL(link.href, doc.baseURI);
      } catch {
        continue;
      }
      if (
        !["https:", "http:"].includes(url.protocol) ||
        url.username ||
        url.password
      )
        continue;
      const label = (link.innerText || link.getAttribute("aria-label") || "")
        .replace(/https?:\/\/\S+/g, "[link]")
        .trim()
        .slice(0, limits.labelChars);
      if (!label) continue;
      result.targets.push({ label, url: url.href });
      if (result.targets.length >= limits.targetsPerDocument) break;
    }
    return result;
  }
}
