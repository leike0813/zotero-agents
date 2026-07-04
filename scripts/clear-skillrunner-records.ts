import { runRuntimePersistenceCleanupCli } from "./internal/cleanup-runtime-category-cli";

void runRuntimePersistenceCleanupCli({
  category: "skillrunner-ledger",
  scriptUrl: import.meta.url,
});
