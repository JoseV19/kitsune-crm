/**
 * Generates a URL-friendly slug from an organization name
 * @param name - The organization name
 * @returns A URL-friendly slug
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Validates if a slug is valid (URL-safe, proper length)
 * @param slug - The slug to validate
 * @returns true if valid, false otherwise
 */
export function isValidSlug(slug: string): boolean {
  if (!slug || slug.length < 3 || slug.length > 50) {
    return false;
  }
  // Only allow lowercase letters, numbers, and hyphens
  return /^[a-z0-9-]+$/.test(slug);
}
