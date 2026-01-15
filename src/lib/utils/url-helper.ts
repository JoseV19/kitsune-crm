/**
 * Utility functions for constructing subdomain URLs
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
  const baseHost = getBaseHost(currentHost);
  return `${protocol}//${slug}.${baseHost}`;
}
