import { GENERIC_HTTP_BACKEND_TYPE } from "../config/defaults";

export type GenericHttpBackendPresetId = "mineru-official";

export type GenericHttpBackendPreset = {
  id: GenericHttpBackendPresetId;
  displayName: string;
  baseUrl: string;
  authKind: "none" | "bearer";
  authTokenPlaceholder?: string;
  timeoutMs?: string;
  note?: {
    textKey: string;
    textFallback: string;
    linkTextKey: string;
    linkTextFallback: string;
    linkUrl: string;
  };
};

export const GENERIC_HTTP_BACKEND_PRESETS: readonly GenericHttpBackendPreset[] =
  [
    {
      id: "mineru-official",
      displayName: "MinerU Official",
      baseUrl: "https://mineru.net",
      authKind: "bearer",
      authTokenPlaceholder: "fill-your-mineru-api-key-here",
      timeoutMs: "600000",
      note: {
        textKey: "backend-manager-generic-http-preset-mineru-note",
        textFallback: "Visit MinerU to get an API Key.",
        linkTextKey: "backend-manager-generic-http-preset-mineru-link",
        linkTextFallback: "https://mineru.net",
        linkUrl: "https://mineru.net",
      },
    },
  ];

export function listGenericHttpBackendPresets() {
  return [...GENERIC_HTTP_BACKEND_PRESETS];
}

export function findGenericHttpBackendPreset(id: string) {
  const normalized = String(id || "").trim();
  return GENERIC_HTTP_BACKEND_PRESETS.find((preset) => preset.id === normalized);
}

export function createGenericHttpBackendDraftFromPreset(
  presetOrId: GenericHttpBackendPreset | string,
) {
  const preset =
    typeof presetOrId === "string"
      ? findGenericHttpBackendPreset(presetOrId)
      : presetOrId;
  if (!preset) {
    throw new Error(`Unknown Generic HTTP backend preset: ${String(presetOrId)}`);
  }
  return {
    internalId: preset.id,
    displayName: preset.displayName,
    type: GENERIC_HTTP_BACKEND_TYPE,
    enabled: true,
    baseUrl: preset.baseUrl,
    authKind: preset.authKind,
    authToken: "",
    authTokenPlaceholder: preset.authTokenPlaceholder || "",
    timeoutMs: preset.timeoutMs || "",
    command: "",
    args: [],
    env: [],
  };
}
