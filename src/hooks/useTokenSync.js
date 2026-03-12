import { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAuthSession } from 'aws-amplify/auth';
import { signIn } from '../actions/loginActions';
import { hideReauthModal, clearPendingRequests, showReauthModal } from '../actions/authActions';

const TOKEN_SYNC_KEY = 'auth_token_updated';

/**
 * Hook for synchronizing authentication state across browser tabs.
 * - Listens for localStorage events when another tab updates the token
 * - Checks session on tab visibility change (when tab gains focus)
 * - Broadcasts token updates to other tabs after successful auth
 */
export const useTokenSync = () => {
    const dispatch = useDispatch();
    const currentToken = useSelector(state => state.isLogged.accessToken);
    const reauthRequired = useSelector(state => state.isLogged.reauthRequired);

    // Function to refresh auth state from Amplify session
    const refreshAuthState = useCallback(async () => {
        try {
            const session = await fetchAuthSession();
            if (session.tokens?.idToken) {
                const idTokenStr = session.tokens.idToken.toString();
                // Only update if token is different
                if (idTokenStr !== currentToken) {
                    const email = session.tokens.idToken?.payload?.email || null;
                    const userId = email || session.tokens.idToken?.payload?.sub || 'unknown';
                    dispatch(signIn(userId, idTokenStr, email));

                    // If re-auth modal was open, close it since we have a new token
                    if (reauthRequired) {
                        dispatch(hideReauthModal());
                        dispatch(clearPendingRequests());
                    }
                }
            } else {
                // Session exists but has no tokens (e.g., refresh token expired,
                // Safari ITP cleared localStorage). Prompt re-authentication
                // rather than letting the user work with a stale expired token.
                console.log('Token sync: Session has no valid tokens - prompting re-auth');
                dispatch(showReauthModal());
            }
        } catch (error) {
            const errorName = error?.name || '';
            const errorMessage = error?.message || '';
            const isAuthError = (
                errorName === 'NotAuthorizedException' ||
                errorMessage.toLowerCase().includes('token') ||
                errorMessage.toLowerCase().includes('not authenticated') ||
                errorMessage.toLowerCase().includes('no current user')
            );

            if (isAuthError) {
                console.log('Token sync: Auth error - prompting re-auth:', errorMessage);
                dispatch(showReauthModal());
            } else {
                // Transient error (network dropout, etc.) — don't prompt re-auth
                console.log('Token sync: Non-auth error, skipping re-auth:', errorMessage);
            }
        }
    }, [dispatch, currentToken, reauthRequired]);

    // Listen for token updates from other tabs via localStorage
    useEffect(() => {
        const handleStorageChange = (event) => {
            if (event.key === TOKEN_SYNC_KEY) {
                // Another tab updated the token, refresh our session
                refreshAuthState();
            }
        };

        window.addEventListener('storage', handleStorageChange);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };
    }, [refreshAuthState]);

    // Check session when tab gains focus
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                // Tab became visible, check if we have a valid session
                refreshAuthState();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [refreshAuthState]);

    // Broadcast token update to other tabs
    const broadcastTokenUpdate = useCallback(() => {
        localStorage.setItem(TOKEN_SYNC_KEY, JSON.stringify({
            timestamp: Date.now()
        }));
    }, []);

    return { broadcastTokenUpdate, refreshAuthState };
};

export default useTokenSync;
