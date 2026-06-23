import { getPref, setPref } from "../utils/prefs";

export type SkillRunnerSkillDisplayEntry = {
  skillId: string;
  skillName?: string;
};

const PREF_KEY = "skillRunnerSkillDisplayRegistryJson";
const displayById = new Map<string, SkillRunnerSkillDisplayEntry>();
let hydrated = false;

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function hydrate() {
  if (hydrated) {
    return;
  }
  hydrated = true;
  try {
    const parsed = JSON.parse(String(getPref(PREF_KEY) || "{}"));
    if (!isRecord(parsed)) {
      return;
    }
    for (const [key, raw] of Object.entries(parsed)) {
      if (!isRecord(raw)) {
        continue;
      }
      const skillId = normalizeString(raw.skillId) || normalizeString(key);
      if (!skillId) {
        continue;
      }
      displayById.set(skillId, {
        skillId,
        skillName: normalizeString(raw.skillName) || undefined,
      });
    }
  } catch {
    // Display labels are projection-only; corrupt cache data should not block
    // lifecycle recovery.
  }
}

function persist() {
  const payload: Record<string, SkillRunnerSkillDisplayEntry> = {};
  for (const entry of displayById.values()) {
    payload[entry.skillId] = { ...entry };
  }
  setPref(PREF_KEY, JSON.stringify(payload));
}

export function registerSkillRunnerSkillDisplaySnapshot(
  entries:
    | Record<string, { skillId: string; skillName?: string } | undefined>
    | undefined,
) {
  hydrate();
  if (!entries) {
    return;
  }
  let changed = false;
  for (const [key, entry] of Object.entries(entries)) {
    const skillId = normalizeString(entry?.skillId) || normalizeString(key);
    if (!skillId) {
      continue;
    }
    const next: SkillRunnerSkillDisplayEntry = {
      skillId,
      skillName: normalizeString(entry?.skillName) || undefined,
    };
    const previous = displayById.get(skillId);
    if (previous?.skillName === next.skillName) {
      continue;
    }
    displayById.set(skillId, next);
    changed = true;
  }
  if (changed) {
    persist();
  }
}

export function getSkillRunnerSkillDisplay(skillIdRaw: unknown) {
  hydrate();
  const skillId = normalizeString(skillIdRaw);
  return skillId ? displayById.get(skillId) || null : null;
}

export function resetSkillRunnerSkillDisplayRegistryForTests() {
  hydrated = true;
  displayById.clear();
  setPref(PREF_KEY, "");
}

export function clearSkillRunnerSkillDisplayRegistryMemoryForTests() {
  hydrated = false;
  displayById.clear();
}
