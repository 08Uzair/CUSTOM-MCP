import net from 'node:net';
import dns from 'node:dns/promises';

/**
 * SSRF guard - blocks requests to private / internal network resources.
 *
 * Defense layers:
 *   1. Protocol + format checks (http/https only, no embedded credentials).
 *   2. Hostname checks (localhost, .local, .internal, .lan, bare IPs).
 *   3. DNS resolution and per-address blocking for every resolved IP.
 *   4. ALLOWED_PRIVATE_HOSTS allowlist for local development only.
 *
 * Cloud metadata endpoints (169.254.169.254 etc.) are covered by the
 * 169.254.0.0/16 block.
 */

const PRIVATE_IPV4_RANGES = [
  ['0.0.0.0', '0.255.255.255'], // "this" network
  ['10.0.0.0', '10.255.255.255'], // private
  ['100.64.0.0', '100.127.255.255'], // CGNAT
  ['127.0.0.0', '127.255.255.255'], // loopback
  ['169.254.0.0', '169.254.255.255'], // link-local (cloud metadata!)
  ['172.16.0.0', '172.31.255.255'], // private
  ['192.0.0.0', '192.0.0.255'], // IETF reserved
  ['192.168.0.0', '192.168.255.255'], // private
  ['198.18.0.0', '198.19.255.255'], // benchmarking
  ['198.51.100.0', '198.51.100.255'], // documentation
  ['203.0.113.0', '203.0.113.255'], // documentation
  ['224.0.0.0', '255.255.255.255'], // multicast + reserved
];

const PRIVATE_IPV6_PATTERNS = [
  /^::1$/, // loopback
  /^::ffff:/, // v4-mapped (checked in IPv4 space anyway)
  /^fc00:/i, // unique local
  /^fd00:/i, // unique local
  /^fe80:/i, // link-local
  /^ff00:/i, // multicast
  /^2001:db8:/i, // documentation
];

/** Blocked hostname suffixes, e.g. http://prometheus.internal:9090 */
const BLOCKED_HOST_SUFFIXES = [
  '.local',
  '.internal',
  '.lan',
  '.localhost',
  '.home',
  '.corp',
];

function ipv4ToInt(ip) {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0;
}

function isPrivateIpv4(ip) {
  const value = ipv4ToInt(ip);
  return PRIVATE_IPV4_RANGES.some(([start, end]) => {
    const s = ipv4ToInt(start);
    const e = ipv4ToInt(end);
    return value >= s && value <= e;
  });
}

function isPrivateIpv6(ip) {
  return PRIVATE_IPV6_PATTERNS.some((re) => re.test(ip));
}

function isBlockedHostname(hostname) {
  const host = hostname.toLowerCase().replace(/\.$/, '');
  if (host === 'localhost' || host === 'ip6-localhost') return true;
  return BLOCKED_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix));
}

function isAllowlisted(hostname, allowlist) {
  const host = hostname.toLowerCase().replace(/\.$/, '');
  return allowlist.some((entry) => entry.toLowerCase() === host);
}

/**
 * Returns { allowed: true } or { allowed: false, reason }.
 * `allowlist` = explicit private hosts permitted (dev only), e.g. ['localhost'].
 */
export async function assertUrlAllowed(rawUrl, allowlist = []) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return { allowed: false, reason: 'URL_IS_INVALID' };
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { allowed: false, reason: 'Only http(s) URLs are supported' };
  }
  if (url.username || url.password) {
    return { allowed: false, reason: 'URLs must not contain credentials' };
  }

  const hostname = url.hostname;

  // Explicit allowlist overrides hostname-level blocks (never IP resolution).
  if (allowlist.length > 0 && isAllowlisted(hostname, allowlist)) {
    return { allowed: true };
  }

  if (net.isIP(hostname)) {
    const blocked = net.isIP(hostname) === 4 ? isPrivateIpv4(hostname) : isPrivateIpv6(hostname);
    return blocked
      ? { allowed: false, reason: 'Private/loopback network addresses are blocked' }
      : { allowed: true };
  }

  if (isBlockedHostname(hostname)) {
    return { allowed: false, reason: 'Internal hostnames are blocked' };
  }

  // Resolve and inspect every address the hostname can resolve to.
  try {
    const { address } = await dns.lookup(hostname, { all: true, verbatim: true });
    for (const { address: ip } of address) {
      const blocked = net.isIP(ip) === 4 ? isPrivateIpv4(ip) : isPrivateIpv6(ip);
      if (blocked) {
        return { allowed: false, reason: `Host ${hostname} resolves to a private/blocked address (${ip})` };
      }
    }
    return { allowed: true };
  } catch {
    return { allowed: false, reason: `Unable to resolve host ${hostname}` };
  }
}

export const SSRFErrorCode = 'SSRF_BLOCKED';