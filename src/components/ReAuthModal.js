import React, { useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import Popup from 'reactjs-popup';
import 'reactjs-popup/dist/index.css';
import CognitoSignInWidget from './CognitoSignInWidget';
import { hideReauthModal, clearPendingRequests } from '../actions/authActions';
import { signIn } from '../actions/loginActions';
import { retryPendingRequests } from '../api';
import { fetchAuthSession } from 'aws-amplify/auth';

const TOKEN_SYNC_KEY = 'auth_token_updated';

const ReAuthModal = () => {
    const reauthRequired = useSelector(state => state.isLogged.reauthRequired);
    const dispatch = useDispatch();

    const onSuccess = useCallback(async () => {
        try {
            // Get the new session tokens
            const session = await fetchAuthSession();
            if (session.tokens?.idToken) {
                const idTokenStr = session.tokens.idToken.toString();
                const email = session.tokens.idToken?.payload?.email || null;
                const userId = email || session.tokens.idToken?.payload?.sub || 'unknown';

                // Update Redux state with new token
                dispatch(signIn(userId, idTokenStr, email));

                // Broadcast token update to other tabs
                localStorage.setItem(TOKEN_SYNC_KEY, JSON.stringify({
                    timestamp: Date.now()
                }));

                // Hide the modal
                dispatch(hideReauthModal());

                // Retry all pending requests with new token
                retryPendingRequests();

                // Clear pending requests from Redux
                dispatch(clearPendingRequests());
            }
        } catch (error) {
            console.error('Error during re-authentication:', error);
        }
    }, [dispatch]);

    return (
        <Popup
            open={reauthRequired}
            modal
            closeOnDocumentClick={false}
            closeOnEscape={false}
            overlayStyle={{
                zIndex: 9999,
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
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
            {reauthRequired && (
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    overflow: 'hidden',
                }}>
                    <div style={{
                        padding: '20px',
                        borderBottom: '1px solid #eee',
                        backgroundColor: '#fff3cd',
                    }}>
                        <h4 style={{
                            margin: '0 0 8px 0',
                            color: '#856404',
                        }}>
                            Session Expired
                        </h4>
                        <p style={{
                            margin: 0,
                            color: '#856404',
                            fontSize: '0.9rem',
                        }}>
                            Your session has expired. Please sign in again to continue.
                            Your current page and any unsaved changes will be preserved.
                        </p>
                    </div>
                    <CognitoSignInWidget onSuccess={onSuccess} />
                </div>
            )}
        </Popup>
    );
};

export default ReAuthModal;
