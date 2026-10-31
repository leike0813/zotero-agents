// Bound text before it crosses back to the Host; this worker belongs to one validation.
const send = self.postMessage.bind(self);
self.postMessage = (message, transfer) => {
  if (message.responseID === 1 && typeof message.data?.text === "string") {
    message.data.text = message.data.text.slice(0, 128000);
  }
  send(message, transfer);
};
// Zotero 10 moved the document worker out of the chrome PDF worker directory.
importScripts(
  new URL(self.location.href).searchParams.get("documentWorker") === "true"
    ? "resource://zotero/document-worker/worker.js"
    : "chrome://zotero/content/xpcom/pdfWorker/worker.js",
);
