export const CONTENT_PACKAGE_CHANNELS = ["stable", "beta", "dev"] as const;

export type ContentPackageChannel = (typeof CONTENT_PACKAGE_CHANNELS)[number];

const CHANNEL_SET = new Set<string>(CONTENT_PACKAGE_CHANNELS);

function invalidChannelsError() {
  return new Error(
    "--channels must include a comma-separated non-empty subset of stable,beta,dev",
  );
}

export function canonicalizeContentPackageChannels(
  channels: readonly string[],
): ContentPackageChannel[] {
  const selected = new Set(
    channels.map((channel) =>
      String(channel || "")
        .trim()
        .toLowerCase(),
    ),
  );
  if (
    selected.size === 0 ||
    selected.has("") ||
    Array.from(selected).some((channel) => !CHANNEL_SET.has(channel))
  ) {
    throw invalidChannelsError();
  }
  return CONTENT_PACKAGE_CHANNELS.filter((channel) => selected.has(channel));
}

export function parseContentPackageChannels(
  value: string,
): ContentPackageChannel[] {
  return canonicalizeContentPackageChannels(String(value || "").split(","));
}
