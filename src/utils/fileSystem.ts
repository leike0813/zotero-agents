export function openFolderInSystemFileManager(
  pathValue: string,
  options?: { label?: string },
) {
  const label = String(options?.label || "workspace").trim() || "workspace";
  const normalizedPath = String(pathValue || "").trim();
  if (!normalizedPath) {
    throw new Error(`${label} path is empty`);
  }
  const pathToFile = Zotero?.File?.pathToFile;
  if (typeof pathToFile !== "function") {
    throw new Error("Zotero.File.pathToFile is unavailable");
  }
  const file = pathToFile(normalizedPath) as
    | {
        exists?: () => boolean;
        launch?: () => unknown;
        reveal?: () => unknown;
      }
    | undefined;
  if (!file) {
    throw new Error(`failed to resolve ${label} path: ${normalizedPath}`);
  }
  if (typeof file.exists === "function" && !file.exists()) {
    throw new Error(`${label} does not exist: ${normalizedPath}`);
  }
  if (typeof file.launch === "function") {
    file.launch();
    return;
  }
  if (typeof file.reveal === "function") {
    file.reveal();
    return;
  }
  throw new Error("nsIFile launch/reveal is unavailable");
}
