/**
 * Utility functions for constructing subdomain URLs and parsing hosts.
 */

/**
 * Extracts the base host (without subdomain) from the current host
 * For localhost: "smiling-friends.localhost:3000" -> "localhost:3000"
 * For production: "smiling-friends.example.com" -> "example.com"
 */
export function getBaseHost(host: string): string {
  const isLocalhost = host.includes('localhost');
  
  if (isLocalhost) {
    // For localhost, extract everything after the first dot
    // "smiling-friends.localhost:3000" -> "localhost:3000"
    const parts = host.split('.');
    if (parts.length > 1) {
      // Remove the first part (subdomain) and rejoin
      return parts.slice(1).join('.');
    }
    // If no subdomain, return as is
    return host;
  } else {
    // For production, extract base domain
    // "smiling-friends.example.com" -> "example.com"
    const parts = host.split('.');
    if (parts.length > 2) {
      // Remove the first part (subdomain) and rejoin
      return parts.slice(1).join('.');
    }
    // If no subdomain, return as is
    return host;
  }
}

export interface HostInfo {
  baseHost: string;
  subdomain: string | null;
  isLocalhost: boolean;
  isMainDomain: boolean;
}

export function getHostInfo(host: string): HostInfo {
  const isLocalhost = host.includes('localhost');
  const parts = host.split('.');
  const subdomain =
    (isLocalhost && parts.length > 1) || (!isLocalhost && parts.length > 2)
      ? parts[0]
      : null;
  const baseHost = getBaseHost(host);
  const isMainDomain = !subdomain || subdomain === 'www' || subdomain === 'localhost';

  return {
    baseHost,
    subdomain: subdomain && subdomain !== 'www' ? subdomain : null,
    isLocalhost,
    isMainDomain,
  };
}

/**
 * Constructs a subdomain URL from the current location
 * @param slug - The organization slug
 * @param currentHost - The current window.location.host
 * @param protocol - The current window.location.protocol
 * @returns The full URL with subdomain
 */
export function buildSubdomainUrl(
  slug: string,
  currentHost: string,
  protocol: string
): string {
  const { baseHost } = getHostInfo(currentHost);
  return `${protocol}//${baseHost}/${slug}`;
}

export function buildTenantPath(slug: string, path = ''): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `/${slug}${normalizedPath}`;
}

const LAST_ORG_COOKIE = 'last_organization_slug';

export function getLastOrganizationCookieName(): string {
  return LAST_ORG_COOKIE;
}

export function buildLastOrganizationCookie(slug: string, host: string): string {
  const { baseHost, isLocalhost } = getHostInfo(host);
  const domain = isLocalhost ? '' : `; Domain=.${baseHost}`;
  const secure = isLocalhost ? '' : '; Secure';
  return `${LAST_ORG_COOKIE}=${slug}; Path=/; Max-Age=31536000; SameSite=Lax${domain}${secure}`;
}

export function getLastOrganizationCookieFromDocument(): string | null {
  if (typeof document === 'undefined') {
    return null;
  }
  const cookie = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${LAST_ORG_COOKIE}=`));
  return cookie ? cookie.split('=')[1] : null;
}
