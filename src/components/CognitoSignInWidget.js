import React, { useEffect } from 'react';

import { Authenticator, useAuthenticator, ThemeProvider } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';


// Inner component that has access to useAuthenticator
const AuthenticatorContent = ({ onSuccess }) => {
    const { authStatus } = useAuthenticator((context) => [context.authStatus]);

    useEffect(() => {
        if (authStatus === 'authenticated') {
            if (onSuccess) {
                onSuccess();
            }
        }
    }, [authStatus, onSuccess]);

    return null;
};

// Custom theme to adjust the Authenticator styling
const theme = {
    name: 'agr-theme',
    tokens: {
        components: {
            authenticator: {
                router: {
                    borderWidth: '0',
                    boxShadow: 'none',
                },
            },
        },
        colors: {
            brand: {
                primary: {
                    10: '#e8f4f8',
                    80: '#0d6efd',
                    90: '#0b5ed7',
                    100: '#0a58ca',
                },
            },
        },
    },
};

const CognitoSignInWidget = ({ onSuccess }) => {
    // Only show social providers if OAuth domain is configured
    const hasSocialProviders = !!process.env.REACT_APP_COGNITO_DOMAIN;

    return (
        <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            overflow: 'hidden',
            width: '100%',
            boxSizing: 'border-box',
        }}>
            <div style={{
                textAlign: 'center',
                padding: '24px 24px 16px 24px',
                borderBottom: '1px solid #eee',
            }}>
                <h2 style={{
                    margin: '0 0 8px 0',
                    fontSize: '1.4rem',
                    fontWeight: '600',
                    color: '#333',
                }}>
                    Sign In
                </h2>
            </div>
            <div style={{
                padding: '16px',
                display: 'flex',
                justifyContent: 'center',
            }}>
                <ThemeProvider theme={theme}>
                    <style>
                        {`
                            [data-amplify-authenticator] {
                                --amplify-components-authenticator-router-box-shadow: none;
                                --amplify-components-authenticator-router-border-width: 0;
                            }
                            [data-amplify-authenticator] [data-amplify-router] {
                                box-shadow: none;
                                border: none;
                            }
                            [data-amplify-authenticator] form {
                                padding: 0;
                            }
                        `}
                    </style>
                    <Authenticator
                        loginMechanisms={['email']}
                        // socialProviders={hasSocialProviders ? ['google'] : []}
                        socialProviders={[]}
                        hideSignUp={true}
                    >
                        <AuthenticatorContent onSuccess={onSuccess} />
                    </Authenticator>
                </ThemeProvider>
            </div>
        </div>
    );
};

export default CognitoSignInWidget;
