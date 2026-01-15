/**
 * Utility to sync Supabase session from localStorage to cookies
 * This ensures sessions work across subdomains
 */

/**
 * Migrates Supabase session from localStorage to cookies
 * Should be called on app initialization
 */
export function migrateSessionToCookies(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  try {
    // Get all localStorage keys that start with 'sb-' (Supabase keys)
    const supabaseKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
        supabaseKeys.push(key);
      }
    }

    // Copy each key to cookies if not already there
    supabaseKeys.forEach((key) => {
      const value = localStorage.getItem(key);
      if (value) {
        // Check if cookie already exists
        const existingCookie = document.cookie
          .split('; ')
          .find((row) => row.startsWith(`${key}=`));
        
        if (!existingCookie) {
          // Set cookie (without domain for localhost compatibility)
          const expires = new Date();
          expires.setTime(expires.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
          const isLocalhost = window.location.hostname.includes('localhost');
          document.cookie = `${key}=${value}; expires=${expires.toUTCString()}; path=/; SameSite=Lax${!isLocalhost ? '; Secure' : ''}`;
        }
      }
    });
  } catch (error) {
    console.error('Error migrating session to cookies:', error);
  }
}
