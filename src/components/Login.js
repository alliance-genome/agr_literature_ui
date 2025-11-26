import React, { useEffect, useState, useCallback } from 'react';

import CognitoSignInWidget from './CognitoSignInWidget';
import { signIn, signOut } from "../actions/loginActions";
import { useSelector, useDispatch } from 'react-redux';

import Popup from 'reactjs-popup';
import 'reactjs-popup/dist/index.css';

import Button from 'react-bootstrap/Button';
import NavDropdown from 'react-bootstrap/NavDropdown';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUserCircle } from '@fortawesome/free-solid-svg-icons'

// AWS Amplify imports
import { fetchAuthSession, signOut as amplifySignOut } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';


const Login = () => {
    const loggedInUser = useSelector(state => state.isLogged.userId);
    const oktaGroups = useSelector(state => state.isLogged.oktaGroups);
    const accessToken = useSelector(state => state.isLogged.accessToken);
    const isSignedIn = useSelector(state => state.isLogged.isSignedIn);

    const [isLoading, setIsLoading] = useState(true);
    const [popupOpen, setPopupOpen] = useState(false);

    const dispatch = useDispatch();

    // Check current auth state and update Redux
    const checkAuthState = useCallback(async () => {
        try {
            const session = await fetchAuthSession();
            if (session.tokens?.accessToken) {
                const accessTokenStr = session.tokens.accessToken.toString();
                const idToken = session.tokens.idToken;
                // Use email or sub from ID token as userId
                const userId = idToken?.payload?.email || idToken?.payload?.sub || 'unknown';
                dispatch(signIn(userId, accessTokenStr));
                setPopupOpen(false);
            } else {
                dispatch(signOut());
            }
        } catch (error) {
            console.log('Not authenticated:', error);
            dispatch(signOut());
        } finally {
            setIsLoading(false);
        }
    }, [dispatch]);

    useEffect(() => {
        // Check auth state on mount
        checkAuthState();

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
                    console.log('Token refresh failed');
                    dispatch(signOut());
                    break;
                default:
                    break;
            }
        });

        return () => {
            hubListenerCancelToken();
        };
    }, [dispatch, checkAuthState]);

    const onSignOutClick = async () => {
        try {
            await amplifySignOut();
            dispatch(signOut());
        } catch (error) {
            console.log('Error signing out:', error);
        }
    }

    const onSignInSuccess = () => {
        setPopupOpen(false);
        checkAuthState();
    };

    const renderAuthButton = () => {
        if (isLoading) {
            return null;
        }

        if (!isSignedIn) {
            return(
            <Popup
                trigger={<Button as="input" type="button" variant="light" value="Sign In" size="sm" />}
                modal
                open={popupOpen}
                onOpen={() => setPopupOpen(true)}
                onClose={() => setPopupOpen(false)}
                overlayStyle={{
                    zIndex: 9999,
                }}
                contentStyle={{
                    width: '500px',
                    padding: '0',
                    border: 'none',
                    borderRadius: '8px',
                    background: 'transparent',
                    zIndex: 10000,
                }}
            >
                <CognitoSignInWidget onSuccess={onSignInSuccess} />
            </Popup>)
        } else {
            return(
              <NavDropdown title={<FontAwesomeIcon icon={faUserCircle} />} alignRight id="login-nav-dropdown">
                <NavDropdown.Item >{loggedInUser}</NavDropdown.Item>
                <NavDropdown.Item >
                  <Button as="input" type="button" variant="primary" value="Sign Out" size="sm" onClick={onSignOutClick} />
                </NavDropdown.Item>
                {oktaGroups !== null && oktaGroups.map((optionValue, index) => (
                  <NavDropdown.Item key={optionValue}>{optionValue}</NavDropdown.Item>
                ))}
                <NavDropdown.Item style={{whiteSpace: 'normal', color: 'blue', textDecoration: 'underline'}}
                  onClick={() => { navigator.clipboard.writeText(accessToken); } } >copy access token</NavDropdown.Item>
              </NavDropdown>)
        }
    }

    return(<div>
        {renderAuthButton()}
    </div>)
};

export default Login
