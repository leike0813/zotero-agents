import {
  resolveBackendManagementAuth,
  updateBackendManagementAuth,
} from "../backends/managementAuth";
import type { BackendInstance, BackendManagementAuth } from "../backends/types";
import { SkillRunnerManagementClient } from "../providers/skillrunner/managementClient";

type LocalizeFn = (
  key: string,
  fallback: string,
  options?: { args?: Record<string, unknown> },
) => string;

type BuildClientArgs = {
  backend: BackendInstance;
  alertWindow?: Window;
  localize: LocalizeFn;
};

export function buildSkillRunnerManagementClient(args: BuildClientArgs) {
  return new SkillRunnerManagementClient({
    baseUrl: args.backend.baseUrl,
    backendId: args.backend.id,
    getManagementAuth: () => resolveBackendManagementAuth(args.backend),
    saveManagementAuth: (auth: BackendManagementAuth) => {
      try {
        updateBackendManagementAuth({
          backendId: args.backend.id,
          auth,
        });
      } catch {
        // backend may no longer exist in persisted profile list
      }
      args.backend.management_auth = auth;
    },
    promptBasicAuth: async ({ reason }) => {
      const win = args.alertWindow;
      if (!win || typeof win.prompt !== "function") {
        return null;
      }
      const existing = resolveBackendManagementAuth(args.backend);
      const defaultUsername =
        existing?.kind === "basic" ? String(existing.username || "") : "";
      const defaultPassword =
        existing?.kind === "basic" ? String(existing.password || "") : "";
      const username = win.prompt(
        args.localize(
          "task-dashboard-management-auth-username",
          "Management API requires Basic auth. Enter username:",
          {
            args: { reason },
          },
        ),
        defaultUsername,
      );
      if (username === null) {
        return null;
      }
      const password = win.prompt(
        args.localize(
          "task-dashboard-management-auth-password",
          "Management API requires Basic auth. Enter password:",
          {
            args: { reason },
          },
        ),
        defaultPassword,
      );
      if (password === null) {
        return null;
      }
      const normalizedUsername = String(username || "").trim();
      const normalizedPassword = String(password || "").trim();
      if (!normalizedUsername || !normalizedPassword) {
        win.alert?.(
          args.localize(
            "task-dashboard-management-auth-required",
            "Username and password are required.",
          ),
        );
        return null;
      }
      return {
        username: normalizedUsername,
        password: normalizedPassword,
      };
    },
  });
}
