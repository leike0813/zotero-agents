import models from "./piModelCatalogSeed.json";

/** Explicitly captured official input; ordinary builds never refresh it. */
export const piModelCatalogSeed = {
  schemaVersion: 1,
  revision:
    "sha256-d28b6de6985826060b6e2ccf589d16800d9fdbc40681ae4c698421c92d2ff86f",
  minimumPiVersion: "0.80.7",
  models,
};
export const piModelCatalogSeedProvenance = {
  url: "https://pi.dev/api/models?pi-version=1.0.0&types=chat,image,classifier",
  runtimeVersion: "1.0.0",
  capturedAt: "2026-10-03",
  lastModified: "Thu, 01 Oct 2026 12:50:47 GMT",
  etag: '"6ffc484eea7a4e430329bcae5573637d"',
};
