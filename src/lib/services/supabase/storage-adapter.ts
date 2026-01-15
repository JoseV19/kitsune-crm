/**
 * Custom storage adapter for Supabase that works across subdomains
 * Uses cookies for localhost subdomains and localStorage for production
 */

type StorageAdapter = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null;
  }
  return null;
}

function setCookie(name: string, value: string, days: number = 30): void {
  if (typeof document === 'undefined') return;
  
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  
  // For localhost, don't set domain (browsers don't allow domain on localhost cookies)
  // For production, we'd set domain: '.yourdomain.com' but that's handled server-side
  const isLocalhost = window.location.hostname.includes('localhost');
  const cookieString = `${name}=${value}; expires=${expires.toUTCString()}; path=/; SameSite=Lax${!isLocalhost ? '; Secure' : ''}`;
  
  document.cookie = cookieString;
}

function removeCookie(name: string): void {
  if (typeof document === 'undefined') return;
  
  const isLocalhost = window.location.hostname.includes('localhost');
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax${!isLocalhost ? '; Secure' : ''}`;
}

/**
 * Storage adapter that uses cookies for cross-subdomain session sharing
 * Falls back to localStorage for non-auth keys
 */
export const crossSubdomainStorage: StorageAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    // Use cookies for Supabase auth keys to work across subdomains
    if (key.startsWith('sb-') || key.includes('auth-token') || key.includes('supabase')) {
      const cookieValue = getCookie(key);
      if (cookieValue) return cookieValue;
      
      // Fallback to localStorage if cookie not found
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          return localStorage.getItem(key);
        } catch {
          return null;
        }
      }
      return null;
    }
    
    // Use localStorage for other keys
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    }
    return null;
  },

  setItem: async (key: string, value: string): Promise<void> => {
    // Use cookies for Supabase auth keys
    if (key.startsWith('sb-') || key.includes('auth-token') || key.includes('supabase')) {
      setCookie(key, value);
      
      // Also store in localStorage as backup
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          localStorage.setItem(key, value);
        } catch {
          // Ignore localStorage errors
        }
      }
      return;
    }
    
    // Use localStorage for other keys
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem(key, value);
      } catch {
        // Ignore localStorage errors
      }
    }
  },

  removeItem: async (key: string): Promise<void> => {
    // Remove from cookies
    if (key.startsWith('sb-') || key.includes('auth-token') || key.includes('supabase')) {
      removeCookie(key);
    }
    
    // Remove from localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.removeItem(key);
      } catch {
        // Ignore localStorage errors
      }
    }
  },
};
