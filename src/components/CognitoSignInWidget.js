import React, { useEffect, useRef, useState } from 'react';

import { Authenticator, useAuthenticator, ThemeProvider } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import Modal from 'react-bootstrap/Modal';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';


// Inner component that has access to useAuthenticator
const AuthenticatorContent = ({ onSuccess, skipInitialAuth }) => {
    const { authStatus } = useAuthenticator((context) => [context.authStatus]);
    const prevAuthStatusRef = useRef(null);
    const hasCalledOnSuccess = useRef(false);

    useEffect(() => {
        const prevStatus = prevAuthStatusRef.current;
        prevAuthStatusRef.current = authStatus;

        if (authStatus === 'authenticated' && !hasCalledOnSuccess.current) {
            // If skipInitialAuth and this is the initial mount (no previous status), skip
            // This is used for dev testing where we want to show the form even when already authenticated
            if (skipInitialAuth && prevStatus === null) {
                return;
            }

            hasCalledOnSuccess.current = true;
            if (onSuccess) {
                onSuccess();
            }
        }
    }, [authStatus, onSuccess, skipInitialAuth]);

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

const CognitoSignInWidget = ({ onSuccess, skipInitialAuth = false }) => {
    // Only show social providers if OAuth domain is configured
    const hasSocialProviders = !!process.env.REACT_APP_COGNITO_DOMAIN;
    const [showHelp, setShowHelp] = useState(false);

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
                <button
                    type="button"
                    className="help-link"
                    onClick={() => setShowHelp(true)}
                >
                    Need help signing in?
                </button>
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
                                text-align: left;
                            }
                            [data-amplify-authenticator] .amplify-label {
                                text-align: left;
                            }
                            [data-amplify-authenticator] .amplify-input {
                                text-align: left;
                            }
                            .help-link {
                                background: none;
                                border: none;
                                color: var(--amplify-components-button-link-color, #0d6efd);
                                font-size: var(--amplify-components-button-small-font-size, 0.875rem);
                                cursor: pointer;
                                padding: 0;
                                text-decoration: none;
                            }
                            .help-link:hover {
                                text-decoration: underline;
                                color: var(--amplify-components-button-link-hover-color, #0b5ed7);
                            }
                            .help-modal-backdrop {
                                z-index: 10000 !important;
                            }
                        `}
                    </style>
                    <Authenticator
                        loginMechanisms={['email']}
                        // socialProviders={hasSocialProviders ? ['google'] : []}
                        socialProviders={[]}
                        hideSignUp={true}
                    >
                        <AuthenticatorContent onSuccess={onSuccess} skipInitialAuth={skipInitialAuth} />
                    </Authenticator>
                </ThemeProvider>
            </div>

            <Modal
                show={showHelp}
                onHide={() => setShowHelp(false)}
                size="lg"
                style={{ zIndex: 10001 }}
                backdropClassName="help-modal-backdrop"
            >
                <Modal.Header closeButton>
                    <Modal.Title>Account Help</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    &nbsp;&nbsp;The Sign In button has a place for Email, enter the one you used for okta Sign In.<br/><br/>
                    &nbsp;&nbsp;Some curators already have an AI-curation account, in which case you don't need to create/reset your account, you can use that email and password.<br/><br/>
                    &nbsp;&nbsp;If you haven't signed on there, you'll have to reset your password by clicking on "Forgot your password?" and following the directions.  Then you can sign in by putting in the email and the new cognito password.<br/><br/>

                    &nbsp;&nbsp;Password requirements<br/>
                    &bull; Minimum 12 characters<br/>
                    &bull; At least one uppercase letter (A-Z)<br/>
                    &bull; At least one lowercase letter (a-z)<br/>
                    &bull; At least one number (0-9)<br/>
                    &bull; At least one symbol (!@#$%^&*()_-+=)<br/><br/>

                    &nbsp;&nbsp;This is not a google Sign In, so you won't be able to sign in by signing on to google with your google password.<br/><br/>

                    &nbsp;&nbsp;For help setting up a new account please contact the administrator for your MOD or the Team where you are working.<br/><br/>
                    <Container fluid>
                        <Row><Col>Chris Tabone</Col><Col>FB</Col><Col>Specialist</Col></Row>
                        <Row><Col>Olin Blodgett</Col><Col>MGI</Col><Col>A-Team</Col></Row>
                        <Row><Col>Jeff De Pons</Col><Col>RGD</Col><Col>A-Team</Col></Row>
                        <Row><Col>Shuai Weng</Col><Col>SGD</Col><Col>Blue-Team</Col></Row>
                        <Row><Col>Valerio Arnaboldi</Col><Col>WB</Col><Col>Blue-Team</Col></Row>
                        <Row><Col>Juancarlos Chan</Col><Col>WB</Col><Col>Blue-Team</Col></Row>
                        <Row><Col>Todd Harris</Col><Col>WB</Col><Col></Col></Row>
                        <Row><Col>Ryan Martin</Col><Col>ZFIN</Col><Col></Col></Row>
                    </Container>
                </Modal.Body>
            </Modal>
        </div>
    );
};

export default CognitoSignInWidget;
