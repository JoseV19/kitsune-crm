/**
 * Utilities for transferring Supabase session across subdomains
 * For localhost development where cookies don't work across subdomains
 * 
 * Uses URL hash to pass refresh token (more secure than query params)
 */

import { supabase } from './client';

/**
 * Prepares session for transfer to subdomain
 * Returns the refresh token to be passed in URL hash
 */
export async function prepareSessionTransfer(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.refresh_token) {
      return null;
    }

    // Return refresh token to be passed in URL hash
    // Hash is not sent to server, making it more secure than query params
    return session.refresh_token;
  } catch (error) {
    console.error('Error preparing session transfer:', error);
    return null;
  }
}

/**
 * Restores session from refresh token
 * Should be called on the new subdomain
 */
export async function restoreSessionFromRefreshToken(refreshToken: string): Promise<boolean> {
  try {
    console.log('[Session Transfer] Attempting to restore session with refresh token...');
    
    // Use refresh token to get new session
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error) {
      console.error('[Session Transfer] Error refreshing session:', error);
      console.error('[Session Transfer] Error details:', {
        message: error.message,
        status: error.status,
      });
      return false;
    }

    if (!data.session) {
      console.error('[Session Transfer] No session returned after refresh');
      return false;
    }

    if (!data.user) {
      console.error('[Session Transfer] No user returned after refresh');
      return false;
    }

    console.log('[Session Transfer] Session refreshed successfully, user:', data.user.email);
    
    // Verify the session is actually set
    const { data: { user: verifyUser } } = await supabase.auth.getUser();
    if (!verifyUser) {
      console.error('[Session Transfer] Session not properly set after refresh');
      return false;
    }
    
    console.log('[Session Transfer] Session verified, user authenticated:', verifyUser.email);
    return true;
  } catch (error) {
    console.error('[Session Transfer] Exception restoring session:', error);
    return false;
  }
}

/**
 * Checks URL hash for session transfer token and restores session if found
 * Should be called on app initialization
 */
export async function checkAndRestoreSessionFromURL(): Promise<boolean> {
  if (typeof window === 'undefined') {
    return false;
  }

  // Check URL hash for refresh token
  // Format: #session_token=<refresh_token>
  const hash = window.location.hash;
  if (!hash) {
    return false;
  }

  const hashParams = new URLSearchParams(hash.substring(1)); // Remove #
  const refreshToken = hashParams.get('session_token');

  if (!refreshToken) {
    return false;
  }

  console.log('[Session Transfer] Found session token in URL, restoring session...');
  console.log('[Session Transfer] Token length:', refreshToken.length);

  // Restore session
  const restored = await restoreSessionFromRefreshToken(refreshToken);

  if (restored) {
    console.log('[Session Transfer] Session restored successfully');
    // Remove token from URL hash after restoring
    hashParams.delete('session_token');
    const newHash = hashParams.toString() ? `#${hashParams.toString()}` : '';
    window.history.replaceState({}, '', window.location.pathname + window.location.search + newHash);
  } else {
    console.error('[Session Transfer] Failed to restore session - will redirect to login');
    // Remove the token from URL even if restoration failed
    hashParams.delete('session_token');
    const newHash = hashParams.toString() ? `#${hashParams.toString()}` : '';
    window.history.replaceState({}, '', window.location.pathname + window.location.search + newHash);
  }

  return restored;
}
