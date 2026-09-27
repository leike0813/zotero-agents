import { pathToFileURL } from "node:url";

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

export function validateContentPackagePublicationScope(
  ref: string,
  channels: readonly string[],
): ContentPackageChannel[] {
  const selected = canonicalizeContentPackageChannels(channels);
  if (
    (ref === "main" && !selected.includes("dev")) ||
    (ref === "dev" && selected.length === 1 && selected[0] === "dev")
  ) {
    return selected;
  }
  throw new Error(
    `Content package publication is allowed only from main (stable,beta) or dev (dev only); received ${ref || "<empty>"} (${selected.join(",")}).`,
  );
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  try {
    const [ref, channels] = process.argv.slice(2);
    validateContentPackagePublicationScope(
      ref || "",
      parseContentPackageChannels(channels || ""),
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
