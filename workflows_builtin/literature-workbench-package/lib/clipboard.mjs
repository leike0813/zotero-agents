export async function copyTextToClipboard(text, runtime) {
  try {
    await runtime.hostApi.clipboard.writeText(text);
    return { copied: true, method: "hostApi.clipboard.writeText" };
  } catch {
    return { copied: false, error: "clipboard unavailable" };
  }
}
