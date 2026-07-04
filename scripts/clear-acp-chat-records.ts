import { runRuntimePersistenceCleanupCli } from "./internal/cleanup-runtime-category-cli";

void runRuntimePersistenceCleanupCli({
  category: "acp-conversations",
  scriptUrl: import.meta.url,
});
