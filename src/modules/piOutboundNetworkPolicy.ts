/**
 * Shared outbound-network policy for Built-in Pi network tools.
 *
 * This module owns policy facts only: URL normalization, cleartext and
 * userinfo rules, permanent metadata/link-local denial, public / private /
 * loopback classification for host literals and resolved addresses, and the
 * credential rules applied per redirect hop. It sends no request and owns no
 * grant, credential, cache or transport.
 */

export type PiOutboundUrlLocation = "public" | "private" | "loopback";

export type PiOutboundUrlFacts = {
  /** Normalized absolute URL. */
  url: string;
  origin: string;
  /** Lowercased host without brackets or a single trailing dot. */
  hostname: string;
  scheme: "http:" | "https:";
  /** Literal-host classification; the authoritative value still comes from DNS. */
  location: PiOutboundUrlLocation;
  ipLiteral: boolean;
};

export type PiOutboundAddressFacts = {
  address: string;
  family: 4 | 6;
  location: PiOutboundUrlLocation;
  /** Cloud metadata or link-local target: permanently denied. */
  metadata: boolean;
};

export const PI_OUTBOUND_URL_MAX_BYTES = 8 * 1024;
export const PI_OUTBOUND_MAX_REDIRECTS = 5;
export const PI_OUTBOUND_MAX_BODY_BYTES = 5 * 1024 * 1024;
export const PI_OUTBOUND_IDLE_TIMEOUT_MS = 30_000;
export const PI_OUTBOUND_TOTAL_TIMEOUT_MS = 120_000;

export class PiOutboundNetworkError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = "PiOutboundNetworkError";
  }
}

function deny(code: string): never {
  throw new PiOutboundNetworkError(code);
}

function utf8Bytes(value: string): number {
  return new TextEncoder().encode(value).length;
}

type ParsedAddress =
  | { family: 4; octets: [number, number, number, number] }
  | { family: 6; groups: number[] };

const IPV4_RE = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

function parseIpv4(
  host: string,
): { family: 4; octets: [number, number, number, number] } | undefined {
  const match = IPV4_RE.exec(host);
  if (!match) return undefined;
  const octets = match.slice(1).map(Number) as [number, number, number, number];
  if (octets.some((part) => part > 255))
    throw new PiOutboundNetworkError("pi_network_invalid_url");
  return { family: 4, octets };
}

function parseIpv6(host: string): { family: 6; groups: number[] } | undefined {
  if (!host.includes(":")) return undefined;
  const [headRaw, tailRaw, ...rest] = host.split("::");
  if (rest.length) throw new PiOutboundNetworkError("pi_network_invalid_url");
  const parseGroups = (part: string) => {
    if (!part) return [];
    const tokens = part.split(":");
    const groups: number[] = [];
    for (let index = 0; index < tokens.length; index += 1) {
      const token = tokens[index];
      if (token.includes(".")) {
        // An embedded dotted quad is only valid as the final token.
        if (index !== tokens.length - 1)
          throw new PiOutboundNetworkError("pi_network_invalid_url");
        const ipv4 = parseIpv4(token);
        if (!ipv4) throw new PiOutboundNetworkError("pi_network_invalid_url");
        const [a, b, c, d] = ipv4.octets;
        groups.push((a << 8) | b, (c << 8) | d);
        continue;
      }
      if (!/^[0-9a-f]{1,4}$/.test(token))
        throw new PiOutboundNetworkError("pi_network_invalid_url");
      groups.push(parseInt(token, 16));
    }
    return groups;
  };
  const head = parseGroups(headRaw || "");
  const tail = tailRaw === undefined ? undefined : parseGroups(tailRaw || "");
  let groups: number[];
  if (tail === undefined) {
    groups = head;
    if (groups.length !== 8)
      throw new PiOutboundNetworkError("pi_network_invalid_url");
  } else {
    const fill = 8 - head.length - tail.length;
    if (fill < 1) throw new PiOutboundNetworkError("pi_network_invalid_url");
    groups = [...head, ...new Array(fill).fill(0), ...tail];
  }
  return { family: 6, groups };
}

export function normalizePiOutboundHostname(host: string): string {
  return host
    .toLowerCase()
    .replace(/^\[|\]$/g, "")
    .replace(/\.$/, "");
}

