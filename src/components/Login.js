import React, { useEffect, useCallback, useRef } from 'react';

import { signIn, signOut } from "../actions/loginActions";
import { showReauthModal } from "../actions/authActions";
import { useSelector, useDispatch } from 'react-redux';
import jwt_decode from 'jwt-decode';

import Button from 'react-bootstrap/Button';
import NavDropdown from 'react-bootstrap/NavDropdown';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserCircle } from '@fortawesome/free-solid-svg-icons';

// AWS Amplify imports
import { fetchAuthSession, signOut as amplifySignOut } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';

const TOKEN_SYNC_KEY = 'auth_token_updated';


const Login = () => {
    const loggedInUser = useSelector(state => state.isLogged.userId);
    const cognitoGroups = useSelector(state => state.isLogged.cognitoGroups);
    const accessToken = useSelector(state => state.isLogged.accessToken);
    const isSignedIn = useSelector(state => state.isLogged.isSignedIn);

    const dispatch = useDispatch();

    // Check current auth state and update Redux
    const checkAuthState = useCallback(async () => {
        try {
            const session = await fetchAuthSession();
            if (session.tokens?.idToken) {
                const idToken = session.tokens.idToken;
                const idTokenStr = session.tokens.idToken.toString();
                const email = idToken?.payload?.email || null;
                const userId = email || idToken?.payload?.sub || 'unknown';
                dispatch(signIn(userId, idTokenStr, email));

                // Broadcast token update to other tabs
                localStorage.setItem(TOKEN_SYNC_KEY, JSON.stringify({
                    timestamp: Date.now()
                }));
            } else {
                dispatch(signOut());
            }
        } catch (error) {
            console.log('Not authenticated:', error);
            dispatch(signOut());
        }
    }, [dispatch]);

    useEffect(() => {
        // Listen for auth events
        const hubListenerCancelToken = Hub.listen('auth', ({ payload }) => {
            switch (payload.event) {
                case 'signedIn':
                    console.log('User signed in');
                    checkAuthState();
                    break;
                case 'signedOut':
                    console.log('User signed out');
                    dispatch(signOut());
                    break;
                case 'tokenRefresh':
                    console.log('Token refreshed');
                    checkAuthState();
                    break;
                case 'tokenRefresh_failure':
                    // Token refresh failed - show re-auth modal instead of signing out
                    console.log('Token refresh failed - showing re-auth modal');
                    dispatch(showReauthModal());
                    break;
                default:
                    break;
            }
        });

        return () => {
            hubListenerCancelToken();
        };
    }, [dispatch, checkAuthState]);

    // Periodically check if token is about to expire and show re-auth modal
    const tokenCheckIntervalRef = useRef(null);
    useEffect(() => {
        const checkTokenExpiration = () => {
            if (!accessToken || !isSignedIn) {
                return;
            }
            try {
                const decodedToken = jwt_decode(accessToken);
                const expirationTime = decodedToken.exp * 1000; // Convert to milliseconds
                const currentTime = Date.now();
                // Show re-auth modal 90 seconds before actual expiration
                if (currentTime >= expirationTime - 90000) {
                    console.log('Token expiring soon - showing re-auth modal');
                    dispatch(showReauthModal());
                }
            } catch (error) {
                console.log('Error checking token expiration:', error);
            }
        };

        if (tokenCheckIntervalRef.current) {
            clearInterval(tokenCheckIntervalRef.current);
        }

        if (isSignedIn && accessToken) {
            checkTokenExpiration();
            // Check every 60 seconds
            tokenCheckIntervalRef.current = setInterval(checkTokenExpiration, 60000);
        }

        return () => {
            if (tokenCheckIntervalRef.current) {
                clearInterval(tokenCheckIntervalRef.current);
            }
        };
    }, [isSignedIn, accessToken, dispatch]);

    const onSignOutClick = async () => {
        try {
            await amplifySignOut();
            dispatch(signOut());
        } catch (error) {
            console.log('Error signing out:', error);
        }
    };

    // Only render user menu when signed in (users can't see this without auth anyway)
    if (!isSignedIn) {
        return null;
    }

    return (
        <div>
            <NavDropdown title={<FontAwesomeIcon icon={faUserCircle} />} alignRight id="login-nav-dropdown">
                <NavDropdown.Item>{loggedInUser}</NavDropdown.Item>
                <NavDropdown.Item>
                    <Button as="input" type="button" variant="primary" value="Sign Out" size="sm" onClick={onSignOutClick} />
                </NavDropdown.Item>
                {cognitoGroups !== null && cognitoGroups.map((optionValue) => (
                    <NavDropdown.Item key={optionValue}>{optionValue}</NavDropdown.Item>
                ))}
                <NavDropdown.Item
                    style={{ whiteSpace: 'normal', color: 'blue', textDecoration: 'underline' }}
                    onClick={() => { navigator.clipboard.writeText(accessToken); }}
                >
                    copy access token
                </NavDropdown.Item>
            </NavDropdown>
        </div>
    );
};

export default Login;
