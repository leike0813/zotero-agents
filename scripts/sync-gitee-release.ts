import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

type CliOptions = {
  repo: string;
  tag: string;
  name: string;
  body: string;
  prerelease: boolean;
  target: string;
  replaceExisting: boolean;
  files: string[];
};

type GiteeRelease = {
  id?: number | string;
  tag_name?: string;
  tagName?: string;
  name?: string;
  title?: string;
};

type GiteeAttachment = {
  id?: number | string;
  name?: string;
  filename?: string;
  browser_download_url?: string;
  download_url?: string;
};

const API_BASE = (
  process.env.GITEE_API_BASE || "https://gitee.com/api/v5"
).replace(/\/+$/, "");
const execFileAsync = promisify(execFile);

function usage(): string {
  return [
    "Usage: tsx scripts/sync-gitee-release.ts --repo owner/repo --tag tag [options] <files...>",
    "",
    "Options:",
    "  --repo <owner/repo>       Gitee repository",
    "  --tag <tag>               Release tag name",
    "  --name <name>             Release title, defaults to tag",
    "  --body <body>             Release body",
    "  --prerelease <bool>       Mark release as prerelease",
    "  --target <branch-or-sha>  Target commitish",
    "  --replace-existing <bool> Replace same-name assets for release recovery",
    "  --file <path>             Add one file; can be repeated",
    "",
    "Requires GITEE_TOKEN in the environment.",
  ].join("\n");
}

function parseBoolean(value: string | undefined): boolean {
  return /^(1|true|yes)$/i.test(String(value || ""));
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    repo: "",
    tag: "",
    name: "",
    body: "",
    prerelease: false,
    target: "",
    replaceExisting: false,
    files: [],
  };

  for (let i = 0; i < argv.length; i += 1) {
    const entry = argv[i];
    if (entry === "--help" || entry === "-h") {
      console.log(usage());
      process.exit(0);
    }

    const readValue = () => {
      const value = argv[i + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`${entry} requires a value`);
      }
      i += 1;
      return value;
    };

    if (entry === "--repo") {
      options.repo = readValue();
    } else if (entry === "--tag") {
      options.tag = readValue();
    } else if (entry === "--name") {
      options.name = readValue();
    } else if (entry === "--body") {
      options.body = readValue();
    } else if (entry === "--prerelease") {
      options.prerelease = parseBoolean(readValue());
    } else if (entry === "--target") {
      options.target = readValue();
    } else if (entry === "--replace-existing") {
      options.replaceExisting = parseBoolean(readValue());
    } else if (entry === "--file") {
      options.files.push(readValue());
    } else if (entry.startsWith("--")) {
      throw new Error(`Unknown option: ${entry}`);
    } else {
      options.files.push(entry);
    }
  }

  options.name ||= options.tag;
  if (!/^[^/]+\/[^/]+$/.test(options.repo)) {
    throw new Error("--repo must be in owner/repo form");
  }
  if (!options.tag) {
    throw new Error("--tag is required");
  }
  if (options.files.length === 0) {
    throw new Error("At least one file is required");
  }
  return options;
}

function splitRepo(repo: string): { owner: string; repo: string } {
  const [owner, name] = repo.split("/");
  return { owner, repo: name };
}

function apiUrl(endpoint: string, token: string): string {
  const url = new URL(`${API_BASE}${endpoint}`);
  url.searchParams.set("access_token", token);
  return url.toString();
}

