import React, { useCallback, useEffect } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import CognitoSignInWidget from './CognitoSignInWidget';
import { signIn } from '../actions/loginActions';
import { setAuthLoading } from '../actions/authActions';
import { fetchAuthSession } from 'aws-amplify/auth';

const TOKEN_SYNC_KEY = 'auth_token_updated';

const LoginPage = () => {
    const history = useHistory();
    const location = useLocation();
    const dispatch = useDispatch();
    const isSignedIn = useSelector(state => state.isLogged.isSignedIn);

    // Get the page user was trying to access (default to home)
    // Include search params (query string) to preserve URLs like /Biblio?action=display&referenceCurie=...
    const fromLocation = location.state?.from;
    const from = fromLocation
        ? fromLocation.pathname + (fromLocation.search || '')
        : '/';

    // Check if already authenticated on mount
    useEffect(() => {
        const checkExistingAuth = async () => {
            try {
                const session = await fetchAuthSession();
                if (session.tokens?.idToken) {
                    const idTokenStr = session.tokens.idToken.toString();
                    const email = session.tokens.idToken?.payload?.email || null;
                    const userId = email || session.tokens.idToken?.payload?.sub || 'unknown';
                    dispatch(signIn(userId, idTokenStr, email));
                } else {
                    dispatch(setAuthLoading(false));
                }
            } catch (error) {
                dispatch(setAuthLoading(false));
            }
        };
        checkExistingAuth();
    }, [dispatch]);

    // Redirect when user becomes signed in
    useEffect(() => {
        if (isSignedIn === true) {
            history.replace(from);
        }
    }, [isSignedIn, history, from]);

    const onSuccess = useCallback(async () => {
        try {
            const session = await fetchAuthSession();
            if (session.tokens?.idToken) {
                const idTokenStr = session.tokens.idToken.toString();
                const email = session.tokens.idToken?.payload?.email || null;
                const userId = email || session.tokens.idToken?.payload?.sub || 'unknown';
                dispatch(signIn(userId, idTokenStr, email));

                // Broadcast token update to other tabs
                localStorage.setItem(TOKEN_SYNC_KEY, JSON.stringify({
                    timestamp: Date.now()
                }));
            }
        } catch (error) {
            console.error('Error during sign in:', error);
        }
    }, [dispatch]);

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            padding: '20px',
            backgroundColor: '#f5f5f5',
        }}>
            <style>
                {`@import url('https://fonts.googleapis.com/css2?family=Raleway:wght@300;600;800&display=swap');`}
            </style>
            <div style={{
                textAlign: 'center',
                marginBottom: '24px',
            }}>
                <h1 style={{
                    fontSize: '2rem',
                    fontWeight: '600',
                    margin: '0',
                    fontFamily: '"Raleway", sans-serif',
                    color: '#666',
                    letterSpacing: '0.5px',
                }}>
                    Alliance Bibliography Central
                </h1>
            </div>
            <div style={{
                maxWidth: '500px',
                width: '100%',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
                borderRadius: '8px',
            }}>
                <CognitoSignInWidget onSuccess={onSuccess} />
            </div>
        </div>
    );
};

export default LoginPage;
