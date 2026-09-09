function parseVersion(value: string) {
  const match = value.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    throw new Error(`Invalid exact CLI version: ${value}`);
  }
  return match.slice(1).map(Number) as [number, number, number];
}

export function resolveExactCliReleaseIntent(current: string, target: string) {
  const [currentMajor, currentMinor, currentPatch] = parseVersion(current);
  const [targetMajor, targetMinor, targetPatch] = parseVersion(target);
  if (target === current) return "auto" as const;
  if (
    targetMajor === currentMajor &&
    targetMinor === currentMinor &&
    targetPatch === currentPatch + 1
  ) {
    return "patch" as const;
  }
  if (
    targetMajor === currentMajor &&
    targetMinor === currentMinor + 1 &&
    targetPatch === 0
  ) {
    return "minor" as const;
  }
  throw new Error(
    `Exact CLI version must be ${current}, its next patch, or its next minor: ${target}`,
  );
}