async function requestJson<T>(
  endpoint: string,
  token: string,
  init: RequestInit = {},
  allowMissing = false,
): Promise<T | null> {
  const response = await fetch(apiUrl(endpoint, token), init);
  if (allowMissing && response.status === 404) {
    return null;
  }
  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Gitee API ${init.method || "GET"} ${endpoint} failed: ${response.status} ${text}`,
    );
  }
  if (
    response.status === 204 ||
    response.headers.get("content-length") === "0"
  ) {
    return null;
  }
  return (await response.json()) as T;
}

async function findReleaseByTag(args: {
  owner: string;
  repo: string;
  tag: string;
  token: string;
}): Promise<GiteeRelease | null> {
  const tagEndpoint = `/repos/${args.owner}/${args.repo}/releases/tags/${encodeURIComponent(args.tag)}`;
  const direct = await requestJson<GiteeRelease>(
    tagEndpoint,
    args.token,
    {},
    true,
  );
  if (direct) return direct;

  for (let page = 1; page <= 10; page += 1) {
    const releases = await requestJson<GiteeRelease[]>(
      `/repos/${args.owner}/${args.repo}/releases?page=${page}&per_page=100`,
      args.token,
    );
    const match = (releases || []).find(
      (release) => (release.tag_name || release.tagName) === args.tag,
    );
    if (match) return match;
    if (!releases || releases.length < 100) break;
  }
  return null;
}

async function createRelease(args: {
  owner: string;
  repo: string;
  tag: string;
  name: string;
  body: string;
  prerelease: boolean;
  target: string;
  token: string;
}): Promise<GiteeRelease> {
  const body = new URLSearchParams({
    tag_name: args.tag,
    name: args.name,
    body: args.body,
    prerelease: String(args.prerelease),
  });
  if (args.target) {
    body.set("target_commitish", args.target);
  }
  const release = await requestJson<GiteeRelease>(
    `/repos/${args.owner}/${args.repo}/releases`,
    args.token,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    },
  );
  if (!release) {
    throw new Error(`Gitee release ${args.tag} was not created`);
  }
  return release;
}

async function updateRelease(args: {
  owner: string;
  repo: string;
  releaseId: number | string;
  tag: string;
  name: string;
  body: string;
  prerelease: boolean;
  token: string;
}): Promise<void> {
  const body = new URLSearchParams({
    tag_name: args.tag,
    name: args.name,
    body: args.body,
    prerelease: String(args.prerelease),
  });
  await requestJson<GiteeRelease>(
    `/repos/${args.owner}/${args.repo}/releases/${args.releaseId}`,
    args.token,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    },
  );
}

async function listAttachments(args: {
  owner: string;
  repo: string;
  releaseId: number | string;
  token: string;
}): Promise<GiteeAttachment[]> {
  const attachments = await requestJson<GiteeAttachment[]>(
    `/repos/${args.owner}/${args.repo}/releases/${args.releaseId}/attach_files`,
    args.token,
    {},
    true,
  );
  return Array.isArray(attachments) ? attachments : [];
}

async function deleteAttachment(args: {
  owner: string;
  repo: string;
  releaseId: number | string;
  attachmentId: number | string;
  token: string;
}): Promise<void> {
  await requestJson(
    `/repos/${args.owner}/${args.repo}/releases/${args.releaseId}/attach_files/${args.attachmentId}`,
    args.token,
    { method: "DELETE" },
  );
}

async function uploadAttachment(args: {
  owner: string;
  repo: string;
  releaseId: number | string;
  filePath: string;
  token: string;
  sendUpload?: () => Promise<void>;
}): Promise<void> {
  const fileName = path.basename(args.filePath);
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      if (args.sendUpload) {
        await args.sendUpload();
      } else {
        const endpoint = apiUrl(
          `/repos/${args.owner}/${args.repo}/releases/${args.releaseId}/attach_files`,
          args.token,
        );
        await execFileAsync(
          "curl",
          [
            "--fail-with-body",
            "--silent",
            "--show-error",
            "--http1.1",
            "--connect-timeout",
            "30",
            "--max-time",
            "900",
            "--header",
            "Expect:",
            "--form",
            `file=@${args.filePath}`,
            endpoint,
          ],
          { maxBuffer: 1024 * 1024 },
        );
      }
      return;
    } catch (error) {
      const attachments = await listAttachments(args);
      const uploaded = attachments.some(
        (attachment) => (attachment.name || attachment.filename) === fileName,
      );
      if (uploaded) {
        console.warn(
          `[gitee-release] upload response failed after Gitee accepted ${fileName}`,
        );
        return;
      }
      if (attempt === 3) {
        throw new Error(
          `Gitee did not accept ${fileName} after ${attempt} attempts`,
          { cause: error },
        );
      }
      console.warn(
        `[gitee-release] retrying ${fileName} after upload attempt ${attempt}`,
      );
    }
  }
}

async function sha256File(filePath: string) {
  return createHash("sha256")
    .update(await fs.readFile(filePath))
    .digest("hex");
}

async function attachmentMatches(
  attachment: GiteeAttachment,
  expectedSha256: string,
  token: string,
) {
  const rawUrl =
    attachment.browser_download_url || attachment.download_url || "";
  if (!rawUrl) {
    throw new Error("Gitee attachment does not include a download URL");
  }
  const url = new URL(rawUrl);
  if (url.hostname === "gitee.com") {
    url.searchParams.set("access_token", token);
  }
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Gitee attachment download failed: ${response.status}`);
  }
  const actual = createHash("sha256")
    .update(new Uint8Array(await response.arrayBuffer()))
    .digest("hex");
  return actual === expectedSha256;
}

