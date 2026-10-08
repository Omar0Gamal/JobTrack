import dns from "node:dns";
import net from "node:net";

/**
 * Checks if an IP address (IPv4 or IPv6) falls into private, loopback,
 * link-local, multicast, or reserved ranges.
 */
export function isPrivateOrReservedIp(rawIp: string): boolean {
  if (!rawIp || typeof rawIp !== "string") {
    return true;
  }

  let ip = rawIp.trim().toLowerCase();

  // Strip brackets if IPv6 literal like [::1]
  if (ip.startsWith("[") && ip.endsWith("]")) {
    ip = ip.slice(1, -1);
  }

  // Handle IPv4-mapped IPv6 addresses, e.g. ::ffff:127.0.0.1 or ::ffff:7f00:1
  if (ip.startsWith("::ffff:")) {
    const remainder = ip.slice(7);
    if (net.isIPv4(remainder)) {
      return isPrivateOrReservedIp(remainder);
    }
    const parts = remainder.split(":");
    if (parts.length === 2 && parts[0] && parts[1]) {
      const p1 = parseInt(parts[0], 16);
      const p2 = parseInt(parts[1], 16);
      if (!isNaN(p1) && !isNaN(p2)) {
        const a = (p1 >> 8) & 0xff;
        const b = p1 & 0xff;
        const c = (p2 >> 8) & 0xff;
        const d = p2 & 0xff;
        return isPrivateOrReservedIp(`${a}.${b}.${c}.${d}`);
      }
    }
    return true;
  }

  const ipVersion = net.isIP(ip);
  if (ipVersion === 0) {
    return true;
  }

  if (ipVersion === 4) {
    const octets = ip.split(".").map(Number);
    if (octets.length !== 4) return true;
    const [a, b, c, d] = octets;
    if (a === undefined || b === undefined || c === undefined || d === undefined) return true;
    if (isNaN(a) || isNaN(b) || isNaN(c) || isNaN(d)) return true;

    // 0.0.0.0/8 - This host on this network
    if (a === 0) return true;

    // 10.0.0.0/8 - Private-use
    if (a === 10) return true;

    // 100.64.0.0/10 - Shared Address Space (CGNAT)
    if (a === 100 && b >= 64 && b <= 127) return true;

    // 127.0.0.0/8 - Loopback
    if (a === 127) return true;

    // 169.254.0.0/16 - Link-local
    if (a === 169 && b === 254) return true;

    // 172.16.0.0/12 - Private-use (172.16.0.0 - 172.31.255.255)
    if (a === 172 && b >= 16 && b <= 31) return true;

    // 192.0.0.0/24 - IETF Protocol Assignments
    if (a === 192 && b === 0 && c === 0) return true;

    // 192.168.0.0/16 - Private-use
    if (a === 192 && b === 168) return true;

    // 198.18.0.0/15 - Network benchmark testing (198.18.0.0 - 198.19.255.255)
    if (a === 198 && (b === 18 || b === 19)) return true;

    // 224.0.0.0/4 - Multicast
    if (a >= 224 && a <= 239) return true;

    // 240.0.0.0/4 - Reserved (including 255.255.255.255)
    if (a >= 240 && a <= 255) return true;

    return false;
  }

  if (ipVersion === 6) {
    // Unspecified ::
    if (ip === "::") return true;

    // Loopback ::1
    if (ip === "::1") return true;

    const firstPart = ip.split(":")[0]?.toLowerCase() ?? "";

    // fc00::/7 - Unique Local Address (fc00:: to fdff::)
    if (firstPart.startsWith("fc") || firstPart.startsWith("fd")) {
      return true;
    }

    // ff00::/8 - Multicast
    if (firstPart.startsWith("ff")) {
      return true;
    }

    // fe80::/10 - Link-Local Unicast (fe80:: to febf::)
    if (
      firstPart.startsWith("fe8") ||
      firstPart.startsWith("fe9") ||
      firstPart.startsWith("fea") ||
      firstPart.startsWith("feb")
    ) {
      return true;
    }

    return false;
  }

  return true;
}

export type SafeUrlResult =
  | { safe: true; url: URL }
  | { safe: false; reason: string };

/**
 * Validates that a raw URL string is safe to request externally:
 * 1. Must parse to valid URL
 * 2. Protocol must be http: or https:
 * 3. Hostname cannot be localhost or internal domain (.local, .internal, etc.)
 * 4. Resolves DNS records and ensures none resolve to private or reserved IPs
 */
export async function validateSafeExternalUrl(rawUrl: string): Promise<SafeUrlResult> {
  if (!rawUrl || typeof rawUrl !== "string") {
    return { safe: false, reason: "URL must be a non-empty string" };
  }

  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return { safe: false, reason: "Invalid URL format" };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { safe: false, reason: "Only http: and https: protocols are permitted" };
  }

  let hostname = url.hostname.trim().toLowerCase();
  if (!hostname) {
    return { safe: false, reason: "URL hostname cannot be empty" };
  }

  if (hostname.startsWith("[") && hostname.endsWith("]")) {
    hostname = hostname.slice(1, -1);
  }

  // Disallow localhost and special internal / mDNS suffixes
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".lan") ||
    hostname.endsWith(".home") ||
    hostname.endsWith(".corp")
  ) {
    return { safe: false, reason: "Internal and localhost domains are not permitted" };
  }

  // If the hostname itself is an IP literal
  if (net.isIP(hostname)) {
    if (isPrivateOrReservedIp(hostname)) {
      return { safe: false, reason: "Private or reserved IP addresses are not permitted" };
    }
    return { safe: true, url };
  }

  // Resolve hostname via DNS
  try {
    const lookups = await dns.promises.lookup(hostname, { all: true });
    if (!lookups || lookups.length === 0) {
      return { safe: false, reason: `Unable to resolve hostname '${hostname}'` };
    }

    for (const entry of lookups) {
      if (isPrivateOrReservedIp(entry.address)) {
        return {
          safe: false,
          reason: `Resolved IP address '${entry.address}' for host '${hostname}' is private or reserved`,
        };
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "DNS resolution failure";
    return { safe: false, reason: `Failed to resolve hostname: ${message}` };
  }

  return { safe: true, url };
}