function parseAddressLiteral(host: string): ParsedAddress | undefined {
  const ipv4 = parseIpv4(host);
  if (ipv4) return ipv4;
  const ipv6 = parseIpv6(host);
  if (!ipv6) return undefined;
  // Unmap IPv4-mapped literals so they classify as IPv4.
  if (ipv6.groups.slice(0, 5).every((group) => group === 0)) {
    const sixth = ipv6.groups[5];
    const last = ipv6.groups[7];
    if (sixth === 0xffff) {
      return {
        family: 4,
        octets: [
          (ipv6.groups[6] >> 8) & 0xff,
          ipv6.groups[6] & 0xff,
          (last >> 8) & 0xff,
          last & 0xff,
        ],
      };
    }
  }
  return ipv6;
}

function addressText(parsed: ParsedAddress): string {
  if (parsed.family === 4) return parsed.octets.join(".");
  const { groups } = parsed;
  const hex = groups.map((group) => group.toString(16)).join(":");
  return hex;
}

/**
 * Cloud-metadata and link-local targets are denied permanently, before any
 * approval is considered. The list covers the well-known IPv4/IPv6 instance
 * metadata endpoints plus every link-local range.
 */
export function isPiMetadataAddress(parsed: ParsedAddress): boolean {
  if (parsed.family === 4) {
    const [a, b, c, d] = parsed.octets;
    // 169.254.0.0/16 link-local (includes 169.254.169.254 and 169.254.170.2).
    if (a === 169 && b === 254) return true;
    // Alibaba Cloud metadata.
    if (a === 100 && b === 100 && c === 100 && d === 200) return true;
    // Oracle Cloud metadata.
    if (a === 192 && b === 0 && c === 0 && d === 192) return true;
    // Azure WireServer.
    if (a === 168 && b === 63 && c === 129 && d === 16) return true;
    return false;
  }
  const { groups } = parsed;
  // fe80::/10 link-local.
  if ((groups[0] & 0xffc0) === 0xfe80) return true;
  // fd00:ec2::254 AWS IPv6 instance metadata.
  if (
    groups[0] === 0xfd00 &&
    groups[1] === 0x0ec2 &&
    groups[2] === 0 &&
    groups[3] === 0 &&
    groups[4] === 0 &&
    groups[5] === 0 &&
    groups[6] === 0 &&
    groups[7] === 0x254
  )
    return true;
  return false;
}

function addressLocation(parsed: ParsedAddress): PiOutboundUrlLocation {
  if (parsed.family === 4) {
    const [a, b] = parsed.octets;
    if (a === 127) return "loopback";
    if (
      a === 10 ||
      a === 0 ||
      a >= 240 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19)) ||
      (a === 192 && b === 0) ||
      (a === 192 && b === 0 && parsed.octets[2] === 2) ||
      (a === 198 && b === 51) ||
      (a === 203 && b === 0)
    )
      return "private";
    return "public";
  }
  const { groups } = parsed;
  if (groups.every((group) => group === 0)) return "private";
  if (groups.slice(0, 7).every((group) => group === 0) && groups[7] === 1)
    return "loopback";
  if ((groups[0] & 0xfe00) === 0xfc00) return "private";
  if (groups[0] === 0x2001 && groups[1] === 0x0db8) return "private";
  return "public";
}

export function classifyPiOutboundAddress(raw: string): PiOutboundAddressFacts {
  const host = normalizePiOutboundHostname(String(raw || ""));
  const parsed = host ? parseAddressLiteral(host) : undefined;
  if (!parsed) deny("pi_network_address_unavailable");
  const metadata = isPiMetadataAddress(parsed);
  return {
    address: addressText(parsed),
    family: parsed.family,
    location: metadata ? "private" : addressLocation(parsed),
    metadata,
  };
}

function nameLocation(hostname: string): PiOutboundUrlLocation {
  if (hostname === "localhost" || hostname.endsWith(".localhost"))
    return "loopback";
  if (
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname === "home.arpa" ||
    hostname.endsWith(".home.arpa")
  )
    return "private";
  return "public";
}

export function classifyPiOutboundUrl(raw: string): PiOutboundUrlFacts {
  if (typeof raw !== "string" || !raw) deny("pi_network_invalid_url");
  if (utf8Bytes(raw) > PI_OUTBOUND_URL_MAX_BYTES)
    deny("pi_network_url_too_long");
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    deny("pi_network_invalid_url");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:")
    deny("pi_network_scheme_denied");
  if (url.username || url.password) deny("pi_network_userinfo_denied");
  if (url.hash) deny("pi_network_invalid_url");
  if (!url.hostname) deny("pi_network_invalid_url");
  const hostname = normalizePiOutboundHostname(url.hostname);
  if (!hostname) deny("pi_network_invalid_url");
  const literal = parseAddressLiteral(hostname);
  return {
    url: url.href,
    origin: url.origin,
    hostname,
    scheme: url.protocol,
    location: literal
      ? isPiMetadataAddress(literal)
        ? "private"
        : addressLocation(literal)
      : nameLocation(hostname),
    ipLiteral: !!literal,
  };
}