async function verifyUploadedAttachment(args: {
  owner: string;
  repo: string;
  releaseId: number | string;
  fileName: string;
  expectedSha256: string;
  token: string;
}) {
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const attachments = await listAttachments(args);
    const candidates = attachments.filter(
      (attachment) =>
        (attachment.name || attachment.filename) === args.fileName,
    );
    const matches = await Promise.all(
      candidates.map((attachment) =>
        attachmentMatches(attachment, args.expectedSha256, args.token).catch(
          () => false,
        ),
      ),
    );
    if (matches.some(Boolean)) return;
    if (attempt < 5) {
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
  }
  throw new Error(
    `Gitee asset ${args.fileName} is missing or has an unexpected checksum`,
  );
}

async function assertFiles(filePaths: string[]): Promise<string[]> {
  const unique = Array.from(
    new Set(filePaths.map((file) => path.normalize(file))),
  );
  for (const filePath of unique) {
    const stat = await fs.stat(filePath).catch(() => null);
    if (!stat?.isFile()) {
      throw new Error(`Release asset is not a file: ${filePath}`);
    }
  }
  return unique;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const token = String(process.env.GITEE_TOKEN || "").trim();
  if (!token) {
    throw new Error("GITEE_TOKEN is required");
  }
  const { owner, repo } = splitRepo(options.repo);
  const files = await assertFiles(options.files);

  let release = await findReleaseByTag({
    owner,
    repo,
    tag: options.tag,
    token,
  });
  if (!release) {
    release = await createRelease({
      owner,
      repo,
      tag: options.tag,
      name: options.name,
      body: options.body,
      prerelease: options.prerelease,
      target: options.target,
      token,
    });
    console.log(`[gitee-release] created ${options.repo}@${options.tag}`);
  } else {
    console.log(`[gitee-release] found ${options.repo}@${options.tag}`);
  }

  const releaseId = release.id;
  if (releaseId === undefined || releaseId === null) {
    throw new Error(`Gitee release ${options.tag} did not include an id`);
  }

  await updateRelease({
    owner,
    repo,
    releaseId,
    tag: options.tag,
    name: options.name,
    body: options.body,
    prerelease: options.prerelease,
    token,
  });

  const attachments = await listAttachments({ owner, repo, releaseId, token });
  for (const filePath of files) {
    const fileName = path.basename(filePath);
    const existing = attachments.filter(
      (attachment) => (attachment.name || attachment.filename) === fileName,
    );
    const expectedSha256 = await sha256File(filePath);
    const matching = await Promise.all(
      existing.map(async (attachment) => {
        try {
          return await attachmentMatches(attachment, expectedSha256, token);
        } catch {
          return null;
        }
      }),
    );
    if (matching.some(Boolean)) {
      console.log(`[gitee-release] reused existing asset ${fileName}`);
      continue;
    }
    if (matching.some((result) => result === null)) {
      throw new Error(
        `Unable to verify existing Gitee asset ${fileName}; no asset was replaced`,
      );
    }
    if (existing.length > 0 && !options.replaceExisting) {
      throw new Error(
        `Gitee asset ${fileName} differs; rerun with --replace-existing true`,
      );
    }
    for (const attachment of existing) {
      if (attachment.id === undefined || attachment.id === null) continue;
      await deleteAttachment({
        owner,
        repo,
        releaseId,
        attachmentId: attachment.id,
        token,
      });
      console.log(`[gitee-release] deleted existing asset ${fileName}`);
    }
    await uploadAttachment({ owner, repo, releaseId, filePath, token });
    await verifyUploadedAttachment({
      owner,
      repo,
      releaseId,
      fileName,
      expectedSha256,
      token,
    });
    console.log(`[gitee-release] uploaded ${fileName}`);
  }
}

export const syncGiteeReleaseInternalsForTests = {
  uploadAttachment,
};

const invokedModule = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : "";
if (import.meta.url === invokedModule) {
  void main().catch((error) => {
    console.error(
      error instanceof Error ? error.stack || error.message : error,
    );
    process.exit(1);
  });
}
