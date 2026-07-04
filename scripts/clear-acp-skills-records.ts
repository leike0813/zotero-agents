import { runRuntimePersistenceCleanupCli } from "./internal/cleanup-runtime-category-cli";

void runRuntimePersistenceCleanupCli({
  category: "acp-skill-runs",
  scriptUrl: import.meta.url,
});