export type PiOutboundPolicyInput = {
  facts: PiOutboundUrlFacts;
  credentialed: boolean;
  localNetworkApprovedOrigin?: string;
};

function requireLocalApproval(input: PiOutboundPolicyInput): void {
  if (input.localNetworkApprovedOrigin !== input.facts.origin)
    deny("pi_network_local_approval_required");
}

/**
 * URL-level policy that depends on no local-network grant: literal metadata is
 * denied and public endpoints must use HTTPS.
 */
export function assertPiOutboundUrlShapeAllowed(
  facts: PiOutboundUrlFacts,
): void {
  if (facts.ipLiteral) {
    const literal = parseAddressLiteral(facts.hostname);
    if (literal && isPiMetadataAddress(literal))
      deny("pi_network_metadata_denied");
  }
  if (facts.location === "public" && facts.scheme !== "https:")
    deny("pi_network_https_required");
}

/** Reject literal-IP metadata before any DNS resolution or connection. */
export function assertPiOutboundUrlAllowed(input: PiOutboundPolicyInput): void {
  const { facts } = input;
  assertPiOutboundUrlShapeAllowed(facts);
  if (facts.location !== "public") requireLocalApproval(input);
  if (
    facts.location === "private" &&
    facts.scheme === "http:" &&
    input.credentialed
  )
    deny("pi_network_cleartext_credential_denied");
}

/**
 * Strongest location across every resolved A/AAAA record. Metadata stays
 * denied and missing evidence fails closed, but no grant is enforced, so the
 * Gateway can classify a target before admission.
 */
export function classifyPiOutboundResolvedLocation(input: {
  facts: PiOutboundUrlFacts;
  addresses: readonly string[];
}): PiOutboundUrlLocation {
  assertPiOutboundUrlShapeAllowed(input.facts);
  const addresses = input.addresses || [];
  if (!addresses.length) deny("pi_network_address_unavailable");
  let location: PiOutboundUrlLocation = "public";
  for (const raw of addresses) {
    let facts: PiOutboundAddressFacts;
    try {
      facts = classifyPiOutboundAddress(raw);
    } catch {
      deny("pi_network_address_denied");
    }
    if (facts.metadata) deny("pi_network_metadata_denied");
    if (facts.location === "loopback") location = "loopback";
    else if (facts.location === "private" && location !== "loopback")
      location = "private";
  }
  return location;
}

/**
 * Apply the resolved-address policy: every A/AAAA record must be classified,
 * metadata stays denied, and any private or loopback address requires the
 * canonical-origin-bound local-network approval. Missing addresses fail closed.
 */
export function assertPiOutboundResolvedAllowed(
  input: PiOutboundPolicyInput & { addresses: readonly string[] },
): PiOutboundUrlLocation {
  assertPiOutboundUrlAllowed(input);
  const location = classifyPiOutboundResolvedLocation({
    facts: input.facts,
    addresses: input.addresses,
  });
  if (location !== "public") {
    requireLocalApproval(input);
    if (
      input.addresses.some(
        (address) => classifyPiOutboundAddress(address).location === "private",
      ) &&
      input.facts.scheme === "http:" &&
      input.credentialed
    )
      deny("pi_network_cleartext_credential_denied");
  }
  return location;
}

/**
 * Validate the address the channel actually connected to. A public host that
 * reaches a private or loopback peer is a rebinding attempt; a missing peer is
 * unavailable evidence and fails closed.
 */
export function assertPiOutboundPeerAllowed(
  input: PiOutboundPolicyInput & {
    peerAddress?: string;
    expected: PiOutboundUrlLocation;
  },
): void {
  if (!input.peerAddress) deny("pi_network_peer_unavailable");
  const peer = classifyPiOutboundAddress(input.peerAddress);
  if (peer.metadata) deny("pi_network_metadata_denied");
  if (peer.location !== "public" && input.expected === "public")
    deny("pi_network_peer_denied");
  if (input.expected !== "public" && peer.location === "public")
    deny("pi_network_peer_denied");
  if (peer.location !== "public") requireLocalApproval(input);
  if (
    peer.location === "private" &&
    input.facts.scheme === "http:" &&
    input.credentialed
  )
    deny("pi_network_cleartext_credential_denied");
}
